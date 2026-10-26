import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { inventarioInicial, notificaciones } from "../../panelData.js";
import PanelJefatura from "./PanelJefatura.jsx";
import PanelDireccion from "./PanelDireccion.jsx";
import PlanoSalones from "./PlanoSalones.jsx";

/* El panel no maneja datos de alumnos: ni números ni avisos sobre ellos. */
/* "Bienvenido, …" con la fecha y la hora, que se actualiza sola. */
function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(reloj);
  }, []);
  return ahora;
}

const fechaYHora = (fecha) =>
  fecha.toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ---------- Encargada de Server: material ---------- */
function TableroServer() {
  const porCategoria = Object.entries(
    inventarioInicial.reduce((acc, { categoria, cantidad, disponibles }) => {
      const [total, prestadas] = acc[categoria] || [0, 0];
      acc[categoria] = [total + cantidad, prestadas + cantidad - disponibles];
      return acc;
    }, {}),
  );
  const total = porCategoria.reduce((suma, [, [t]]) => suma + t, 0);
  const prestadas = porCategoria.reduce((suma, [, [, p]]) => suma + p, 0);

  return (
    <>
      <div className="kpis">
        {[
          ["ph:desktop-tower", "Material en total", total],
          ["ph:hand-arrow-up", "Prestado ahora", prestadas],
        ].map(([icono, etiqueta, valor]) => (
          <article className="kpi" key={etiqueta}>
            <span className="kpi__icono">
              <Icon icon={icono} width={22} height={22} aria-hidden="true" />
            </span>
            <p className="kpi__valor">{valor}</p>
            <p className="kpi__etiqueta">{etiqueta}</p>
          </article>
        ))}
      </div>

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Por sector del inventario</h2>
        <p className="tarjeta__bajada">Prestados sobre el total de cada tipo de material.</p>
        <div className="barras-h">
          {porCategoria.map(([categoria, [t, p]]) => (
            <div className="barra-h" key={categoria}>
              <span className="barra-h__etiqueta">{categoria}</span>
              <div className="barra-h__pista">
                <div className="barra-h__valor" style={{ width: `${(p / t) * 100}%` }} />
              </div>
              <span className="barra-h__numero">
                {p}/{t}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Tablero({ ruta, params, usuario }) {
  const ahora = useAhora();
  const rol = usuario?.rol;
  const nombre = usuario?.nombre || "";

  /* Jefatura y Dirección tienen su encabezado propio (escuela, cargo, fecha
     y hora): no se repite el saludo ni la fecha arriba. */
  const encabezado =
    rol === "jefatura" || rol === "direccion" ? {} : { chip: "TABLERO", titulo: `Bienvenido, ${nombre}`, texto: fechaYHora(ahora) };

  return (
    <Layout ruta={ruta} {...encabezado}>
      {rol === "jefatura" && <PanelJefatura usuario={usuario} />}
      {rol === "direccion" && <PanelDireccion usuario={usuario} />}

      {rol === "server" ? (
        <TableroServer />
      ) : (
        (rol === "direccion" || rol === "jefatura") && <PlanoSalones editable params={params} />
      )}

      {/* Avisos: lista desplegable; cada aviso muestra el título y la fecha,
          y el detalle se abre con un clic. */}
      <details className="tarjeta registro" open>
        <summary className="registro__resumen">
          <span>
            <span className="tarjeta__titulo">Avisos</span>
            <span className="tarjeta__bajada">Reemplazan las cadenas de WhatsApp: todo queda registrado acá.</span>
          </span>
          <span className="registro__cantidad">{notificaciones.length} avisos</span>
          <Icon className="registro__flecha" icon="ph:caret-down" width={18} height={18} aria-hidden="true" />
        </summary>
        <ul className="avisos">
          {notificaciones.map((aviso) => (
            <li key={aviso.id}>
              <details className={`avisos__item avisos__item--${aviso.tipo} avisos__item--desplegable`}>
                <summary className="avisos__resumen">
                  <Icon icon={aviso.icono} width={20} height={20} aria-hidden="true" />
                  <span className="avisos__titulo">{aviso.titulo}</span>
                  <span className="avisos__fecha">{aviso.fecha}</span>
                  <Icon className="avisos__flecha" icon="ph:caret-down" width={16} height={16} aria-hidden="true" />
                </summary>
                <p className="avisos__detalle">{aviso.detalle}</p>
              </details>
            </li>
          ))}
        </ul>
      </details>
    </Layout>
  );
}
