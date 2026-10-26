import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ir } from "../../router.js";
import { tokenActual } from "../../conexion.js";
import { obtenerResumenDireccion } from "../../services/api.js";
import { explicar, useAsignaciones, vigentes } from "../../asignaciones.js";
import { diaDe, estadoEspacio, fechaYHoraLarga, useReloj } from "../../horario.js";
import logo from "../../assets/images/logo-tecnica1.jpg";

/* Tablero de Dirección: lo primero que ve el director al entrar.

   - Cabecera institucional con la cadena de conducción:
     Dirección (1°) → Jefatura de Área (2°) → EMATP (3°).
   - La escuela ahora (ocupación de las aulas con la hora de este
     dispositivo, igual que el plano) y la semana (ausencias, cancelaciones,
     cambios de aula, cartelera).
   - Lo que espera una decisión de Dirección.
   - Los equipos, nivel por nivel, con lo que hizo cada persona en la semana,
     y la actividad reciente de todos.
   Se vuelve a pedir cada minuto. */

const CADA = 60 * 1000;
const ICONO_NIVEL = { 1: "ph:user", 2: "ph:grid-four", 3: "ph:desktop-tower" };
const ROL = { direccion: "Dirección", jefatura_area: "Jefatura de Área", server: "EMATP", sistema: "Sistema" };
const ICONO_ACTIVIDAD = {
  "clase-alta": "ph:plus-circle",
  "clase-cambio": "ph:pencil-simple",
  "clase-baja": "ph:trash",
  "clase-intercambio": "ph:arrows-left-right",
  cartelera: "ph:television-simple",
  "publicacion-pendiente": "ph:paper-plane-tilt",
  "publicacion-publicada": "ph:megaphone",
  "publicacion-devuelta": "ph:arrow-u-up-left",
  archivo: "ph:file-arrow-up",
};
const ICONO_PENDIENTE = {
  publicaciones: "ph:megaphone",
  "sin-espacio": "ph:map-pin-line",
  revisar: "ph:magnifying-glass",
  semana: "ph:calendar-x",
  pantallas: "ph:television-simple",
};

