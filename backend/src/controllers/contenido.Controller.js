const db = require('../database/db');
const { ROLES } = require('../utils/roles');
const {
  PAGINAS,
  AREAS_PROYECTOS,
  REPARTO_POR_DEFECTO,
  ROLES_EDITORES,
  EDITORES,
  rolDelSitio,
  paginaDeClave,
  DatoInvalido,
  falla,
  esObjeto,
  texto,
  textoOpcional,
  lista,
  identificador,
  linkOpcional,
  imagenOpcional,
  documento,
  textos,
  validarValorTexto,
} = require('../utils/contenido');

// Contenido del sitio público: lo que gestión edita y el sitio muestra.
// Cada sección se guarda entera como JSON (tabla contenido); las notas, una
// por fila (tabla publicaciones). Mientras una sección no se guardó nunca se
// devuelve null y el sitio muestra su contenido original.

const leerSeccion = async (seccion) => {
  const fila = await db.obtenerFila('SELECT datos FROM contenido WHERE seccion = ?', seccion);
  return fila ? JSON.parse(fila.datos) : null;
};

const guardarSeccion = (seccion, datos, usuarioId) =>
  db.ejecutar(
    `INSERT INTO contenido (seccion, datos, actualizado_por, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(seccion) DO UPDATE SET
       datos = excluded.datos,
       actualizado_por = excluded.actualizado_por,
       updated_at = excluded.updated_at`,
    seccion, JSON.stringify(datos), usuarioId
  );

// Las escrituras que leen y vuelven a guardar una sección (textos de una
// página, proyectos de un área, ajustes) van de a una: si no, dos editores a
// la vez podrían pisarse lo que guardó el otro.
let cola = Promise.resolve();
const enSerie = (tarea) => {
  const resultado = cola.then(tarea, tarea);
  cola = resultado.catch(() => {});
  return resultado;
};

