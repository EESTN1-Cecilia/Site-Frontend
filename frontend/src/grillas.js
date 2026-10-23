import { conId, guardarLocal, leerLocal } from "./almacen.js";
import { grillaInicial, horas } from "./panelData.js";

/* Grillas de Espacios y horarios. Las edita Grilla.jsx y las lee el plano del
   Tablero. Todavía no se guardan en el servidor: quedan en este navegador. */
const CLAVE = "tec1-grillas";

export const horasBase = () => horas.map((nombre) => ({ id: nombre, nombre }));

/* Una grilla por ciclo para empezar; después se crean las que hagan falta
   (por turno, por taller…), cada una con sus propios horarios. */
const iniciales = () =>
  ["Básico", "Superior"].map((nombre) => ({
    id: nombre,
    nombre,
    horas: horasBase(),
    clases: grillaInicial.filter((c) => c.ciclo === nombre),
  }));

export const leerGrillas = () => {
  const guardadas = conId(leerLocal(CLAVE))
    .filter((g) => Array.isArray(g.horas) && Array.isArray(g.clases))
    .map((g) => ({ ...g, horas: conId(g.horas), clases: conId(g.clases) }));
  return guardadas.length ? guardadas : iniciales();
};

export const guardarGrillas = (grillas) => guardarLocal(CLAVE, grillas);
