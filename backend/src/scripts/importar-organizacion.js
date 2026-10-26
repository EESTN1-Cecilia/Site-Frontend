// Importa la organización institucional (el PDF «ORGANIZACION OCTUBRE»,
// extraído a JSON con frontend/scripts/extraer-organizacion.mjs).
//
//   npm run importar-organizacion                    → sólo revisa: informe, sin cambios
//   npm run importar-organizacion -- --aplicar       → carga materias, docentes y grupos
//   npm run importar-organizacion -- --aplicar --con-clases
//   ... --con-clases --compartidas   → también las que comparten aula (o grupo) con otra del PDF
//                                                    → además, grillas y clases del PDF
//   ... -- --datos src/datos/otro.json               → otro archivo extraído
//   npm run importar-organizacion -- --aplicar --asignar-espacio TALLER=pb-18
//                                                    → las clases importadas que dicen
//                                                      «TALLER» (y no tienen espacio)
//                                                      pasan al Taller grande, si no chocan
//
// Se puede correr las veces que haga falta: no duplica nada. Lo existente no
// se renombra ni se borra (a un grupo que ya estaba sólo se le completan los
// datos vacíos). Las clases del PDF NO se importan salvo con --con-clases: el
// PDF es la organización de un período, no necesariamente lo vigente.
//
// El informe (nuevos, coincidentes y dudosos) queda en
// data/informe-importacion-organizacion.md. Lo dudoso se guarda igual, con
// la marca `revisar` y el motivo, para corregirlo después.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { analizar, aplicar, asignarEspacio } = require('../utils/importacion');
const { TURNOS } = require('../utils/salones');

const argumentos = process.argv.slice(2);
const opcion = (nombre) => argumentos.includes(nombre);
const valor = (nombre, porDefecto) => {
  const i = argumentos.indexOf(nombre);
  return i >= 0 ? argumentos[i + 1] : porDefecto;
};

const archivo = path.resolve(__dirname, '..', '..', valor('--datos', 'src/datos/organizacion-octubre-2026.json'));
const destinoInforme = path.join(__dirname, '..', '..', 'data', 'informe-importacion-organizacion.md');

const tabla = (filas, columnas) =>
  filas.length
    ? [
        `| ${columnas.map(([t]) => t).join(' | ')} |`,
        `| ${columnas.map(() => '---').join(' | ')} |`,
        ...filas.map((f) => `| ${columnas.map(([, c]) => String(c(f) ?? '—').replace(/\|/g, '/')).join(' | ')} |`),
      ].join('\n')
    : '_Ninguno._';

// --asignar-espacio TALLER=pb-18 (se puede repetir)
const espaciosElegidos = argumentos
  .map((a, i) => (a === '--asignar-espacio' ? argumentos[i + 1] : null))
  .filter(Boolean)
  .map((par) => {
    const [original, salonId] = par.split('=');
    if (!original || !salonId) throw new Error(`--asignar-espacio espera ESPACIO_DEL_PDF=id_del_plano (vino «${par}»)`);
    return { original: original.trim().toUpperCase(), salonId: salonId.trim() };
  });

function informeAsignados(asignados) {
  if (!asignados.length) return '';
  return asignados
    .map((r) => [
      `## Espacio «${r.original}» del PDF → ${r.salon}`,
      `- Clases que pasaron a ${r.salon}: ${r.asignadas}.`,
      `- Sin espacio porque se superponen con otra clase en ${r.salon}: ${r.sinLugar.length}.`,
      '',
      tabla(r.sinLugar, [['Grilla', (c) => c.grilla], ['Día', (c) => c.dia], ['Horario', (c) => `${c.inicio} a ${c.fin}`], ['Materia', (c) => c.materia], ['Grupo', (c) => c.grupo], ['Choca con', (c) => `${c.conClase.materia ?? 'clase'} · ${c.conClase.grupo ?? 'sin grupo'} (${c.conClase.inicio} a ${c.conClase.fin})`]]),
      '',
    ].join('\n'))
    .join('\n');
}

