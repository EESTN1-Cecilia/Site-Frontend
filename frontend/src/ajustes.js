import { useEffect, useState } from "react";
import { campos, conId, esObjeto, guardarLocal, leerLocal, texto } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarAjustesEnServidor } from "./services/api.js";

/* Ajustes generales del sitio que maneja Dirección.
   Viven en el backend; acá quedan además en el navegador como respaldo. */
const semilla = () => ({
  inscripcionAbierta: true,
  mensajeCierre:
    "La inscripción está cerrada por ahora. Cuando se abra la próxima convocatoria lo vas a ver acá y en Novedades.",
  /* Qué rol edita cada página pública. null = el reparto por defecto de sesion.js. */
  edicionPaginas: null,
  /* Redes del pie de página ({ id, red, url }); sin link no se muestran. */
  redes: [
    ["instagram", "https://www.instagram.com/tecnica1mg/?hl=es"],
    [
      "facebook",
      "https://www.facebook.com/people/Escuela-Secundaria-T%C3%A9cnica-N1-Esteban-Echeverria/100064875789538/",
    ],
    ["youtube", "https://www.youtube.com/@Tecnica1MonteGrande"],
  ].map(([red, url]) => ({ id: red, red, url })),
});

const CLAVE = "tec1-ajustes";

/* Roles a los que Dirección puede darles páginas (los interruptores de su
   pantalla). Un reparto con otros roles no se usa ni se vuelve a mandar. */
const ROLES_EDITORES = ["secretaria", "jefatura", "server"];

const sanearReparto = (reparto) =>
  esObjeto(reparto)
    ? Object.fromEntries(
        Object.entries(reparto)
          .filter(([, roles]) => Array.isArray(roles))
          .map(([pagina, roles]) => [pagina, roles.filter((rol) => ROLES_EDITORES.includes(rol))]),
      )
    : null;

/* Se toma cada ajuste sólo si tiene la forma esperada; si no, queda el original. */
const sanear = (datos) => {
  const base = semilla();
  if (!esObjeto(datos)) return base;

  return {
    ...base,
    ...datos,
    inscripcionAbierta:
      typeof datos.inscripcionAbierta === "boolean" ? datos.inscripcionAbierta : base.inscripcionAbierta,
    mensajeCierre: texto(datos.mensajeCierre, base.mensajeCierre),
    edicionPaginas: sanearReparto(datos.edicionPaginas),
    redes: Array.isArray(datos.redes)
      ? conId(datos.redes).map((r) => ({ id: r.id, ...campos(r, ["red", "url"]) }))
      : base.redes,
  };
};

let ajustes = sanear(leerLocal(CLAVE));
const oyentes = new Set();

/* Para leerlos fuera de un componente (los permisos de sesion.js). */
export const ajustesActuales = () => ajustes;

const persistir = () => {
  guardarLocal(CLAVE, ajustes);
  oyentes.forEach((fn) => fn(ajustes));
};

/* Lo que llega del servidor al abrir el sitio. null = Dirección todavía no
   guardó ajustes, así que valen los originales (no la copia de este navegador). */
export const hidratarAjustes = (deServidor) => {
  ajustes = sanear(deServidor);
  persistir();
};

export const guardarAjustes = (cambio) => {
  ajustes = sanear({ ...ajustes, ...cambio });
  persistir();

  /* Al servidor se le mandan sólo los ajustes que cambiaron. */
  return enviar((token) => guardarAjustesEnServidor(token, cambio));
};

export function useAjustes() {
  const [actual, setActual] = useState(ajustes);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
