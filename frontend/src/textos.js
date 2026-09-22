import { useEffect, useState } from "react";
import { enviar } from "./conexion.js";
import { guardarTextosEnServidor } from "./services/api.js";

/* Textos de las páginas públicas cambiados desde gestión.
   Sólo se guarda lo que difiere del texto original: "pagina.parte" -> texto.
   Viven en el backend; acá quedan además en el navegador para que el sitio
   siga andando si el servidor no responde. */
const CLAVE = "tec1-textos";

/* A qué página pertenece una clave. La clave puede traer un tipo adelante
   ("img:inicio.hero.foto", "orden:previas.pasos"). El backend hace la misma
   cuenta para comprobar el permiso. */
const TIPOS = ["img", "link", "oculto", "fondo", "orden", "extra"];

export const paginaDeClave = (clave) => {
  if (typeof clave !== "string" || !clave) return null;

  const [posibleTipo, ...resto] = clave.split(":");
  const sinTipo = TIPOS.includes(posibleTipo) ? resto.join(":") : clave;
  const partes = sinTipo.split(".");

  if (partes[0] === "proyectos") return partes[1] ? `/proyectos/${partes[1]}` : null;

  return (
    {
      inicio: "/",
      evaluacion: "/evaluacion",
      previas: "/previas",
      novedades: "/novedades",
      inscripcion: "/inscripcion",
    }[partes[0]] || null
  );
};

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || {};
  } catch {
    return {};
  }
};

let textos = leer();
const oyentes = new Set();

const persistir = () => {
  localStorage.setItem(CLAVE, JSON.stringify(textos));
  oyentes.forEach((fn) => fn(textos));
};

/* Lo que llega del servidor al abrir el sitio. */
export const hidratarTextos = (deServidor) => {
  textos = deServidor || {};
  persistir();
};

/* Publica los textos de una página. Al servidor sólo se le mandan las claves
   de esa página: es lo que el backend deja tocar según el permiso del rol. */
export const guardarTextos = (nuevos, pagina) => {
  textos = nuevos;
  persistir();

  if (!pagina) return;

  const deLaPagina = Object.fromEntries(
    Object.entries(nuevos).filter(([clave]) => paginaDeClave(clave) === pagina),
  );

  return enviar((token) => guardarTextosEnServidor(token, pagina, deLaPagina));
};

export function useTextos() {
  const [actual, setActual] = useState(textos);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
