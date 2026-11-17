import { useEffect, useState } from "react";
import { campos, conId, esObjeto, guardarLocal, leerLocal, texto } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarMesasEnServidor } from "./services/api.js";

/* Cronograma de mesas de intensificación. Lo edita gestión (Jefatura de Área,
   Server y Dirección) y lo lee la página de Previas.
   Se guarda en el backend; el navegador queda como respaldo. */

export { esLinkValido } from "./links.js";

const CARPETA =
  "https://drive.google.com/drive/folders/1hhydmRyf5w9uGizHK3IPu9Xeexeve4i2?usp=sharing";

/* Carpeta que tenía el sitio antes: si quedó guardada (en el servidor o en
   este navegador) se cambia por la actual. Un link que puso Dirección a mano
   se respeta. */
const CARPETAS_ANTERIORES = [
  "https://drive.google.com/drive/folders/1hhydmRyf5w9uGizHK3IPu9Xeexeve4i2",
  "https://drive.google.com/drive/folders/1OHWHKxjDuzcytS84ASQCqNHY3KXevnws?usp=sharing",
  "https://drive.google.com/drive/folders/1ekod6AXga5ImRl3ZIbo16AT7GAJTbwfN?usp=sharing",
];

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
  /* Una fila por materia y año (en 5° a 7°, también por orientación), según la lista
     de materias de la escuela. Los datos van en este orden:
       id, materia, año, fecha, hora, aula, docente, orientación, carpeta de Drive.
     La carpeta de Drive va sin el "?usp=sharing" (no hace falta); "" = todavía sin
     cargar. Las materias sin fecha van al final de la tabla; se completan desde el
     panel de gestión. Las cuatro mesas del final no figuran en la lista de materias. */
  mesas: [
    ["1-ciencias-naturales", "Ciencias Naturales", "1°", "", "", "", "", "", D + "1600pTZYybhka0eRifwmDZTcgkQ2VomVd"],
    ["1-ciencias-sociales", "Ciencias Sociales", "1°", "", "", "", "", "", ""],
    ["1-musica", "Música", "1°", "", "", "", "", "", D + "1QEKKEm20IVWnUDbfTp_dr-1fhcnL3ZY_"],
    ["1-educacion-fisica", "Educación Física", "1°", "", "", "", "", "", D + "14zEvpkuhKb-nRZiDJ7PrI2yy2mWGUV6p"],
    ["1-ingles", "Inglés", "1°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves", "", D + "1jnM7KdpR05vKahZ3thMICvlzPpg_Hnag"],
    ["1-matematica", "Matemática", "1°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán", "", D + "10R8qlTHW9l_CSeTRDFUDXP2-LnkwX2Ot"],
    ["1-practicas-del-lenguaje", "Prácticas del Lenguaje", "1°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves", "", D + "1PdQIqCFV5tv1ZmnQVdV5Xg-Sn0Mq16IN"],
    ["1-construccion-de-ciudadania", "Construcción de Ciudadanía", "1°", "", "", "", "", "", ""],
    ["1-lenguajes-tecnologicos", "Lenguajes Tecnológicos", "1°", "", "", "", "", "", D + "1r1nNnXxKgr0GJGF6WPckOhSejCZrdmWQ"],
    ["1-procedimientos-tecnicos", "Procedimientos Técnicos", "1°", "", "", "", "", "", ""],
    ["1-sistemas-tecnologicos", "Sistemas Tecnológicos", "1°", "", "", "", "", "", D + "1gRJSV_1uBNXVzcyELgvPNH7I3DshSs7X"],
    ["2-biologia", "Biología", "2°", "", "", "", "", "", D + "1XCVcbCzgKdp1aLW6b-wNt0a_PSXWvLS7"],
    ["2-construccion-de-ciudadania", "Construcción de Ciudadanía", "2°", "", "", "", "", "", ""],
    ["2-educacion-artistica-plastica", "Educación Artística: Plástica", "2°", "", "", "", "", "", D + "1hTx0uDXyovJ7-_RRO2U9FzM5i0p3ks6k"],
    ["2-educacion-fisica", "Educación Física", "2°", "", "", "", "", "", D + "1Lk4J0Npwt5NUNuPgEyeLjyZB3eODRyU8"],
    ["2-fisicoquimica", "Fisicoquímica", "2°", "2026-12-02", "09:00", "Laboratorio 2", "Prof. E. Paz", "", ""],
    ["2-geografia", "Geografía", "2°", "", "", "", "", "", ""],
    ["2-historia", "Historia", "2°", "", "", "", "", "", ""],
    ["2-ingles", "Inglés", "2°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves", "", D + "19DV6Cx_9ayaFSbeFlo8LkekSzm5xJlH7"],
    ["2-matematica", "Matemática", "2°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán", "", D + "1qYj2654Uup1LfhAJLaT3HJ7tLwhJ4nyy"],
    ["2-practicas-del-lenguaje", "Prácticas del Lenguaje", "2°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves", "", D + "1FHx7FAM2kAGJ23Keo8nTk76XLM9K2WFA"],
    ["2-lenguajes-tecnologicos", "Lenguajes Tecnológicos", "2°", "", "", "", "", "", D + "1ZsQs8hFUabUU2qCl6o3fHsLXK_NS6Fmf"],
    ["2-procedimientos-tecnicos", "Procedimientos Técnicos", "2°", "", "", "", "", "", D + "151c3bhr69ebCqcuas7nI8YDFKoxc0Yg9"],
    ["2-sistemas-tecnologicos", "Sistemas Tecnológicos", "2°", "", "", "", "", "", D + "1Vt6LToEQTFaYOafdFVx2yuGfu6CM90OQ"],
    ["3-biologia", "Biología", "3°", "", "", "", "", "", D + "1HEv5ujj0uUvu-YeQRiNQ7fImvJYpycNS"],
    ["3-construccion-de-ciudadania", "Construcción de Ciudadanía", "3°", "", "", "", "", "", ""],
    ["3-educacion-artistica-plastica", "Educación Artística: Plástica", "3°", "", "", "", "", "", D + "17dJ-okXlWCRb4weMWW5ajkYGfJ3Ktwhi"],
    ["3-educacion-fisica", "Educación Física", "3°", "", "", "", "", "", D + "15hgNxlWRschi5_dC2R2ahuV2Vw3vhqG_"],
    ["3-geografia", "Geografía", "3°", "", "", "", "", "", ""],
    ["3-fisicoquimica", "Fisicoquímica", "3°", "2026-12-02", "09:00", "Laboratorio 2", "Prof. E. Paz", "", D + "19izY-Iva_m6RGt2MIUpGGpgp74i557Ps"],
    ["3-historia", "Historia", "3°", "", "", "", "", "", ""],
    ["3-ingles", "Inglés", "3°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves", "", D + "1WVOuy4H3Ny_As25MPW7MjtCWue5LQOjA"],
    ["3-matematica", "Matemática", "3°", "", "", "", "", "", D + "1scXCFFCPIFclAxLtoIJ3Z5io_yz4f0is"],
    ["3-practicas-del-lenguaje", "Prácticas del Lenguaje", "3°", "2026-12-01", "11:00", "Aula 5", "Prof. C. Nieves", "", D + "1SpYYCFc2m5OBSjndQcXhv7fM94herYhG"],
    ["3-lenguajes-tecnologicos", "Lenguajes Tecnológicos", "3°", "", "", "", "", "", D + "1yG_XFj9n9bEX_jUdGAxuPNISOsst-dlF"],
    ["3-procedimientos-tecnicos", "Procedimientos Técnicos", "3°", "", "", "", "", "", D + "1K2ntCe5hlRFMVgI4RMviQRIQksFHAnTX"],
    ["3-sistemas-tecnologicos", "Sistemas Tecnológicos", "3°", "", "", "", "", "", D + "1mcOMWdpNVGzy3umaAyCdqqKjVWh9GR3n"],
    ["4-educacion-fisica", "Educación Física", "4°", "", "", "", "", "", D + "1UsPJsswIsacbrwOLXT39XbcwgPyfEsUg"],
    ["4-fisica", "Física", "4°", "", "", "", "", "", D + "1W41ujEp77YFPrrJEH4Jad2UoP6DSCj1I"],
    ["4-geografia", "Geografía", "4°", "", "", "", "", "", ""],
    ["4-historia", "Historia", "4°", "", "", "", "", "", ""],
    ["4-ingles", "Inglés", "4°", "", "", "", "", "", D + "1r5C7DEUqwbqgOUvRSihmpn51hK1W1RU4"],
    ["4-literatura", "Literatura", "4°", "", "", "", "", "", D + "11bFVC4ycGbwDlCO3m6W67eibZ9cp34SX"],
    ["4-matematica", "Matemática", "4°", "", "", "", "", "", D + "1WRCRlygiT29wRHABF8T702rfelJ_DHiK"],
    ["4-quimica", "Química", "4°", "", "", "", "", "", D + "1dgDXAdVjz9aGlxwgULTI4neKm5skUC9y"],
    ["4-salud-y-adolescencia", "Salud y Adolescencia", "4°", "", "", "", "", "", D + "1S0hRDQ92uCumMlsRPUunDCDiKCyXXbF2"],
    ["4-laboratorio-de-hardware", "Laboratorio de Hardware", "4°", "", "", "", "", "", D + "113C8KZ75EzP0zUVbpAsGyDg0qVZ3EiaJ"],
    ["4-laboratorio-de-sistemas-operativos", "Laboratorio de Sistemas Operativos", "4°", "", "", "", "", "", D + "1dmnyWK5jn74EMzVNXAMeJzx2pggA8kxq"],
    ["4-laboratorio-de-programacion", "Laboratorio de Programación", "4°", "", "", "", "", "", D + "11Ot9e1IuiMq0ruuna8TUXr_Tx8WY9UXd"],
    ["4-tecnologias-electronicas", "Tecnologías Electrónicas", "4°", "", "", "", "", "", ""],
    ["4-laboratorio-de-aplicaciones", "Laboratorio de Aplicaciones", "4°", "", "", "", "", "", D + "1Zc17sP2Uphqd1Z04RlJu6OMjYD2jeQmC"],
    ["5i-literatura", "Literatura", "5°", "", "", "", "", "Informática", D + "1kOwYNuY1Hq0iaxaEuuTNmIpg3PNduWIr"],
    ["5i-ingles", "Inglés", "5°", "", "", "", "", "Informática", ""],
    ["5i-educacion-fisica", "Educación Física", "5°", "", "", "", "", "Informática", D + "1rjuexfPxhQToV5Ty3_mI9Vlw-nccCflu"],
    ["5i-politica-y-ciudadania", "Política y Ciudadanía", "5°", "", "", "", "", "Informática", ""],
    ["5i-geografia", "Geografía", "5°", "", "", "", "", "Informática", ""],
    ["5i-analisis-matematico", "Análisis Matemático", "5°", "2026-12-04", "09:00", "Aula 12", "Prof. S. Roldán", "Informática", ""],
    ["5i-sistemas-digitales", "Sistemas Digitales", "5°", "", "", "", "", "Informática", D + "1zbwX_8caJmiwTvyaWen9io2XrP1NPQgV"],
    ["5i-teleinformatica", "Teleinformática", "5°", "", "", "", "", "Informática", D + "178Gb1DiYQ7SM7DqelNkvMnl3NyT-ThrU"],
    ["5i-laboratorio-de-programacion", "Laboratorio de Programación", "5°", "", "", "", "", "Informática", D + "1gFw3JUrgCpr7Oq1V8RdrpxNSrMqJ5XL8"],
    ["5i-laboratorio-de-hardware-ii", "Laboratorio de Hardware II", "5°", "", "", "", "", "Informática", D + "1AskbteTMLlAertQOQVlT8JSm7NqKQ3Kp"],
    ["5i-laboratorio-de-sistemas-operativos", "Laboratorio de Sistemas Operativos", "5°", "", "", "", "", "Informática", ""],
    ["5i-laboratorio-de-aplicaciones", "Laboratorio de Aplicaciones", "5°", "", "", "", "", "Informática", ""],
    ["5p-literatura", "Literatura", "5°", "", "", "", "", "Programación", D + "1n_aYxnI1o2xMQs3vy3EdMmZwE8mNN_zL"],
    ["5p-ingles", "Inglés", "5°", "", "", "", "", "Programación", ""],
    ["5p-educacion-fisica", "Educación Física", "5°", "", "", "", "", "Programación", D + "1OS6AHugciJu8GUsgTYSkjAFfP095YQXh"],
    ["5p-politica-y-ciudadania", "Política y Ciudadanía", "5°", "", "", "", "", "Programación", ""],
    ["5p-geografia", "Geografía", "5°", "", "", "", "", "Programación", ""],
    ["5p-analisis-matematico", "Análisis Matemático", "5°", "2026-12-04", "09:00", "Aula 12", "Prof. S. Roldán", "Programación", D + "16e1CSjf2uaDuhI2CSCH6rTJM5o0ymYmp"],
    ["5p-sistemas-digitales", "Sistemas Digitales", "5°", "", "", "", "", "Programación", D + "1poHvN1eIiBdxD1xai0Uu1LOfsG654Y50"],
    ["5p-modelos-y-sistemas", "Modelos y Sistemas", "5°", "", "", "", "", "Programación", D + "1ACproxfQTcb6geIR6U5f5GAZ6zDE5Imv"],
    ["5p-laboratorio-de-programacion", "Laboratorio de Programación", "5°", "", "", "", "", "Programación", D + "1NeNcbQcZwy5_8jqk0gB26ymRfpxemEAP"],
    ["5p-laboratorio-de-diseno-web", "Laboratorio de Diseño Web", "5°", "", "", "", "", "Programación", D + "14AjdwdxEFSrgCdvSFNrp5zZ2ehBLXvj3"],
    ["5p-laboratorio-de-redes-informaticas", "Laboratorio de Redes Informáticas", "5°", "", "", "", "", "Programación", D + "1FFPj9GR-UB_5lbTzu2gyx4J3R9KWnVAG"],
    ["5p-laboratorio-de-diseno-de-base-de-datos", "Laboratorio de Diseño de Base de Datos", "5°", "", "", "", "", "Programación", ""],
    ["6i-literatura", "Literatura", "6°", "", "", "", "", "Informática", D + "1IMSJaaeknu0aQp3EPwTX7sVCvS14BFKd"],
    ["6i-ingles", "Inglés", "6°", "", "", "", "", "Informática", ""],
    ["6i-educacion-fisica", "Educación Física", "6°", "", "", "", "", "Informática", D + "1s33e00Rq7whCxHK1RHP7CEqYEiTK6Xfm"],
    ["6i-laboratorio-de-sistemas-operativos", "Laboratorio de Sistemas Operativos", "6°", "", "", "", "", "Informática", ""],
    ["6i-laboratorio-de-hardware", "Laboratorio de Hardware", "6°", "", "", "", "", "Informática", ""],
    ["6i-matematica-aplicada-1-cuatrimestre", "Matemática Aplicada — 1.º cuatrimestre", "6°", "", "", "", "", "Informática", D + "1NLDfZ1VXYtPhlCIMUfxTx2B20HqTXGST"],
    ["6i-matematica-aplicada-2-cuatrimestre", "Matemática Aplicada — 2.º cuatrimestre", "6°", "", "", "", "", "Informática", D + "1NLDfZ1VXYtPhlCIMUfxTx2B20HqTXGST"],
    ["6i-derecho-del-trabajo", "Derecho del Trabajo", "6°", "", "", "", "", "Informática", D + "1cp0Z_pQ6iqXVi1jmLBGzYnYmAViwB5bC"],
    ["6i-investigacion-operativa", "Investigación Operativa", "6°", "", "", "", "", "Informática", D + "1-pXE6z9dGwSP6Dm9bNH-ciU6HPwRhesN"],
    ["6i-laboratorio-de-programacion", "Laboratorio de Programación", "6°", "", "", "", "", "Informática", ""],
    ["6i-sistemas-digitales", "Sistemas Digitales", "6°", "", "", "", "", "Informática", D + "1S5nhXwD4966L8XgNKJeJ7zdR88O8ggDQ"],
    ["6i-seguridad-informatica", "Seguridad Informática", "6°", "", "", "", "", "Informática", ""],
    ["6i-laboratorio-de-aplicaciones", "Laboratorio de Aplicaciones", "6°", "", "", "", "", "Informática", D + "1nhkAuPSzBhxrVj5H-6BFdT8NjDJFUdp4"],
    ["6p-literatura", "Literatura", "6°", "", "", "", "", "Programación", ""],
    ["6p-ingles", "Inglés", "6°", "", "", "", "", "Programación", ""],
    ["6p-educacion-fisica", "Educación Física", "6°", "", "", "", "", "Programación", ""],
    ["6p-filosofia", "Filosofía", "6°", "", "", "", "", "Programación", ""],
    ["6p-arte", "Arte", "6°", "", "", "", "", "Programación", ""],
    ["6p-matematica-discreta", "Matemática Discreta", "6°", "", "", "", "", "Programación", D + "1Xy820i0S_Kxgmm6GhTKCfemwcTmO06zi"],
    ["6p-sistemas-digitales", "Sistemas Digitales", "6°", "", "", "", "", "Programación", D + "1XwVE663dw6ljVvtEMZsE0rYnfV-sJvbT"],
    ["6p-sistemas-de-gestion-y-autogestion", "Sistemas de Gestión y Autogestión", "6°", "", "", "", "", "Programación", D + "1dNFq5OfSTW181wz8ZDUIgwcl5FXIberV"],
    ["6p-seguridad-informatica", "Seguridad Informática", "6°", "", "", "", "", "Programación", D + "1dh9A-U4sCdgngH8r0PGj8jRJb_KI2LpY"],
    ["6p-derecho-del-trabajo", "Derecho del Trabajo", "6°", "", "", "", "", "Programación", D + "1JNeDEvP0ewF_xkkBx7MqGDlTde1SF6L4"],
    ["6p-laboratorio-de-procesos-industriales", "Laboratorio de Procesos Industriales", "6°", "", "", "", "", "Programación", D + "1X5NEFPVA6sjuCzSoVCPsY1uBbXfdhq9e"],
    ["6p-laboratorio-de-diseno-web-estatico", "Laboratorio de Diseño Web Estático", "6°", "", "", "", "", "Programación", D + "1huYGM6PWW3dR6CJAYN1bitPHG90LRg6f"],
    ["6p-laboratorio-de-diseno-web-dinamico", "Laboratorio de Diseño Web Dinámico", "6°", "", "", "", "", "Programación", ""],
    ["6p-laboratorio-de-programacion-iii", "Laboratorio de Programación III", "6°", "", "", "", "", "Programación", ""],
    ["7i-modelos-y-sistemas", "Modelos y Sistemas", "7°", "", "", "", "", "Informática", ""],
    ["7i-evaluacion-de-proyectos", "Evaluación de Proyectos", "7°", "", "", "", "", "Informática", D + "1Kr3eXvQpbpkxhl1ifHS-FjCVE1yKW4fH"],
    ["7i-emprendimientos-productivos-y-desarrollo-local", "Emprendimientos Productivos y Desarrollo Local", "7°", "", "", "", "", "Informática", ""],
    ["7i-i-m-r-r-i", "I.M.R.R.I.", "7°", "", "", "", "", "Informática", D + "1z7pL79cIIvwjvUTrr6syA-OhfZaEzxcm"],
    ["7i-base-de-datos", "Base de Datos", "7°", "", "", "", "", "Informática", D + "1BibxNsIcaahNo7SJO4XjMw_HUXR-LA3m"],
    ["7i-p-d-i-s-c", "P.D.I.S.C.", "7°", "", "", "", "", "Informática", D + "16wAp_l4Ip-vRnIB9mz_CH19hFxzDR8n3"],
    ["7i-imrsc", "IMRSC", "7°", "", "", "", "", "Informática", D + "1Ld78GK9hVyoVeq8NZIf0M0FcwmXgJtr1"],
    ["7p-emprendimientos-productivos-y-desarrollo-local", "Emprendimientos Productivos y Desarrollo Local", "7°", "", "", "", "", "Programación", ""],
    ["7p-evaluacion-de-proyectos", "Evaluación de Proyectos", "7°", "", "", "", "", "Programación", D + "1NKfC-03iOp1zg7Nemp8rRhCUS0srR8F8"],
    ["7p-organizacion-y-metodos", "Organización y Métodos", "7°", "2026-12-05", "09:00", "Aula 5", "Prof. H. Barreto", "Programación", D + "1qcG7Z9A_j661sBICtpEdappHDvZ-ibNX"],
    ["7p-p-d-i-s-c", "PDISC", "7°", "", "", "", "", "Programación", D + "1HhGiOtO8ok_XUDMCHb8hrBwJTtg7IRbq"],
    ["7p-p-i-s-w-d", "PISWD", "7°", "", "", "", "", "Programación", ""],
    ["7p-pdspw", "PDSPW", "7°", "", "", "", "", "Programación", ""],
    ["7p-d-i-s-p-m", "Aplicaciones Móviles", "7°", "", "", "", "", "Programación", D + "1O00QjdilrGkn-NgNqVgeINsJSu6WI9oP"],
    /* Carpetas de Drive con archivo que no estaban en la lista de materias. */
    ["x1-equivalencias-de-taller", "Equivalencias de Taller", "1°", "", "", "", "", "", D + "1qhd-UYWJWClkm6CrKMy8eKl6MFsLdZ81"],
    ["x2-equivalencias-de-taller", "Equivalencias de Taller", "2°", "", "", "", "", "", D + "1Us3HrVXn9trSBEhRLCzzYFqZbCZzUFxG"],
    ["x3-equivalencias-de-taller", "Equivalencias de Taller", "3°", "", "", "", "", "", D + "1AswdX0O-8UK4AAzcaLmhRQ-pVnun0rgD"],
    ["x6i-sistemas-de-gestion", "Sistemas de Gestión", "6°", "", "", "", "", "Informática", D + "1rIXez00FHbb9O9WS2L-iog70l9VG5xNW"],
    ["x7p-imrsc", "IMRSC", "7°", "", "", "", "", "Programación", D + "1gT5hXrHKmQKBjGLQBqZUyn14UqtgY15w"],
    ["m5", "Sistemas Digitales", "4°", "2026-12-03", "09:00", "Laboratorio 1", "Prof. M. Vega", "", ""],
    ["m6", "Base de Datos", "5°", "2026-12-03", "11:00", "Aula 12", "Prof. Ramírez", "Programación", D + "1DS2Q3kfYcUH8kBbnnmyIdugEjhdrC9IL"],
    ["m8", "Redes", "6°", "2026-12-04", "11:00", "Laboratorio 2", "Prof. D. Suárez", "Informática", ""],
    ["m10", "Modelos y Sistemas II", "7°", "2026-12-05", "11:00", "Laboratorio 1", "Prof. N. Quiroga", "Programación", ""],

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
        carpeta: CARPETAS_ANTERIORES.includes(texto(datos.carpeta)) ? CARPETA : texto(datos.carpeta),
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
