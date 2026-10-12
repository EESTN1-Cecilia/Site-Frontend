process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-contenido.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-contenido.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const app = require('../../app');
const db = require('../database/db');
const { OPCIONES } = require('../utils/tokens');
const { paginaDeClave } = require('../utils/contenido');

let servidorHTTP;
let puerto;
const tokens = {};

const generarToken = (idUsuario) =>
  jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });

function peticion(metodo, ruta, cuerpo, token, crudo) {
  return new Promise((resolve, reject) => {
    const datos = crudo ?? (cuerpo === undefined ? null : JSON.stringify(cuerpo));
    const req = http.request(
      {
        method: metodo,
        hostname: 'localhost',
        port: puerto,
        path: ruta,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let texto = '';
        res.on('data', (c) => (texto += c));
        res.on('end', () => {
          try { resolve({ estado: res.statusCode, cuerpo: JSON.parse(texto) }); }
          catch { resolve({ estado: res.statusCode, cuerpo: texto }); }
        });
      }
    );
    req.on('error', reject);
    if (datos) req.write(datos);
    req.end();
  });
}

before(async () => {
  await db.asegurarMigraciones();
  for (const [username, rol] of [['director', 'direccion'], ['jefe', 'jefatura_area'], ['ematp', 'server']]) {
    const r = await db.ejecutar(
      'INSERT INTO usuarios (username, password_hash, rol) VALUES (?, ?, ?)',
      username, 'hash-que-no-se-usa', rol
    );
    tokens[rol] = generarToken(r.lastID);
  }
  servidorHTTP = http.createServer(app);
  await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
});

after(() => new Promise((r) => servidorHTTP.close(r)));

describe('paginaDeClave (igual que el frontend)', () => {
  it('asigna cada clave a su página', () => {
    assert.strictEqual(paginaDeClave('inicio.hero.titulo'), '/');
    assert.strictEqual(paginaDeClave('img:novedades.hero.logo'), '/novedades');
    assert.strictEqual(paginaDeClave('orden:previas.pasos'), '/previas');
    assert.strictEqual(paginaDeClave('proyectos.informatica.faq.q0.pregunta'), '/proyectos/informatica');
    assert.strictEqual(paginaDeClave('proyectos.faq.titulo'), null);
    assert.strictEqual(paginaDeClave('pub:n1:titulo'), null);
    assert.strictEqual(paginaDeClave('constructor.x'), null);
  });

  it('el menú y el pie del sitio se editan con Inicio', () => {
    assert.strictEqual(paginaDeClave('inicio.menu.ingresar'), '/');
    assert.strictEqual(paginaDeClave('img:inicio.menu.logo'), '/');
    assert.strictEqual(paginaDeClave('inicio.pie.enlaces.panel'), '/');
  });
});

describe('GET /api/contenido', () => {
  it('sin nada guardado devuelve null en cada sección (el sitio usa lo original)', async () => {
    const res = await peticion('GET', '/api/contenido');
    assert.strictEqual(res.estado, 200);
    for (const seccion of ['textos', 'ajustes', 'mesas', 'programas', 'proyectos', 'publicaciones']) {
      assert.strictEqual(res.cuerpo[seccion], null, seccion);
    }
  });
});

