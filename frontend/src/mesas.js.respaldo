import { useEffect, useState } from "react";
import { campos, conId, esObjeto, guardarLocal, leerLocal, texto } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarMesasEnServidor } from "./services/api.js";

/* Cronograma de mesas de intensificación. Lo edita gestión (Jefatura de Área,
   Server y Dirección) y lo lee la página de Previas.
   Se guarda en el backend; el navegador queda como respaldo. */

export { esLinkValido } from "./links.js";

const CARPETA =
  "https://drive.google.com/drive/folders/1OHWHKxjDuzcytS84ASQCqNHY3KXevnws?usp=sharing";

/* Carpeta que tenía el sitio antes: si quedó guardada (en el servidor o en
   este navegador) se cambia por la actual. Un link que puso Dirección a mano
   se respeta. */
const CARPETA_ANTERIOR =
  "https://drive.google.com/drive/folders/1ekod6AXga5ImRl3ZIbo16AT7GAJTbwfN?usp=sharing";

const semilla = () => ({
  carpeta: CARPETA,
  /* Carpetas internas de "Todos los trabajos": una por subdivisión. Los
     nombres y links definitivos los tiene que confirmar Pablo o la Jefatura
     de Área; mientras tanto quedan en null, como ya se hace con otras
     divisiones sin materiales. */
  subcarpetas: [
    { id: "sc1", nombre: "1° a 4° año", link: "" },
    { id: "sc2", nombre: "Informática (5° a 7°)", link: "" },
    { id: "sc3", nombre: "Programación (5° a 7°)", link: "" },
  ],
  mesas: [
    ["m1", "Matemática", "1° y 2°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán"],
    ["m2", "Prácticas del Lenguaje", "1° a 3°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves"],
    ["m3", "Fisicoquímica", "2° y 3°", "2026-12-02", "09:00", "Laboratorio 2", "Prof. E. Paz"],
    ["m4", "Inglés", "1° a 3°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves"],
    ["m5", "Sistemas Digitales", "4°", "2026-12-03", "09:00", "Laboratorio 1", "Prof. M. Vega"],
    ["m6", "Base de Datos", "5°", "2026-12-03", "11:00", "Aula 12", "Prof. Ramírez", "Programación"],
    ["m7", "Análisis Matemático", "5°", "2026-12-04", "09:00", "Aula 12", "Prof. S. Roldán"],
    ["m8", "Redes", "6°", "2026-12-04", "11:00", "Laboratorio 2", "Prof. D. Suárez", "Informática"],
    ["m9", "Organización y Métodos", "7°", "2026-12-05", "09:00", "Aula 5", "Prof. H. Barreto"],
    ["m10", "Desarrollo de Software", "7°", "2026-12-05", "11:00", "Laboratorio 1", "Prof. N. Quiroga", "Programación"],
  ].map(([id, materia, anio, fecha, hora, aula, docente, orientacion = ""]) => ({
    id,
    materia,
    anio,
    orientacion,
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
  orientacion: "",
  fecha: "",
  hora: "",
  aula: "",
  docente: "",
  drive: "",
});

export const nuevaSubcarpeta = () => ({
  id: `sc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  nombre: "",
  link: "",
});

const CLAVE = "tec1-mesas";

/* De 1° a 4° las materias son las mismas para todos; de 5° a 7° cambian
   según la orientación. Una mesa sin orientación es para todos. */
export const ORIENTACIONES = ["Informática", "Programación"];

const CAMPOS = ["materia", "anio", "orientacion", "fecha", "hora", "aula", "docente", "drive"];
const CAMPOS_SUBCARPETA = ["nombre", "link"];

/* Sin la forma esperada vale el cronograma original. */
const sanear = (datos) =>
  esObjeto(datos) && Array.isArray(datos.mesas)
    ? {
        carpeta: texto(datos.carpeta) === CARPETA_ANTERIOR ? CARPETA : texto(datos.carpeta),
        subcarpetas: Array.isArray(datos.subcarpetas)
          ? conId(datos.subcarpetas).map((s) => ({ id: s.id, ...campos(s, CAMPOS_SUBCARPETA) }))
          : semilla().subcarpetas,
        mesas: conId(datos.mesas).map((m) => ({ id: m.id, ...campos(m, CAMPOS) })),
      }
    : semilla();

let contenido = sanear(leerLocal(CLAVE));
const oyentes = new Set();

const persistir = () => {
  guardarLocal(CLAVE, contenido);
  oyentes.forEach((fn) => fn(contenido));
};

/* Lo que llega del servidor al abrir el sitio. null = todavía no se cargó
   ningún cronograma, así que vale el que trae el sitio (no la copia de este
   navegador, que pudo dejar otra persona). */
export const hidratarMesas = (deServidor) => {
  contenido = sanear(deServidor);
  persistir();
};

export const guardarMesas = (nuevo) => {
  contenido = sanear(nuevo);
  persistir();

  return enviar((token) => guardarMesasEnServidor(token, contenido));
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
