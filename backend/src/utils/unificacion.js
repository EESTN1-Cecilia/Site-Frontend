// Unir grillas: el ciclo básico y el superior, la mañana y la tarde, en una
// sola grilla (como la organización institucional en papel). Cada módulo
// lleva su turno, así la grilla única tiene «Mañana 1°», «Mañana 2°»,
// «Tarde 1°»…
//
// Cada clase de la grilla que se une pasa al módulo del mismo turno con el
// que más se superpone en horario, y conserva su horario propio si es
// distinto del módulo. Las clases sin un módulo así se llevan su módulo.
// Nada se borra salvo la grilla vacía. planificar() no toca la base;
// unir() lo aplica en una transacción.

const minutos = (h) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : null);
const solapa = (a, b) => {
  const [x0, x1, y0, y1] = [a.inicio, a.fin, b.inicio, b.fin].map(minutos);
  if ([x0, x1, y0, y1].some((v) => v === null)) return 0;
  return Math.max(0, Math.min(x1, y1) - Math.max(x0, y0));
};
// Sin turno cargado, se deduce por la hora: hasta las 12:30, mañana.
const turnoPorHora = (inicio) => (minutos(inicio) === null ? '' : minutos(inicio) < 12 * 60 + 30 ? 'manana' : 'tarde');

const unirListas = (a, b) => {
  const [x, y] = [JSON.parse(a || '[]'), JSON.parse(b || '[]')];
  // Vacía = todos: si alguna admite todos, la unión también.
  return !x.length || !y.length ? '[]' : JSON.stringify([...new Set([...x, ...y])]);
};

async function planificar(db, { destino, origen }) {
  const [d, o] = await Promise.all(
    [destino, origen].map((id) => db.obtenerFila('SELECT * FROM grillas WHERE id = ?', id))
  );
  if (!d) throw new Error(`No existe la grilla ${destino}`);
  if (!o) throw new Error(`No existe la grilla ${origen}`);
  if (d.id === o.id) throw new Error('Elegí dos grillas distintas');

  const modulos = await db.obtenerFilas('SELECT * FROM modulos WHERE grilla_id = ? ORDER BY orden, id', d.id);
  const clases = await db.obtenerFilas(
    `SELECT a.id, a.dia, a.inicio AS inicio_propio, a.fin AS fin_propio,
            COALESCE(a.inicio, m.inicio) AS inicio, COALESCE(a.fin, m.fin) AS fin,
            m.id AS modulo_id, m.nombre AS modulo, m.turno AS turno_modulo,
            ma.nombre AS materia, g.nombre AS grupo
     FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id
     LEFT JOIN materias ma ON ma.id = a.materia_id LEFT JOIN grupos g ON g.id = a.grupo_id
     WHERE m.grilla_id = ? ORDER BY a.dia, m.orden, a.id`,
    o.id
  );
  const mover = [];
  const llevar = new Map(); // módulos de la grilla que se une que pasan enteros
  for (const c of clases) {
    const turno = c.turno_modulo || o.turno || turnoPorHora(c.inicio);
    const destinoModulo = modulos
      .filter((m) => (m.turno || d.turno) === turno)
      .map((m) => ({ m, s: solapa(c, m) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)[0]?.m;
    if (destinoModulo) {
      mover.push({ ...c, turno, a: destinoModulo });
    } else {
      llevar.set(c.modulo_id, { id: c.modulo_id, nombre: c.modulo, turno });
    }
  }
  return { destino: d, origen: o, mover, llevar: [...llevar.values()], total: clases.length };
}

async function unir(db, plan) {
  const { destino: d, origen: o } = plan;
  await db.transaccion(async () => {
    for (const c of plan.mover) {
      const igual = c.inicio === c.a.inicio && c.fin === c.a.fin;
      await db.ejecutar(
        `UPDATE asignaciones SET modulo_id = ?, inicio = ?, fin = ?, version = version + 1, updated_at = datetime('now')
         WHERE id = ?`,
        c.a.id, igual ? null : c.inicio, igual ? null : c.fin, c.id
      );
    }
    let orden = (await db.obtenerFila('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM modulos WHERE grilla_id = ?', d.id)).n;
    for (const m of plan.llevar) {
      const fila = await db.obtenerFila('SELECT clave FROM modulos WHERE id = ?', m.id);
      await db.ejecutar(
        'UPDATE modulos SET grilla_id = ?, clave = ?, turno = ?, orden = ? WHERE id = ?',
        d.id, `${o.id}-${fila.clave}`.slice(0, 100), m.turno, orden++, m.id
      );
    }
    const dias = [...new Set([...(JSON.parse(d.dias || 'null') ?? []), ...(JSON.parse(o.dias || 'null') ?? [])])];
    await db.ejecutar(
      `UPDATE grillas SET dias = ?, grupos = ?, materias = ?,
         ciclo = CASE WHEN ciclo = ? OR ? = '' THEN ciclo ELSE 'ambos' END WHERE id = ?`,
      dias.length ? JSON.stringify(dias) : null,
      unirListas(d.grupos, o.grupos), unirListas(d.materias, o.materias), o.ciclo, o.ciclo, d.id
    );
    await db.ejecutar('DELETE FROM grillas WHERE id = ?', o.id);
    await db.ejecutar(
      "INSERT INTO asignaciones_registro (accion, detalle) VALUES ('cambio', ?)",
      `La grilla ${o.nombre} se unió a ${d.nombre}: ${plan.total} clases`
    );
  });
}

module.exports = { planificar, unir, turnoPorHora };
