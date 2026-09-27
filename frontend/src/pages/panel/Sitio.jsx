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
import { redesSociales } from "../../data.js";
import { esLinkValido } from "../../links.js";

/* Redes del pie de página: Dirección elige la red, pega el link, agrega o quita. */
function Redes({ redes, editable }) {
  const guardar = (lista) => guardarAjustes({ redes: lista });
  const cambiar = (id, cambio) => guardar(redes.map((r) => (r.id === id ? { ...r, ...cambio } : r)));

  return (
    <article className="tarjeta sitio__pagina">
      <div className="sitio__cabecera">
        <span className="sitio__icono">
          <Icon icon="ph:share-network" width={22} height={22} aria-hidden="true" />
        </span>
        <div className="sitio__nombre">
          <h2 className="tarjeta__titulo">Redes sociales</h2>
          <p className="sitio__ruta">Pie de página · en todas las páginas</p>
        </div>
        <span className={`etiqueta ${editable ? "etiqueta--ok" : ""}`}>
          {editable ? "Editás" : "Solo lectura"}
        </span>
      </div>

      <ul className="sitio__partes">
        {redes.map((r) => {
          const nombre = redesSociales[r.red]?.[0] || r.red;
          const invalido = r.url && !esLinkValido(r.url);

          return (
            <li className="sitio__parte sitio__parte--columna" key={r.id}>
              <div className="red-edit">
                <Icon icon={redesSociales[r.red]?.[1] || "ph:link"} width={20} height={20} aria-hidden="true" />
                <select
                  aria-label="Red"
                  value={r.red}
                  disabled={!editable}
                  onChange={(e) => cambiar(r.id, { red: e.target.value })}
                >
                  {Object.entries(redesSociales).map(([clave, [etiqueta]]) => (
                    <option key={clave} value={clave}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  aria-label={`Link de ${nombre}`}
                  placeholder="https://…"
                  defaultValue={r.url}
                  disabled={!editable}
                  aria-invalid={!!invalido}
                  onBlur={(e) => cambiar(r.id, { url: e.target.value.trim() })}
                />
                {editable && (
                  <button
                    className="tabla-edit__quitar"
                    title={`Quitar ${nombre}`}
                    aria-label={`Quitar ${nombre}`}
                    onClick={() => guardar(redes.filter((x) => x.id !== r.id))}
                  >
                    <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className={`sitio__parte-quien ${invalido ? "red-edit__error" : ""}`}>
                {invalido
                  ? "El link tiene que empezar con https://"
                  : r.url
                    ? "Se muestra en el pie de página."
                    : "Sin link: no se muestra en el sitio."}
              </p>
            </li>
          );
        })}
      </ul>

      {editable && (
        <button
          className="enlace sitio__ver"
          onClick={() =>
            guardar([...redes, { id: `r${Date.now().toString(36)}`, red: "instagram", url: "" }])
          }
        >
          + Agregar otra red
        </button>
      )}
    </article>
  );
}

const TODA = "Toda la página: textos, imágenes, links y secciones";

/* Todas las vistas que ven los alumnos. "Toda la página" abre el editor en el
   lugar; las otras partes son para agregar o quitar elementos de una lista. */
const paginas = [
  {
    ruta: "/",
    icono: "ph:house",
    partes: [
      [TODA, { pagina: true }],
      ["Menú de arriba y pie de página (se ven en todas las páginas)", { pagina: true }],
      ["Agregar o quitar programas", { editor: "/panel/programas" }],
    ],
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

        <Redes redes={ajustes.redes} editable={esDireccion} />
      </div>

      {vista && (
        <VistaPrevia chip="VISTA PREVIA" titulo={vista.nombre} url={vista.ruta} cerrar={() => setVista(null)} />
      )}
    </Layout>
  );
}
