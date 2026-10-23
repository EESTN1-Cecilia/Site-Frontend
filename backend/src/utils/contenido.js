const { ROLES } = require('./roles');

// ---------------------------------------------------------------------
// Reglas del contenido del sitio público. Son las mismas que usa el
// frontend (frontend/src/sesion.js, textos.js, SitioPagina.jsx), pero acá
// son las que valen: el frontend sólo decide qué se muestra.
// ---------------------------------------------------------------------

// Páginas públicas que se editan en el lugar.
const PAGINAS = [
  '/',
  '/evaluacion',
  '/previas',
  '/novedades',
  '/inscripcion',
  '/proyectos/ciclo-basico',
  '/proyectos/informatica',
  '/proyectos/programacion',
];

const AREAS_PROYECTOS = ['ciclo-basico', 'informatica', 'programacion'];

// Quién edita los textos de cada página si Dirección no cambió el reparto
// (ajustes.edicionPaginas). Dirección edita todas. Roles con el nombre del sitio.
const REPARTO_POR_DEFECTO = {
  '/': ['secretaria'],
  '/evaluacion': ['jefatura'],
  '/previas': ['jefatura'],
  '/novedades': ['secretaria'],
  '/inscripcion': ['secretaria'],
  '/proyectos/ciclo-basico': ['jefatura'],
  '/proyectos/informatica': ['jefatura'],
  '/proyectos/programacion': ['jefatura'],
};

// Roles a los que Dirección puede darles páginas.
const ROLES_EDITORES = ['secretaria', 'jefatura', 'server'];

// El sitio llama "jefatura" a jefatura_area.
const rolDelSitio = (rol) => (rol === ROLES.JEFATURA_AREA ? 'jefatura' : rol);

// Quién modifica cada sección (roles del backend). Dirección, todo.
const EDITORES = {
  publicaciones: [ROLES.DIRECCION, ROLES.JEFATURA_AREA],
  mesas: [ROLES.DIRECCION, ROLES.JEFATURA_AREA, ROLES.SERVIDOR],
  programas: [ROLES.DIRECCION, ROLES.JEFATURA_AREA],
  proyectos: [ROLES.DIRECCION, ROLES.JEFATURA_AREA],
  ajustes: [ROLES.DIRECCION],
  // Del panel (no del sitio público): Espacios y horarios y el plano del colegio.
  grillas: [ROLES.DIRECCION, ROLES.JEFATURA_AREA],
  plano: [ROLES.DIRECCION, ROLES.JEFATURA_AREA],
};

// A qué página pertenece una clave de texto: "inicio.hero.titulo" -> "/",
// "img:novedades.hero.logo" -> "/novedades". Misma cuenta que paginaDeClave
// en frontend/src/textos.js.
const TIPOS_CLAVE = ['img', 'link', 'oculto', 'fondo', 'orden', 'extra'];
const PAGINA_POR_PREFIJO = {
  inicio: '/',
  evaluacion: '/evaluacion',
  previas: '/previas',
  novedades: '/novedades',
  inscripcion: '/inscripcion',
};

function paginaDeClave(clave) {
  if (typeof clave !== 'string' || !clave) return null;

  const [posibleTipo, ...resto] = clave.split(':');
  const sinTipo = TIPOS_CLAVE.includes(posibleTipo) ? resto.join(':') : clave;
  const partes = sinTipo.split('.');

  if (partes[0] === 'proyectos') {
    return AREAS_PROYECTOS.includes(partes[1]) ? `/proyectos/${partes[1]}` : null;
  }
  return Object.hasOwn(PAGINA_POR_PREFIJO, partes[0]) ? PAGINA_POR_PREFIJO[partes[0]] : null;
}

// ---------- Validación ----------
class DatoInvalido extends Error {}
const falla = (mensaje) => {
  throw new DatoInvalido(mensaje);
};

const MAX_TEXTO = 5000;
const MAX_IMAGEN = 3 * 1024 * 1024; // una imagen subida (data:image/…) de 1,5 MB en base64
const MAX_LIBRE = 6 * 1024 * 1024; // zona libre: el HTML con varias imágenes subidas

const esObjeto = (valor) => !!valor && typeof valor === 'object' && !Array.isArray(valor);
const esLink = (valor) => typeof valor === 'string' && /^https?:\/\//i.test(valor.trim());

