/* Correcciones a mano de las zonas del plano, por id de salón. Pisan lo que
   calcula scripts/zonas-plano.mjs a partir del dibujo:

     "pb-22": [[10, 50], [40, 50], [40, 62], [10, 62]],  // polígono en %
     "pb-4": null,                                         // sin zona: sólo cartel

   Después de editar: `node scripts/zonas-plano.mjs` (en frontend/). */
export const zonasManuales = {};
