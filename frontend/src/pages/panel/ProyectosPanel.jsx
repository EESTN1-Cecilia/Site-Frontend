import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import {
  areas,
  borrarProyecto,
  guardarProyecto,
  nuevoId,
  restaurarProyectos,
  useAreas,
} from "../../proyectos.js";
import { ir } from "../../router.js";
import { puedeEditar } from "../../sesion.js";
import { esLinkDeDocumento, esLinkValido } from "../../links.js";
import VistaPrevia from "../../components/VistaPrevia.jsx";

const claves = Object.keys(areas);

const vacio = () => ({
  id: nuevoId(),
  titulo: "",
  anio: "",
  resumen: "",
  equipo: [],
  stack: [],
  aprendizajes: [],
  repo: "",
  docs: [],
});

const aTexto = (lista) => (lista || []).join("\n");
const aLista = (texto) =>
  texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

/* Aproxima el peso del archivo para mostrarlo en la descarga. */
const pesoLegible = (bytes) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;

export default function ProyectosPanel({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const conProyectos = useAreas();
  const [area, setArea] = useState(claves[0]);
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [vista, setVista] = useState(null);

  const lista = conProyectos[area].proyectos;

  const cambiar = (campo) => (e) =>
    setEditando((previo) => ({ ...previo, [campo]: e.target.value }));

  const cambiarDoc = (indice, campo) => (e) =>
    setEditando((previo) => ({
      ...previo,
      docs: previo.docs.map((doc, i) =>
        i === indice ? { ...doc, [campo]: e.target.value } : doc,
      ),
    }));

  const elegirArchivo = (indice) => (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setEditando((previo) => ({
      ...previo,
      docs: previo.docs.map((doc, i) =>
        i === indice
          ? {
              ...doc,
              nombre: doc.nombre || archivo.name.replace(/\.[^.]+$/, ""),
              archivo: `/docs/${archivo.name}`,
              peso: pesoLegible(archivo.size),
            }
          : doc,
      ),
    }));
  };

  const guardar = (e) => {
    e.preventDefault();
    const docs = editando.docs.filter((doc) => doc.nombre && doc.archivo);

    /* Los links se muestran en el sitio: sólo http(s) o archivos del propio sitio. */
    if (editando.repo?.trim() && !esLinkValido(editando.repo)) {
      setError("El link del repositorio tiene que empezar con https://");
      return;
    }
    if (docs.some((doc) => !esLinkDeDocumento(doc.archivo))) {
      setError("Cada documento tiene que ser un link https:// o una ruta del sitio como /docs/informe.pdf");
      return;
    }

    guardarProyecto(area, { ...editando, repo: editando.repo?.trim() || null, docs });
    setAviso(`“${editando.titulo}” guardado en ${conProyectos[area].titulo}.`);
    setError("");
    setEditando(null);
  };

  const eliminar = (proyecto) => {
    borrarProyecto(area, proyecto.id);
    setAviso(`“${proyecto.titulo}” se quitó del sitio.`);
  };

  return (
    <Layout
      ruta={ruta}
      chip="JEFATURA DE ÁREA"
      titulo="Proyectos publicados"
      texto="Lo que cargues acá es lo que ven los alumnos en la página de cada orientación."
      acciones={
        <>
          <button
            className="boton"
            onClick={() => setVista({ area, titulo: areas[area].titulo })}
          >
            <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
            Ver en el sitio
          </button>
          {editable && (
            <button
              className="boton boton--primario"
              onClick={() => setEditando(vacio())}
            >
              <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
              Nuevo proyecto
            </button>
          )}
        </>
      }
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

      <div className="filtros">
        <div className="filtros__chips">
          {claves.map((clave) => (
            <button
              key={clave}
              className={`filtro ${area === clave ? "filtro--activo" : ""}`}
              onClick={() => setArea(clave)}
            >
              {areas[clave].titulo} ({conProyectos[clave].proyectos.length})
            </button>
          ))}
        </div>
      </div>

      <div className="tabla-scroll">
        <table className="tabla tabla--panel">
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>Año</th>
              <th>Alumnos</th>
              <th>Lenguajes</th>
              <th>Repo</th>
              <th>Documentos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((proyecto) => (
              <tr key={proyecto.id}>
                <td data-label="Proyecto">
                  <strong>{proyecto.titulo}</strong>
                </td>
                <td data-label="Año">{proyecto.anio || "—"}</td>
                <td data-label="Alumnos">{proyecto.equipo?.length || 0}</td>
                <td data-label="Lenguajes">{proyecto.stack?.length || 0}</td>
                <td data-label="Repo">
                  {esLinkValido(proyecto.repo) ? (
                    <a
                      className="enlace"
                      href={proyecto.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td data-label="Documentos">{proyecto.docs?.length || 0}</td>
                <td>
                  <div className="acciones-fila">
                    <button
                      className="boton boton--fino"
                      onClick={() =>
                        setVista({
                          area,
                          titulo: proyecto.titulo,
                          proyecto: proyecto.id,
                        })
                      }
                    >
                      <Icon icon="ph:eye" width={15} height={15} aria-hidden="true" />
                      Previsualizar
                    </button>
                    {editable && (
                      <>
                        <button
                          className="boton boton--fino"
                          onClick={() =>
                            setEditando({
                              ...vacio(),
                              ...proyecto,
                              docs: proyecto.docs || [],
                            })
                          }
                        >
                          Editar
                        </button>
                        <button
                          className="boton boton--fino boton--peligro"
                          onClick={() => eliminar(proyecto)}
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length === 0 && (
        <p className="vacio">
          No hay proyectos cargados en {areas[area].titulo}.
        </p>
      )}

      {editable && (
        <p className="bloqueado">
          <Icon icon="ph:info" width={16} height={16} aria-hidden="true" />
          Los cambios se guardan en el servidor de la escuela.
          <button
            className="enlace"
            onClick={() => {
              if (!window.confirm("Se reemplazan los proyectos de las tres orientaciones por los originales, en el sitio. ¿Seguir?")) return;
              restaurarProyectos();
              setAviso("Proyectos restaurados a los originales.");
            }}
          >
            Restaurar los proyectos originales
          </button>
        </p>
      )}

      {vista && (
        <VistaPrevia
          chip={`VISTA PREVIA · ${areas[vista.area].titulo}`}
          titulo={vista.titulo}
          url={`/proyectos/${vista.area}${vista.proyecto ? `?preview=${vista.proyecto}` : ""}`}
          cerrar={() => setVista(null)}
          acciones={
            editable && vista.proyecto ? (
              <button
                className="boton boton--primario"
                onClick={() => {
                  const proyecto = lista.find((p) => p.id === vista.proyecto);
                  setVista(null);
                  setEditando({
                    ...vacio(),
                    ...proyecto,
                    docs: proyecto.docs || [],
                  });
                }}
              >
                <Icon icon="ph:pencil-simple" width={16} height={16} aria-hidden="true" />
                Editar este proyecto
              </button>
            ) : null
          }
        />
      )}

      {editando && (
        <div className="modal" role="dialog" aria-modal="true">
          <form className="modal__caja" onSubmit={guardar}>
            <div className="modal__barra">
              <div>
                <p className="chip">{areas[area].titulo}</p>
                <h2 className="modal__titulo">
                  {editando.titulo || "Nuevo proyecto"}
                </h2>
              </div>
              <button
                type="button"
                className="cajon__cerrar"
                aria-label="Cerrar"
                onClick={() => {
                  setEditando(null);
                  setError("");
                }}
              >
                <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
              </button>
            </div>

            <div className="modal__cuerpo">
              {error && <p className="selector__error">{error}</p>}
              <div className="formulario formulario--panel">
                <label className="campo">
                  <span>Nombre del proyecto</span>
                  <input
                    required
                    value={editando.titulo}
                    onChange={cambiar("titulo")}
                  />
                </label>
                <label className="campo">
                  <span>Año o instancia</span>
                  <input
                    placeholder="7° año · Prácticas profesionalizantes"
                    value={editando.anio}
                    onChange={cambiar("anio")}
                  />
                </label>
                <label className="campo campo--ancho">
                  <span>Descripción</span>
                  <textarea
                    required
                    rows={3}
                    placeholder="De qué se trata el proyecto, en dos o tres líneas."
                    value={editando.resumen}
                    onChange={cambiar("resumen")}
                  />
                </label>
                <label className="campo campo--ancho">
                  <span>Repositorio (URL)</span>
                  <input
                    type="url"
                    placeholder="https://github.com/usuario/proyecto"
                    value={editando.repo}
                    onChange={cambiar("repo")}
                  />
                </label>
                <label className="campo">
                  <span>Alumnos (uno por línea)</span>
                  <textarea
                    rows={5}
                    value={aTexto(editando.equipo)}
                    onChange={(e) =>
                      setEditando((previo) => ({
                        ...previo,
                        equipo: aLista(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="campo">
                  <span>Lenguajes y herramientas (uno por línea)</span>
                  <textarea
                    rows={5}
                    value={aTexto(editando.stack)}
                    onChange={(e) =>
                      setEditando((previo) => ({
                        ...previo,
                        stack: aLista(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="campo campo--ancho">
                  <span>Qué se aprende (uno por línea)</span>
                  <textarea
                    rows={4}
                    value={aTexto(editando.aprendizajes)}
                    onChange={(e) =>
                      setEditando((previo) => ({
                        ...previo,
                        aprendizajes: aLista(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              <div>
                <h3 className="bloque__titulo">Documentos descargables</h3>
                {editando.docs.map((doc, indice) => (
                  <div className="doc-fila" key={indice}>
                    <label className="campo">
                      <span>Nombre</span>
                      <input
                        value={doc.nombre || ""}
                        onChange={cambiarDoc(indice, "nombre")}
                      />
                    </label>
                    <label className="campo">
                      <span>Ruta o URL</span>
                      <input
                        placeholder="/docs/informe.pdf"
                        value={doc.archivo || ""}
                        onChange={cambiarDoc(indice, "archivo")}
                      />
                    </label>
                    <label className="campo campo--chico">
                      <span>Páginas</span>
                      <input
                        inputMode="numeric"
                        value={doc.paginas || ""}
                        onChange={cambiarDoc(indice, "paginas")}
                      />
                    </label>
                    <label className="campo campo--chico">
                      <span>Peso</span>
                      <input
                        placeholder="1,8 MB"
                        value={doc.peso || ""}
                        onChange={cambiarDoc(indice, "peso")}
                      />
                    </label>
                    <div className="doc-fila__acciones">
                      <label className="boton boton--fino boton--archivo">
                        <Icon
                          icon="ph:paperclip"
                          width={15}
                          height={15}
                          aria-hidden="true"
                        />
                        Elegir
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={elegirArchivo(indice)}
                        />
                      </label>
                      <button
                        type="button"
                        className="boton boton--fino boton--peligro"
                        onClick={() =>
                          setEditando((previo) => ({
                            ...previo,
                            docs: previo.docs.filter((_, i) => i !== indice),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="boton"
                  onClick={() =>
                    setEditando((previo) => ({
                      ...previo,
                      docs: [...previo.docs, { nombre: "", archivo: "" }],
                    }))
                  }
                >
                  <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
                  Agregar documento
                </button>

                <p className="bloqueado">
                  <Icon icon="ph:info" width={16} height={16} aria-hidden="true" />
                  “Elegir” completa nombre y peso; el archivo lo tiene que subir
                  el backend a /docs.
                </p>
              </div>
            </div>

            <div className="modal__pie">
              <button className="boton boton--primario" type="submit">
                <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
                Guardar y publicar
              </button>
              <button
                type="button"
                className="boton"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
