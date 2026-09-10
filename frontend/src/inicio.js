import { useEffect, useState } from "react";

/* Contenido editable de la portada. Mismo patrón que publicaciones:
   se guarda en el navegador hasta que exista la API. */
const semilla = () => ({
  hero: {
    chip: "EDUCACIÓN TÉCNICA PÚBLICA · ESTEBAN ECHEVERRÍA",
    titulo: "Técnica 1",
    destacado: "Cecilia Berdichevski",
    bajada:
      "Un espacio para aprender, crear y transformar ideas en proyectos. Formación técnica, comunidad y futuro.",
    accionPrimaria: "Ver cursos",
    accionSecundaria: "Inscripción 2027",
  },
  escuela: {
    chip: "NUESTRA ESCUELA",
    titulo: "Una escuela para quienes",
    destacado: "quieren hacer",
    texto:
      "Formamos estudiantes con curiosidad, pensamiento crítico y herramientas para construir su futuro. Nuestra comunidad combina conocimiento, práctica y trabajo colaborativo.",
  },
  facts: [
    {
      id: "f1",
      icono: "ph:wrench",
      tono: "rose",
      titulo: "Aprendizaje práctico",
      texto: "Proyectos que conectan teoría y realidad.",
    },
    {
      id: "f2",
      icono: "ph:users-three",
      tono: "gray",
      titulo: "Comunidad educativa",
      texto: "Una escuela abierta, inclusiva y participativa.",
    },
    {
      id: "f3",
      icono: "ph:rocket-launch",
      tono: "white",
      titulo: "Mirada hacia el futuro",
      texto: "Tecnología, creatividad y compromiso.",
    },
  ],
  propuestas: {
    chip: "FORMACIÓN",
    titulo: "Nuestras",
    destacado: "propuestas",
    descripcion: "Buscá tu curso y accedé a los materiales de cada división.",
  },
  atajos: [
    {
      id: "a1",
      ruta: "/evaluacion",
      icono: "ph:clipboard-text",
      titulo: "Evaluación de saberes",
      texto: "Períodos, valoraciones y cómo se lee el boletín.",
    },
    {
      id: "a2",
      ruta: "/previas",
      icono: "ph:arrows-clockwise",
      titulo: "Intensificación / Previas",
      texto: "Cronograma de mesas y pasos para acreditar.",
    },
    {
      id: "a3",
      ruta: "/novedades",
      icono: "ph:megaphone",
      titulo: "Novedades",
      texto: "Todo lo que pasa en la escuela, al día.",
    },
  ],
  identidad: {
    chip: "IDENTIDAD INSTITUCIONAL",
    titulo: "Técnica, creatividad y",
    destacado: "comunidad",
    texto:
      "Nuestra identidad se construye a partir de la educación técnica como herramienta de transformación. Aprender es experimentar, resolver problemas, trabajar con otros y animarse a crear.",
  },
  puntos: [
    { id: "p1", titulo: "Conocimiento", texto: "Aprender para comprender." },
    { id: "p2", titulo: "Práctica", texto: "Aprender haciendo." },
    { id: "p3", titulo: "Innovación", texto: "Imaginar nuevas soluciones." },
    { id: "p4", titulo: "Comunidad", texto: "Construir juntos." },
  ],
});

/* Modelos para el botón "agregar" de cada lista. */
export const nuevoItem = (lista) => {
  const id = `${lista[0]}-${Math.random().toString(36).slice(2, 8)}`;

  if (lista === "facts")
    return {
      id,
      icono: "ph:star",
      tono: "white",
      titulo: "Nuevo destacado",
      texto: "Contá algo de la escuela.",
    };

  if (lista === "atajos")
    return {
      id,
      ruta: "/novedades",
      icono: "ph:arrow-right",
      titulo: "Nuevo atajo",
      texto: "Adónde lleva este acceso.",
    };

  return { id, titulo: "Nuevo punto", texto: "Descripción breve." };
};

const CLAVE = "tec1-inicio";

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || semilla();
  } catch {
    return semilla();
  }
};

let contenido = leer();
const oyentes = new Set();

export const guardarInicio = (nuevo) => {
  contenido = nuevo;
  localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  oyentes.forEach((fn) => fn(nuevo));
};

export const restaurarInicio = () => guardarInicio(semilla());

export function useInicio() {
  const [actual, setActual] = useState(contenido);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
