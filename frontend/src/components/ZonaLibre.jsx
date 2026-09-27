import { lazy, Suspense, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useEdicionTextos, usePlano } from "./Texto.jsx";
import { deBloquesViejos, limpiarZona, paraElSitio } from "../libre.js";
import "../styles/libre.css";

/* El editor (GrapesJS) pesa: se baja sólo cuando alguien lo abre. */
const EditorLibre = lazy(() => import("./EditorLibre.jsx"));

/* ---------------------------------------------------------------------
   Zona libre de una página: lo que quien edita arma con el editor completo
   (textos, imágenes, videos, los componentes de las páginas, estilos). En
   el sitio es el HTML + CSS guardados, limpios (libre.js), y el CSS sólo
   alcanza a esta zona.

   `zona` es la clave del HTML ("novedades.libre"; el CSS va en
   "novedades.libre.css"): tiene que empezar con el nombre de la página, que
   es lo que el backend usa para el permiso.
   `anterior` es la zona del editor de bloques que había antes en la página:
   si todavía no se guardó nada nuevo, se arranca de esos bloques, y al
   guardar se borran.
   `seccion`: la zona va como una sección propia de la página (al final);
   vacía, en el sitio no deja ni el espacio.
--------------------------------------------------------------------- */
export default function ZonaLibre({ zona, anterior, dueno, seccion, titulo = "Contenido libre" }) {
  const leer = usePlano();
  const edicion = useEdicionTextos();
  const [abierto, setAbierto] = useState(false);

  const guardado = leer(zona);
  const alcance = `.libre[data-zona="${zona}"]`;
  const { html, css } = limpiarZona(
    typeof guardado === "string" ? guardado : anterior ? deBloquesViejos(leer, anterior) : "",
    leer(`${zona}.css`),
    alcance,
  );

  const enSeccion = (contenido) =>
    seccion ? <section className="seccion contenedor zona-libre">{contenido}</section> : contenido;

  /* El mismo objeto mientras el HTML no cambie: si no, React lo vuelve a
     poner en cada dibujo (y, por ejemplo, se cierra una pregunta abierta). */
  const marcado = useMemo(() => ({ __html: paraElSitio(html) }), [html]);
  const vista = html && (
    <>
      {css && <style>{css}</style>}
      <div className="libre" data-zona={zona} dangerouslySetInnerHTML={marcado} />
    </>
  );

  if (!edicion?.puede(dueno)) return vista ? enSeccion(vista) : null;

  const guardar = (nuevoHtml, nuevoCss) => {
    edicion.fijar(zona, nuevoHtml || undefined);
    edicion.fijar(`${zona}.css`, (nuevoHtml && nuevoCss) || undefined);
    if (!anterior) return;
    for (const clave of Object.keys(edicion.borrador)) {
      const sinTipo = clave.replace(/^\w+:/, "");
      if (sinTipo === anterior || sinTipo.startsWith(`${anterior}.`)) edicion.fijar(clave, undefined);
    }
  };

  /* Para el editor, sin el alcance del sitio: los estilos van por "#id". */
  const paraEditar = limpiarZona(
    typeof guardado === "string" ? guardado : anterior ? deBloquesViejos(leer, anterior) : "",
    leer(`${zona}.css`),
  );

  return enSeccion(
    <div className="zona-edicion">
      <div className="zona-edicion__barra">
        <span className="zona-edicion__rotulo">
          <Icon icon="ph:layout" width={16} height={16} aria-hidden="true" />
          Zona libre
        </span>
        <button type="button" className="boton boton--primario boton--fino" onClick={() => setAbierto(true)}>
          <Icon icon="ph:pencil-simple" width={15} height={15} aria-hidden="true" />
          {html ? "Editar con el editor completo" : "Armar con el editor completo"}
        </button>
      </div>

      {vista || (
        <p className="zona-edicion__vacia">
          Todavía no hay nada acá. Con el editor completo podés sumar textos, imágenes, videos, tarjetas,
          pasos, avisos, tablas y más, al final de esta página.
        </p>
      )}

      {abierto && (
        <Suspense fallback={<p className="vacio">Cargando el editor…</p>}>
          <EditorLibre
            titulo={titulo}
            html={paraEditar.html}
            css={paraEditar.css}
            alCambiar={guardar}
            cerrar={() => setAbierto(false)}
          />
        </Suspense>
      )}
    </div>,
  );
}