const texto = (valor, nombre, max = MAX_TEXTO) => {
  if (typeof valor !== 'string') falla(`${nombre} tiene que ser texto`);
  if (valor.length > max) falla(`${nombre} es demasiado largo`);
  return valor;
};
const textoOpcional = (valor, nombre, max) =>
  valor === undefined || valor === null ? '' : texto(valor, nombre, max);

const lista = (valor, nombre, max) => {
  if (!Array.isArray(valor)) falla(`${nombre} tiene que ser una lista`);
  if (valor.length > max) falla(`${nombre} tiene demasiados elementos`);
  return valor;
};

const identificador = (valor, nombre = 'id') => {
  texto(valor, nombre, 100);
  if (!/^[\w-]+$/.test(valor)) falla(`${nombre} inválido`);
  return valor;
};

const linkOpcional = (valor, nombre) => {
  const link = textoOpcional(valor, nombre, 2000).trim();
  if (link && !esLink(link)) falla(`${nombre} tiene que empezar con https://`);
  return link;
};

// Imagen: link http(s), archivo del propio sitio ("/assets/…") o imagen subida.
const imagenOpcional = (valor, nombre) => {
  const imagen = textoOpcional(valor, nombre, MAX_IMAGEN);
  const valida =
    !imagen ||
    esLink(imagen) ||
    /^\/(?!\/)/.test(imagen) ||
    /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(imagen);
  if (!valida) falla(`${nombre} no es una imagen válida`);
  return imagen;
};

// Documento: link http(s) o archivo del propio sitio ("/docs/informe.pdf").
const documento = (valor, nombre) => {
  const doc = texto(valor, nombre, 2000).trim();
  if (!esLink(doc) && !(/^\/(?!\/)[\w./-]+$/.test(doc) && !doc.includes('..'))) {
    falla(`${nombre} tiene que ser un link https:// o una ruta del sitio como /docs/informe.pdf`);
  }
  return doc;
};

const textos = (valor, nombre, max = 50) =>
  lista(valor, nombre, max).map((item, i) => texto(item, `${nombre}[${i}]`, 500));

// Valor de una clave de texto de página. Hay textos, marcas (oculto) y listas
// (orden de bloques, copias, bloques libres, redes).
const FONDOS = ['blanco', 'gris', 'rosa'];

function validarValorTexto(clave, valor) {
  if (clave.startsWith('img:')) return imagenOpcional(valor, clave);
  if (clave.startsWith('link:')) return linkOpcional(valor, clave);
  if (clave.startsWith('oculto:')) {
    if (valor !== true) falla(`${clave} sólo puede ser verdadero`);
    return valor;
  }
  if (clave.startsWith('fondo:')) {
    if (!FONDOS.includes(valor)) falla(`${clave}: fondo inválido`);
    return valor;
  }
  // Zona libre ("novedades.libre") o página entera ("previas.pagina"): HTML
  // del editor completo, con las imágenes subidas adentro. El frontend lo
  // limpia (libre.js) antes de mostrarlo.
  if (/\.(libre|pagina)$/.test(clave)) return texto(valor, clave, MAX_LIBRE);
  // Sus estilos ("novedades.libre.css"): reglas por elemento. El frontend deja
  // sólo propiedades y colores de una lista; acá se corta lo que nunca va.
  if (/\.(libre|pagina)\.css$/.test(clave)) {
    const css = texto(valor, clave, 100000);
    if (/<|@import|url\(|expression\(|javascript:/i.test(css)) falla(`${clave}: CSS no permitido`);
    return css;
  }
  if (typeof valor === 'string') return texto(valor, clave, 20000);
  if (Array.isArray(valor)) {
    lista(valor, clave, 500);
    for (const item of valor) {
      if (typeof item === 'string') {
        texto(item, clave, 200);
      } else if (esObjeto(item)) {
        const campos = Object.entries(item);
        if (campos.length > 10) falla(`${clave}: elemento con demasiados campos`);
        for (const [nombre, dato] of campos) {
          if (nombre.length > 50) falla(`${clave}: campo inválido`);
          texto(dato, `${clave}.${nombre}`, 2000);
        }
      } else {
        falla(`${clave}: elemento inválido`);
      }
    }
    return valor;
  }
  return falla(`El valor de ${clave} no es válido`);
}

module.exports = {
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
};
