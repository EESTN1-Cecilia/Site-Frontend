import { useEffect, useState } from "react";
import { sesionRecordada, tokenActual } from "./conexion.js";
import { seSuperponen } from "./horario.js";
import {
  agregarAlCatalogo,
  cambiarAulaEnServidor,
  copiarGrillaEnServidor,
  escucharEventos,
  guardarAsignacion,
  guardarLoteEnServidor,
  guardarSalon,
  intercambiarAsignaciones,
  obtenerAsignaciones,
  quitarAsignacion,
  verificarAsignacion,
} from "./services/api.js";

/* Espacios y horarios + plano: la única fuente de datos del navegador.

   La grilla semanal, el plano, la ventana de cada espacio y el panel de
   Jefatura leen de acá y escriben por acá. Lo guardado vive en el backend
   (tabla asignaciones): este store no inventa nada ni guarda copias en el
   navegador. Después de cada cambio que el servidor acepta, todos los que
   miran se actualizan en el momento.

   Entre personas: mientras alguien mira, queda abierto un canal de avisos
   (GET /api/eventos). Cuando otra persona guarda, llega un aviso y se vuelven
   a traer los datos, sin recargar la página. Si el canal se corta, se
   reintenta solo (cada vez más espaciado) y al volver se trae todo de nuevo
   por si algo cambió en el medio. `enVivo` dice si el canal está abierto. */

const vacio = {
  asignaciones: [],
  salones: [],
  docentes: [],
  materias: [],
  grupos: [],
  grillas: [],
  dias: [],
  tipos: {},
  pisos: {},
  estados: {},
};

/* Última grilla traída del servidor, guardada en el navegador de esta sesión
   (donde está el token). Es sólo para mostrar algo al instante mientras llega
   lo del servidor, que siempre la reemplaza: la fuente es la base de datos.
   Se borra al entrar y al salir (borrarCopias). */
const RESPALDO = "tec1-asignaciones";
const lugar = () => (sesionRecordada() ? localStorage : sessionStorage);
const leerRespaldo = () => {
  try {
    if (!tokenActual()) return null;
    const r = JSON.parse(lugar().getItem(RESPALDO));
    return r && Array.isArray(r.grillas) && Array.isArray(r.asignaciones) && r.grillas.length ? r : null;
  } catch {
    return null;
  }
};
const guardarRespaldo = (datos) => {
  try {
    lugar().setItem(RESPALDO, JSON.stringify(datos));
  } catch {
    /* sin lugar o bloqueado: sólo en memoria */
  }
};
const inicial = () => {
  const r = leerRespaldo();
  return { cargando: false, cargado: false, error: "", enVivo: false, datos: r ? { ...vacio, ...r } : vacio, token: r ? tokenActual() : null };
};

let estado = inicial();
const oyentes = new Set();

const cambiar = (nuevo) => {
  estado = { ...estado, ...nuevo };
  if (nuevo.datos && estado.cargado && estado.datos.grillas.length) guardarRespaldo(estado.datos);
  oyentes.forEach((fn) => fn(estado));
};
const conDatos = (cambio) => cambiar({ datos: { ...estado.datos, ...cambio(estado.datos) } });

export const estadoActual = () => estado;

/* Sólo las grillas vigentes ocupan espacios: las copias de otras semanas
   quedan archivadas (se ven en la grilla, no en el plano). */
export const esVigente = (a) => a.grilla_vigente !== 0 && a.grilla_vigente !== false;
export const vigentes = (lista) => lista.filter(esVigente);

/* Mensaje claro según qué falló: no es lo mismo no llegar al servidor que
   que el servidor rechace el dato (conflicto, dato inválido, sin permiso). */
export const explicar = (error) => {
  if (error?.sinConexion) {
    return "No se pudo conectar con el servidor. Revisá la conexión y volvé a intentar: no se guardó nada.";
  }
  if (error?.status === 403) return "Tu cuenta no tiene permiso para hacer este cambio.";
  if (error?.status === 401) return "La sesión venció. Volvé a ingresar.";
  return error?.message || "No se pudo completar la operación.";
};

const conSesion = async (accion) => {
  const token = tokenActual();
  if (!token) {
    const error = new Error("La sesión se cerró. Volvé a ingresar.");
    error.status = 401;
    throw error;
  }
  return accion(token);
};

/* ---------- Carga ---------- */
let pedidoEnCurso = null;

export function cargarAsignaciones() {
  if (pedidoEnCurso) return pedidoEnCurso;
  const token = tokenActual();
  cambiar({ cargando: true, token });
  pedidoEnCurso = conSesion(obtenerAsignaciones)
    .then((datos) => cambiar({ cargando: false, cargado: true, error: "", datos: { ...vacio, ...datos } }))
    .catch((error) => cambiar({ cargando: false, error: explicar(error) }))
    .finally(() => {
      pedidoEnCurso = null;
    });
  return pedidoEnCurso;
}

