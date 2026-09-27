import { useEffect, useState } from "react";
import { campos, conId, guardarLocal, leerLocal } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarProgramasEnServidor } from "./services/api.js";

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

const CAMPOS = ["nombre", "descripcion", "url", "logo", "autores"];

/* Sin la forma esperada valen los programas originales. */
const sanear = (datos) =>
  Array.isArray(datos) ? conId(datos).map((p) => ({ id: p.id, ...campos(p, CAMPOS) })) : semilla();

let lista = sanear(leerLocal(CLAVE));
const oyentes = new Set();

const persistir = () => {
  guardarLocal(CLAVE, lista);
  oyentes.forEach((fn) => fn(lista));
};

/* Lo que llega del servidor al abrir el sitio. null = nadie cargó programas
   todavía, así que se muestran los que trae el sitio (no la copia de este
   navegador, que pudo dejar otra persona). */
export const hidratarProgramas = (deServidor) => {
  lista = sanear(deServidor);
  persistir();
};

export const guardarProgramas = (nueva) => {
  lista = sanear(nueva);
  persistir();

  return enviar((token) => guardarProgramasEnServidor(token, lista));
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
