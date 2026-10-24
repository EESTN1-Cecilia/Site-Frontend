import { useEffect, useState } from "react";
import { conId, guardarLocal, leerLocal } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarGrillasEnServidor } from "./services/api.js";
import { grillaInicial, horas } from "./panelData.js";

/* Grillas de Espacios y horarios. Las edita Grilla.jsx y las lee el plano del
   Tablero. Se guardan en el servidor (sección "grillas", sólo con sesión) y
   este navegador se queda una copia por si el servidor no responde. */
const CLAVE = "tec1-grillas";

export const horasBase = () => horas.map((nombre) => ({ id: nombre, nombre }));

/* Una grilla por ciclo para empezar; después se crean las que hagan falta
   (por turno, por taller…), cada una con sus propios horarios. */
const iniciales = () =>
  ["Básico", "Superior"].map((nombre) => ({
    id: nombre,
    nombre,
    horas: horasBase(),
    clases: grillaInicial.filter((c) => c.ciclo === nombre),
  }));

/* Sin la forma esperada valen las grillas de ejemplo. */
const sanear = (datos) => {
  const validas = conId(datos)
    .filter((g) => Array.isArray(g.horas) && Array.isArray(g.clases))
    .map((g) => ({ ...g, horas: conId(g.horas), clases: conId(g.clases) }));
  return validas.length ? validas : iniciales();
};

let lista = sanear(leerLocal(CLAVE));
const oyentes = new Set();

const persistir = () => {
  guardarLocal(CLAVE, lista);
  oyentes.forEach((fn) => fn(lista));
};

/* null = nadie guardó grillas todavía: valen las de ejemplo. */
export const hidratarGrillas = (deServidor) => {
  lista = deServidor ? sanear(deServidor) : iniciales();
  persistir();
};

/* `cambio(lista)` devuelve la lista nueva; se aplica al instante y se manda. */
export const cambiarGrillas = (cambio) => {
  lista = cambio(lista);
  persistir();
  return enviar((token) => guardarGrillasEnServidor(token, lista));
};

export function useGrillas() {
  const [actual, setActual] = useState(lista);
  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);
  return actual;
}
