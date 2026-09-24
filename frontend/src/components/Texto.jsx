import { createContext, useContext, useState } from "react";
import { Icon } from "@iconify/react";
import Editable from "./Editable.jsx";
import SelectorImagen, { Ventana } from "./SelectorImagen.jsx";
import { useTextos } from "../textos.js";
import { esLinkValido } from "../links.js";

/* ---------------------------------------------------------------------
   Piezas editables de las páginas públicas.

   Cada texto, imagen, link y contenedor tiene un id. Lo publicado se guarda
   como cambios sobre el contenido original (textos.js); mientras se edita,
   el editor de páginas provee el borrador con este contexto:
   { borrador, cambiar(id, valor, original), fijar(clave, valor), puede(dueno) }

   `dueno` es la sección que manda sobre ese dato (por ejemplo las notas se
   rigen por /panel/publicaciones). Sin dueno manda el permiso de la página.
--------------------------------------------------------------------- */
export const EdicionTextos = createContext(null);
export const useEdicionTextos = () => useContext(EdicionTextos);

/* Lo publicado, o el borrador si se está editando. */
function useFuente() {
  const publicados = useTextos();
  const edicion = useContext(EdicionTextos);
  return [edicion ? edicion.borrador : publicados, edicion];
}

/* ---------- Texto ---------- */
export default function Texto({ id, children, clase, dueno }) {
  const [fuente, edicion] = useFuente();
  const valor = fuente[id] ?? children;

  if (!edicion?.puede(dueno)) return clase ? <span className={clase}>{valor}</span> : valor;

  return (
    <Editable
      clase={clase}
      valor={valor}
      detener
      alCambiar={(nuevo) => edicion.cambiar(id, nuevo, children)}
    />
  );
}

/* ---------- Texto plano ----------
   Para textos que van en atributos (data-label, placeholder) y no se pueden
   editar en el lugar: devuelve una función (id, original) => valor actual. */
export function usePlano() {
  const [fuente] = useFuente();
  return (id, original) => fuente[id] ?? original;
}

/* ---------- Campo con placeholder editable ----------
   En el sitio es un input (o textarea) común; en el editor el placeholder se
   escribe en el lugar del campo. */
export function Campo({ id, placeholder, como: Etiqueta = "input", dueno, ...resto }) {
  const [fuente, edicion] = useFuente();
  const valor = fuente[id] ?? placeholder;

  if (!edicion?.puede(dueno)) return <Etiqueta placeholder={valor} {...resto} />;

  return (
    <Editable
      clase="campo__marcador"
      valor={valor}
      detener
      alCambiar={(nuevo) => edicion.cambiar(id, nuevo, placeholder)}
    />
  );
}

/* ---------- Partes que aparecen sólo en un caso ----------
   (sin resultados, formulario enviado…). En el editor se muestran siempre,
   con un aviso de cuándo se ven, para poder editarlas. */
export function Caso({ visible, cuando, children }) {
  const edicion = useContext(EdicionTextos);

  if (!edicion) return visible ? children : null;

  return (
    <div className="caso-edicion">
      <p className="caso-edicion__aviso">
        <Icon icon="ph:eye" width={14} height={14} aria-hidden="true" />
        Se ve {cuando}
      </p>
      {children}
    </div>
  );
}

/* ---------- Imagen: clic para cambiarla ----------
   `vacio` es lo que se ve cuando no hay imagen (por ejemplo la inicial de un
   programa); si lo hay, la imagen también se puede quitar. */
