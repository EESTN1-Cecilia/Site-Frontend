import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import {
  esLinkValido,
  guardarMesas,
  nuevaMesa,
  nuevaSubcarpeta,
  ORIENTACIONES,
  restaurarMesas,
  useMesas,
} from "../../mesas.js";
import { puedeEditar } from "../../sesion.js";

const columnas = [
  ["materia", "Materia", "text"],
  ["anio", "Año", "text"],
  ["orientacion", "Orientación", "select"],
  ["fecha", "Fecha", "date"],
  ["hora", "Hora", "time"],
  ["aula", "Aula", "text"],
  ["docente", "Docente", "text"],
  ["drive", "Link de Drive", "url"],
];

/* Un link cargado que no sea http(s) no se publica. */
const linkMalo = (url) => !!url?.trim() && !esLinkValido(url);

export default function Mesas({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const publicado = useMesas();
  const [borrador, setBorrador] = useState(publicado);
  const [vista, setVista] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const sucio = JSON.stringify(borrador) !== JSON.stringify(publicado);

  const cambiar = (id, campo, valor) =>
    setBorrador((previo) => ({
      ...previo,
      mesas: previo.mesas.map((m) =>
        m.id === id ? { ...m, [campo]: valor } : m,
      ),
    }));

  const cambiarSubcarpeta = (id, campo, valor) =>
    setBorrador((previo) => ({
      ...previo,
      subcarpetas: previo.subcarpetas.map((s) =>
        s.id === id ? { ...s, [campo]: valor } : s,
      ),
    }));

  const publicar = async () => {
    if (
      linkMalo(borrador.carpeta) ||
      borrador.subcarpetas.some((s) => linkMalo(s.link)) ||
      borrador.mesas.some((m) => linkMalo(m.drive))
    ) {
      setError(
        "Hay links que no empiezan con https://. Corregí los marcados en rojo antes de publicar.",
      );
      return;
    }
    const resultado = await guardarMesas(borrador);
    /* "Publicado" sólo si el servidor lo recibió. */
    if (!resultado.ok) {
      setAviso("");
      setError(`No se pudo publicar: ${resultado.motivo}.`);
      return;
    }
    setError("");
    setAviso("Cronograma publicado.");
  };

  return (
    <Layout
      ruta={ruta}
      chip="CONTENIDO DEL SITIO"
      titulo="Mesas de examen"
      texto="El cronograma de intensificación que ven los alumnos. Editá cualquier celda y el link de Drive de cada materia."
      acciones={
        <>
          <button className="boton" onClick={() => setVista(true)}>
            <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
            Ver en el sitio
          </button>
          {editable && (
            <>
              <button
                className="boton"
                disabled={!sucio}
                onClick={() => {
                  setBorrador(publicado);
                  setError("");
                }}
              >
                Descartar cambios
              </button>
              <button
                className="boton boton--primario"
                disabled={!sucio}
                onClick={publicar}
              >
                <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
                Publicar cronograma
              </button>
            </>
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

      {error && (
        <p className="flash">
          <Icon icon="ph:warning" width={18} height={18} aria-hidden="true" />
          {error}
        </p>
      )}

      {sucio && editable && (
        <p className="flash flash--info">
          <Icon icon="ph:pencil-simple" width={18} height={18} aria-hidden="true" />
          Hay cambios sin publicar. El sitio sigue mostrando el cronograma
          anterior.
        </p>
      )}

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Carpeta general de planes de trabajo</h2>
        <p className="tarjeta__bajada">
          Es el botón “Planes de trabajo en Drive” que aparece arriba de la
          tabla.
        </p>
        <label
          className={`campo campo--ancho carpeta ${
            linkMalo(borrador.carpeta) ? "campo--error" : ""
          }`}
        >
          <span>Link de la carpeta</span>
          <input
            type="url"
            disabled={!editable}
            placeholder="https://drive.google.com/…"
            value={borrador.carpeta}
            onChange={(e) =>
              setBorrador({ ...borrador, carpeta: e.target.value })
            }
          />
        </label>
      </section>

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Carpetas por subdivisión</h2>
        <p className="tarjeta__bajada">
          Los accesos que aparecen al lado del botón "Todos los trabajos".
        </p>
        <div className="tabla-scroll">
          <table className="tabla tabla--panel tabla-edit">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Link de Drive</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody>
              {borrador.subcarpetas.map((sub) => (
                <tr
                  key={sub.id}
                  className={linkMalo(sub.link) ? "tabla-edit__error" : ""}
                >
                  <td data-label="Nombre">
                    <input
                      disabled={!editable}
                      aria-label="Nombre de la subdivisión"
                      value={sub.nombre}
                      onChange={(e) => cambiarSubcarpeta(sub.id, "nombre", e.target.value)}
                    />
                  </td>
                  <td data-label="Link de Drive">
                    <input
                      type="url"
                      disabled={!editable}
                      aria-label={`Link de ${sub.nombre || "la subdivisión"}`}
                      placeholder="https://drive.google.com/…"
                      value={sub.link}
                      onChange={(e) => cambiarSubcarpeta(sub.id, "link", e.target.value)}
                    />
                  </td>
                  {editable && (
                    <td>
                      <button
                        className="tabla-edit__quitar"
                        aria-label={`Quitar ${sub.nombre || "subdivisión"}`}
                        onClick={() =>
                          setBorrador((previo) => ({
                            ...previo,
                            subcarpetas: previo.subcarpetas.filter((s) => s.id !== sub.id),
                          }))
                        }
                      >
                        <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {borrador.subcarpetas.length === 0 && (
          <p className="vacio">No hay subdivisiones cargadas.</p>
        )}

        {editable && (
          <button
            className="boton agregar-mesa"
            onClick={() =>
              setBorrador((previo) => ({
                ...previo,
                subcarpetas: [...previo.subcarpetas, nuevaSubcarpeta()],
              }))
            }
          >
            <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
            Agregar subdivisión
          </button>
        )}
      </section>

      <div className="tabla-scroll">
        <table className="tabla tabla--panel tabla-edit">
          <thead>
            <tr>
              {columnas.map(([campo, etiqueta]) => (
                <th key={campo}>{etiqueta}</th>
              ))}
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {borrador.mesas.map((mesa) => (
              <tr
                key={mesa.id}
                className={linkMalo(mesa.drive) ? "tabla-edit__error" : ""}
              >
                {columnas.map(([campo, etiqueta, tipo]) => (
                  <td key={campo} data-label={etiqueta}>
                    {tipo === "select" ? (
                      <select
                        disabled={!editable}
                        aria-label={`${etiqueta} de ${mesa.materia || "la mesa"}`}
                        value={mesa[campo]}
                        onChange={(e) => cambiar(mesa.id, campo, e.target.value)}
                      >
                        <option value="">Todas</option>
                        {ORIENTACIONES.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={tipo}
                        disabled={!editable}
                        aria-label={`${etiqueta} de ${mesa.materia || "la mesa"}`}
                        placeholder={tipo === "url" ? "https://drive.google.com/…" : ""}
                        value={mesa[campo]}
                        onChange={(e) => cambiar(mesa.id, campo, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                {editable && (
                  <td>
                    <button
                      className="tabla-edit__quitar"
                      aria-label={`Quitar ${mesa.materia || "mesa"}`}
                      onClick={() =>
                        setBorrador((previo) => ({
                          ...previo,
                          mesas: previo.mesas.filter((m) => m.id !== mesa.id),
                        }))
                      }
                    >
                      <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {borrador.mesas.length === 0 && (
        <p className="vacio">No hay mesas cargadas.</p>
      )}

      {editable && (
        <>
          <button
            className="boton agregar-mesa"
            onClick={() =>
              setBorrador((previo) => ({
                ...previo,
                mesas: [...previo.mesas, nuevaMesa()],
              }))
            }
          >
            <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
            Agregar mesa
          </button>

          <p className="bloqueado">
            <Icon icon="ph:info" width={16} height={16} aria-hidden="true" />
            Los cambios se guardan en el servidor de la escuela.
            <button
              className="enlace"
              onClick={() => {
                if (!window.confirm("Se reemplaza el cronograma del sitio por el original de ejemplo (fechas y docentes ficticios). ¿Seguir?")) return;
                setBorrador(restaurarMesas());
                setError("");
                setAviso("Cronograma restaurado al original.");
              }}
            >
              Restaurar el cronograma original
            </button>
          </p>
        </>
      )}

      {vista && (
        <VistaPrevia
          chip="VISTA PREVIA · INTENSIFICACIÓN"
          titulo="Cronograma de mesas"
          url="/previas"
          cerrar={() => setVista(false)}
        />
      )}
    </Layout>
  );
}
