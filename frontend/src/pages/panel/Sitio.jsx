import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import { guardarAjustes, useAjustes } from "../../ajustes.js";
import {
  puede,
  puedeEditar,
  puedeEditarPagina,
  quienEdita,
  quienEditaPagina,
} from "../../sesion.js";
import { ir } from "../../router.js";
import { paginasEditables } from "./SitioPagina.jsx";

const TODA = "Toda la página: textos, imágenes, links y secciones";

/* Todas las vistas que ven los alumnos. "Toda la página" abre el editor en el
   lugar; las otras partes son para agregar o quitar elementos de una lista. */
const paginas = [
  {
    ruta: "/",
    icono: "ph:house",
    partes: [[TODA, { pagina: true }], ["Agregar o quitar programas", { editor: "/panel/programas" }]],
  },
  { ruta: "/evaluacion", icono: "ph:clipboard-text", partes: [[TODA, { pagina: true }]] },
  {
    ruta: "/previas",
    icono: "ph:arrows-clockwise",
    partes: [
      [TODA, { pagina: true }],
      ["Agregar o quitar mesas", { editor: "/panel/mesas" }],
      ["Avisos nuevos", { editor: "/panel/publicaciones" }],
    ],
  },
  {
    ruta: "/novedades",
    icono: "ph:megaphone",
    partes: [[TODA, { pagina: true }], ["Notas nuevas", { editor: "/panel/publicaciones" }]],
  },
  { ruta: "/inscripcion", icono: "ph:user-plus", inscripcion: true, partes: [[TODA, { pagina: true }]] },
  ...["ciclo-basico", "informatica", "programacion"].map((clave) => ({
    ruta: `/proyectos/${clave}`,
    icono: "ph:folders",
    partes: [[TODA, { pagina: true }], ["Agregar o quitar proyectos", { editor: "/panel/proyectos" }]],
  })),
];

export default function Sitio({ ruta, usuario }) {
  const ajustes = useAjustes();
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState("");
  const esDireccion = usuario?.rol === "direccion";

  /* Para cada parte: si este rol la edita, quién la edita y adónde lleva.
     La página completa cuenta como editable si el rol toca alguna parte de ella. */
  const resolver = (pagina, [, parte]) => {
    if (parte.pagina) {
      const duenos = paginasEditables[pagina.ruta][2];
      return {
        editable:
          puedeEditarPagina(usuario, pagina.ruta) || duenos.some((d) => puedeEditar(usuario, d)),
        quien: quienEditaPagina(pagina.ruta),
        destino: `/panel/sitio/pagina?p=${encodeURIComponent(pagina.ruta)}`,
        accesible: true,
      };
    }
    return {
      editable: puedeEditar(usuario, parte.editor),
      quien: quienEdita(parte.editor),
      destino: parte.editor,
      accesible: puede(usuario, parte.editor),
    };
  };

  return (
    <Layout
      ruta={ruta}
      chip="SITIO PÚBLICO"
      titulo="Páginas del sitio"
      texto="Todo lo que ven los alumnos, en un solo lugar. Cada parte la edita el rol que corresponde; Dirección puede editar todas."
    >
      {aviso && (
        <p className="flash">
          <Icon icon="ph:check-circle" width={18} height={18} aria-hidden="true" />
          {aviso}
          <button className="flash__cerrar" onClick={() => setAviso("")}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}

      <div className="sitio">
        {paginas.map((pagina) => {
          const nombre = paginasEditables[pagina.ruta][0];
          const partes = pagina.partes.map((parte) => [parte, resolver(pagina, parte)]);
          const editables = partes.filter(([, r]) => r.editable).length;

          return (
            <article className="tarjeta sitio__pagina" key={pagina.ruta}>
              <div className="sitio__cabecera">
                <span className="sitio__icono">
                  <Icon icon={pagina.icono} width={22} height={22} aria-hidden="true" />
                </span>
                <div className="sitio__nombre">
                  <h2 className="tarjeta__titulo">{nombre}</h2>
                  <p className="sitio__ruta">{pagina.ruta}</p>
                </div>
                <span className={`etiqueta ${editables ? "etiqueta--ok" : ""}`}>
                  {editables ? "Editás" : "Solo lectura"}
                </span>
              </div>

              <ul className="sitio__partes">
                {partes.map(([[etiqueta], r]) => (
                  <li className="sitio__parte" key={etiqueta}>
                    <div>
                      <p className="sitio__parte-nombre">{etiqueta}</p>
                      <p className="sitio__parte-quien">Lo edita {r.quien}</p>
                    </div>
                    {r.accesible ? (
                      <button
                        className={`boton boton--fino ${r.editable ? "boton--primario" : ""}`}
                        onClick={() => ir(r.destino)}
                      >
                        <Icon icon={r.editable ? "ph:pencil-simple" : "ph:eye"} width={15} height={15} aria-hidden="true" />
                        {r.editable ? "Editar" : "Ver"}
                      </button>
                    ) : (
                      <span className="sitio__sin-acceso">
                        <Icon icon="ph:lock" width={15} height={15} aria-hidden="true" />
                        Sin acceso
                      </span>
                    )}
                  </li>
                ))}

                {pagina.inscripcion && (
                  <li className="sitio__parte">
                    <div>
                      <p className="sitio__parte-nombre">
                        Inscripción {ajustes.inscripcionAbierta ? "abierta" : "cerrada"}
                      </p>
                      <p className="sitio__parte-quien">La abre y la cierra Dirección</p>
                    </div>
                    {esDireccion ? (
                      <button
                        className={`interruptor ${ajustes.inscripcionAbierta ? "interruptor--on" : ""}`}
                        aria-pressed={ajustes.inscripcionAbierta}
                        aria-label="Inscripción abierta"
                        onClick={() => {
                          guardarAjustes({ inscripcionAbierta: !ajustes.inscripcionAbierta });
                          setAviso(
                            ajustes.inscripcionAbierta
                              ? "La inscripción quedó cerrada: se sacó del menú y de la portada."
                              : "La inscripción quedó abierta.",
                          );
                        }}
                      >
                        <span />
                      </button>
                    ) : (
                      <span
                        className={`etiqueta ${ajustes.inscripcionAbierta ? "etiqueta--ok" : "etiqueta--alerta"}`}
                      >
                        {ajustes.inscripcionAbierta ? "Abierta" : "Cerrada"}
                      </span>
                    )}
                  </li>
                )}

                {pagina.inscripcion && esDireccion && (
                  <li className="sitio__parte sitio__parte--columna">
                    <label className="campo campo--ancho">
                      <span>Mensaje cuando está cerrada</span>
                      <textarea
                        rows={2}
                        defaultValue={ajustes.mensajeCierre}
                        onBlur={(e) => guardarAjustes({ mensajeCierre: e.target.value })}
                      />
                    </label>
                  </li>
                )}
              </ul>

              <button className="enlace sitio__ver" onClick={() => setVista({ ...pagina, nombre })}>
                Ver la página como la ven los alumnos
              </button>
            </article>
          );
        })}
      </div>

      {vista && (
        <VistaPrevia chip="VISTA PREVIA" titulo={vista.nombre} url={vista.ruta} cerrar={() => setVista(null)} />
      )}
    </Layout>
  );
}
