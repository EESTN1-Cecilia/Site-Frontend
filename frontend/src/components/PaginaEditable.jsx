import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EnDinamico, usePlano } from "./Texto.jsx";
import { limpiarZona, paraElSitio } from "../libre.js";
import { ir } from "../router.js";
import "../styles/libre.css";

/* ---------------------------------------------------------------------
   Página armada con el editor completo (GrapesJS).

   Una página del sitio puede guardarse entera como HTML + CSS
   ("previas.pagina" y "previas.pagina.css"). Si está guardada, el sitio la
   muestra desde ahí; si no, como siempre, desde su componente de React.

   Las partes que se arman con datos o responden a clics (el cronograma de
   mesas con su buscador, los avisos publicados…) no son HTML: en la página
   guardada quedan como un lugar vacío, <div data-dinamico="cronograma">, y
   acá se dibujan adentro los componentes de siempre.
--------------------------------------------------------------------- */

/* Mientras se saca la "foto" de una página para el editor (instantanea.jsx):
   las partes automáticas se marcan en vez de dibujarse sueltas. */
export const ModoInstantanea = createContext(false);

/* Una parte automática de la página. En la foto, sus piezas salen marcadas
   para editarlas una por una (Texto.jsx, useMarca). */
export function Dinamico({ id, children }) {
  return useContext(ModoInstantanea) ? (
    <EnDinamico.Provider value>
      <div data-dinamico={id}>{children}</div>
    </EnDinamico.Provider>
  ) : (
    children
  );
}

/* Botón a otra página del sitio. En la foto para el editor sale como link
   ("#/previas"): así se guarda y se puede cambiar su texto o a dónde lleva. */
export function IrA({ ruta, className, children }) {
  return useContext(ModoInstantanea) ? (
    <a className={className} href={`#${ruta}`}>
      {children}
    </a>
  ) : (
    <button className={className} onClick={() => ir(ruta)}>
      {children}
    </button>
  );
}

/* La página guardada, limpia, o null si se muestra la de siempre. */
export function usePaginaGuardada(clave) {
  const leer = usePlano();
  const instantanea = useContext(ModoInstantanea);
  const html = leer(clave);
  if (instantanea || typeof html !== "string") return null;
  return limpiarZona(html, leer(`${clave}.css`), `.pagina-libre[data-pagina="${clave}"]`, "pagina");
}

/* `dinamicos`: { id: elemento } con lo que va en cada lugar automático. */
export function PaginaEditable({ clave, pagina, dinamicos }) {
  const caja = useRef(null);
  const [lugares, setLugares] = useState([]);
  const html = paraElSitio(pagina.html);
  /* El mismo objeto mientras el HTML no cambie: si no, React vuelve a poner
     el HTML en cada dibujo y se lleva lo que hay en los lugares. */
  const marcado = useMemo(() => ({ __html: html }), [html]);

  /* Cada vez que cambia el HTML, React lo vuelve a poner y los lugares son otros. */
  useLayoutEffect(() => {
    setLugares([...caja.current.querySelectorAll("[data-dinamico]")]);
  }, [html]);

  return (
    <>
      {pagina.css && <style>{pagina.css}</style>}
      <div ref={caja} className="pagina-libre" data-pagina={clave} dangerouslySetInnerHTML={marcado} />
      {lugares.map((lugar, i) => {
        const id = lugar.getAttribute("data-dinamico");
        return Object.hasOwn(dinamicos, id) ? createPortal(dinamicos[id], lugar, `${id}-${i}`) : null;
      })}
    </>
  );
}
