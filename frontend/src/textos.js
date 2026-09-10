import { useEffect, useState } from "react";

/* Textos de las páginas públicas cambiados desde gestión.
   Sólo se guarda lo que difiere del texto original: "pagina.parte" -> texto.
   Se guarda en el navegador hasta que exista la API. */
const CLAVE = "tec1-textos";

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || {};
  } catch {
    return {};
  }
};

let textos = leer();
const oyentes = new Set();

export const guardarTextos = (nuevos) => {
  textos = nuevos;
  localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  oyentes.forEach((fn) => fn(nuevos));
};

export function useTextos() {
  const [actual, setActual] = useState(textos);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