function informeMarkdown(datos, inf, resultado, modo) {
  const sec = (titulo, lista, columnas) => {
    const nuevos = lista.filter((x) => x.estado !== 'coincide');
    const coinciden = lista.filter((x) => x.estado === 'coincide');
    const dudosos = lista.filter((x) => x.revisar);
    return [
      `## ${titulo}`,
      `${lista.length} en el documento: ${nuevos.length} nuevos, ${coinciden.length} ya estaban, ${dudosos.length} para revisar.`,
      '',
      tabla(lista, columnas),
      '',
    ].join('\n');
  };
  const celdas = datos.franjas.reduce((s, f) => s + f.celdas.length, 0);
  return [
    `# Importación de ${datos.fuente}`,
    '',
    `- Modo: **${modo}**. Fecha: ${new Date().toLocaleString('es-AR')}.`,
    `- Páginas procesadas: ${datos.paginas} (${datos.franjas.map((f) => `pág. ${f.pagina}: turno ${f.turno.toLowerCase()}, ${f.modulo}° módulo, ${f.celdas.length} celdas`).join('; ')}). Total: ${celdas} celdas.`,
    datos.avisos.length ? `- Celdas incompletas en el PDF: ${datos.avisos.join('; ')}.` : '- Todas las celdas del PDF están completas.',
    '',
    sec('Materias y actividades', inf.materias, [
      ['Nombre', (m) => m.nombre], ['Estado', (m) => (m.estado === 'coincide' ? `ya estaba (${m.nombreExistente})` : 'nueva')],
      ['Veces', (m) => m.apariciones], ['Como figura en el PDF', (m) => [...m.variantes, ...m.siglas].join(' · ')], ['Revisar', (m) => m.revisar],
    ]),
    sec('Grupos de taller', inf.grupos, [
      ['Grupo', (g) => g.nombre], ['Curso', (g) => g.curso], ['Alumnos', (g) => g.alumnos], ['Turno', (g) => TURNOS[g.turno] ?? g.turno],
      ['Estado', (g) => (g.estado === 'coincide' ? `ya estaba (${g.nombreExistente})` : 'nuevo')], ['Revisar', (g) => g.revisar],
    ]),
    sec('Docentes', inf.docentes, [
      ['Nombre', (d) => d.nombre], ['En el PDF', (d) => d.original], ['Veces', (d) => d.apariciones],
      ['Estado', (d) => (d.estado === 'coincide' ? `ya estaba (${d.nombreExistente})` : 'nuevo')], ['Revisar', (d) => d.revisar],
    ]),
    '## Espacios (se vinculan con el plano; no se crean)',
    '',
    tabla(inf.espacios, [['En el PDF', (e) => e.original], ['Veces', (e) => e.apariciones], ['Espacio del plano', (e) => e.salon], ['Revisar', (e) => e.revisar]]),
    '',
    '## Clases',
    resultado?.clases !== undefined && modo.includes('clases')
      ? [
          `- Guardadas: ${resultado.clases}. Ya estaban (importadas antes): ${resultado.yaImportadas}. Grillas nuevas: ${resultado.grillas}.`,
          `- Sin espacio del plano (quedan para elegirlo): ${inf.clases.filter((c) => !c.espacio?.salon_id).length}.`,
          `- No guardadas por superponerse con otra clase: ${resultado.conflictos.length}.`,
          '',
          tabla(resultado.conflictos, [['Pág.', (c) => c.pagina], ['Día', (c) => c.dia], ['Fila', (c) => c.fila], ['Horario', (c) => `${c.inicio} a ${c.fin}`], ['Materia', (c) => c.materia?.nombre], ['Grupo', (c) => c.grupo?.nombre], ['Choca por', (c) => c.recurso]]),
        ].join('\n')
      : `- ${inf.clases.length} clases en el documento. **No se importaron**: hace falta \`--aplicar --con-clases\`.`,
    '',
  ].join('\n');
}

async function principal() {
  const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  await db.asegurarMigraciones();
  const existentes = {
    materias: await db.obtenerFilas('SELECT id, nombre FROM materias'),
    docentes: await db.obtenerFilas('SELECT id, nombre FROM docentes'),
    grupos: await db.obtenerFilas('SELECT id, nombre FROM grupos'),
    salones: await db.obtenerFilas('SELECT id, nombre, clasificacion FROM salones'),
  };
  const informe = analizar(datos, existentes);

  const aplicando = opcion('--aplicar');
  const conClases = aplicando && opcion('--con-clases');
  const modo = aplicando ? (conClases ? 'aplicar catálogos y clases' : 'aplicar catálogos') : 'revisar (sin cambios)';
  const resultado = aplicando ? await aplicar(db, informe, { clases: conClases, fuente: datos.fuente, compartidas: opcion('--compartidas') }) : null;

  const asignados = [];
  if (espaciosElegidos.length && !aplicando) console.log('--asignar-espacio necesita --aplicar: no se cambió nada.');
  if (aplicando) for (const e of espaciosElegidos) asignados.push(await asignarEspacio(db, e));

  fs.writeFileSync(destinoInforme, informeMarkdown(datos, informe, resultado, modo) + informeAsignados(asignados));
  const cuenta = (lista) => `${lista.filter((x) => x.estado !== 'coincide').length} nuevos, ${lista.filter((x) => x.estado === 'coincide').length} ya estaban, ${lista.filter((x) => x.revisar).length} para revisar`;
  console.log(`Modo: ${modo}`);
  console.log(`Materias: ${informe.materias.length} (${cuenta(informe.materias)})`);
  console.log(`Grupos: ${informe.grupos.length} (${cuenta(informe.grupos)})`);
  console.log(`Docentes: ${informe.docentes.length} (${cuenta(informe.docentes)})`);
  console.log(`Espacios: ${informe.espacios.length} (${informe.espacios.filter((e) => e.salon_id).length} vinculados al plano, ${informe.espacios.filter((e) => e.revisar).length} para revisar)`);
  if (resultado) {
    console.log(`Guardado: ${resultado.materias} materias, ${resultado.docentes} docentes, ${resultado.grupos} grupos nuevos; ${resultado.gruposCompletados} grupos completados.`);
    if (conClases) console.log(`Clases: ${resultado.clases} guardadas (${resultado.compartidas} con aula compartida según el PDF), ${resultado.yaImportadas} ya estaban, ${resultado.conflictos.length} no guardadas por superposición; ${resultado.grillas} grillas nuevas.`);
  }
  for (const r of asignados) {
    console.log(`Espacio «${r.original}» → ${r.salon}: ${r.asignadas} clases asignadas, ${r.sinLugar.length} sin espacio por superponerse.`);
  }
  console.log(`Informe: ${path.relative(process.cwd(), destinoInforme)}`);
}

principal()
  .catch((error) => {
    console.error('No se pudo importar:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
