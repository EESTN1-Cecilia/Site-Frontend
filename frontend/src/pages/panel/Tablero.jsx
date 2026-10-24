import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { dias, inventarioInicial, notificaciones } from "../../panelData.js";
import { useGrillas } from "../../grillas.js";
import { alternarCancelado, mismoSalon, renombrarSalon, usePlano } from "../../plano.js";
import Editable from "../../components/Editable.jsx";

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

/* ---------- Plano: qué profesor está en cada salón, según la grilla ---------- */
function Plano() {
  const pisos = usePlano();
  const grillas = useGrillas();
  const hoy = dias[new Date().getDay() - 1] ?? dias[0];
  const [pisoId, setPisoId] = useState(pisos[0].id);
  const [grillaId, setGrillaId] = useState(grillas[0].id);
  const [dia, setDia] = useState(hoy);
  const grilla = grillas.find((g) => g.id === grillaId) ?? grillas[0];
  const [horaId, setHoraId] = useState(grilla.horas[0]?.id ?? "");
  const hora = grilla.horas.some((h) => h.id === horaId) ? horaId : grilla.horas[0]?.id;
  const piso = pisos.find((p) => p.id === pisoId) ?? pisos[0];

  const enCurso = grilla.clases.filter((c) => c.dia === dia && c.hora === hora);

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Plano del colegio</h2>
      <p className="tarjeta__bajada">
        Quién está en cada salón, según la grilla de Espacios y horarios. Hacé clic en el
        nombre de un salón para cambiarlo, o en el ícono de al lado para cancelarlo.
      </p>

      <div className="filtros">
        <div className="filtros__chips">
          {pisos.map((p) => (
            <button
              key={p.id}
              className={`filtro ${piso.id === p.id ? "filtro--activo" : ""}`}
              onClick={() => setPisoId(p.id)}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        {[
          ["Grilla", grillaId, setGrillaId, grillas.map((g) => [g.id, g.nombre])],
          ["Día", dia, setDia, dias.map((d) => [d, d])],
          ["Horario", hora, setHoraId, grilla.horas.map((h) => [h.id, h.nombre])],
        ].map(([etiqueta, valor, cambiar, opciones]) => (
          <label className="campo campo--select" key={etiqueta}>
            <span>{etiqueta}</span>
            <select value={valor} onChange={(e) => cambiar(e.target.value)}>
              {opciones.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="plano" style={{ aspectRatio: piso.proporcion }}>
        <img className="plano__dibujo" src={piso.imagen} alt={`Plano de ${piso.nombre.toLowerCase()}`} />
        {piso.salones.map((salon) => {
          const clase = enCurso.find((c) => mismoSalon(c.aula, salon.nombre));
          const ocupado = clase && !clase.ausente;
          return (
            <div
              key={salon.id}
              className={`plano__salon ${salon.chico ? "plano__salon--chico" : ""} ${
                ocupado ? "plano__salon--ocupado" : ""
              } ${salon.cancelado ? "plano__salon--cancelado" : ""}`}
              style={{ left: `${salon.x}%`, top: `${salon.y}%` }}
            >
              <span className="plano__fila">
                <Editable
                  clase="plano__nombre"
                  detener
                  valor={salon.nombre}
                  alCambiar={(v) => renombrarSalon(salon.id, v || "Sin nombre")}
                />
                <button
                  className="plano__cancelar"
                  title={salon.cancelado ? "Volver a habilitar el salón" : "Cancelar el salón"}
                  aria-label={`${salon.cancelado ? "Habilitar" : "Cancelar"} ${salon.nombre}`}
                  onClick={() => alternarCancelado(salon.id)}
                >
                  <Icon
                    icon={salon.cancelado ? "ph:arrow-counter-clockwise" : "ph:prohibit"}
                    width={12}
                    height={12}
                    aria-hidden="true"
                  />
                </button>
              </span>
              {salon.cancelado ? (
                <span className="plano__profe plano__profe--aviso">
                  {clase ? "Cancelada: reubicar clase" : "Cancelada"}
                </span>
              ) : (
                <>
                  {ocupado && <span className="plano__profe">{clase.profesor}</span>}
                  {clase?.ausente && <span className="plano__profe">Libre: docente ausente</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Tablero({ ruta, usuario }) {
  const ahora = useAhora();
  const rol = usuario?.rol;
  const nombre = usuario?.nombre || "";

  return (
    <Layout
      ruta={ruta}
      chip="TABLERO"
      titulo={`Bienvenido, ${nombre}`}
      texto={fechaYHora(ahora)}
    >
      {rol === "server" ? (
        <TableroServer />
      ) : (
        (rol === "direccion" || rol === "jefatura") && <Plano />
      )}

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
    </Layout>
  );
}
