import { useEffect, useState } from "react";

/* Estado de ocupación de los espacios: el único lugar que lo calcula.
   Lo usan el plano, la grilla, el panel de Jefatura y la ventana de cada
   espacio, así todos muestran lo mismo.

   Se calcula con las asignaciones guardadas y la hora LOCAL de este
   dispositivo (el reloj del navegador). Si la computadora tiene mal la
   hora, los colores van a estar corridos: no es la hora institucional.
   No se guarda en ningún lado: cambia solo con el reloj.

   Estados de un espacio en un instante:
     libre          → ninguna clase activa en ese momento
     ocupado        → hay una clase activa y le faltan más de 10 minutos
     por-finalizar  → hay una clase activa en sus últimos 10 minutos
     sin-horario    → hay una clase hoy en ese módulo pero el módulo no tiene
                      hora de inicio y fin cargada (no se puede saber)
   Cada clase ocupa [inicio, fin): a las 09:20 en punto una clase de
   08:00 a 09:20 ya terminó, y una que empieza 09:20 ya empezó. */

export const MINUTOS_POR_FINALIZAR = 10;

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export const ESTADOS = {
  libre: { texto: "Libre", icono: "ph:check-circle" },
  ocupado: { texto: "Ocupado", icono: "ph:x-circle" },
  "por-finalizar": { texto: "Por finalizar", icono: "ph:hourglass-medium" },
  "sin-horario": { texto: "Sin horario cargado", icono: "ph:question" },
};

/* "08:30" → 510. null si no es una hora. */
export const aMinutos = (hhmm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const aHora = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/* Día de la semana de una fecha ("Lunes"…), o null el fin de semana. */
export const diaDe = (fecha) => DIAS[fecha.getDay() - 1] ?? null;

/* Minutos desde la medianoche, con segundos (09:09:59 → 549.98). */
export const minutosDe = (fecha) =>
  fecha.getHours() * 60 + fecha.getMinutes() + fecha.getSeconds() / 60;

/* "Sábado, 24 de octubre de 2026 · 23:30": fecha y hora del dispositivo
   para el encabezado del Tablero (24 h, como los horarios de las clases). */
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const formatoHora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const fechaYHoraLarga = (fecha) => {
  const dia = formatoFecha.format(fecha).replace(/,/g, "");
  const [nombre, ...resto] = dia.split(" ");
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}, ${resto.join(" ")} · ${formatoHora.format(fecha)}`;
};

/* Intervalo [inicio, fin) en minutos, o null si no tiene hora. */
export const intervalo = (a) => {
  const [i, f] = [aMinutos(a.inicio), aMinutos(a.fin)];
  return i !== null && f !== null && i < f ? [i, f] : null;
};

/* Mismo criterio que el backend (asignaciones.Controller.js): con hora, se
   superponen si cada una empieza antes de que termine la otra; sin hora, si
   son el mismo día y módulo. Las consecutivas no chocan. */
export function seSuperponen(a, b) {
  if (a.dia !== b.dia) return false;
  const [x, y] = [intervalo(a), intervalo(b)];
  if (x && y) return x[0] < y[1] && x[1] > y[0];
  return a.hora === b.hora;
}

/* Estado de UNA clase activa en un instante (minutos del día). */
export function estadoClase(clase, minutos, margen = MINUTOS_POR_FINALIZAR) {
  const tramo = intervalo(clase);
  if (!tramo) return null;
  const [inicio, fin] = tramo;
  if (minutos < inicio || minutos >= fin) return null;
  return minutos >= fin - margen ? "por-finalizar" : "ocupado";
}

/* Estado de un espacio en un instante, con la clase actual y la próxima.
   `clases`: las asignaciones de ese espacio (de cualquier día). */
export function estadoEspacio(clases, fecha, margen = MINUTOS_POR_FINALIZAR) {
  const dia = diaDe(fecha);
  const minutos = minutosDe(fecha);
  const deHoy = clases
    .filter((c) => c.dia === dia && c.estado === "activa")
    .sort((a, b) => (aMinutos(a.inicio) ?? 9999) - (aMinutos(b.inicio) ?? 9999));

  let actual = null;
  let estado = "libre";
  for (const c of deHoy) {
    const e = estadoClase(c, minutos, margen);
    // Si hay dos (no debería), manda la que todavía no está por terminar.
    if (e && (!actual || estado === "por-finalizar")) {
      actual = c;
      estado = e;
    }
  }
  const proxima = deHoy.find((c) => intervalo(c) && intervalo(c)[0] > minutos) ?? null;
  if (!actual && deHoy.some((c) => !intervalo(c))) estado = "sin-horario";
  return { estado, actual, proxima, deHoy };
}

/* Estado de un espacio en un día y módulo elegidos (vista planificada):
   ocupado si hay alguna clase activa que se superpone con ese momento. */
export function estadoEnMomento(clases, momento) {
  const actual = clases.find((c) => c.estado === "activa" && seSuperponen(c, momento)) ?? null;
  return { estado: actual ? "ocupado" : "libre", actual, proxima: null, deHoy: [] };
}

/* ---------- Reloj compartido ----------
   Un solo temporizador para toda la aplicación, sin importar cuántos espacios
   haya: se despierta al cambiar el minuto (que es cuando una clase empieza,
   entra en sus últimos 10 minutos o termina) y avisa a quien esté mirando.
   Si el reloj del dispositivo salta (lo cambiaron a mano, volvió de
   suspensión, pasó la medianoche), se nota en el próximo tic o al volver a
   la pestaña, y se recalcula todo con la hora nueva. Sin nadie mirando, el
   temporizador se apaga. */
let ahora = new Date();
const oyentes = new Set();
let temporizador = null;

const avisar = () => {
  ahora = new Date();
  oyentes.forEach((fn) => fn(ahora));
};

const programar = () => {
  clearTimeout(temporizador);
  const enMs = 60000 - (Date.now() % 60000) + 50;
  temporizador = setTimeout(() => {
    avisar();
    programar();
  }, enMs);
};

const alVolver = () => {
  if (document.visibilityState !== "hidden") {
    avisar();
    programar();
  }
};

export function suscribirReloj(fn) {
  oyentes.add(fn);
  if (oyentes.size === 1) {
    ahora = new Date();
    programar();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", alVolver);
  }
  return () => {
    oyentes.delete(fn);
    if (!oyentes.size) {
      clearTimeout(temporizador);
      temporizador = null;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", alVolver);
    }
  };
}

/* La hora local, actualizada en cada cambio de minuto. */
export function useReloj() {
  const [fecha, setFecha] = useState(() => new Date());
  useEffect(() => suscribirReloj(setFecha), []);
  return fecha;
}
