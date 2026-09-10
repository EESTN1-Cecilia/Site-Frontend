import { useEffect, useState } from "react";

/* Cronograma de mesas de intensificación. Lo edita gestión (Jefatura de Área,
   Server y Dirección) y lo lee la página de Previas.
   Se guarda en el navegador hasta que exista la API. */

export { esLinkValido } from "./links.js";

const semilla = () => ({
  carpeta:
    "https://drive.google.com/drive/folders/1ekod6AXga5ImRl3ZIbo16AT7GAJTbwfN?usp=sharing",
  mesas: [
    ["m1", "Matemática", "1° y 2°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán"],
    ["m2", "Prácticas del Lenguaje", "1° a 3°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves"],
    ["m3", "Fisicoquímica", "2° y 3°", "2026-12-02", "09:00", "Laboratorio 2", "Prof. E. Paz"],
    ["m4", "Inglés", "1° a 3°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves"],
    ["m5", "Sistemas Digitales", "4°", "2026-12-03", "09:00", "Laboratorio 1", "Prof. M. Vega"],
    ["m6", "Base de Datos", "5°", "2026-12-03", "11:00", "Aula 12", "Prof. Ramírez"],
    ["m7", "Análisis Matemático", "5°", "2026-12-04", "09:00", "Aula 12", "Prof. S. Roldán"],
    ["m8", "Redes", "6°", "2026-12-04", "11:00", "Laboratorio 2", "Prof. D. Suárez"],
    ["m9", "Organización y Métodos", "7°", "2026-12-05", "09:00", "Aula 5", "Prof. H. Barreto"],
    ["m10", "Desarrollo de Software", "7°", "2026-12-05", "11:00", "Laboratorio 1", "Prof. N. Quiroga"],
  ].map(([id, materia, anio, fecha, hora, aula, docente]) => ({
    id,
    materia,
    anio,
    fecha,
    hora,
    aula,
    docente,
    drive: "",
  })),
});

export const nuevaMesa = () => ({
  id: `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  materia: "",
  anio: "",
  fecha: "",
  hora: "",
  aula: "",
  docente: "",
  drive: "",
});

const CLAVE = "tec1-mesas";

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || semilla();
  } catch {
    return semilla();
  }
};

let contenido = leer();
const oyentes = new Set();

export const guardarMesas = (nuevo) => {
  contenido = nuevo;
  localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  oyentes.forEach((fn) => fn(nuevo));
};

export const restaurarMesas = () => {
  const original = semilla();
  guardarMesas(original);
  return original;
};

export function useMesas() {
  const [actual, setActual] = useState(contenido);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
