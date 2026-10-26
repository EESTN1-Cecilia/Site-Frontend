import { useId, useMemo, useState } from "react";

/* Varios elementos de un catálogo, con búsqueda (grupos, materias…).
   Sin ninguno elegido vale «todos»: así una grilla nueva no queda vacía.
   opciones: [{ id, nombre, detalle? }] · valores: [id] */
const normalizar = (texto = "") =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function SelectorMultiple({ etiqueta, opciones, valores, alCambiar, ayuda, atajos = [] }) {
  const id = useId();
  const [buscar, setBuscar] = useState("");
  const elegidos = new Set(valores.map(Number));
  const filtradas = useMemo(
    () => opciones.filter((o) => !buscar || normalizar(`${o.nombre} ${o.detalle ?? ""}`).includes(normalizar(buscar))),
    [opciones, buscar],
  );
  const alternar = (opcion) =>
    alCambiar(elegidos.has(opcion.id) ? valores.filter((v) => Number(v) !== opcion.id) : [...valores, opcion.id]);

  return (
    <fieldset className="multiple">
      <legend className="multiple__etiqueta">
        {etiqueta}
        <span className="multiple__cuenta">{elegidos.size ? `${elegidos.size} elegidos` : "todos"}</span>
      </legend>
      {ayuda && <p className="multiple__ayuda">{ayuda}</p>}
      <div className="multiple__barra">
        <input
          type="search"
          aria-label={`Buscar en ${etiqueta.toLowerCase()}`}
          placeholder="Buscar…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        {atajos.map(([texto, ids]) => (
          <button key={texto} type="button" className="boton boton--fino" onClick={() => alCambiar(ids)}>
            {texto}
          </button>
        ))}
        <button type="button" className="boton boton--fino" onClick={() => alCambiar([])} disabled={!elegidos.size}>
          Todos
        </button>
      </div>
      <ul className="multiple__lista" id={id}>
        {filtradas.map((o) => (
          <li key={o.id}>
            <label className="multiple__opcion">
              <input type="checkbox" checked={elegidos.has(o.id)} onChange={() => alternar(o)} />
              <span>{o.nombre}</span>
              {o.detalle && <span className="multiple__detalle">{o.detalle}</span>}
            </label>
          </li>
        ))}
        {!filtradas.length && <li className="multiple__vacio">No hay coincidencias.</li>}
      </ul>
    </fieldset>
  );
}
