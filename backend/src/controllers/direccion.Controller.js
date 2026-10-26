const db = require('../database/db');
const { ROLES } = require('../utils/roles');
const { lunesDe } = require('./asignaciones.Controller');

// Tablero de Dirección: un resumen de lo que hicieron los demás perfiles y de
// lo que espera una decisión. Sólo lectura; sale de lo que ya registra el
// sistema (historial de clases, cartelera, publicaciones, archivos subidos).
//
// Jerarquía: Dirección > Jefatura de Área > EMATP.

const NIVELES = [
  { nivel: 1, rol: ROLES.DIRECCION, nombre: 'Dirección', cargo: 'Conducción institucional' },
  { nivel: 2, rol: ROLES.JEFATURA_AREA, nombre: 'Jefatura de Área', cargo: 'Espacios, horarios y seguimiento curricular' },
  { nivel: 3, rol: ROLES.SERVIDOR, nombre: 'EMATP', cargo: 'Server, inventario y cartelera' },
];
const DIAS_ACTIVIDAD = 7;
const desde = `datetime('now', '-${DIAS_ACTIVIDAD} days')`;

const nombreDe = (u) => (u ? u.nombre || u.username : 'Sistema (importaciones y tareas automáticas)');

// GET /api/direccion/resumen
async function resumen(req, res) {
  try {
    const usuarios = await db.obtenerFilas('SELECT id, username, nombre, rol, activo FROM usuarios ORDER BY id');
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    const lunes = lunesDe();

    const [registro, cartelera, publicaciones, archivos, contenido] = await Promise.all([
      db.obtenerFilas(`SELECT id, accion, detalle, usuario_id, created_at FROM asignaciones_registro WHERE created_at >= ${desde} ORDER BY id DESC`),
      db.obtenerFilas(`SELECT id, titulo, nivel, activo, autor_id, created_at FROM cartelera ORDER BY id DESC`),
      db.obtenerFilas(`SELECT id, estado, autor_id, datos, created_at, updated_at FROM publicaciones ORDER BY updated_at DESC`),
      db.obtenerFilas(`SELECT id, user_id, original_name, destination, status, created_at FROM upload_logs WHERE created_at >= ${desde} ORDER BY id DESC`),
      db.obtenerFilas(`SELECT seccion, actualizado_por, updated_at FROM contenido WHERE updated_at >= ${desde} AND seccion NOT LIKE '%_respaldo'`),
    ]);

    // Qué hizo cada persona en la semana.
    const actividad = new Map();
    const sumar = (id, campo, fecha) => {
      if (!id) return;
      const a = actividad.get(id) ?? { clases: 0, cartelera: 0, publicaciones: 0, archivos: 0, sitio: 0, ultima: null };
      a[campo] += 1;
      if (fecha && (!a.ultima || fecha > a.ultima)) a.ultima = fecha;
      actividad.set(id, a);
    };
    registro.forEach((r) => sumar(r.usuario_id, 'clases', r.created_at));
    cartelera.filter((c) => c.created_at >= sqlHace(DIAS_ACTIVIDAD)).forEach((c) => sumar(c.autor_id, 'cartelera', c.created_at));
    publicaciones.filter((p) => p.updated_at >= sqlHace(DIAS_ACTIVIDAD)).forEach((p) => sumar(p.autor_id, 'publicaciones', p.updated_at));
    archivos.forEach((a) => sumar(a.user_id, 'archivos', a.created_at));
    contenido.forEach((c) => sumar(c.actualizado_por, 'sitio', c.updated_at));

    const equipo = NIVELES.map((n) => ({
      ...n,
      personas: usuarios
        .filter((u) => u.rol === n.rol)
        .map((u) => ({
          id: u.id,
          usuario: u.username,
          nombre: u.nombre || u.username,
          activo: !!u.activo,
          actividad: actividad.get(u.id) ?? { clases: 0, cartelera: 0, publicaciones: 0, archivos: 0, sitio: 0, ultima: null },
        }))
        .sort((a, b) => b.activo - a.activo || (b.actividad.ultima ?? '').localeCompare(a.actividad.ultima ?? '')),
    }));

    // Lo último que pasó, de todos los perfiles, en una sola línea de tiempo.
    const quien = (id) => {
      const u = porId.get(id);
      return { quien: nombreDe(u), rol: u?.rol ?? 'sistema' };
    };
    const titulo = (datos) => {
      try {
        return JSON.parse(datos).titulo || 'Novedad';
      } catch {
        return 'Novedad';
      }
    };
    const recientes = [
      ...registro.map((r) => ({ fecha: r.created_at, tipo: `clase-${r.accion}`, detalle: r.detalle, ...quien(r.usuario_id) })),
      ...cartelera.filter((c) => c.created_at >= sqlHace(DIAS_ACTIVIDAD)).map((c) => ({
        fecha: c.created_at, tipo: 'cartelera', detalle: `Cargó en la cartelera «${c.titulo || 'imagen sin título'}»`, ...quien(c.autor_id),
      })),
      ...publicaciones.filter((p) => p.updated_at >= sqlHace(DIAS_ACTIVIDAD)).map((p) => ({
        fecha: p.updated_at, tipo: `publicacion-${p.estado}`,
        detalle: `${{ pendiente: 'Envió para revisar', publicada: 'Publicó', devuelta: 'Le devolvieron' }[p.estado]} «${titulo(p.datos)}»`,
        ...quien(p.autor_id),
      })),
      ...archivos.map((a) => ({ fecha: a.created_at, tipo: 'archivo', detalle: `Subió «${a.original_name}» a ${a.destination}`, ...quien(a.user_id) })),
    ]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 14);

    // La escuela ahora (grillas vigentes).
    const n = async (sql, ...p) => (await db.obtenerFila(sql, ...p)).n;
    const vigentes = `FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id JOIN grillas g ON g.id = m.grilla_id AND g.vigente = 1`;
    const escuela = {
      clases: await n(`SELECT COUNT(*) AS n ${vigentes}`),
      compartidas: await n(`SELECT COUNT(*) AS n ${vigentes} WHERE a.compartida = 1`),
      sinEspacio: await n(`SELECT COUNT(*) AS n ${vigentes} WHERE a.salon_id IS NULL`),
      ausentesSemana: await n(`SELECT COUNT(*) AS n ${vigentes} WHERE a.estado = 'docente_ausente' AND a.semana = ?`, lunes),
      canceladasSemana: await n(`SELECT COUNT(*) AS n ${vigentes} WHERE a.estado = 'suspendida' AND a.semana = ?`, lunes),
      cambiosAulaSemana: await n(`SELECT COUNT(*) AS n ${vigentes} WHERE a.salon_habitual IS NOT NULL AND a.semana = ?`, lunes),
      docentes: await n('SELECT COUNT(*) AS n FROM docentes WHERE activo = 1'),
      materias: await n('SELECT COUNT(*) AS n FROM materias WHERE activo = 1'),
      grupos: await n('SELECT COUNT(*) AS n FROM grupos WHERE activo = 1'),
      revisar: await n(`SELECT (SELECT COUNT(*) FROM docentes WHERE activo = 1 AND revisar IS NOT NULL)
        + (SELECT COUNT(*) FROM materias WHERE activo = 1 AND revisar IS NOT NULL)
        + (SELECT COUNT(*) FROM grupos WHERE activo = 1 AND revisar IS NOT NULL) AS n`),
    };
    const carteleraResumen = {
      imagenes: cartelera.length,
      activas: cartelera.filter((c) => c.activo).length,
      porNivel: Object.fromEntries([3, 2, 1].map((x) => [x, cartelera.filter((c) => c.nivel === x).length])),
      pantallas: await n('SELECT COUNT(*) AS n FROM pantallas'),
    };

    // Lo que espera una decisión de Dirección.
    const pendientesPublicar = publicaciones.filter((p) => p.estado === 'pendiente');
    const pendientes = [
      pendientesPublicar.length && {
        tipo: 'publicaciones', cantidad: pendientesPublicar.length, ruta: '/panel/direccion',
        texto: `Novedad${pendientesPublicar.length === 1 ? '' : 'es'} esperando aprobación`,
      },
      escuela.sinEspacio && {
        tipo: 'sin-espacio', cantidad: escuela.sinEspacio, ruta: '/panel/grilla',
        texto: 'Clases sin aula del plano (SUM, TALLER u otro espacio del PDF)',
      },
      escuela.revisar && {
        tipo: 'revisar', cantidad: escuela.revisar, ruta: '/panel/grilla',
        texto: 'Docentes, materias o grupos importados marcados para revisar',
      },
      escuela.ausentesSemana + escuela.canceladasSemana && {
        tipo: 'semana', cantidad: escuela.ausentesSemana + escuela.canceladasSemana, ruta: '/panel/grilla',
        texto: 'Ausencias y clases canceladas esta semana',
      },
      !carteleraResumen.pantallas && {
        tipo: 'pantallas', cantidad: 0, ruta: '/panel/cartelera', texto: 'Ningún televisor configurado en la Cartelera digital',
      },
    ].filter(Boolean);

    return res.json({ dias: DIAS_ACTIVIDAD, equipo, recientes, escuela, cartelera: carteleraResumen, pendientes });
  } catch (error) {
    console.error('[Dirección] Error en resumen:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// La misma fecha que usa SQLite («AAAA-MM-DD hh:mm:ss», UTC) hace `dias` días.
function sqlHace(dias) {
  return new Date(Date.now() - dias * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { resumen };
