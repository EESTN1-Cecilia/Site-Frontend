import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import {
  TOPE_INASISTENCIAS,
  alumnos,
  asistenciaMensual,
  grillaInicial,
  notificaciones,
  planillas,
} from "../../panelData.js";

/* Materias agrupadas por estado, para el gráfico de cursada. */
const porEstado = alumnos
  .flatMap((alumno) => alumno.materias)
  .reduce((acc, [, estado]) => {
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});

const totalMaterias = Object.values(porEstado).reduce((a, b) => a + b, 0);

const kpis = [
  ["ph:student", "Alumnos activos", alumnos.length],
  [
    "ph:warning-circle",
    "Con inasistencias sobre el tope",
    alumnos.filter((a) => a.inasistencias > TOPE_INASISTENCIAS).length,
  ],
  [
    "ph:arrows-clockwise",
    "Materias en intensificación",
    alumnos.reduce((total, a) => total + a.intensifica.length, 0),
  ],
  [
    "ph:clipboard-text",
    "Planillas pendientes",
    planillas.filter((p) => p.estado !== "Entregada").length,
  ],
];

export default function Tablero({ ruta }) {
  const librados = grillaInicial.filter((clase) => clase.ausente);

  return (
    <Layout
      ruta={ruta}
      chip="RESUMEN"
      titulo="Tablero de gestión"
      texto="Estado general de la escuela: asistencia, cursada y avisos del día."
    >
      <div className="kpis">
        {kpis.map(([icono, etiqueta, valor]) => (
          <article className="kpi" key={etiqueta}>
            <span className="kpi__icono">
              <Icon icon={icono} width={22} height={22} aria-hidden="true" />
            </span>
            <p className="kpi__valor">{valor}</p>
            <p className="kpi__etiqueta">{etiqueta}</p>
          </article>
        ))}
      </div>

      <div className="panel__cols">
        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Asistencia por mes</h2>
          <p className="tarjeta__bajada">
            Porcentaje de presentes sobre la matrícula total.
          </p>
          <div className="barras">
            {asistenciaMensual.map(([mes, valor]) => (
              <div className="barra" key={mes}>
                <div className="barra__pista">
                  <div className="barra__valor" style={{ height: `${valor}%` }}>
                    <span>{valor}%</span>
                  </div>
                </div>
                <span className="barra__etiqueta">{mes.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Materias en curso</h2>
          <p className="tarjeta__bajada">
            {totalMaterias} espacios curriculares registrados.
          </p>
          <div className="barras-h">
            {Object.entries(porEstado).map(([estado, cantidad]) => (
              <div className="barra-h" key={estado}>
                <span className="barra-h__etiqueta">{estado}</span>
                <div className="barra-h__pista">
                  <div
                    className={`barra-h__valor barra-h__valor--${estado.toLowerCase()}`}
                    style={{ width: `${(cantidad / totalMaterias) * 100}%` }}
                  />
                </div>
                <span className="barra-h__numero">{cantidad}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Avisos</h2>
        <p className="tarjeta__bajada">
          Reemplazan las cadenas de WhatsApp: todo queda registrado acá.
        </p>
        <ul className="avisos">
          {notificaciones.map((aviso) => (
            <li className={`avisos__item avisos__item--${aviso.tipo}`} key={aviso.id}>
              <Icon icon={aviso.icono} width={20} height={20} aria-hidden="true" />
              <div>
                <p className="avisos__titulo">{aviso.titulo}</p>
                <p className="avisos__detalle">{aviso.detalle}</p>
              </div>
              <span className="avisos__fecha">{aviso.fecha}</span>
            </li>
          ))}
        </ul>
      </section>

      {librados.length > 0 && (
        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Aulas libres ahora</h2>
          <div className="etiquetas">
            {librados.map((clase) => (
              <span className="etiqueta etiqueta--libre" key={clase.id}>
                {clase.aula} · {clase.curso} · {clase.dia} {clase.hora}
              </span>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
