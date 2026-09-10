import { useEffect, useState } from "react";

/* Programas hechos por alumnos que cualquiera puede usar.
   Se muestran al final de la portada y se cargan desde gestión. */
const semilla = () => [
  {
    id: "diagramtec",
    nombre: "DiagramTec",
    descripcion:
      "Plataforma para crear, editar y compartir diagramas de flujo de datos con un editor visual. Pensada para que estudiantes y docentes practiquen el modelado de datos.",
    url: "https://diagramtec.com",
    logo: "",
    autores:
      "Maite Vázquez, Santiago Alvarez, Leandro Pereyra, Joaquín Villalva y Nayla",
  },
];

export const nuevoPrograma = () => ({
  id: `prog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  nombre: "",
  descripcion: "",
  url: "",
  logo: "",
  autores: "",
});

const CLAVE = "tec1-programas";

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || semilla();
  } catch {
    return semilla();
  }
};

let lista = leer();
const oyentes = new Set();

export const guardarProgramas = (nueva) => {
  lista = nueva;
  localStorage.setItem(CLAVE, JSON.stringify(nueva));
  oyentes.forEach((fn) => fn(nueva));
};

export const restaurarProgramas = () => {
  const original = semilla();
  guardarProgramas(original);
  return original;
};

export function useProgramas() {
  const [actual, setActual] = useState(lista);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
