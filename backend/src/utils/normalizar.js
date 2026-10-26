// Normalización de nombres para importar catálogos sin duplicar registros.
//
// - clave(): para COMPARAR. Sin tildes, mayúsculas, puntos ni palabras de
//   enlace, y en singular: «LABORATORIO SISTEMAS OPERATIVOS» y «Laboratorio
//   de Sistemas Operativos» dan la misma clave; «Grupo 1.1» y «1.1» también.
// - titulo(): para MOSTRAR. Tipo título en español, con las tildes de las
//   palabras de las materias (las del PDF vienen en mayúsculas sin tildes).
//   Los apellidos sólo cambian de mayúsculas: sus tildes no se adivinan.
// - esSigla() / sigla(): «P.D.I.S.C.» y «PDISC» son la misma sigla.
// - iniciales(): para resolver una sigla contra un nombre completo
//   («Proyecto de Diseño e Implementación de Sistemas Computacionales» → PDISC).

const ENLACE = new Set(['de', 'del', 'e', 'y', 'la', 'las', 'el', 'los', 'para', 'en', 'a']);

// Sólo palabras de nombres de materias, donde la tilde es ortografía segura.
const TILDES = {
  basico: 'básico',
  tecnologicos: 'tecnológicos',
  tecnologico: 'tecnológico',
  tecnicos: 'técnicos',
  tecnico: 'técnico',
  programacion: 'programación',
  informaticas: 'informáticas',
  informatica: 'informática',
  estaticas: 'estáticas',
  estatica: 'estática',
  dinamicas: 'dinámicas',
  dinamica: 'dinámica',
  implementacion: 'implementación',
  moviles: 'móviles',
  movil: 'móvil',
  organizacion: 'organización',
  metodos: 'métodos',
  electronica: 'electrónica',
  matematica: 'matemática',
};

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

const palabras = (texto) =>
  sinTildes(String(texto || ''))
    .toLowerCase()
    .replace(/[.]/g, '')
    .split(/[^a-z0-9ñ]+/i)
    .filter(Boolean);

function clave(texto) {
  return palabras(texto)
    .filter((p) => !ENLACE.has(p) && p !== 'grupo' && p !== 'prof')
    .map((p) => (p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p))
    .join('');
}

// Para nombres de personas: sólo sin tildes, mayúsculas ni espacios de más.
// No se quitan palabras: en «GRASSO E.» la «E.» es una inicial, no «e».
const claveNombre = (texto) =>
  sinTildes(String(texto || '')).toLowerCase().replace(/\s+/g, ' ').trim();

// Palabras con contenido (para medir cuánto se parecen dos nombres).
const terminos = (texto) =>
  new Set(
    palabras(texto)
      .filter((p) => !ENLACE.has(p))
      .map((p) => (p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p))
  );
const parecido = (a, b) => {
  const [x, y] = [terminos(a), terminos(b)];
  const comunes = [...x].filter((t) => y.has(t)).length;
  return comunes / (x.size + y.size - comunes || 1);
};

// Una sola palabra en mayúsculas con puntos («P.D.I.S.C.») o casi sin
// vocales («PDSPM»). «GRASSO» o «REDES» no son siglas.
const esSigla = (texto) => {
  const t = String(texto || '').trim();
  if (!/^[A-ZÑ](\.?[A-ZÑ]){2,9}\.?$/.test(t)) return false;
  const letras = t.replace(/\./g, '');
  return t.includes('.') || (letras.match(/[AEIOU]/g) ?? []).length / letras.length <= 0.2;
};
const sigla = (texto) => String(texto).toUpperCase().replace(/[^A-ZÑ]/g, '');

const iniciales = (texto) =>
  palabras(texto)
    .filter((p) => !ENLACE.has(p))
    .map((p) => p[0].toUpperCase())
    .join('');

function titulo(texto, { tildes = true } = {}) {
  const limpio = String(texto || '').trim().replace(/\s+/g, ' ');
  return limpio
    .toLowerCase()
    .split(' ')
    .map((p, i) => {
      if (/^[a-zñ]\.$/.test(p)) return p.toUpperCase(); // inicial: «Grasso C.»
      const base = tildes ? (TILDES[p] ?? p) : p;
      if (i > 0 && ENLACE.has(base)) return base;
      return base.charAt(0).toUpperCase() + base.slice(1);
    })
    .join(' ');
}

module.exports = { clave, claveNombre, parecido, titulo, sigla, esSigla, iniciales, sinTildes };
