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
        institucional: guardado?.tipo === "institucional",
        ...(espaciosComunes[id] ?? espacioComunGeneral),
        capacidad: guardado?.capacidad ?? null,
        habilitado: guardado ? guardado.habilitado : true,
        cancelado: guardado ? !guardado.habilitado : false,
        x,
        y,
        chico: !!chico,
        zona: zonas[id] ?? null,
      };
    }),
  }));
};

export function usePlano() {
  return armarPisos(useAsignaciones().datos.salones);
}

/* Nombre, tipo, capacidad y habilitado de un espacio se cambian con
   guardarEspacio (asignaciones.js), desde la ventana de cada espacio. */
