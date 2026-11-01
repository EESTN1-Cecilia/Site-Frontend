import { Icon } from "@iconify/react";
import { useAsignaciones, vigentes } from "../../asignaciones.js";
import { diaDe, estadoEspacio, fechaYHoraLarga, useReloj } from "../../horario.js";
import logo from "../../assets/images/logo-tecnica1.jpg";

/* Encabezado bordó del Tablero de Jefatura: identifica la escuela y el área,
   muestra la fecha y la hora de este dispositivo y resume la ocupación de
   las aulas en este momento. Los accesos a cada sección están en el menú de
   la izquierda: acá no se repiten.
   Colores de la paleta del logo (app.css): bordó oscuro, rojo institucional
   y los rojos claros de acento. */

/* "general" es Jefatura de Área sin un departamento: no lleva sufijo. */
const AREAS = { matematica: "Matemática", lengua: "Lengua", general: "" };
const nombreArea = (area) =>
  area in AREAS ? AREAS[area] : area ? area.charAt(0).toUpperCase() + area.slice(1) : "";

export default function PanelJefatura({ usuario }) {
  const { cargado, datos } = useAsignaciones();
  const fecha = useReloj();
  const hoy = diaDe(fecha);
  const area = nombreArea(usuario?.area);

  /* Ocupación de este momento (hora del dispositivo), con el mismo cálculo
     que el plano: sólo aulas habilitadas (los espacios comunes no cuentan). */
  const estados = datos.salones
    .filter((s) => s.habilitado && s.clasificacion !== "ESPACIO_COMUN")
    .map((s) => estadoEspacio(vigentes(datos.asignaciones).filter((a) => a.salon_id === s.id), fecha).estado);
  const cuantos = (estado) => (hoy ? estados.filter((e) => e === estado).length : "—");
  const deHoy = hoy ? vigentes(datos.asignaciones).filter((a) => a.dia === hoy && a.estado === "activa") : [];

  const numeros = [
    ["Aulas ocupadas ahora", cuantos("ocupado"), "ocupado"],
    ["Por finalizar", cuantos("por-finalizar"), "por-finalizar"],
    ["Aulas libres ahora", cuantos("libre"), "libre"],
    ["Clases hoy", hoy ? deHoy.length : "—"],
  ];

  return (
    <section className="institucional" aria-labelledby="institucional-titulo">
      <div className="institucional__cabecera">
        <div className="institucional__identidad">
          <img
            className="institucional__logo"
            src={logo}
            alt="Logo de la E.E.S. Técnica N° 1, Esteban Echeverría"
            width="200"
            height="200"
          />
          <div>
            <p className="institucional__escuela">E.E.S. Técnica N° 1 · Cecilia Berdichevsky</p>
            <h1 className="institucional__titulo" id="institucional-titulo">
              Jefatura de Área{area && <span> · {area}</span>}
            </h1>
            <p className="institucional__lugar">{usuario?.nombre ? `${usuario.nombre} · ` : ""}Esteban Echeverría</p>
          </div>
        </div>
        {/* Hora de este dispositivo: se actualiza sola cada minuto. */}
        <p className="institucional__reloj">
          <Icon icon="ph:clock" width={18} height={18} aria-hidden="true" />
          <time dateTime={fecha.toISOString()}>{fechaYHoraLarga(fecha)}</time>
        </p>
      </div>

      <dl className="institucional__numeros">
        {numeros.map(([etiqueta, valor, estado]) => (
          <div className={`institucional__numero ${estado ? `institucional__numero--${estado}` : ""}`} key={etiqueta}>
            <dt>{etiqueta}</dt>
            <dd>{cargado ? valor : "…"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
