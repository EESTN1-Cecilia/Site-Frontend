import { aMinutos, diaDe, estadoClase, minutosDe } from "./horario.js";
import { espacioDe } from "./exportarGrilla.js";

/* Cartelera digital: la lógica de lo que muestra el televisor, sin React
   (así se prueba sola).

   - El plano alterna entre planta baja y primer piso cada minuto. Los
     dibujos son verticales: en el televisor (apaisado) se giran 90° para que
     ocupen el ancho; los carteles se ubican con las coordenadas giradas y
     quedan derechos.
   - Debajo del plano, como un tablero de turnos: aula, grupo, docente y
     materia de cada clase que está pasando ahora en esa planta. */

export const SEGUNDOS_POR_PISO = 10;
export const SEGUNDOS_POR_PAGINA = 10; // si la lista no entra, pasa de a páginas
export const FILAS_POR_PAGINA = 10;
export const FILAS_BAJO_EL_PLANO = 4; // dos columnas de dos, debajo del plano (si hay más, rotan)

/* Planta que toca en este minuto (una y otra, cada minuto). */
export const pisoDelMomento = (fecha, pisos) => pisos[Math.floor(fecha.getTime() / (SEGUNDOS_POR_PISO * 1000)) % pisos.length];

/* Punto del plano vertical [x, y] (en % de la imagen) → el mismo punto en el
   plano girado 90° en el sentido del reloj. */
export const girar = ([x, y]) => [100 - y, x];

/* La parte del dibujo (ya girado) que tiene espacios, con un margen: los
   planos traen franjas en blanco (el contorno punteado del terreno) que en
   el televisor sólo achicarían el plano (y se verían como un marco). En % del
   dibujo; el margen deja ver las paredes de los espacios del borde. */
export function recorteDe(puntos, margen = 1.5) {
  if (!puntos.length) return { x0: 0, y0: 0, x1: 100, y1: 100 };
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  return {
    x0: Math.max(0, Math.min(...xs) - margen),
    y0: Math.max(0, Math.min(...ys) - margen),
    x1: Math.min(100, Math.max(...xs) + margen),
    y1: Math.min(100, Math.max(...ys) + margen),
  };
}

/* Cuánto falta (0 a 1) para cambiar de planta. */
export const avanceDelMinuto = (fecha) => (fecha.getTime() % (SEGUNDOS_POR_PISO * 1000)) / (SEGUNDOS_POR_PISO * 1000);

const porNombre = (a, b) => (a.aula ?? "").localeCompare(b.aula ?? "", "es", { numeric: true }) || (a.grupo ?? "").localeCompare(b.grupo ?? "", "es", { numeric: true });
const hora = (hhmm) => (hhmm ? hhmm.replace(/^0/, "") : "");

/* El tablero de una planta: las clases de ahora y, si no hay, las próximas
   de hoy (el primer horario que viene). Docente ausente o clase cancelada
   figuran igual, con su aviso: el aula queda libre. */
export function turnosDe(clases, salonesDelPiso, fecha) {
  const dia = diaDe(fecha);
  const minutos = minutosDe(fecha);
  const delPiso = new Map(salonesDelPiso.filter((s) => !s.comun).map((s) => [s.id, s]));
  const deHoy = clases.filter((c) => c.dia === dia && delPiso.has(c.salon_id) && c.inicio && c.fin);
  const fila = (c, estado) => ({
    id: c.id,
    aula: delPiso.get(c.salon_id)?.nombre ?? c.salon,
    docente: c.docente,
    grupo: c.grupo,
    materia: c.materia,
    desde: hora(c.inicio),
    hasta: hora(c.fin),
    estado,
  });

  const ahora = deHoy
    .map((c) => {
      const e = estadoClase(c, minutos);
      if (!e) return null;
      return fila(c, c.estado === "activa" ? e : c.estado);
    })
    .filter(Boolean)
    .sort(porNombre);
  if (ahora.length) return { titulo: "Ahora", filas: ahora };

  const siguientes = deHoy.filter((c) => c.estado === "activa" && aMinutos(c.inicio) > minutos);
  if (!siguientes.length) return { titulo: "Ahora", filas: [] };
  const primero = Math.min(...siguientes.map((c) => aMinutos(c.inicio)));
  return {
    titulo: `Próximas · desde las ${hora(siguientes.find((c) => aMinutos(c.inicio) === primero).inicio)}`,
    filas: siguientes.filter((c) => aMinutos(c.inicio) === primero).map((c) => fila(c, "proxima")).sort(porNombre),
  };
}

