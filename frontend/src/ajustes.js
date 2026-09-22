import { useEffect, useState } from "react";

/* Ajustes generales del sitio que maneja Dirección.
   Se guardan en el navegador hasta que exista la API. */
const semilla = () => ({
  inscripcionAbierta: true,
  mensajeCierre:
    "La inscripción está cerrada por ahora. Cuando se abra la próxima convocatoria lo vas a ver acá y en Novedades.",
  /* Qué rol edita cada página pública. null = el reparto por defecto de sesion.js. */
  edicionPaginas: null,
  /* Redes del pie de página ({ id, red, url }); sin link no se muestran. */
  redes: ["instagram", "facebook", "youtube"].map((red) => ({ id: red, red, url: "" })),
});

const CLAVE = "tec1-ajustes";

const leer = () => {
  try {
    return { ...semilla(), ...JSON.parse(localStorage.getItem(CLAVE)) };
  } catch {
    return semilla();
  }
};

let ajustes = leer();
const oyentes = new Set();

/* Para leerlos fuera de un componente (los permisos de sesion.js). */
export const ajustesActuales = () => ajustes;

export const guardarAjustes = (cambio) => {
  ajustes = { ...ajustes, ...cambio };
  localStorage.setItem(CLAVE, JSON.stringify(ajustes));
  oyentes.forEach((fn) => fn(ajustes));
};

export function useAjustes() {
  const [actual, setActual] = useState(ajustes);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
