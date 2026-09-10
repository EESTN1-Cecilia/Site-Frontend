import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { etiquetasPermisos, rolesPermisos } from "../../panelData.js";
import { quitarPublicacion, usePublicaciones } from "../../publicaciones.js";
import { ir } from "../../router.js";
import VistaPrevia from "../../components/VistaPrevia.jsx";

export default function Direccion({ ruta }) {
  const [permisos, setPermisos] = useState(rolesPermisos);
  const pendientes = usePublicaciones();
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState("");

  const alternar = (rol, clave) =>
    setPermisos((previo) =>
      previo.map((fila) =>
        fila.rol === rol
          ? { ...fila, permisos: { ...fila.permisos, [clave]: !fila.permisos[clave] } }
          : fila,
      ),
    );

  const resolver = (id, accion) => {
    const publicacion = pendientes.find((p) => p.id === id);
    quitarPublicacion(id);
    setVista(null);
    setAviso(`“${publicacion.titulo}” ${accion}.`);
  };

  return (
    <Layout
      ruta={ruta}
      chip="DIRECCIÓN Y VICEDIRECCIÓN"
      titulo="Permisos y publicación"
      texto="Quién puede editar qué, y qué sale publicado en el sitio. Nada se publica sin visto de dirección."
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

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Permisos por rol</h2>
        <p className="tarjeta__bajada">
          Tocá una celda para dar o quitar acceso. El cambio se aplica al
          instante.
        </p>
        <div className="tabla-scroll">
          <table className="tabla tabla--panel">
            <thead>
              <tr>
                <th>Rol</th>
                {etiquetasPermisos.map(([clave, etiqueta]) => (
                  <th key={clave}>{etiqueta}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permisos.map((fila) => (
                <tr key={fila.rol}>
                  <td data-label="Rol">
                    <strong>{fila.rol}</strong>
                  </td>
                  {etiquetasPermisos.map(([clave, etiqueta]) => (
                    <td data-label={etiqueta} key={clave}>
                      <button
                        className={`interruptor ${
                          fila.permisos[clave] ? "interruptor--on" : ""
                        }`}
                        aria-pressed={fila.permisos[clave]}
                        aria-label={`${etiqueta} para ${fila.rol}`}
                        onClick={() => alternar(fila.rol, clave)}
                      >
                        <span />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Publicaciones esperando aprobación</h2>
        <p className="tarjeta__bajada">
          Previsualizá cómo queda en el sitio antes de publicarlo.
        </p>
        {pendientes.length ? (
          <ul className="reservas">
            {pendientes.map((publicacion) => (
              <li className="reserva" key={publicacion.id}>
                <div>
                  <p className="reserva__titulo">{publicacion.titulo}</p>
                  <p className="reserva__detalle">
                    {publicacion.seccion} · {publicacion.autor} ·{" "}
                    {publicacion.fecha}
                  </p>
                </div>
                <div className="acciones-fila">
                  <button
                    className="boton boton--fino"
                    onClick={() => setVista(publicacion)}
                  >
                    <Icon icon="ph:eye" width={15} height={15} aria-hidden="true" />
                    Previsualizar
                  </button>
                  <button
                    className="boton boton--fino"
                    onClick={() => ir("/panel/publicaciones")}
                  >
                    <Icon
                      icon="ph:pencil-simple"
                      width={15}
                      height={15}
                      aria-hidden="true"
                    />
                    Editar
                  </button>
                  <button
                    className="boton boton--fino boton--primario"
                    onClick={() => resolver(publicacion.id, "fue publicada")}
                  >
                    Aprobar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nota-interna">No hay publicaciones pendientes.</p>
        )}
      </section>

      {vista && (
        <VistaPrevia
          chip={`VISTA PREVIA · ${vista.seccion}`}
          titulo={vista.titulo}
          url={`${vista.ruta}?preview=${vista.id}`}
          cerrar={() => setVista(null)}
          acciones={
            <>
              <button
                className="boton boton--primario"
                onClick={() => resolver(vista.id, "fue publicada")}
              >
                <Icon icon="ph:check" width={16} height={16} aria-hidden="true" />
                Aprobar y publicar
              </button>
              <button
                className="boton boton--peligro"
                onClick={() => resolver(vista.id, "volvió al autor con cambios")}
              >
                Devolver con cambios
              </button>
            </>
          }
        />
      )}
    </Layout>
  );
}