/* Si la lista no entra, se muestra de a páginas que rotan solas. */
export function paginaDe(filas, fecha, porPagina = FILAS_POR_PAGINA) {
  const paginas = Math.max(1, Math.ceil(filas.length / porPagina));
  const n = Math.floor(fecha.getTime() / (SEGUNDOS_POR_PAGINA * 1000)) % paginas;
  return { filas: filas.slice(n * porPagina, (n + 1) * porPagina), pagina: n + 1, paginas };
}

/* Enlace del televisor (se abre en el navegador de la TV). */
export const urlPantalla = (token, origen = window.location) =>
  `${origen.origin}${origen.pathname}#/tv?p=${encodeURIComponent(token)}`;

/* ---------- Turnos (como el llamador de una clínica) ----------
   Cada 5 minutos, durante un minuto, en lugar del plano: qué grupo va a qué
   aula en las clases que están por empezar, con las novedades (cambio de
   aula, docente ausente, clase cancelada, asignación nueva o cambiada hoy).
   Cuando falta poco para que empiecen (15 minutos o menos), cada 2. */
export const CADA_MINUTOS = 5;
export const CADA_MINUTOS_CERCA = 2;
export const MINUTOS_CERCA = 15;
export const FILAS_TURNOS = 8;

const NOVEDAD = {
  docente_ausente: "Docente ausente",
  suspendida: "Clase cancelada",
};

/* La novedad de una clase (o null), de la más a la menos importante. */
export function novedadDe(c) {
  if (NOVEDAD[c.estado]) return { tipo: c.estado, texto: NOVEDAD[c.estado] };
  if (c.salon_habitual) return { tipo: "cambio-aula", texto: `Cambio de aula (antes ${c.salon_habitual})` };
  if (c.reciente === "nueva") return { tipo: "nueva", texto: "Nueva asignación" };
  if (c.reciente === "cambio") return { tipo: "actualizada", texto: "Actualizada hoy" };
  return null;
}

/* Las clases de hoy que empiezan desde hace 10 minutos hasta dentro de 40,
   por hora y grupo. La destacada (arriba, grande) es la primera con novedad,
   o la primera que empieza; abajo van primero las otras con novedad. */
export function turnosProximos(clases, fecha) {
  const dia = diaDe(fecha);
  const minutos = minutosDe(fecha);
  const filas = clases
    // También las que van a un espacio que no está en el plano (SUM, TALLER del PDF).
    .filter((c) => c.dia === dia && c.inicio && espacioDe(c) && aMinutos(c.inicio) >= minutos - 10 && aMinutos(c.inicio) <= minutos + 40)
    .sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio) || (a.grupo ?? "").localeCompare(b.grupo ?? "", "es", { numeric: true }))
    .map((c) => ({
      id: c.id,
      grupo: c.grupo,
      aula: espacioDe(c),
      docente: c.docente,
      materia: c.materia,
      desde: hora(c.inicio),
      hasta: hora(c.fin),
      novedad: novedadDe(c),
    }));
  const destacada = filas.find((f) => f.novedad) ?? filas[0] ?? null;
  // Debajo, primero las que tienen novedad (que no queden en otra página).
  const resto = filas.filter((f) => f !== destacada);
  return { destacada, filas: [...resto.filter((f) => f.novedad), ...resto.filter((f) => !f.novedad)] };
}

/* Minutos que faltan para la próxima clase de hoy (null si no hay). */
export function minutosParaLaProxima(clases, fecha) {
  const dia = diaDe(fecha);
  const minutos = minutosDe(fecha);
  const inicios = clases.filter((c) => c.dia === dia && c.inicio && aMinutos(c.inicio) > minutos).map((c) => aMinutos(c.inicio) - minutos);
  return inicios.length ? Math.min(...inicios) : null;
}

/* ¿Este minuto toca la grilla de turnos? Sólo si hay turnos para mostrar. */
export function tocanTurnos(fecha, hayTurnos, faltan) {
  if (!hayTurnos) return false;
  const cada = faltan !== null && faltan <= MINUTOS_CERCA ? CADA_MINUTOS_CERCA : CADA_MINUTOS;
  return Math.floor(fecha.getTime() / 60000) % cada === cada - 1;
}