describe('Textos de páginas', () => {
  it('sin token → 401', async () => {
    const res = await peticion('PUT', '/api/contenido/textos', { pagina: '/previas', textos: {} });
    assert.strictEqual(res.estado, 401);
  });

  it('jefatura edita Previas (su página por defecto)', async () => {
    const res = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/previas', textos: { 'previas.hero.titulo': 'Mesas de diciembre', 'orden:previas.pasos': ['p1', 'p0'] } },
      tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
  });

  it('jefatura NO edita Inicio (es de secretaría por defecto) → 403', async () => {
    const res = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/', textos: { 'inicio.hero.titulo': 'hackeado' } }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 403);
  });

  it('una clave de otra página no entra con el permiso de esta → 400', async () => {
    const res = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/previas', textos: { 'inicio.hero.titulo': 'colado' } }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 400);
  });

  it('valores inválidos → 400 (link javascript:, fondo que no existe, objeto)', async () => {
    for (const textos of [
      { 'link:previas.boton': 'javascript:alert(1)' },
      { 'fondo:previas.hero': 'modal' },
      { 'previas.hero.titulo': { a: 1 } },
    ]) {
      const res = await peticion('PUT', '/api/contenido/textos', { pagina: '/previas', textos }, tokens.direccion);
      assert.strictEqual(res.estado, 400, JSON.stringify(textos));
    }
  });

  it('guardar una página conserva los textos de las demás', async () => {
    const res = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/', textos: { 'inicio.hero.titulo': 'Bienvenidos' } }, tokens.direccion);
    assert.strictEqual(res.estado, 200);
    const { cuerpo } = await peticion('GET', '/api/contenido');
    assert.strictEqual(cuerpo.textos['inicio.hero.titulo'], 'Bienvenidos');
    assert.strictEqual(cuerpo.textos['previas.hero.titulo'], 'Mesas de diciembre');
  });

  it('acepta imágenes subidas de más de 10 kb (límite propio de contenido)', async () => {
    const imagen = 'data:image/png;base64,' + 'A'.repeat(200 * 1024);
    const res = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/', textos: { 'img:inicio.hero.foto': imagen } }, tokens.direccion);
    assert.strictEqual(res.estado, 200);
  });

  it('zona libre: acepta HTML con imágenes subidas; no un objeto', async () => {
    const html = `<p>Hola</p><img src="data:image/png;base64,${'A'.repeat(200 * 1024)}">`;
    const ok = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/novedades', textos: { 'novedades.libre': html } }, tokens.direccion);
    assert.strictEqual(ok.estado, 200);

    const mal = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/novedades', textos: { 'novedades.libre': { html } } }, tokens.direccion);
    assert.strictEqual(mal.estado, 400);
  });

  it('página entera: se guarda con el permiso de esa página', async () => {
    const pagina = '<section class="seccion contenedor"><h2 id="i1">Hola</h2></section><div data-dinamico="cronograma"></div>';
    const ok = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/previas', textos: { 'previas.pagina': pagina, 'previas.pagina.css': '#i1 { color: rgb(139, 30, 30); }' } },
      tokens.jefatura_area);
    assert.strictEqual(ok.estado, 200);

    const ajena = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/', textos: { 'inicio.pagina': pagina } }, tokens.jefatura_area);
    assert.strictEqual(ajena.estado, 403);

    const conUrl = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/previas', textos: { 'previas.pagina.css': '#i1 { background: url(https://evil.test/x.png) }' } },
      tokens.jefatura_area);
    assert.strictEqual(conUrl.estado, 400);
  });

  it('zona libre: acepta sus estilos; no url(), @import ni etiquetas', async () => {
    const ok = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/novedades', textos: { 'novedades.libre': '<p id="i1">Hola</p>', 'novedades.libre.css': '#i1 { color: rgb(139, 30, 30); }' } },
      tokens.direccion);
    assert.strictEqual(ok.estado, 200);

    for (const css of ['#i1 { background-image: url(https://evil.test/x.png); }', '@import "https://evil.test/a.css";', '</style><script>alert(1)</script>']) {
      const res = await peticion('PUT', '/api/contenido/textos',
        { pagina: '/novedades', textos: { 'novedades.libre.css': css } }, tokens.direccion);
      assert.strictEqual(res.estado, 400, css);
    }
  });

  it('JSON mal formado → 400', async () => {
    const res = await peticion('PUT', '/api/contenido/textos', undefined, tokens.direccion, '{"pagina":');
    assert.strictEqual(res.estado, 400);
  });
});

