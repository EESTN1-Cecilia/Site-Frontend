/* ---------------------------------------------------------------------
   Copias del contenido en el navegador y validación de lo que llega.

   Lo publicado vive en el backend; cada store guarda además una copia en
   localStorage para que el sitio siga andando si el servidor no responde.
   Esa copia es un respaldo, no la fuente: si el navegador no tiene lugar (o
   bloquea el almacenamiento) no pasa nada, el sitio sigue con lo que tiene
   en memoria.

   Lo que llega del servidor o del navegador se revisa antes de usarlo: un
   dato con otra forma (un objeto donde va un texto, algo que no es una
   lista) no tiene que poder dejar la página en blanco.
--------------------------------------------------------------------- */

export const leerLocal = (clave) => {
  try {
    return JSON.parse(localStorage.getItem(clave));
  } catch {
    return null;
  }
};

export const guardarLocal = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* Sin lugar o bloqueado: queda sólo en memoria. */
  }
};

/* Copias de contenido. Se borran al entrar y al salir de gestión: la
   siguiente persona que use el navegador arranca de lo que hay en el
   servidor, no de lo que dejó la anterior. */
const COPIAS = [
  "tec1-textos",
  "tec1-ajustes",
  "tec1-mesas",
  "tec1-programas",
  "tec1-proyectos",
  "tec1-publicaciones",
  "tec1-grillas",
  "tec1-plano",
];

export const borrarCopias = () =>
  COPIAS.forEach((clave) => {
    try {
      localStorage.removeItem(clave);
    } catch {
      /* nada que borrar */
    }
  });

/* ---------- Formas ---------- */
export const esObjeto = (valor) => !!valor && typeof valor === "object" && !Array.isArray(valor);
export const esTexto = (valor) => typeof valor === "string";
export const texto = (valor, porDefecto = "") => (esTexto(valor) ? valor : porDefecto);
export const booleano = (valor, porDefecto = false) => (typeof valor === "boolean" ? valor : porDefecto);

/* Lista de objetos con id de texto; lo demás se descarta. */
export const conId = (valor) =>
  Array.isArray(valor) ? valor.filter((item) => esObjeto(item) && esTexto(item.id)) : [];

/* Copia los campos de texto indicados (los que falten o no sean texto quedan vacíos). */
export const campos = (item, nombres) =>
  Object.fromEntries(nombres.map((nombre) => [nombre, texto(item[nombre])]));
