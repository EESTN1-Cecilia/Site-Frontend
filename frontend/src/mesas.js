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

const D = "https://drive.google.com/drive/folders/";

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
  /* Una fila por año cuando las carpetas de Drive son distintas (1° y 2°, etc.).
     El último valor de cada fila es la carpeta de Drive de esa materia y año
     (sin el "?usp=sharing", que no hace falta); "" = todavía sin cargar. */
  mesas: [
    ["m1-1", "Matemática", "1°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán", "", D + "10R8qlTHW9l_CSeTRDFUDXP2-LnkwX2Ot"],
    ["m1-2", "Matemática", "2°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán", "", D + "1qYj2654Uup1LfhAJLaT3HJ7tLwhJ4nyy"],
    ["m2-1", "Prácticas del Lenguaje", "1°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves", "", D + "1PdQIqCFV5tv1ZmnQVdV5Xg-Sn0Mq16IN"],
    ["m2-2", "Prácticas del Lenguaje", "2°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves", "", D + "1FHx7FAM2kAGJ23Keo8nTk76XLM9K2WFA"],
    ["m2-3", "Prácticas del Lenguaje", "3°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves", "", D + "1SpYYCFc2m5OBSjndQcXhv7fM94herYhG"],
    ["m3-2", "Fisicoquímica", "2°", "2026-12-02", "09:00", "Laboratorio 2", "Prof. E. Paz"],
    ["m3-3", "Fisicoquímica", "3°", "2026-12-02", "09:00", "Laboratorio 2", "Prof. E. Paz", "", D + "19izY-Iva_m6RGt2MIUpGGpgp74i557Ps"],
    ["m4-1", "Inglés", "1°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves", "", D + "1jnM7KdpR05vKahZ3thMICvlzPpg_Hnag"],
    ["m4-2", "Inglés", "2°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves", "", D + "19DV6Cx_9ayaFSbeFlo8LkekSzm5xJlH7"],
    ["m4-3", "Inglés", "3°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves", "", D + "1WVOuy4H3Ny_As25MPW7MjtCWue5LQOjA"],
    /* Materias de 1° a 3° sin mesa asignada todavía: sin fecha, hora, aula ni docente
       (van al final de la tabla). Se completan desde el panel de gestión. */
    ["p1-ciencias-naturales", "Ciencias Naturales", "1°", "", "", "", "", "", D + "1600pTZYybhka0eRifwmDZTcgkQ2VomVd"],
    ["p1-ciencias-sociales", "Ciencias Sociales", "1°", "", "", "", "", "", ""],
    ["p1-musica", "Música", "1°", "", "", "", "", "", D + "1QEKKEm20IVWnUDbfTp_dr-1fhcnL3ZY_"],
    ["p1-educacion-fisica", "Educación Física", "1°", "", "", "", "", "", D + "14zEvpkuhKb-nRZiDJ7PrI2yy2mWGUV6p"],
    ["p1-construccion-de-ciudadania", "Construcción de Ciudadanía", "1°", "", "", "", "", "", ""],
    ["p1-lenguajes-tecnologicos", "Lenguajes Tecnológicos", "1°", "", "", "", "", "", D + "1r1nNnXxKgr0GJGF6WPckOhSejCZrdmWQ"],
    ["p1-procedimientos-tecnicos", "Procedimientos Técnicos", "1°", "", "", "", "", "", ""],
    ["p1-sistemas-tecnologicos", "Sistemas Tecnológicos", "1°", "", "", "", "", "", D + "1gRJSV_1uBNXVzcyELgvPNH7I3DshSs7X"],
    ["p2-biologia", "Biología", "2°", "", "", "", "", "", D + "1XCVcbCzgKdp1aLW6b-wNt0a_PSXWvLS7"],
    ["p2-construccion-de-ciudadania", "Construcción de Ciudadanía", "2°", "", "", "", "", "", ""],
    ["p2-educacion-artistica-plastica", "Educación Artística: Plástica", "2°", "", "", "", "", "", D + "1hTx0uDXyovJ7-_RRO2U9FzM5i0p3ks6k"],
    ["p2-educacion-fisica", "Educación Física", "2°", "", "", "", "", "", D + "1Lk4J0Npwt5NUNuPgEyeLjyZB3eODRyU8"],
    ["p2-geografia", "Geografía", "2°", "", "", "", "", "", ""],
    ["p2-historia", "Historia", "2°", "", "", "", "", "", ""],
    ["p2-lenguajes-tecnologicos", "Lenguajes Tecnológicos", "2°", "", "", "", "", "", ""],
    ["p2-procedimientos-tecnicos", "Procedimientos Técnicos", "2°", "", "", "", "", "", D + "151c3bhr69ebCqcuas7nI8YDFKoxc0Yg9"],
    ["p2-sistemas-tecnologicos", "Sistemas Tecnológicos", "2°", "", "", "", "", "", ""],
    ["p3-biologia", "Biología", "3°", "", "", "", "", "", D + "1HEv5ujj0uUvu-YeQRiNQ7fImvJYpycNS"],
    ["p3-construccion-de-ciudadania", "Construcción de Ciudadanía", "3°", "", "", "", "", "", ""],
    ["p3-educacion-artistica-plastica", "Educación Artística: Plástica", "3°", "", "", "", "", "", D + "17dJ-okXlWCRb4weMWW5ajkYGfJ3Ktwhi"],
    ["p3-educacion-fisica", "Educación Física", "3°", "", "", "", "", "", D + "15hgNxlWRschi5_dC2R2ahuV2Vw3vhqG_"],
    ["p3-geografia", "Geografía", "3°", "", "", "", "", "", ""],
    ["p3-historia", "Historia", "3°", "", "", "", "", "", ""],
    ["p3-lenguajes-tecnologicos", "Lenguajes Tecnológicos", "3°", "", "", "", "", "", ""],
    ["p3-matematica", "Matemática", "3°", "", "", "", "", "", D + "1scXCFFCPIFclAxLtoIJ3Z5io_yz4f0is"],
    ["p3-procedimientos-tecnicos", "Procedimientos Técnicos", "3°", "", "", "", "", "", D + "1K2ntCe5hlRFMVgI4RMviQRIQksFHAnTX"],
    ["p3-sistemas-tecnologicos", "Sistemas Tecnológicos", "3°", "", "", "", "", "", D + "1mcOMWdpNVGzy3umaAyCdqqKjVWh9GR3n"],
    ["m5", "Sistemas Digitales", "4°", "2026-12-03", "09:00", "Laboratorio 1", "Prof. M. Vega"],
    ["m6", "Base de Datos", "5°", "2026-12-03", "11:00", "Aula 12", "Prof. Ramírez", "Programación"],
    ["m7", "Análisis Matemático", "5°", "2026-12-04", "09:00", "Aula 12", "Prof. S. Roldán"],
    ["m8", "Redes", "6°", "2026-12-04", "11:00", "Laboratorio 2", "Prof. D. Suárez", "Informática"],
    ["m9", "Organización y Métodos", "7°", "2026-12-05", "09:00", "Aula 5", "Prof. H. Barreto"],
    ["m10", "Desarrollo de Software", "7°", "2026-12-05", "11:00", "Laboratorio 1", "Prof. N. Quiroga", "Programación"],
  ].map(([id, materia, anio, fecha, hora, aula, docente, orientacion = "", drive = ""]) => ({
    id,
    materia,
    anio,
    orientacion,
    fecha,
    hora,
    aula,
    docente,
    drive,
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
