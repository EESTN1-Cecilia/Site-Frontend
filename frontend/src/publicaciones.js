import { useEffect, useState } from "react";
import { publicacionesPendientes } from "./panelData.js";
import imagenCicloBasico from "./assets/images/ciclo-basico-taller.jpg";
import imagenInformatica from "./assets/images/informatica-robotica.jpg";
import imagenProgramacion from "./assets/images/programacion-proyectos.jpg";

/* Imágenes ya cargadas en el sitio, para elegir sin subir nada. */
export const biblioteca = [
  ["Taller de ciclo básico", imagenCicloBasico],
  ["Laboratorio de informática", imagenInformatica],
  ["Proyectos de programación", imagenProgramacion],
];

export const nuevoBloque = (tipo) => ({
  id: `b-${Math.random().toString(36).slice(2, 9)}`,
  tipo,
  texto:
    tipo === "titulo"
      ? "Título de la sección"
      : tipo === "destacado"
        ? "Dato importante que conviene resaltar."
        : "Escribí acá el texto.",
  url: tipo === "imagen" ? imagenCicloBasico : undefined,
  epigrafe: tipo === "imagen" ? "" : undefined,
});

/* Estados: "pendiente" (espera el visto de Dirección), "publicada" (se ve en
   el sitio) y "devuelta" (Dirección pidió cambios). */

/* Notas que ya estaban publicadas en Novedades. */
const publicadas = [
  [
    "n1",
    "Institucional",
    "2026-09-08",
    "Inscripción 2027: apertura de vacantes para 1° año",
    "Del 15 al 30 de septiembre se reciben las solicitudes de ingreso al ciclo básico. Cupos por orden de presentación de la documentación completa.",
    imagenCicloBasico,
  ],
  [
    "n2",
    "Académico",
    "2026-09-05",
    "Cronograma de mesas de intensificación de diciembre",
    "Ya está publicado el cronograma con materia, día, hora y aula para el ciclo básico y el superior.",
    imagenInformatica,
  ],
  [
    "n3",
    "Proyectos",
    "2026-08-29",
    "Muestra anual de prácticas profesionalizantes",
    "Los 7° años de Informática y Programación presentan sus proyectos finales el 14 de noviembre en el SUM.",
    imagenProgramacion,
  ],
  [
    "n4",
    "Proyectos",
    "2026-08-18",
    "El taller de robótica sumó equipamiento nuevo",
    "Gracias a una donación de material, el laboratorio incorporó kits de sensores y placas para los proyectos de 5° y 6°.",
    imagenInformatica,
  ],
  [
    "n5",
    "Comunidad",
    "2026-08-04",
    "Jornada de puertas abiertas para familias",
    "Recorrido por talleres y laboratorios, charla sobre las dos orientaciones técnicas y espacio de consultas.",
    imagenCicloBasico,
  ],
  [
    "n6",
    "Académico",
    "2026-07-21",
    "Nuevo régimen de evaluación por saberes",
    "Explicamos cómo se leen las valoraciones TEA, TEP y TED en el boletín y qué implica cada una.",
    imagenProgramacion,
  ],
].map(([id, categoria, fecha, titulo, resumen, imagen]) => ({
  id,
  titulo,
  seccion: "Novedades",
  ruta: "/novedades",
  categoria,
  autor: "Secretaría",
  fecha,
  estado: "publicada",
  bloques: [
    { id: `${id}-i`, tipo: "imagen", url: imagen, epigrafe: "" },
    { id: `${id}-r`, tipo: "parrafo", texto: resumen },
  ],
}));

/* Borradores del relevamiento esperando el visto de Dirección. */
const pendientes = () =>
  publicacionesPendientes.map((pub) => ({
    id: pub.id,
    titulo: pub.titulo,
    seccion: pub.seccion,
    ruta: pub.ruta,
    categoria: pub.categoria,
    autor: pub.autor,
    fecha: pub.fecha,
    estado: "pendiente",
    bloques: [
      { id: `${pub.id}-i`, tipo: "imagen", url: pub.imagen, epigrafe: "" },
      { id: `${pub.id}-r`, tipo: "parrafo", texto: pub.resumen },
      ...pub.cuerpo.map((texto, i) => ({
        id: `${pub.id}-p${i}`,
        tipo: "parrafo",
        texto,
      })),
    ],
  }));

const semilla = () => [...pendientes(), ...publicadas];

const CLAVE = "tec1-publicaciones";

/* Una lista guardada antes de que existiera el estado sólo tenía borradores:
   se marcan como pendientes y se suman las notas ya publicadas. */
const completar = (guardada) => {
  if (guardada.some((pub) => "estado" in pub)) return guardada;

  const ids = new Set(guardada.map((pub) => pub.id));
  return [
    ...guardada.map((pub) => ({ ...pub, estado: "pendiente" })),
    ...publicadas.filter((pub) => !ids.has(pub.id)),
  ];
};

const leer = () => {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE));
    return guardada ? completar(guardada) : semilla();
  } catch {
    return semilla();
  }
};

let lista = leer();
const oyentes = new Set();

const persistir = () => {
  localStorage.setItem(CLAVE, JSON.stringify(lista));
  oyentes.forEach((fn) => fn(lista));
};

export const guardarPublicacion = (pub) => {
  lista = lista.map((item) => (item.id === pub.id ? pub : item));
  persistir();
};

export const quitarPublicacion = (id) => {
  lista = lista.filter((item) => item.id !== id);
  persistir();
};

const cambiarEstado = (id, estado) => {
  lista = lista.map((pub) => (pub.id === id ? { ...pub, estado } : pub));
  persistir();
};

export const aprobarPublicacion = (id) => cambiarEstado(id, "publicada");
export const devolverPublicacion = (id) => cambiarEstado(id, "devuelta");

export const nuevaPublicacion = () => {
  const pub = {
    id: `pub-${Date.now().toString(36)}`,
    titulo: "Nueva publicación",
    seccion: "Novedades",
    ruta: "/novedades",
    categoria: "Institucional",
    autor: "Sin asignar",
    fecha: new Date().toISOString().slice(0, 10),
    estado: "pendiente",
    bloques: [nuevoBloque("imagen"), nuevoBloque("parrafo")],
  };

  lista = [pub, ...lista];
  persistir();
  return pub;
};

export const restaurarPublicaciones = () => {
  lista = semilla();
  persistir();
};

export function usePublicaciones() {
  const [actual, setActual] = useState(lista);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
