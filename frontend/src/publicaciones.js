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

/* Las publicaciones del relevamiento pasan a bloques editables. */
const semilla = () =>
  publicacionesPendientes.map((pub) => ({
    id: pub.id,
    titulo: pub.titulo,
    seccion: pub.seccion,
    ruta: pub.ruta,
    categoria: pub.categoria,
    autor: pub.autor,
    fecha: pub.fecha,
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

const CLAVE = "tec1-publicaciones";

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || semilla();
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

export const nuevaPublicacion = () => {
  const pub = {
    id: `pub-${Date.now().toString(36)}`,
    titulo: "Nueva publicación",
    seccion: "Novedades",
    ruta: "/novedades",
    categoria: "Institucional",
    autor: "Sin asignar",
    fecha: new Date().toISOString().slice(0, 10),
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
