const { analizar } = require('./importacion');

// Depuración de catálogos: deja sólo los docentes, materias y grupos que
// figuran en la grilla institucional oficial (el PDF de organización ya
// extraído a JSON).
//
// - Borra DEFINITIVAMENTE los que no figuran (no es una baja lógica).
// - Para no dejar referencias huérfanas, borra también las clases que usan
//   alguno de los borrados, y los saca de las listas de cada grilla.
// - Los grupos que ya estaban con otro formato («Grupo 1.1») toman el nombre
//   oficial («1.1»): mismo id, mismas clases.
// planificar() no toca la base; depurar() lo aplica en una transacción.

async function planificar(db, datos) {
  const existentes = {
    materias: await db.obtenerFilas('SELECT id, nombre FROM materias'),
    docentes: await db.obtenerFilas('SELECT id, nombre FROM docentes'),
    grupos: await db.obtenerFilas('SELECT id, nombre FROM grupos'),
    salones: await db.obtenerFilas('SELECT id, nombre, clasificacion FROM salones'),
  };
  const oficial = analizar(datos, existentes);
  const ids = (lista) => new Set(lista.filter((x) => x.id).map((x) => x.id));
  const oficiales = { materias: ids(oficial.materias), docentes: ids(oficial.docentes), grupos: ids(oficial.grupos) };
  // Lo del PDF que todavía no se importó no se puede conservar: primero, importar.
  const faltan = ['materias', 'docentes', 'grupos'].filter((t) => oficial[t].some((x) => !x.id));

  const fuera = Object.fromEntries(
    ['materias', 'docentes', 'grupos'].map((t) => [t, existentes[t].filter((x) => !oficiales[t].has(x.id))])
  );
  const borrar = { materias: new Set(fuera.materias.map((x) => x.id)), docentes: new Set(fuera.docentes.map((x) => x.id)), grupos: new Set(fuera.grupos.map((x) => x.id)) };
  const clases = (await db.obtenerFilas(
    `SELECT a.id, a.dia, a.docente_id, a.materia_id, a.grupo_id, g.nombre AS grilla, m.nombre AS modulo,
            d.nombre AS docente, ma.nombre AS materia, gr.nombre AS grupo
     FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id JOIN grillas g ON g.id = m.grilla_id
     LEFT JOIN docentes d ON d.id = a.docente_id LEFT JOIN materias ma ON ma.id = a.materia_id
     LEFT JOIN grupos gr ON gr.id = a.grupo_id`
  )).filter((a) => borrar.docentes.has(a.docente_id) || borrar.materias.has(a.materia_id) || borrar.grupos.has(a.grupo_id));
  const renombrar = oficial.grupos
    .filter((g) => g.estado === 'coincide' && g.nombreExistente !== g.nombre)
    .map((g) => ({ id: g.id, de: g.nombreExistente, a: g.nombre }));

  return { fuera, clases, renombrar, faltan };
}

async function depurar(db, plan) {
  if (plan.faltan.length) {
    throw new Error(`Primero importá los catálogos del PDF (faltan ${plan.faltan.join(', ')}): npm run importar-organizacion -- --aplicar`);
  }
  await db.transaccion(async () => {
    for (const c of plan.clases) await db.ejecutar('DELETE FROM asignaciones WHERE id = ?', c.id);
    for (const [tabla, filas] of Object.entries(plan.fuera)) {
      for (const f of filas) await db.ejecutar(`DELETE FROM ${tabla} WHERE id = ?`, f.id);
    }
    for (const g of plan.renombrar) await db.ejecutar('UPDATE grupos SET nombre = ? WHERE id = ?', g.a, g.id);

    // Las grillas que limitaban grupos o materias no deben apuntar a borrados.
    const borrados = { grupos: new Set(plan.fuera.grupos.map((g) => g.id)), materias: new Set(plan.fuera.materias.map((m) => m.id)) };
    for (const g of await db.obtenerFilas('SELECT id, grupos, materias FROM grillas')) {
      const limpiar = (json, conjunto) => {
        try {
          return JSON.stringify((JSON.parse(json) ?? []).filter((id) => !conjunto.has(id)));
        } catch {
          return '[]';
        }
      };
      await db.ejecutar(
        'UPDATE grillas SET grupos = ?, materias = ? WHERE id = ?',
        limpiar(g.grupos, borrados.grupos), limpiar(g.materias, borrados.materias), g.id
      );
    }

    const total = Object.values(plan.fuera).reduce((s, l) => s + l.length, 0);
    await db.ejecutar(
      "INSERT INTO asignaciones_registro (accion, detalle) VALUES ('baja', ?)",
      `Depuración de catálogos: ${plan.fuera.materias.length} materias, ${plan.fuera.docentes.length} docentes y ` +
        `${plan.fuera.grupos.length} grupos que no figuran en la grilla oficial; ${plan.clases.length} clases que los usaban` +
        (total ? '' : ' (nada para borrar)')
    );
  });
}

module.exports = { planificar, depurar };
