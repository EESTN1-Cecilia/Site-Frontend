// Deja en la base sólo los docentes, materias y grupos de la grilla
// institucional oficial (ver src/utils/depuracion.js).
//
//   npm run depurar-catalogos                 → sólo muestra qué se borraría
//   npm run depurar-catalogos -- --aplicar    → lo borra (DEFINITIVO: hacé un respaldo antes)
//   ... -- --datos src/datos/otro.json        → otra grilla oficial extraída
require('dotenv').config({ quiet: true });
const path = require('path');
const db = require('../database/db');
const { planificar, depurar } = require('../utils/depuracion');

const argumentos = process.argv.slice(2);
const i = argumentos.indexOf('--datos');
const archivo = path.resolve(__dirname, '..', '..', i >= 0 ? argumentos[i + 1] : 'src/datos/organizacion-octubre-2026.json');

async function principal() {
  await db.asegurarMigraciones();
  const plan = await planificar(db, require(archivo));
  const lista = (filas, campo = 'nombre') => (filas.length ? filas.map((f) => f[campo]).join(', ') : 'ninguno');

  console.log(`Materias fuera de la grilla oficial (${plan.fuera.materias.length}): ${lista(plan.fuera.materias)}`);
  console.log(`Docentes fuera de la grilla oficial (${plan.fuera.docentes.length}): ${lista(plan.fuera.docentes)}`);
  console.log(`Grupos fuera de la grilla oficial (${plan.fuera.grupos.length}): ${lista(plan.fuera.grupos)}`);
  console.log(`Clases que los usan y se borran con ellos (${plan.clases.length}):`);
  for (const c of plan.clases) {
    console.log(`  - ${c.grilla}, ${c.dia} ${c.modulo}: ${c.materia ?? 'sin materia'} · ${c.grupo ?? 'sin grupo'} · ${c.docente ?? 'sin docente'}`);
  }
  console.log(`Grupos que toman su nombre oficial (${plan.renombrar.length}): ${plan.renombrar.map((g) => `${g.de} → ${g.a}`).join(', ') || 'ninguno'}`);
  if (plan.faltan.length) console.log(`Ojo: hay ${plan.faltan.join(', ')} del PDF sin importar. Importalos antes de depurar.`);

  if (!argumentos.includes('--aplicar')) {
    console.log('\nNo se cambió nada. Para borrar: npm run depurar-catalogos -- --aplicar');
    return;
  }
  await depurar(db, plan);
  console.log('\nListo: depurado.');
}

principal()
  .catch((error) => {
    console.error('No se pudo depurar:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
