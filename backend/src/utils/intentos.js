// Límite de intentos de login fallidos, en memoria (sin dependencias).
// Se cuenta por IP y por nombre de usuario: pasado el tope, esa clave queda
// bloqueada hasta que venza la ventana. Un login correcto limpia el contador
// del usuario. Con varias instancias del backend cada una lleva su cuenta.

const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_IP = 20;
const MAX_POR_USUARIO = 5;
const MAX_CLAVES = 10000; // tope de memoria: se descartan las más viejas

const fallos = new Map(); // clave -> { cantidad, desde }

const vigente = (registro, ahora) => registro && ahora - registro.desde < VENTANA_MS;

function limpiarVencidos(ahora) {
  for (const [clave, registro] of fallos) {
    if (!vigente(registro, ahora)) fallos.delete(clave);
  }
  // Si igual quedan demasiadas, se descartan las primeras (las más viejas).
  while (fallos.size > MAX_CLAVES) fallos.delete(fallos.keys().next().value);
}

const claves = (ip, username) => [
  [`ip:${ip}`, MAX_POR_IP],
  [`usuario:${String(username).toLowerCase()}`, MAX_POR_USUARIO],
];

// Devuelve los segundos que faltan si la IP o el usuario están bloqueados; si no, 0.
function segundosBloqueado(ip, username, ahora = Date.now()) {
  let espera = 0;
  for (const [clave, maximo] of claves(ip, username)) {
    const registro = fallos.get(clave);
    if (vigente(registro, ahora) && registro.cantidad >= maximo) {
      espera = Math.max(espera, Math.ceil((registro.desde + VENTANA_MS - ahora) / 1000));
    }
  }
  return espera;
}

function registrarFallo(ip, username, ahora = Date.now()) {
  if (fallos.size >= MAX_CLAVES) limpiarVencidos(ahora);
  for (const [clave] of claves(ip, username)) {
    const registro = fallos.get(clave);
    if (vigente(registro, ahora)) registro.cantidad += 1;
    else fallos.set(clave, { cantidad: 1, desde: ahora });
  }
}

function registrarExito(username) {
  fallos.delete(`usuario:${String(username).toLowerCase()}`);
}

// bcrypt ocupa hilos del pool de libuv que también usa sqlite3: se limita
// cuántos logins lo corren a la vez para que el resto del backend siga atendiendo.
const MAX_LOGINS_SIMULTANEOS = 2;
let enCurso = 0;

function tomarTurno() {
  if (enCurso >= MAX_LOGINS_SIMULTANEOS) return false;
  enCurso += 1;
  return true;
}

function liberarTurno() {
  enCurso = Math.max(0, enCurso - 1);
}

// Sólo para tests.
function reiniciar() {
  fallos.clear();
  enCurso = 0;
}

module.exports = {
  segundosBloqueado,
  registrarFallo,
  registrarExito,
  tomarTurno,
  liberarTurno,
  reiniciar,
  MAX_POR_USUARIO,
};