/* «hace 5 min», «hace 3 h», «ayer», o la fecha. Las fechas del backend son UTC. */
function hace(fechaSql, ahora) {
  if (!fechaSql) return "sin actividad";
  const f = new Date(`${fechaSql.replace(" ", "T")}Z`);
  const minutos = Math.round((ahora - f) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 24 * 60) return `hace ${Math.round(minutos / 60)} h`;
  if (minutos < 48 * 60) return "ayer";
  return f.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
function queHizo(a) {
  const partes = [
    a.clases && plural(a.clases, "cambio en clases", "cambios en clases"),
    a.publicaciones && plural(a.publicaciones, "novedad", "novedades"),
    a.cartelera && plural(a.cartelera, "imagen en cartelera", "imágenes en cartelera"),
    a.archivos && plural(a.archivos, "archivo subido", "archivos subidos"),
    a.sitio && plural(a.sitio, "cambio en el sitio", "cambios en el sitio"),
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "Sin movimientos esta semana";
}

export default function PanelDireccion({ usuario }) {
  const { cargado, datos } = useAsignaciones();
  const fecha = useReloj();
  const hoy = diaDe(fecha);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    const pedir = () =>
      obtenerResumenDireccion(tokenActual())
        .then((r) => vivo && (setResumen(r), setError("")))
        .catch((e) => vivo && setError(explicar(e)));
    pedir();
    const id = setInterval(pedir, CADA);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  /* La escuela ahora: el mismo cálculo que el plano (aulas habilitadas). */
  const clases = vigentes(datos.asignaciones);
  const estados = datos.salones
    .filter((s) => s.habilitado && s.clasificacion !== "ESPACIO_COMUN")
    .map((s) => estadoEspacio(clases.filter((a) => a.salon_id === s.id), fecha).estado);
  const ocupadas = hoy ? estados.filter((e) => e === "ocupado" || e === "por-finalizar").length : null;
  const deHoy = hoy ? clases.filter((a) => a.dia === hoy && a.estado === "activa").length : null;
  const e = resumen?.escuela;
  const numeros = [
    ["ph:door-open", "Aulas en uso ahora", ocupadas === null ? "—" : `${ocupadas}/${estados.length}`, cargado],
    ["ph:calendar-check", "Clases hoy", deHoy ?? "—", cargado],
    ["ph:user-minus", "Ausencias esta semana", e?.ausentesSemana, !!e],
    ["ph:prohibit", "Clases canceladas", e?.canceladasSemana, !!e],
    ["ph:arrows-left-right", "Cambios de aula", e?.cambiosAulaSemana, !!e],
    ["ph:television-simple", "Imágenes en cartelera", resumen ? `${resumen.cartelera.activas}` : undefined, !!resumen],
  ];

  const personasActivas = (n) => n.personas.filter((p) => p.activo).length;

  return (
    <>
      <section className="direccion" aria-labelledby="direccion-titulo">
        <div className="direccion__cabecera">
          <div className="direccion__identidad">
            <img className="direccion__escudo" src={logo} alt="Logo de la E.E.S. Técnica N° 1" width="200" height="200" />
            <div>
              <p className="direccion__escuela">E.E.S. Técnica N° 1 · Cecilia Berdichevski</p>
              <h1 className="direccion__titulo" id="direccion-titulo">
                Dirección
              </h1>
              <p className="direccion__cargo">
                Conducción institucional · {usuario?.nombre || usuario?.usuario} · Esteban Echeverría
              </p>
            </div>
          </div>
          <p className="direccion__reloj">
            <Icon icon="ph:clock" width={18} height={18} aria-hidden="true" />
            <time dateTime={fecha.toISOString()}>{fechaYHoraLarga(fecha)}</time>
          </p>
        </div>

        {/* La cadena de conducción: quién está debajo de quién. */}
        <ol className="direccion__cadena" aria-label="Orden de conducción">
          {(resumen?.equipo ?? [
            { nivel: 1, nombre: "Dirección", personas: [] },
            { nivel: 2, nombre: "Jefatura de Área", personas: [] },
            { nivel: 3, nombre: "EMATP", personas: [] },
          ]).map((n) => (
            <li key={n.nivel} className={`direccion__eslabon direccion__eslabon--${n.nivel}`}>
              <span className="direccion__orden">{n.nivel}°</span>
              <Icon icon={ICONO_NIVEL[n.nivel]} width={18} height={18} aria-hidden="true" />
              <span className="direccion__nivel">{n.nombre}</span>
              {resumen && <span className="direccion__cuentas">{plural(personasActivas(n), "cuenta", "cuentas")}</span>}
            </li>
          ))}
        </ol>

        <dl className="direccion__numeros">
          {numeros.map(([icono, etiqueta, valor, listo]) => (
            <div className="direccion__numero" key={etiqueta}>
              <dt>
                <Icon icon={icono} width={16} height={16} aria-hidden="true" /> {etiqueta}
              </dt>
              <dd>{listo ? valor ?? "—" : "…"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {error && <p className="flash flash--error">{error}</p>}

      <div className="direccion__grilla">
        <section className="tarjeta direccion__pendientes" aria-labelledby="pendientes-titulo">
          <h2 className="tarjeta__titulo" id="pendientes-titulo">
            <Icon icon="ph:seal-check" width={22} height={22} aria-hidden="true" /> Para decidir
          </h2>
          <p className="tarjeta__bajada">Lo que espera a Dirección o conviene revisar.</p>
          {!resumen ? (
            <p className="nota-interna">Cargando…</p>
          ) : resumen.pendientes.length ? (
            <ul className="direccion__lista">
              {resumen.pendientes.map((p) => (
                <li key={p.tipo}>
                  <button className="direccion__pendiente" onClick={() => ir(p.ruta)}>
                    <Icon icon={ICONO_PENDIENTE[p.tipo] ?? "ph:circle"} width={20} height={20} aria-hidden="true" />
                    <span>{p.texto}</span>
                    {p.cantidad > 0 && <strong>{p.cantidad}</strong>}
                    <Icon icon="ph:caret-right" width={16} height={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="direccion__al-dia">
              <Icon icon="ph:check-circle" width={20} height={20} aria-hidden="true" /> Todo al día.
            </p>
          )}
          {e && (
            <p className="direccion__escuela-datos">
              {e.clases} clases en la grilla vigente ({e.compartidas} con aula compartida) · {e.docentes} docentes · {e.materias} materias ·{" "}
              {e.grupos} grupos · {resumen.cartelera.pantallas} {resumen.cartelera.pantallas === 1 ? "televisor" : "televisores"}
            </p>
          )}
        </section>

        <section className="tarjeta direccion__equipos" aria-labelledby="equipos-titulo">
          <h2 className="tarjeta__titulo" id="equipos-titulo">
            <Icon icon="ph:tree-structure" width={22} height={22} aria-hidden="true" /> Equipos
          </h2>
          <p className="tarjeta__bajada">Cada nivel y lo que hizo cada persona en los últimos {resumen?.dias ?? 7} días.</p>
          {resumen &&
            resumen.equipo.map((n) => (
              <div className={`direccion__nivel-equipo direccion__nivel-equipo--${n.nivel}`} key={n.nivel}>
                <p className="direccion__nivel-titulo">
                  <span className="direccion__orden">{n.nivel}°</span> {n.nombre}
                  <span className="direccion__nivel-cargo">{n.cargo}</span>
                </p>
                <ul className="direccion__personas">
                  {n.personas.map((p) => (
                    <li key={p.id} className={`direccion__persona ${p.activo ? "" : "direccion__persona--inactiva"}`}>
                      <span className="direccion__inicial" aria-hidden="true">{p.nombre.charAt(0).toUpperCase()}</span>
                      <div>
                        <p className="direccion__persona-nombre">
                          {p.nombre}
                          {!p.activo && <span className="direccion__baja">desactivada</span>}
                        </p>
                        <p className="direccion__persona-detalle">{p.activo ? queHizo(p.actividad) : `Usuario ${p.usuario}`}</p>
                      </div>
                      <span className="direccion__cuando">{p.activo ? hace(p.actividad.ultima, fecha) : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          <button className="boton boton--fino direccion__ir" onClick={() => ir("/panel/direccion")}>
            <Icon icon="ph:shield-check" width={15} height={15} aria-hidden="true" /> Cuentas y permisos
          </button>
        </section>
      </div>

      <details className="tarjeta registro direccion__actividad" open>
        <summary className="registro__resumen">
          <span>
            <span className="tarjeta__titulo">Actividad reciente</span>
            <span className="tarjeta__bajada">Lo último que hicieron todos los perfiles, más nuevo primero.</span>
          </span>
          {resumen && <span className="registro__cantidad">Últimos {resumen.recientes.length}</span>}
          <Icon className="registro__flecha" icon="ph:caret-down" width={18} height={18} aria-hidden="true" />
        </summary>
        {!resumen ? (
          <p className="nota-interna">Cargando…</p>
        ) : resumen.recientes.length ? (
          <ol className="direccion__linea">
            {resumen.recientes.map((r, i) => (
              <li key={`${r.fecha}-${i}`} className={`direccion__evento direccion__evento--${r.rol}`}>
                <span className="direccion__evento-icono">
                  <Icon icon={ICONO_ACTIVIDAD[r.tipo] ?? "ph:dot"} width={16} height={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="direccion__evento-detalle">{r.detalle}</p>
                  <p className="direccion__evento-quien">
                    {r.quien} <span className={`direccion__rol direccion__rol--${r.rol}`}>{ROL[r.rol] ?? r.rol}</span>
                  </p>
                </div>
                <span className="direccion__cuando">{hace(r.fecha, fecha)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="nota-interna">Sin movimientos en la semana.</p>
        )}
      </details>
    </>
  );
}
