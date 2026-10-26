import { useId, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";

/* Desplegable con búsqueda (combobox accesible): se escribe para filtrar y
   se elige con el mouse o con las flechas y Enter. Sólo deja elegir opciones
   que existen; si falta una y `alAgregar` está, ofrece agregarla con lo
   escrito (queda en el catálogo del sistema).

   opciones: [{ id, nombre, detalle? }] · valor: id elegido (o "") */
const normalizar = (texto = "") =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function SelectorBuscable({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  alAgregar,
  textoAgregar = "Agregar",
  placeholder = "Escribí para buscar…",
  requerido = false,
  desactivado = false,
  error = "",
}) {
  const id = useId();
  const [texto, setTexto] = useState(null); // null = mostrando lo elegido
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(0);
  const [agregando, setAgregando] = useState(false);
  const entrada = useRef(null);

  const elegida = opciones.find((o) => String(o.id) === String(valor));
  const buscado = normalizar(texto ?? "");
  const filtradas = useMemo(
    () =>
      opciones
        .filter((o) => !buscado || normalizar(`${o.nombre} ${o.detalle ?? ""}`).includes(buscado))
        .slice(0, 60),
    [opciones, buscado],
  );
  const exacta = opciones.some((o) => normalizar(o.nombre) === buscado);
  const puedeAgregar = alAgregar && buscado.length >= 2 && !exacta;
  const total = filtradas.length + (puedeAgregar ? 1 : 0);

  const elegir = (opcion) => {
    alCambiar(String(opcion.id));
    setTexto(null);
    setAbierto(false);
  };

  const agregar = async () => {
    setAgregando(true);
    try {
      const nuevo = await alAgregar(texto.trim());
      if (nuevo) elegir(nuevo);
    } finally {
      setAgregando(false);
    }
  };

  const confirmar = () => {
    if (resaltada < filtradas.length) elegir(filtradas[resaltada]);
    else if (puedeAgregar) agregar();
  };

  return (
    <div className={`campo buscable ${error ? "campo--error" : ""}`}>
      <label htmlFor={id}>
        {etiqueta}
        {requerido && <span aria-hidden="true"> *</span>}
      </label>
      <div className="buscable__caja">
        <Icon className="buscable__lupa" icon="ph:magnifying-glass" width={16} height={16} aria-hidden="true" />
        <input
          id={id}
          ref={entrada}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={abierto && total ? `${id}-op-${resaltada}` : undefined}
          aria-required={requerido}
          aria-invalid={!!error}
          autoComplete="off"
          disabled={desactivado || agregando}
          placeholder={elegida ? elegida.nombre : placeholder}
          value={texto ?? elegida?.nombre ?? ""}
          onFocus={(e) => {
            setAbierto(true);
            e.target.select();
          }}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
            setResaltada(0);
          }}
          onBlur={() =>
            // Deja terminar el clic en una opción antes de cerrar.
            setTimeout(() => {
              setAbierto(false);
              setTexto(null);
            }, 150)
          }
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAbierto(true);
              setResaltada((r) => Math.min(r + 1, Math.max(total - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setResaltada((r) => Math.max(r - 1, 0));
            } else if (e.key === "Enter" && abierto) {
              e.preventDefault();
              confirmar();
            } else if (e.key === "Escape" && abierto) {
              // Cierra la lista, no la ventana.
              e.stopPropagation();
              setAbierto(false);
              setTexto(null);
            }
          }}
        />
        {valor && !desactivado && !requerido && (
          <button
            type="button"
            className="buscable__limpiar"
            aria-label={`Quitar ${etiqueta.toLowerCase()}`}
            onClick={() => alCambiar("")}
          >
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {abierto && !desactivado && (
        <ul className="buscable__lista" id={`${id}-lista`} role="listbox" aria-label={etiqueta}>
          {filtradas.map((o, i) => (
            <li
              key={o.id}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={String(o.id) === String(valor)}
              className={`buscable__opcion ${i === resaltada ? "buscable__opcion--resaltada" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(o)}
              onMouseEnter={() => setResaltada(i)}
            >
              <span>{o.nombre}</span>
              {o.detalle && <span className="buscable__detalle">{o.detalle}</span>}
            </li>
          ))}
          {puedeAgregar && (
            <li
              id={`${id}-op-${filtradas.length}`}
              role="option"
              aria-selected={false}
              className={`buscable__opcion buscable__opcion--agregar ${
                resaltada === filtradas.length ? "buscable__opcion--resaltada" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={agregar}
            >
              <Icon icon="ph:plus" width={14} height={14} aria-hidden="true" />
              {textoAgregar} “{texto.trim()}”
            </li>
          )}
          {!total && <li className="buscable__vacio">No hay coincidencias.</li>}
        </ul>
      )}
      {error && <span className="campo__error">{error}</span>}
    </div>
  );
}