describe('Ajustes y reparto de páginas', () => {
  it('sólo Dirección → 403 para jefatura', async () => {
    const res = await peticion('PUT', '/api/ajustes', { inscripcionAbierta: false }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 403);
  });

  it('rechaza roles, páginas y ajustes desconocidos', async () => {
    for (const cambio of [
      { edicionPaginas: { '/': ['alumno'] } },
      { edicionPaginas: { '/admin': ['jefatura'] } },
      { cualquierCosa: true },
      { redes: [{ id: 'r1', red: 'instagram', url: 'javascript:alert(1)' }] },
    ]) {
      const res = await peticion('PUT', '/api/ajustes', cambio, tokens.direccion);
      assert.strictEqual(res.estado, 400, JSON.stringify(cambio));
    }
  });

  it('cuando Dirección le da Inicio a jefatura, jefatura puede editarla', async () => {
    const reparto = await peticion('PUT', '/api/ajustes', { edicionPaginas: { '/': ['secretaria', 'jefatura'] } }, tokens.direccion);
    assert.strictEqual(reparto.estado, 200);
    const res = await peticion('PUT', '/api/contenido/textos',
      { pagina: '/', textos: { 'inicio.hero.titulo': 'Editado por jefatura' } }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
  });
});

describe('Publicaciones', () => {
  const nota = {
    id: 'pub-test',
    titulo: 'Nota de prueba',
    seccion: 'Novedades',
    ruta: '/novedades',
    categoria: 'Institucional',
    autor: 'Jefatura',
    fecha: '2026-09-24',
    estado: 'publicada',
    bloques: [{ id: 'b1', tipo: 'parrafo', texto: 'Hola' }],
  };

  it('lo que guarda jefatura queda pendiente aunque mande "publicada"', async () => {
    const res = await peticion('POST', '/api/publicaciones', nota, tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.publicacion.estado, 'pendiente');
  });

  it('el sitio no ve la pendiente (todavía no hay notas publicadas)', async () => {
    const { cuerpo } = await peticion('GET', '/api/contenido');
    assert.strictEqual(cuerpo.publicaciones, null);
  });

  it('jefatura no puede aprobar; server no puede guardar notas → 403', async () => {
    assert.strictEqual((await peticion('POST', '/api/publicaciones/pub-test/aprobar', undefined, tokens.jefatura_area)).estado, 403);
    assert.strictEqual((await peticion('POST', '/api/publicaciones', nota, tokens.server)).estado, 403);
  });

  it('Dirección aprueba y la nota aparece en el sitio', async () => {
    const res = await peticion('POST', '/api/publicaciones/pub-test/aprobar', undefined, tokens.direccion);
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.publicacion.estado, 'publicada');
    const { cuerpo } = await peticion('GET', '/api/contenido');
    assert.deepStrictEqual(cuerpo.publicaciones.map((p) => p.id), ['pub-test']);
  });

  it('aprobar una nota que no está en el servidor → 404', async () => {
    const res = await peticion('POST', '/api/publicaciones/no-existe/aprobar', undefined, tokens.direccion);
    assert.strictEqual(res.estado, 404);
  });

  it('server sólo ve las publicadas; gestión ve todas', async () => {
    await peticion('POST', '/api/publicaciones', { ...nota, id: 'pub-borrador' }, tokens.jefatura_area);
    const server = await peticion('GET', '/api/publicaciones', undefined, tokens.server);
    assert.deepStrictEqual(server.cuerpo.publicaciones.map((p) => p.id), ['pub-test']);
    const jefe = await peticion('GET', '/api/publicaciones', undefined, tokens.jefatura_area);
    assert.strictEqual(jefe.cuerpo.publicaciones.length, 2);
  });

  it('una imagen con esquema peligroso o una ruta rara → 400', async () => {
    for (const cambio of [
      { bloques: [{ id: 'b1', tipo: 'imagen', url: 'javascript:alert(1)' }] },
      { bloques: [{ id: 'b1', tipo: 'link', texto: 'Formulario', url: 'javascript:alert(1)' }] },
      { ruta: '/panel' },
      { id: '../x' },
    ]) {
      const res = await peticion('POST', '/api/publicaciones', { ...nota, ...cambio }, tokens.direccion);
      assert.strictEqual(res.estado, 400, JSON.stringify(cambio));
    }
  });

  it('una nota puede llevar un bloque con un link https', async () => {
    const link = { id: 'b2', tipo: 'link', texto: 'Ir al formulario', url: 'https://forms.gle/abc' };
    const res = await peticion('POST', '/api/publicaciones', { ...nota, id: 'pub-borrador', bloques: [link] }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
    assert.deepStrictEqual(res.cuerpo.publicacion.bloques, [link]);
  });
});

describe('Mesas, programas y proyectos', () => {
  it('server guarda el cronograma; un link que no es https → 400', async () => {
    const mesas = { carpeta: 'https://drive.google.com/x', mesas: [{ id: 'm1', materia: 'Matemática', drive: '' }] };
    assert.strictEqual((await peticion('PUT', '/api/mesas', mesas, tokens.server)).estado, 200);
    const malo = { ...mesas, mesas: [{ id: 'm1', materia: 'X', drive: 'javascript:alert(1)' }] };
    assert.strictEqual((await peticion('PUT', '/api/mesas', malo, tokens.server)).estado, 400);
  });

  it('mesas: subcarpetas se guardan con su nombre y link; un link inválido → 400', async () => {
    const conSubcarpetas = {
      carpeta: 'https://drive.google.com/x',
      subcarpetas: [
        { id: 'sc1', nombre: '1° a 4° año', link: 'https://drive.google.com/sc1' },
        { id: 'sc2', nombre: 'Informática (5° a 7°)', link: '' },
      ],
      mesas: [{ id: 'm1', materia: 'Matemática', drive: '' }],
    };
    const res = await peticion('PUT', '/api/mesas', conSubcarpetas, tokens.server);
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.mesas.subcarpetas[0].nombre, '1° a 4° año');
    assert.strictEqual(res.cuerpo.mesas.subcarpetas[1].link, '');

    const malo = { ...conSubcarpetas, subcarpetas: [{ id: 'sc1', nombre: 'X', link: 'ftp://x' }] };
    assert.strictEqual((await peticion('PUT', '/api/mesas', malo, tokens.server)).estado, 400);
  });

  it('programas: server no puede; sin link https → 400', async () => {
    const programas = [{ id: 'p1', nombre: 'DiagramTec', url: 'https://diagramtec.com' }];
    assert.strictEqual((await peticion('PUT', '/api/programas', { programas }, tokens.server)).estado, 403);
    assert.strictEqual((await peticion('PUT', '/api/programas', { programas: [{ id: 'p1', nombre: 'X', url: 'ftp://x' }] }, tokens.jefatura_area)).estado, 400);
    assert.strictEqual((await peticion('PUT', '/api/programas', { programas }, tokens.jefatura_area)).estado, 200);
  });

  it('programas: en desarrollo no necesita link; sin marcar sigue exigiéndolo', async () => {
    const programas = [
      { id: 'p1', nombre: 'DiagramTec', url: 'https://diagramtec.com' },
      { id: 'p2', nombre: 'Volta', url: '', enDesarrollo: true },
    ];
    const res = await peticion('PUT', '/api/programas', { programas }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.programas[1].enDesarrollo, true);
    assert.strictEqual(res.cuerpo.programas[1].url, '');

    const sinMarcar = [...programas, { id: 'p3', nombre: 'X', url: '' }];
    assert.strictEqual((await peticion('PUT', '/api/programas', { programas: sinMarcar }, tokens.jefatura_area)).estado, 400);
  });

  it('proyectos: área inválida o documento a otro dominio → 400; válido → se guarda por área', async () => {
    const proyecto = { id: 'robot', titulo: 'Robot', docs: [{ nombre: 'Informe', archivo: '/docs/informe.pdf' }] };
    assert.strictEqual((await peticion('PUT', '/api/proyectos/constructor', { proyectos: [proyecto] }, tokens.jefatura_area)).estado, 400);
    const malo = { ...proyecto, docs: [{ nombre: 'Informe', archivo: '//evil.com/x.pdf' }] };
    assert.strictEqual((await peticion('PUT', '/api/proyectos/informatica', { proyectos: [malo] }, tokens.jefatura_area)).estado, 400);
    assert.strictEqual((await peticion('PUT', '/api/proyectos/informatica', { proyectos: [proyecto] }, tokens.jefatura_area)).estado, 200);

    const { cuerpo } = await peticion('GET', '/api/contenido');
    assert.deepStrictEqual(Object.keys(cuerpo.proyectos), ['informatica']);
    assert.strictEqual(cuerpo.mesas.mesas[0].materia, 'Matemática');
    assert.strictEqual(cuerpo.programas[0].nombre, 'DiagramTec');
  });
});
