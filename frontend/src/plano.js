import planoPb from "./assets/images/plano-pb.png";
import plano1p from "./assets/images/plano-1p.png";
import { espacioComunGeneral, espaciosComunes, salonesPorPiso } from "./planoSalones.js";
import { zonas } from "./zonasPlano.js";
import { useAsignaciones } from "./asignaciones.js";

/* Planos del colegio (sacados de los PDF de la escuela).

   Cada espacio tiene en el dibujo:
   - su cartel (planoSalones.js): el punto donde va el nombre, en % del
     ancho y alto de la imagen;
   - su zona (zonasPlano.js): el polígono del ambiente, calculado del propio
     dibujo con scripts/zonas-plano.mjs. Las coordenadas son % de la imagen,
     así la zona sigue al dibujo al cambiar el tamaño de la pantalla.
   Nombre, tipo, capacidad y si está habilitado vienen del backend (tabla
   salones), con el mismo id. */
const pisos = [
  { id: "pb", nombre: "Planta baja", imagen: planoPb, ancho: 898, alto: 1600 },
  { id: "1p", nombre: "Primer piso", imagen: plano1p, ancho: 1013, alto: 1392 },
];

/* Espacios fijos e institucionales: Preceptorías, Secretaría y Dirección. Se
   dibujan con color y rótulo propios, no se pueden elegir ni asignar ni
   modificar. Los de un mismo `grupo` comparten un solo rótulo (Secretaría y
   Dirección son dos recintos, pero un solo cartel). */
export const fijos = {
  "pb-7": {
    rotulo: "Preceptoría",
    color: "azul",
    zona: [[43.5, 66.6], [51.6, 66.6], [51.6, 70.95], [43.5, 70.95]],
  },
  "1p-5": {
    rotulo: "Jefatura",
    color: "bordo",
    zona: [[33.7, 66.5], [40.0, 66.5], [40.0, 70.9], [33.7, 70.9]],
  },
  "1p-19": {
    rotulo: "Preceptoría",
    color: "azul",
    zona: [[40.6, 29.1], [44.0, 29.1], [44.0, 33.4], [40.6, 33.4]],
  },
  "pb-17": {
    rotulo: "Preceptoría",
    color: "azul",
    zona: [[2.35, 40.2], [10.1, 40.2], [10.1, 42.55], [2.35, 42.55]],
  },
  /* Secretaría y Dirección se dibujan como un solo bloque (todo el recinto
     entre la pared en diagonal y el pasillo): el polígono va en pb-11 y pb-12
     queda sin zona propia. */
  "pb-11": {
    rotulo: "Secretaría y Dirección",
    color: "bordo",
    grupo: "secretaria-direccion",
    zona: [[35.5, 43.25], [51.7, 43.25], [51.7, 52.4], [41.8, 52.4]],
  },
  "pb-12": {
    rotulo: "Secretaría y Dirección",
    color: "bordo",
    grupo: "secretaria-direccion",
    zona: null,
  },
};

export const armarPisos = (deServidor) => {
  const porId = Object.fromEntries(deServidor.map((s) => [s.id, s]));
  return pisos.map((piso) => ({
    ...piso,
    proporcion: `${piso.ancho} / ${piso.alto}`,
    salones: salonesPorPiso[piso.id].map(([id, nombre, x, y, chico]) => {
      const guardado = porId[id];
      return {
        id,
        piso: piso.id,
        nombre: guardado?.nombre ?? nombre,
        tipo: guardado?.tipo ?? "otro",
        // AULA admite clases; ESPACIO_COMUN (PAÑOL, E.O.E.…) sólo se consulta.
        clasificacion: guardado?.clasificacion ?? "AULA",
        comun: guardado?.clasificacion === "ESPACIO_COMUN",
        // Reservado a funciones institucionales (Jefatura de Área): nunca asignable.
        institucional: guardado?.tipo === "institucional" || !!fijos[id],
        fijo: fijos[id] ?? null,
        ...(espaciosComunes[id] ?? espacioComunGeneral),
        capacidad: guardado?.capacidad ?? null,
        habilitado: guardado ? guardado.habilitado : true,
        cancelado: guardado ? !guardado.habilitado : false,
        x,
        y,
        chico: !!chico,
        zona: fijos[id] ? fijos[id].zona : zonas[id] ?? null,
      };
    }),
  }));
};

export function usePlano() {
  return armarPisos(useAsignaciones().datos.salones);
}

/* Nombre, tipo, capacidad y habilitado de un espacio se cambian con
   guardarEspacio (asignaciones.js), desde la ventana de cada espacio. */