// Los errores de validación son 400 con el mensaje; el resto, 500 genérico.
const responder = (nombre, accion) => async (req, res) => {
  try {
    return await accion(req, res);
  } catch (error) {
    if (error instanceof DatoInvalido) return res.status(400).json({ error: error.message });
    console.error(`[Contenido] Error en ${nombre}:`, error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const puedeEditar = (usuario, seccion) => EDITORES[seccion].includes(usuario.rol);

// ---------- Publicaciones ----------
const ESTADOS = ['pendiente', 'publicada', 'devuelta'];
const TIPOS_BLOQUE = ['titulo', 'destacado', 'imagen', 'parrafo', 'link'];
const RUTAS_PUBLICACION = ['/novedades', '/previas'];

const conEstado = (fila) => ({ ...JSON.parse(fila.datos), estado: fila.estado });

// Una vez que Dirección publicó alguna nota, el sitio muestra sólo las del
// servidor (aunque después se despubliquen todas). Antes, las originales.
const MARCA_NOTAS = 'publicaciones';
const marcarNotasIniciadas = (usuarioId) => guardarSeccion(MARCA_NOTAS, { iniciadas: true }, usuarioId);

function validarPublicacion(pub) {
  if (!esObjeto(pub)) falla('La publicación tiene que ser un objeto');
  const ruta = texto(pub.ruta, 'ruta', 50);
  if (!RUTAS_PUBLICACION.includes(ruta)) falla('ruta inválida');

  return {
    id: identificador(pub.id),
    titulo: texto(pub.titulo, 'titulo', 300),
    seccion: textoOpcional(pub.seccion, 'seccion', 100),
    ruta,
    categoria: textoOpcional(pub.categoria, 'categoria', 100),
    autor: textoOpcional(pub.autor, 'autor', 100),
    fecha: textoOpcional(pub.fecha, 'fecha', 30),
    bloques: lista(pub.bloques || [], 'bloques', 100).map((bloque, i) => {
      if (!esObjeto(bloque)) falla(`bloques[${i}] inválido`);
      const tipo = texto(bloque.tipo, `bloques[${i}].tipo`, 20);
      if (!TIPOS_BLOQUE.includes(tipo)) falla(`bloques[${i}].tipo inválido`);
      if (tipo === 'link') {
        return {
          id: identificador(bloque.id, `bloques[${i}].id`),
          tipo,
          texto: textoOpcional(bloque.texto, `bloques[${i}].texto`, 300),
          url: linkOpcional(bloque.url, `bloques[${i}].url`),
        };
      }
      return tipo === 'imagen'
        ? {
            id: identificador(bloque.id, `bloques[${i}].id`),
            tipo,
            url: imagenOpcional(bloque.url, `bloques[${i}].url`),
            epigrafe: textoOpcional(bloque.epigrafe, `bloques[${i}].epigrafe`, 500),
          }
        : {
            id: identificador(bloque.id, `bloques[${i}].id`),
            tipo,
            texto: textoOpcional(bloque.texto, `bloques[${i}].texto`, 20000),
          };
    }),
  };
}

// ---------- Rutas ----------

// GET /api/contenido (público): todo lo que el sitio necesita para dibujarse.
const obtenerContenido = responder('obtenerContenido', async (req, res) => {
  const filas = await db.obtenerFilas('SELECT seccion, datos FROM contenido');
  const secciones = Object.fromEntries(filas.map((f) => [f.seccion, JSON.parse(f.datos)]));

  const publicaciones = secciones[MARCA_NOTAS]
    ? (await db.obtenerFilas(
        "SELECT datos, estado FROM publicaciones WHERE estado = 'publicada' ORDER BY updated_at DESC"
      )).map(conEstado)
    : null;

  return res.json({
    textos: secciones.textos ?? null,
    ajustes: secciones.ajustes ?? null,
    mesas: secciones.mesas ?? null,
    programas: secciones.programas ?? null,
    proyectos: secciones.proyectos ?? null,
    publicaciones,
  });
});

// PUT /api/contenido/textos { pagina, textos }: reemplaza los textos de UNA
// página. Cada clave tiene que ser de esa página y quien guarda tiene que
// poder editarla (Dirección, o su rol en el reparto de Dirección).
const guardarTextos = responder('guardarTextos', (req, res) =>
  enSerie(async () => {
    const { pagina, textos: nuevos } = req.body || {};
    if (!PAGINAS.includes(pagina)) falla('Página inválida');
    if (!esObjeto(nuevos)) falla('textos tiene que ser un objeto');

    const ajustes = await leerSeccion('ajustes');
    const reparto = (ajustes && ajustes.edicionPaginas) || {};
    const editores = reparto[pagina] ?? REPARTO_POR_DEFECTO[pagina] ?? [];
    if (req.usuario.rol !== ROLES.DIRECCION && !editores.includes(rolDelSitio(req.usuario.rol))) {
      return res.status(403).json({ error: 'No tenés permiso para editar esta página' });
    }

    const entradas = Object.entries(nuevos);
    if (entradas.length > 3000) falla('Demasiados textos para una página');
    for (const [clave, valor] of entradas) {
      if (clave.length > 200 || paginaDeClave(clave) !== pagina) falla(`La clave ${clave.slice(0, 80)} no es de esta página`);
      validarValorTexto(clave, valor);
    }

    // Se conservan los textos de las demás páginas.
    const actuales = (await leerSeccion('textos')) || {};
    const deOtras = Object.fromEntries(Object.entries(actuales).filter(([clave]) => paginaDeClave(clave) !== pagina));
    await guardarSeccion('textos', { ...deOtras, ...nuevos }, req.usuario.id);
    return res.json({ mensaje: 'Textos guardados' });
  })
);

// PUT /api/ajustes (Dirección): cambio parcial de los ajustes del sitio.
function validarAjustes(cambio) {
  if (!esObjeto(cambio)) falla('Los ajustes tienen que ser un objeto');
  const limpio = {};

  for (const [clave, valor] of Object.entries(cambio)) {
    if (clave === 'inscripcionAbierta') {
      if (typeof valor !== 'boolean') falla('inscripcionAbierta tiene que ser verdadero o falso');
      limpio.inscripcionAbierta = valor;
    } else if (clave === 'mensajeCierre') {
      limpio.mensajeCierre = texto(valor, 'mensajeCierre', 1000);
    } else if (clave === 'edicionPaginas') {
      if (valor === null) {
        limpio.edicionPaginas = null;
        continue;
      }
      if (!esObjeto(valor)) falla('edicionPaginas tiene que ser un objeto');
      limpio.edicionPaginas = Object.fromEntries(
        Object.entries(valor).map(([pagina, roles]) => {
          if (!PAGINAS.includes(pagina)) falla(`edicionPaginas: página inválida ${pagina.slice(0, 80)}`);
          lista(roles, `edicionPaginas[${pagina}]`, ROLES_EDITORES.length);
          for (const rol of roles) {
            if (!ROLES_EDITORES.includes(rol)) falla(`edicionPaginas: rol inválido ${String(rol).slice(0, 40)}`);
          }
          return [pagina, [...new Set(roles)]];
        })
      );
    } else if (clave === 'redes') {
      limpio.redes = lista(valor, 'redes', 20).map((red, i) => {
        if (!esObjeto(red)) falla(`redes[${i}] inválida`);
        return {
          id: identificador(red.id, `redes[${i}].id`),
          red: identificador(red.red, `redes[${i}].red`),
          url: linkOpcional(red.url, `redes[${i}].url`),
        };
      });
    } else {
      falla(`Ajuste desconocido: ${clave.slice(0, 80)}`);
    }
  }
  return limpio;
}

const guardarAjustes = responder('guardarAjustes', (req, res) =>
  enSerie(async () => {
    const cambio = validarAjustes(req.body);
    const ajustes = { ...((await leerSeccion('ajustes')) || {}), ...cambio };
    await guardarSeccion('ajustes', ajustes, req.usuario.id);
    return res.json({ ajustes });
  })
);

// GET /api/publicaciones: gestión ve también las que esperan revisión. Un rol
// que no maneja notas recibe sólo las publicadas (lo mismo que el sitio).
const listarPublicaciones = responder('listarPublicaciones', async (req, res) => {
  const total = await db.obtenerFila('SELECT COUNT(*) AS n FROM publicaciones');
  if (!total.n) return res.json({ publicaciones: null });

  const filas = puedeEditar(req.usuario, 'publicaciones')
    ? await db.obtenerFilas('SELECT datos, estado FROM publicaciones ORDER BY updated_at DESC')
    : await db.obtenerFilas("SELECT datos, estado FROM publicaciones WHERE estado = 'publicada' ORDER BY updated_at DESC");
  return res.json({ publicaciones: filas.map(conEstado) });
});

// POST /api/publicaciones: crea o actualiza una nota. El servidor decide el
// estado: lo que guarda alguien que no es Dirección vuelve a esperar su visto.
const guardarPublicacion = responder('guardarPublicacion', async (req, res) => {
  const publicacion = validarPublicacion(req.body);
  const esDireccion = req.usuario.rol === ROLES.DIRECCION;
  const pedido = req.body.estado;
  const estado = esDireccion && ESTADOS.includes(pedido) ? pedido : 'pendiente';

  await db.ejecutar(
    `INSERT INTO publicaciones (id, datos, estado, autor_id, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       datos = excluded.datos,
       estado = excluded.estado,
       updated_at = excluded.updated_at`,
    publicacion.id, JSON.stringify(publicacion), estado, req.usuario.id
  );
  if (estado === 'publicada') await marcarNotasIniciadas(req.usuario.id);

  return res.json({ publicacion: { ...publicacion, estado } });
});

// POST /api/publicaciones/:id/aprobar | /devolver (Dirección).
const cambiarEstado = (estado) =>
  responder('cambiarEstado', async (req, res) => {
    const resultado = await db.ejecutar(
      "UPDATE publicaciones SET estado = ?, updated_at = datetime('now') WHERE id = ?",
      estado, req.params.id
    );
    if (resultado.changes !== 1) {
      return res.status(404).json({ error: 'Esa nota todavía no está guardada en el servidor: guardala y después aprobala' });
    }
    if (estado === 'publicada') await marcarNotasIniciadas(req.usuario.id);

    const fila = await db.obtenerFila('SELECT datos, estado FROM publicaciones WHERE id = ?', req.params.id);
    return res.json({ publicacion: conEstado(fila) });
  });

// DELETE /api/publicaciones/:id. Borrar algo que ya no está no es un error.
const borrarPublicacion = responder('borrarPublicacion', async (req, res) => {
  await db.ejecutar('DELETE FROM publicaciones WHERE id = ?', req.params.id);
  return res.json({ mensaje: 'Publicación borrada' });
});

// PUT /api/mesas { carpeta, mesas }: cronograma completo de intensificación.
const guardarMesas = responder('guardarMesas', async (req, res) => {
  const cuerpo = req.body;
  if (!esObjeto(cuerpo)) falla('El cronograma tiene que ser un objeto');

  const mesas = {
    carpeta: linkOpcional(cuerpo.carpeta, 'carpeta'),
    mesas: lista(cuerpo.mesas, 'mesas', 300).map((mesa, i) => {
      if (!esObjeto(mesa)) falla(`mesas[${i}] inválida`);
      return {
        id: identificador(mesa.id, `mesas[${i}].id`),
        materia: textoOpcional(mesa.materia, 'materia', 200),
        anio: textoOpcional(mesa.anio, 'anio', 50),
        fecha: textoOpcional(mesa.fecha, 'fecha', 30),
        hora: textoOpcional(mesa.hora, 'hora', 30),
        aula: textoOpcional(mesa.aula, 'aula', 100),
        docente: textoOpcional(mesa.docente, 'docente', 200),
        drive: linkOpcional(mesa.drive, 'drive'),
      };
    }),
  };

  await guardarSeccion('mesas', mesas, req.usuario.id);
  return res.json({ mesas });
});

// PUT /api/programas { programas }: la lista completa de la portada.
const guardarProgramas = responder('guardarProgramas', async (req, res) => {
  const programas = lista((req.body || {}).programas, 'programas', 100).map((prog, i) => {
    if (!esObjeto(prog)) falla(`programas[${i}] inválido`);
    const url = linkOpcional(prog.url, `programas[${i}].url`);
    if (!url) falla(`programas[${i}] necesita un link https://`);
    const nombre = texto(prog.nombre, `programas[${i}].nombre`, 200);
    if (!nombre.trim()) falla(`programas[${i}] necesita nombre`);
    return {
      id: identificador(prog.id, `programas[${i}].id`),
      nombre,
      descripcion: textoOpcional(prog.descripcion, 'descripcion', 2000),
      url,
      logo: imagenOpcional(prog.logo, `programas[${i}].logo`),
      autores: textoOpcional(prog.autores, 'autores', 1000),
    };
  });

  await guardarSeccion('programas', programas, req.usuario.id);
  return res.json({ programas });
});

// PUT /api/proyectos/:area { proyectos }: la lista completa de un área.
const guardarProyectos = responder('guardarProyectos', (req, res) =>
  enSerie(async () => {
    const { area } = req.params;
    if (!AREAS_PROYECTOS.includes(area)) falla('Área inválida');

    const proyectos = lista((req.body || {}).proyectos, 'proyectos', 100).map((p, i) => {
      if (!esObjeto(p)) falla(`proyectos[${i}] inválido`);
      return {
        id: identificador(p.id, `proyectos[${i}].id`),
        titulo: texto(p.titulo, 'titulo', 300),
        anio: textoOpcional(p.anio, 'anio', 50),
        equipo: p.equipo === null || p.equipo === undefined ? null : textos(p.equipo, 'equipo'),
        resumen: textoOpcional(p.resumen, 'resumen', 5000),
        stack: textos(p.stack || [], 'stack'),
        aprendizajes: textos(p.aprendizajes || [], 'aprendizajes'),
        repo: linkOpcional(p.repo, 'repo') || null,
        docs: lista(p.docs || [], 'docs', 30).map((doc, j) => {
          if (!esObjeto(doc)) falla(`docs[${j}] inválido`);
          return {
            nombre: texto(doc.nombre, `docs[${j}].nombre`, 300),
            archivo: documento(doc.archivo, `docs[${j}].archivo`),
            peso: textoOpcional(doc.peso, 'peso', 30),
            paginas: doc.paginas === undefined || doc.paginas === null ? '' : texto(String(doc.paginas), 'paginas', 10),
          };
        }),
      };
    });

    const actuales = (await leerSeccion('proyectos')) || {};
    await guardarSeccion('proyectos', { ...actuales, [area]: proyectos }, req.usuario.id);
    return res.json({ proyectos });
  })
);

module.exports = {
  obtenerContenido,
  guardarTextos,
  guardarAjustes,
  listarPublicaciones,
  guardarPublicacion,
  aprobarPublicacion: cambiarEstado('publicada'),
  devolverPublicacion: cambiarEstado('devuelta'),
  borrarPublicacion,
  guardarMesas,
  guardarProgramas,
  guardarProyectos,
};
