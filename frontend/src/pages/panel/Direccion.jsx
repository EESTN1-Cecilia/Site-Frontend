import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { etiquetasPermisos, rolesPermisos } from "../../panelData.js";
import {
  aprobarPublicacion,
  devolverPublicacion,
  usePublicaciones,
} from "../../publicaciones.js";
import { ir } from "../../router.js";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import { guardarAjustes, useAjustes } from "../../ajustes.js";
import { accesos, edicionPaginas, nombrePerfil } from "../../sesion.js";
import { paginasEditables } from "./SitioPagina.jsx";

/* Los roles que entran al editor de páginas; Dirección ya edita todas. */
const editores = accesos["/panel/sitio/pagina"].filter((rol) => rol !== "direccion");

/* Tarjeta cerrada con un resumen; al abrirla muestra sus interruptores.
   opciones: [etiqueta, activo, alternar]. */
function Opciones({ chip, titulo, opciones }) {
  const activos = opciones.filter(([, activo]) => activo).length;

  return (
    <details className="permiso">
      <summary className="permiso__cabecera">
        <span className="permiso__chip">{chip}</span>
        <strong className="permiso__titulo">{titulo}</strong>
        <span className="permiso__resumen">
          {activos} de {opciones.length}
        </span>
        <Icon className="permiso__flecha" icon="ph:caret-down" width={16} height={16} aria-hidden="true" />
      </summary>
      <ul className="permiso__opciones">
        {opciones.map(([etiqueta, activo, alternar]) => (
          <li className="permiso__opcion" key={etiqueta}>
            <span>{etiqueta}</span>
            <button
              className={`interruptor ${activo ? "interruptor--on" : ""}`}
              aria-pressed={activo}
              aria-label={`${etiqueta} · ${titulo}`}
              onClick={alternar}
            >
              <span />
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function Direccion({ ruta }) {
  const reparto = useAjustes().edicionPaginas || edicionPaginas;
  const [permisos, setPermisos] = useState(rolesPermisos);
  const pendientes = usePublicaciones().filter((p) => p.estado === "pendiente");
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

  /* Se manda el reparto de las páginas editables y nada más: una página o un
     rol que no está en esta pantalla no viaja con la autoridad de Dirección.
     Una página sin reparto guardado toma el de por defecto. */
  const alternarPagina = (pagina, rol) => {
    const completo = Object.fromEntries(
      Object.keys(paginasEditables).map((p) => [p, reparto[p] ?? edicionPaginas[p] ?? []]),
    );
    const actuales = completo[pagina];
    completo[pagina] = actuales.includes(rol) ? actuales.filter((r) => r !== rol) : [...actuales, rol];
    guardarAjustes({ edicionPaginas: completo });
  };

  const resolver = (id, accion) => {
    const publicacion = pendientes.find((p) => p.id === id);
    (accion === "fue publicada" ? aprobarPublicacion : devolverPublicacion)(id);
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
        {/* Estos interruptores todavía no se guardan en ningún lado: decirlo
            evita que Dirección crea que sacó un acceso que sigue abierto. */}
        <p className="tarjeta__bajada">
          Vista de ejemplo: estos permisos todavía no se guardan ni cambian
          accesos reales. Lo que cada rol puede ver lo define el sistema; quién
          edita cada página se elige más abajo.
        </p>
        <div className="permisos">
          {permisos.map((fila) => (
            <Opciones
              key={fila.rol}
              chip="Rol"
              titulo={fila.rol}
              opciones={etiquetasPermisos.map(([clave, etiqueta]) => [
                etiqueta,
                fila.permisos[clave],
                () => alternar(fila.rol, clave),
              ])}
            />
          ))}
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Páginas del sitio que edita cada rol</h2>
        <p className="tarjeta__bajada">
          Abrí una página para elegir qué roles pueden editarla desde Sitio
          público. Dirección las edita todas.
        </p>
        <div className="permisos">
          {Object.entries(paginasEditables).map(([pagina, [nombre]]) => (
            <Opciones
              key={pagina}
              chip="Página"
              titulo={nombre}
              opciones={editores.map((rol) => [
                nombrePerfil(rol),
                (reparto[pagina] || []).includes(rol),
                () => alternarPagina(pagina, rol),
              ])}
            />
          ))}
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