export function Imagen({ id, src, alt = "", className = "", dueno, vacio }) {
  const [fuente, edicion] = useFuente();
  const [abierto, setAbierto] = useState(false);
  const clave = `img:${id}`;
  const actual = fuente[clave] ?? src;

  if (!edicion?.puede(dueno))
    return actual ? <img className={className} src={actual} alt={alt} /> : (vacio ?? null);

  const abrir = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAbierto(true);
  };

  return (
    <>
      {actual ? (
        <img
          className={`${className} imagen-editable`}
          src={actual}
          alt={alt}
          title="Hacé clic para cambiar la imagen"
          onClick={abrir}
        />
      ) : (
        <span className="imagen-editable imagen-vacia" title="Hacé clic para poner una imagen" onClick={abrir}>
          {vacio}
        </span>
      )}
      {abierto && (
        <SelectorImagen
          actual={actual}
          quitar={vacio !== undefined}
          cerrar={() => setAbierto(false)}
          elegir={(url) => {
            /* null vuelve a la original; "" deja el lugar sin imagen. */
            edicion.fijar(clave, url === null || url === src ? undefined : url);
            setAbierto(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- Link: el destino se cambia con el botón de cadena ---------- */
export function Enlace({
  id,
  href,
  className = "",
  claseVacia = "",
  ocultarVacio = false,
  vacio,
  dueno,
  children,
  ...resto
}) {
  const [fuente, edicion] = useFuente();
  const [abierto, setAbierto] = useState(false);
  const [borradorUrl, setBorradorUrl] = useState("");
  const [error, setError] = useState("");
  const clave = `link:${id}`;
  const url = fuente[clave] ?? href ?? "";
  const valido = esLinkValido(url);
  const editable = !!edicion?.puede(dueno);

  const cuerpo = valido ? (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer" {...resto}>
      {children}
    </a>
  ) : ocultarVacio && !editable ? null : (
    vacio ?? <span className={`${className} ${claseVacia}`}>{children}</span>
  );

  if (!editable) return cuerpo;

  const guardar = (nuevo) => {
    edicion.fijar(clave, nuevo === (href ?? "") ? undefined : nuevo);
    setAbierto(false);
  };

  return (
    <>
      {cuerpo}
      <button
        type="button"
        className="control-edicion enlace-editar"
        title={valido ? "Cambiar el link" : "Agregar un link"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setBorradorUrl(url);
          setError("");
          setAbierto(true);
        }}
      >
        <Icon icon={valido ? "ph:link" : "ph:link-break"} width={13} height={13} aria-hidden="true" />
      </button>
      {abierto && (
        <Ventana
          chip="LINK"
          titulo={valido ? "Cambiar el link" : "Agregar un link"}
          cerrar={() => setAbierto(false)}
          pie={
            <>
              <button
                className="boton boton--primario"
                onClick={() =>
                  esLinkValido(borradorUrl)
                    ? guardar(borradorUrl.trim())
                    : setError("El link tiene que empezar con https://")
                }
              >
                Guardar link
              </button>
              <button className="boton" onClick={() => guardar("")}>
                Quitar el link
              </button>
            </>
          }
        >
          <label className="campo campo--ancho">
            <span>Adónde lleva</span>
            <input
              autoFocus
              type="url"
              placeholder="https://…"
              value={borradorUrl}
              onChange={(e) => setBorradorUrl(e.target.value)}
            />
          </label>
          {error && <p className="selector__error">{error}</p>}
        </Ventana>
      )}
    </>
  );
}

/* ---------- Dato con formato (fechas, horas) ---------- */
export function Dato({ id, valor, tipo = "text", formato = (v) => v, dueno }) {
  const [fuente, edicion] = useFuente();
  const actual = fuente[id] ?? valor;

  if (!edicion?.puede(dueno)) return formato(actual);

  return (
    <input
      type={tipo}
      className="control-edicion dato-editable"
      value={actual || ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => edicion.cambiar(id, e.target.value, valor)}
    />
  );
}

/* ---------- Listas: orden, ocultos y copias ---------- */
/* Devuelve los elementos en el orden elegido (con las copias agregadas) y una
   función que arma las props del Bloque de cada uno. */
export function useLista(lista, base, { duplicable = false } = {}) {
  const [fuente] = useFuente();

  const copias = (fuente[`extra:${lista}`] || [])
    .map(({ id, de }) => {
      const original = base.find((item) => item.id === de);
      return original ? { ...original, id, copiaDe: de } : null;
    })
    .filter(Boolean);

  const orden = fuente[`orden:${lista}`] || [];
  const posicion = (id) => {
    const i = orden.indexOf(id);
    return i < 0 ? Infinity : i;
  };

  const items = [...base, ...copias]
    .map((item, i) => [item, i])
    .sort(([a, i], [b, j]) => posicion(a.id) - posicion(b.id) || i - j)
    .map(([item]) => item);

  const ids = items.map((item) => item.id);
  const bloque = (item) => ({
    id: `${lista}.${item.id}`,
    lista,
    item: item.id,
    ids,
    copia: item.copiaDe,
    duplicable,
  });

  return [items, bloque];
}

const fondos = [
  [undefined, "Original"],
  ["blanco", "Blanco"],
  ["gris", "Gris"],
  ["rosa", "Rosa"],
];

/* ---------- Contenedor: mover, duplicar, ocultar y cambiar el fondo ----------
   `acciones` son botones de más para la barra (los usa EditorDeBloques). */
export function Bloque({
  id,
  como: Etiqueta = "div",
  className = "",
  ancla,
  lista,
  item,
  ids,
  copia,
  duplicable,
  dueno,
  acciones,
  children,
  ...resto
}) {
  const [fuente, edicion] = useFuente();
  const oculto = !!fuente[`oculto:${id}`];
  const fondo = fuente[`fondo:${id}`];
  const clases = [className, fondo && `fondo--${fondo}`].filter(Boolean).join(" ");

  if (!edicion?.puede(dueno)) {
    return oculto ? null : (
      <Etiqueta className={clases} id={ancla} {...resto}>
        {children}
      </Etiqueta>
    );
  }

  const pos = ids ? ids.indexOf(item) : -1;
  const extras = fuente[`extra:${lista}`] || [];

  const mover = (paso) => {
    const nuevo = [...ids];
    [nuevo[pos], nuevo[pos + paso]] = [nuevo[pos + paso], nuevo[pos]];
    edicion.fijar(`orden:${lista}`, nuevo);
  };

  const duplicar = () => {
    const nuevoId = `c${Date.now().toString(36)}`;
    edicion.fijar(`extra:${lista}`, [...extras, { id: nuevoId, de: copia || item }]);
    const nuevo = [...ids];
    nuevo.splice(pos + 1, 0, nuevoId);
    edicion.fijar(`orden:${lista}`, nuevo);
  };

  const quitarCopia = () => {
    edicion.fijar(`extra:${lista}`, extras.filter((x) => x.id !== item));
    edicion.fijar(`orden:${lista}`, ids.filter((x) => x !== item));
  };

  const siguienteFondo =
    fondos[(fondos.findIndex(([clave]) => clave === fondo) + 1) % fondos.length];

  return (
    <Etiqueta
      className={`${clases} bloque-editable ${oculto ? "bloque-oculto" : ""}`}
      id={ancla}
      {...resto}
    >
      <span
        className="barra-bloque"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {lista && (
          <>
            <button type="button" title="Subir" disabled={pos <= 0} onClick={() => mover(-1)}>
              <Icon icon="ph:arrow-up" width={15} height={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Bajar"
              disabled={pos < 0 || pos >= ids.length - 1}
              onClick={() => mover(1)}
            >
              <Icon icon="ph:arrow-down" width={15} height={15} aria-hidden="true" />
            </button>
          </>
        )}
        {lista && duplicable && (
          <button type="button" title="Duplicar" onClick={duplicar}>
            <Icon icon="ph:copy" width={15} height={15} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          title={`Fondo: ${fondos.find(([c]) => c === fondo)?.[1] || "Original"} (cambiar a ${siguienteFondo[1]})`}
          onClick={() => edicion.fijar(`fondo:${id}`, siguienteFondo[0])}
        >
          <span className={`barra-bloque__fondo fondo--${fondo || "original"}`} />
        </button>
        <button
          type="button"
          title={oculto ? "Mostrar" : "Ocultar"}
          onClick={() => edicion.fijar(`oculto:${id}`, oculto ? undefined : true)}
        >
          <Icon icon={oculto ? "ph:eye" : "ph:eye-slash"} width={15} height={15} aria-hidden="true" />
        </button>
        {copia && (
          <button type="button" title="Quitar esta copia" onClick={quitarCopia}>
            <Icon icon="ph:trash" width={15} height={15} aria-hidden="true" />
          </button>
        )}
        {acciones}
      </span>
      {children}
    </Etiqueta>
  );
}