/* Varios avisos juntos (alguien guardó tres cosas seguidas) = una sola carga. */
let recarga = null;
const recargarPronto = () => {
  clearTimeout(recarga);
  recarga = setTimeout(cargarAsignaciones, 150);
};

/* ---------- Avisos en vivo ---------- */
let canal = null;

function abrirCanal() {
  if (canal) return;
  const control = new AbortController();
  const propio = { control, intento: 0, espera: null };
  canal = propio;

  const conectar = async () => {
    const token = tokenActual();
    if (!token || canal !== propio) return;
    try {
      await escucharEventos(
        token,
        (evento) => {
          if (evento === "hola") {
            // Al (re)conectar se trae todo: pudo cambiar algo mientras no había canal.
            if (propio.intento > 0) recargarPronto();
            propio.intento = 0;
            cambiar({ enVivo: true });
          }
          if (evento === "cambio") recargarPronto();
        },
        control.signal,
      );
    } catch {
      /* se cortó o no se pudo abrir: se reintenta abajo */
    }
    if (canal !== propio || control.signal.aborted) return;
    cambiar({ enVivo: false });
    propio.intento += 1;
    propio.espera = setTimeout(conectar, Math.min(30000, 1500 * 2 ** (propio.intento - 1)));
  };
  conectar();
}

function cerrarCanal() {
  if (!canal) return;
  canal.control.abort();
  clearTimeout(canal.espera);
  canal = null;
  cambiar({ enVivo: false });
}

/* ---------- Cambios ---------- */

/* Si el servidor dice que otra persona cambió lo mismo (409 con `cambio`),
   se traen los datos nuevos antes de devolver el error. */
const alFallar = async (error) => {
  if (error?.status === 409 && error.datos?.cambio) await cargarAsignaciones();
  if (error?.status === 404) await cargarAsignaciones();
  throw error;
};

const reemplazar = (guardadas) =>
  conDatos((d) => ({
    asignaciones: [
      ...d.asignaciones.filter((a) => !guardadas.some((g) => g.id === a.id)),
      ...guardadas,
    ],
  }));

/* Crea (sin id) o modifica una asignación. Devuelve la guardada. Un 409 trae
   en error.datos los conflictos y las alternativas. */
export async function guardar(id, version, asignacion) {
  try {
    const { asignacion: guardada } = await conSesion((token) =>
      guardarAsignacion(token, id, id ? { ...asignacion, version } : asignacion),
    );
    reemplazar([guardada]);
    return guardada;
  } catch (error) {
    return alFallar(error);
  }
}

export async function quitar(id, version) {
  try {
    await conSesion((token) => quitarAsignacion(token, id, version));
    conDatos((d) => ({ asignaciones: d.asignaciones.filter((a) => a.id !== id) }));
  } catch (error) {
    return alFallar(error);
  }
}

/* Cambia de lugar dos clases (día y módulo). */
export async function intercambiar(a, b) {
  try {
    const { asignaciones } = await conSesion((token) =>
      intercambiarAsignaciones(token, { id: a.id, version: a.version }, { id: b.id, version: b.version }),
    );
    reemplazar(asignaciones);
    return asignaciones;
  } catch (error) {
    return alFallar(error);
  }
}

/* «Guardar cambios»: altas, cambios ({ id, version, ... }) y bajas
   ({ id, version }) en una sola operación del servidor: se guarda todo o
   nada. Devuelve las asignaciones guardadas. */
export async function guardarLote({ altas = [], cambios = [], bajas = [] }) {
  try {
    const r = await conSesion((token) => guardarLoteEnServidor(token, { altas, cambios, bajas }));
    conDatos((d) => ({
      asignaciones: [
        ...d.asignaciones.filter((a) => !r.bajas.includes(a.id) && !r.asignaciones.some((g) => g.id === a.id)),
        ...r.asignaciones,
      ],
    }));
    return r.asignaciones;
  } catch (error) {
    return alFallar(error);
  }
}

/* Cambio de aula excepcional: el servidor recuerda el aula habitual. Pedir
   el aula habitual la restituye. */
export async function cambiarAula(id, version, salonId) {
  try {
    const { asignacion } = await conSesion((token) => cambiarAulaEnServidor(token, id, salonId, version));
    reemplazar([asignacion]);
    return asignacion;
  } catch (error) {
    return alFallar(error);
  }
}

