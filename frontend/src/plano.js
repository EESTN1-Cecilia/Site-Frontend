import { useEffect, useState } from "react";
import { guardarLocal, leerLocal } from "./almacen.js";
import planoPb from "./assets/images/plano-pb.png";
import plano1p from "./assets/images/plano-1p.png";

/* Planos del colegio (sacados de los PDF de la escuela). Cada salón es un
   texto encima del dibujo, en % del ancho y alto de la imagen. Los nombres
   se editan desde el Tablero y son los salones que ofrece la grilla. */
const pisos = [
  {
    id: "pb",
    nombre: "Planta baja",
    imagen: planoPb,
    proporcion: "898 / 1600",
    salones: [
      ["pb-1", "Taller 1", 11, 80.6],
      ["pb-2", "Kiosco", 22.7, 80.6],
      ["pb-3", "Cocina", 31.7, 82.6],
      ["pb-4", "Hall de acceso", 46.3, 78.4],
      ["pb-5", "Auditorio", 66.1, 90.9],
      ["pb-6", "Bunker", 71.6, 73.2],
      ["pb-7", "Preceptoría 1", 48.1, 67.6, true],
      ["pb-8", "Aula 1", 68.9, 66.2],
      ["pb-9", "Aula 2", 68.9, 56.6],
      ["pb-10", "Aula 3", 68.9, 47.7],
      ["pb-11", "Secretaría", 40.2, 45, true],
      ["pb-12", "Dirección", 47.4, 45, true],
      ["pb-13", "Aula 5", 43, 35.6],
      ["pb-14", "Aula 4", 42.9, 31.1],
      ["pb-15", "Aula 6", 26.6, 33],
      ["pb-16", "Aula 7", 9.3, 33],
      ["pb-17", "Preceptoría 2", 5.9, 41.1, true],
      ["pb-18", "Taller grande", 24.6, 11.8],
      ["pb-19", "Patio interno", 25.7, 25.2],
      ["pb-20", "Aula 3", 68.9, 15.8],
      ["pb-21", "Aula 3", 68.9, 5.5],
      ["pb-22", "Patio", 23.7, 56.6],
    ],
  },
  {
    id: "1p",
    nombre: "Primer piso",
    imagen: plano1p,
    proporcion: "1013 / 1392",
    salones: [
      ["1p-3", "Laboratorio", 8.1, 80.6],
      ["1p-4", "Pañol", 20.9, 80.6],
      ["1p-16", "Sin nombre", 36.2, 80.7],
      ["1p-5", "Jefe de área", 36.6, 68.1, true],
      ["1p-17", "Sin nombre", 53.7, 73.3, true],
      ["1p-6", "Aula 11", 53.4, 66.2],
      ["1p-7", "Aula 12", 53.1, 56.6],
      ["1p-8", "Aula 13", 53.4, 47.8],
      ["1p-9", "Aula 15", 33.4, 33.1],
      ["1p-10", "Aula 16", 20.8, 33.1],
      ["1p-11", "Biblioteca", 7.9, 33.1],
      ["1p-12", "Aula 20", 54.1, 15.9],
      ["1p-13", "Aula 21", 54.1, 5.6],
      ["1p-14", "Aula 14", 33.9, 45.4],
      ["1p-15", "Aula 10", 53.4, 80.7],
    ],
  },
];

/* Los nombres cambiados quedan en este navegador, como las grillas. */
const CLAVE = "tec1-plano";
const leer = () => {
  const guardados = leerLocal(CLAVE);
  return guardados && typeof guardados === "object" ? guardados : {};
};

/* Salones cancelados (en obra, clausurados…): ids, también en este navegador. */
const CLAVE_CANCELADOS = "tec1-plano-cancelados";
const leerCancelados = () => {
  const guardados = leerLocal(CLAVE_CANCELADOS);
  return Array.isArray(guardados) ? guardados.filter((id) => typeof id === "string") : [];
};

let nombres = leer();
let cancelados = leerCancelados();
const oyentes = new Set();
const avisar = () => oyentes.forEach((fn) => fn({ nombres, cancelados }));

export const renombrarSalon = (id, nombre) => {
  nombres = { ...nombres, [id]: nombre };
  guardarLocal(CLAVE, nombres);
  avisar();
};

export const alternarCancelado = (id) => {
  cancelados = cancelados.includes(id) ? cancelados.filter((x) => x !== id) : [...cancelados, id];
  guardarLocal(CLAVE_CANCELADOS, cancelados);
  avisar();
};

const armar = ({ nombres: cambios, cancelados: fuera }) =>
  pisos.map((piso) => ({
    ...piso,
    salones: piso.salones.map(([id, nombre, x, y, chico]) => ({
      id,
      nombre: typeof cambios[id] === "string" ? cambios[id] : nombre,
      x,
      y,
      chico: !!chico,
      cancelado: fuera.includes(id),
    })),
  }));

const salones = () => armar({ nombres, cancelados }).flatMap((piso) => piso.salones);

export function usePlano() {
  const [actuales, setActuales] = useState({ nombres, cancelados });
  useEffect(() => {
    oyentes.add(setActuales);
    return () => oyentes.delete(setActuales);
  }, []);
  return armar(actuales);
}

/* Salones para elegir en la grilla, sin repetidos ni cancelados. */
export const nombresSalones = () => [
  ...new Set(salones().filter((s) => !s.cancelado).map((s) => s.nombre)),
];

/* El salón de una clase está cancelado (para avisar que hay que reubicarla). */
export const salonCancelado = (aula) =>
  salones().some((s) => s.cancelado && mismoSalon(s.nombre, aula));

/* "AULA 3" y "Aula 3" son el mismo salón. */
export const mismoSalon = (a = "", b = "") =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
