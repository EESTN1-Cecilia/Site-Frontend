import { tokenActual } from "./conexion.js";
import { guardarGrillasEnServidor } from "./services/api.js";
import { cargarAsignaciones, estadoActual, ponerGrillas, useAsignaciones } from "./asignaciones.js";

/* Grillas de Espacios y horarios (Básico, Superior…) y sus módulos, cada uno
   con su hora de inicio y fin. Las clases NO van acá: son asignaciones
   (asignaciones.js), las mismas que muestra el plano.

   Viven en el backend (tablas grillas y modulos) y llegan con el resto de los
   datos del plano. */

/* Módulos de una grilla nueva: los de siempre, sin hora (la carga la escuela). */
export const horasBase = () =>
  ["1°/2°", "3°/4°", "5°/6°", "7°/8°"].map((nombre) => ({ id: nombre, nombre, inicio: null, fin: null }));

/* `cambio(lista)` devuelve la lista nueva. Se muestra al instante; si el
   servidor la rechaza (un horario que hace chocar clases, sin conexión) se
   vuelve a lo guardado y se devuelve el error para avisarlo. */
export async function cambiarGrillas(cambio) {
  const antes = estadoActual().datos.grillas;
  const nuevas = cambio(antes);
  ponerGrillas(nuevas);
  try {
    const token = tokenActual();
    if (!token) throw new Error("La sesión se cerró. Volvé a ingresar.");
    const { grillas } = await guardarGrillasEnServidor(token, nuevas);
    ponerGrillas(grillas);
    // Borrar un horario o una grilla se lleva sus clases.
    await cargarAsignaciones();
    return { ok: true };
  } catch (error) {
    ponerGrillas(antes);
    return { ok: false, error };
  }
}

export function useGrillas() {
  return useAsignaciones().datos.grillas;
}