/* Reutiliza una grilla para otra semana. Devuelve { grilla, clases }. */
export async function copiarGrilla(id, datos) {
  const respuesta = await conSesion((token) => copiarGrillaEnServidor(token, id, datos));
  await cargarAsignaciones();
  return respuesta;
}

/* Conflictos que tendría la asignación, según el servidor (no guarda nada). */
export const verificar = (asignacion) => conSesion((token) => verificarAsignacion(token, asignacion));

/* tipo: "docentes" | "materias" | "grupos". Devuelve el nuevo (o el existente). */
export async function agregar(tipo, datos) {
  const respuesta = await conSesion((token) => agregarAlCatalogo(token, tipo, datos));
  const nuevo = respuesta.docente || respuesta.materia || respuesta.grupo;
  conDatos((d) => ({
    [tipo]: [...d[tipo].filter((x) => x.id !== nuevo.id), nuevo].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    ),
  }));
  return nuevo;
}

/* Nombre, tipo, capacidad o habilitado de un espacio. */
export async function guardarEspacio(id, cambios) {
  const { salon } = await conSesion((token) => guardarSalon(token, id, cambios));
  conDatos((d) => ({
    salones: d.salones.map((s) => (s.id === salon.id ? salon : s)),
    // Las asignaciones muestran el nombre del espacio.
    asignaciones: d.asignaciones.map((a) => (a.salon_id === salon.id ? { ...a, salon: salon.nombre } : a)),
  }));
  return salon;
}

/* Las grillas (y sus módulos con horario) se editan en grillas.js; acá se
   reemplazan en pantalla en cuanto el servidor las acepta. */
export const ponerGrillas = (grillas) => conDatos(() => ({ grillas }));

/* ---------- Conflictos que ya se ven con lo cargado ----------
   Para avisar mientras se completa el formulario. El backend vuelve a
   revisar todo al guardar y es el que decide. */

export function conflictosLocales(a, excluir = []) {
  if (a.estado && a.estado !== "activa") return [];
  const lista = [];
  const vigente = estado.datos.grillas.find((g) => g.id === a.grilla_id)?.vigente !== false;
  // Como en el backend: compiten si son de la misma grilla o ambas vigentes.
  const compiten = (b) => b.grilla_id === a.grilla_id || (vigente && esVigente(b));
  for (const b of estado.datos.asignaciones) {
    if (excluir.includes(b.id) || b.estado !== "activa" || !compiten(b) || !seSuperponen(a, b)) continue;
    const cuando = `el ${b.dia} ${b.inicio ? `de ${b.inicio} a ${b.fin}` : `en ${b.modulo_nombre}`}`;
    // Dos clases «compartidas» (así figuran en la organización) comparten aula y grupo; el docente no.
    const compartidas = !!a.compartida && !!b.compartida;
    if (b.salon_id && b.salon_id === a.salon_id && !compartidas) {
      lista.push({ recurso: "espacio", mensaje: `${b.salon} ya está ocupado ${cuando} (${b.materia || "sin materia"}, ${b.docente || "sin docente"})`, asignacion: b });
    }
    if (b.docente_id && b.docente_id === Number(a.docente_id)) {
      lista.push({ recurso: "docente", mensaje: `${b.docente} ya tiene clase en ${b.salon || "otro espacio"} ${cuando}`, asignacion: b });
    }
    if (b.grupo_id && b.grupo_id === Number(a.grupo_id) && !compartidas) {
      lista.push({ recurso: "grupo", mensaje: `${b.grupo} ya tiene ${b.materia || "otra clase"} ${cuando}`, asignacion: b });
    }
  }
  return lista;
}

/* ---------- Para las pantallas ---------- */
export function useAsignaciones() {
  const [actual, setActual] = useState(estado);
  useEffect(() => {
    oyentes.add(setActual);
    const otraSesion = estado.token !== tokenActual();
    if (otraSesion) {
      cerrarCanal();
      cambiar({ cargado: false, error: "", datos: vacio });
    }
    if ((!estado.cargado || otraSesion) && !estado.cargando) cargarAsignaciones();
    abrirCanal();
    setActual(estado);
    return () => {
      oyentes.delete(setActual);
      // Sin nadie mirando se cierra el canal (se vuelve a abrir al volver).
      if (!oyentes.size) cerrarCanal();
    };
  }, []);
  return actual;
}

/* Para los tests: vuelve todo a cero. */
export function reiniciar() {
  cerrarCanal();
  clearTimeout(recarga);
  pedidoEnCurso = null;
  oyentes.clear();
  estado = { cargando: false, cargado: false, error: "", enVivo: false, datos: vacio, token: null };
}

/* Suscribirse sin React (tests, otros stores). */
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export { abrirCanal, cerrarCanal };
