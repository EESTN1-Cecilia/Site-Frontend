// Une una grilla a otra (por ejemplo «Superior» a la grilla única de la
// organización): ver src/utils/unificacion.js.
//
//   npm run unificar-grillas -- --origen Superior --destino org-octubre2026            → sólo muestra
//   npm run unificar-grillas -- --origen Superior --destino org-octubre2026 --aplicar  → la une
require('dotenv').config({ quiet: true });
const db = require('../database/db');
const { planificar, unir } = require('../utils/unificacion');

const argumentos = process.argv.slice(2);
const valor = (nombre) => {
  const i = argumentos.indexOf(nombre);
  return i >= 0 ? argumentos[i + 1] : undefined;
};

async function principal() {
  await db.asegurarMigraciones();
  const [origen, destino] = [valor('--origen'), valor('--destino')];
  if (!origen || !destino) {
    const grillas = await db.obtenerFilas('SELECT id, nombre FROM grillas ORDER BY orden, id');
    console.log('Uso: npm run unificar-grillas -- --origen <id> --destino <id> [--aplicar]');
    console.log(`Grillas: ${grillas.map((g) => `${g.id} («${g.nombre}»)`).join(', ')}`);
    return;
  }
  const plan = await planificar(db, { destino, origen });
  console.log(`«${plan.origen.nombre}» → «${plan.destino.nombre}»: ${plan.total} clases`);
  for (const c of plan.mover) {
    const propio = c.inicio === c.a.inicio && c.fin === c.a.fin ? '' : ` (conserva ${c.inicio} a ${c.fin})`;
    console.log(`  - ${c.dia} ${c.materia ?? 'sin materia'} · ${c.grupo ?? 'sin grupo'}: ${c.modulo} → ${c.a.nombre} ${c.turno}${propio}`);
  }
  for (const m of plan.llevar) console.log(`  - El módulo ${m.nombre} pasa entero (turno ${m.turno || 'sin turno'})`);
  if (!argumentos.includes('--aplicar')) {
    console.log('\nNo se cambió nada. Para unir: agregá --aplicar');
    return;
  }
  await unir(db, plan);
  console.log(`\nListo: «${plan.origen.nombre}» quedó dentro de «${plan.destino.nombre}».`);
}

principal()
  .catch((error) => {
    console.error('No se pudo unir:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
