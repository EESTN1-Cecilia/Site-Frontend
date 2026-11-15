import { useEffect, useState } from "react";
import { booleano, campos, conId, guardarLocal, leerLocal } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarProgramasEnServidor } from "./services/api.js";

/* Programas hechos por alumnos que cualquiera puede usar.
   Se muestran al final de la portada y se cargan desde gestión. */
const URL_DIAGRAMTEC = "https://diagramtec-frontend.vercel.app/";
/* Link que tenía antes: si quedó guardado en el navegador o en el servidor, se actualiza. */
const URL_DIAGRAMTEC_ANTERIOR = "https://diagramtec.com";

const semilla = () => [
  {
    id: "diagramtec",
    nombre: "DiagramTec",
    descripcion:
      "Plataforma para crear, editar y compartir diagramas de flujo de datos con un editor visual. Pensada para que estudiantes y docentes practiquen el modelado de datos.",
    url: URL_DIAGRAMTEC,
    logo: "",
    autores:
      "Maite Vázquez, Santiago Alvarez, Leandro Pereyra, Joaquín Villalva y Nayla",
    enDesarrollo: false,
  },
  {
    id: "serverdesk",
    nombre: "ServerDesk",
    descripcion:
      "Aplicación que usa el encargado de la sala server para prestar y devolver netbooks y CPU: cada equipo se identifica escaneando su código de barras, y queda registrado a qué profesor se le prestó, cuándo salió y cuándo volvió.",
    url: "",
    logo: "",
    autores:
      "Santiago Alvarez, Sebastián Callamullo, Eliana Pérez, Ortega Isaías, Rojas Mía y Carballo Juan",
    enDesarrollo: true,
  },
  {
    id: "volta",
    nombre: "Volta",
    descripcion:
      "Aplicación web para armar y probar circuitos tecnológicos de forma digital, sin gastar materiales físicos. Incluye calculadora de resistencias en serie y en paralelo, calculadora de la Ley de Ohm y un bloc de notas para anotar los avances, que se puede descargar junto con el circuito.",
    url: "",
    logo: "",
    autores: "Sebastián Lopez",
    enDesarrollo: true,
  },
];

export const nuevoPrograma = () => ({
  id: `prog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  nombre: "",
  descripcion: "",
  url: "",
  logo: "",
  autores: "",
  enDesarrollo: false,
});

const CLAVE = "tec1-programas";

const CAMPOS = ["nombre", "descripcion", "url", "logo", "autores"];

/* Sin la forma esperada valen los programas originales. */
const sanear = (datos) =>
  Array.isArray(datos)
    ? conId(datos).map((p) => ({
        id: p.id,
        ...campos(p, CAMPOS),
        enDesarrollo: booleano(p.enDesarrollo),
      }))
        .map((p) =>
          p.id === "diagramtec" && p.url === URL_DIAGRAMTEC_ANTERIOR ? { ...p, url: URL_DIAGRAMTEC } : p,
        )
    : semilla();

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
