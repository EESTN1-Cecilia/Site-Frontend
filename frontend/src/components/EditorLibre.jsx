import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, buildIcon, loadIcon } from "@iconify/react";
import grapesjs from "grapesjs";
import es from "grapesjs/locale/es.mjs";
import "grapesjs/dist/css/grapes.min.css";
import estilosLibre from "../styles/libre.css?inline";
import estilosApp from "../styles/app.css?inline";
import estilosPaginas from "../styles/paginas.css?inline";
import estilosPanel from "../styles/panel.css?inline";
import { PALETA, limpiarZona, normalizarColor } from "../libre.js";
import { comoInsertar, esLinkValido } from "../links.js";

/* ---------------------------------------------------------------------
   Editor completo de la zona libre (ZonaLibre.jsx): GrapesJS entero, en
   pantalla completa, con sus paneles de siempre —bloques, estilos,
   propiedades, capas, computadora/tablet/celular, ver código— en castellano
   y con los colores del sitio.

   Lo que arma se guarda como HTML + CSS (libre.js los limpia): los estilos
   van por elemento ("#id"), y los colores sólo se eligen de la paleta.
--------------------------------------------------------------------- */

const BASICOS = [
  ["texto", "ph:text-align-left", "Texto", "<p>Escribí el texto acá.</p>"],
  ["titulo", "ph:text-h", "Título", "<h2>Título</h2>"],
  ["imagen", "ph:image", "Imagen", { type: "image" }],
  ["boton", "ph:cursor-click", "Botón", '<a class="u-boton">Más información</a>'],
  ["divisor", "ph:minus", "Divisor", "<hr>"],
  ["video", "ph:play-circle", "Video o Drive", { type: "insertar" }],
  ["caja", "ph:square", "Caja", "<div><p>Una caja para agrupar cosas.</p></div>"],
];

const repetir = (veces, armar) => Array.from({ length: veces }, (_, i) => armar(i + 1)).join("");

/* Los componentes de las páginas (Encabezado.jsx, .mini, .linea, .aviso,
   .faq, .lista-check, .atajo, .tabla), con el mismo aspecto. */
const SECCIONES = [
  [
    "encabezado",
    "ph:text-aa",
    "Encabezado",
    '<div class="u-encabezado"><p class="u-chip">Novedad</p>' +
      '<h2 class="u-titulo">Título de la <span class="u-destacado">sección</span></h2>' +
      '<p class="u-bajada">Una o dos líneas que cuentan de qué se trata.</p></div>',
  ],
  [
    "tarjetas",
    "ph:squares-four",
    "Tarjetas",
    `<div class="u-tarjetas">${repetir(3, (n) => `<div class="u-tarjeta"><h3>Tarjeta ${n}</h3><p>Un texto corto que explica este punto.</p></div>`)}</div>`,
  ],
  [
    "pasos",
    "ph:list-numbers",
    "Pasos",
    `<ol class="u-pasos">${repetir(3, (n) => `<li><h3>Paso ${n}</h3><p>Qué hay que hacer en este paso.</p></li>`)}</ol>`,
  ],
  [
    "aviso",
    "ph:megaphone",
    "Aviso",
    '<div class="u-aviso"><h3>Título del aviso</h3><p>Lo importante, en pocas palabras.</p>' +
      '<a class="u-boton">Ver más</a></div>',
  ],
  [
    "preguntas",
    "ph:question",
    "Preguntas",
    `<div class="u-preguntas">${repetir(3, (n) => `<div class="u-faq"><h3>¿Pregunta ${n}?</h3><p>La respuesta, clara y corta.</p></div>`)}</div>`,
  ],
  [
    "checks",
    "ph:list-checks",
    "Lista con checks",
    `<ul class="u-checks">${repetir(3, (n) => `<li>Punto ${n} de la lista</li>`)}</ul>`,
  ],
  [
    "accesos",
    "ph:arrow-square-out",
    "Accesos",
    `<div class="u-accesos">${repetir(2, (n) => `<a class="u-acceso"><strong>Acceso ${n}</strong><span>Una línea que explica adónde lleva.</span><span class="u-mas">Entrar →</span></a>`)}</div>`,
  ],
  [
    "tabla",
    "ph:table",
    "Tabla",
    '<div class="u-tabla"><table><thead><tr><th>Materia</th><th>Día</th><th>Horario</th></tr></thead><tbody>' +
      "<tr><td>Matemática</td><td>Lunes 2/12</td><td>8:00</td></tr>" +
      "<tr><td>Lengua</td><td>Martes 3/12</td><td>10:00</td></tr></tbody></table></div>",
  ],
  [
    "columnas",
    "ph:columns",
    "Dos columnas",
    '<div class="u-columnas"><div><h2>Título</h2><p>El texto va al lado de la imagen.</p></div>' +
      '<div><img class="u-ancho-completo"></div></div>',
  ],
];

/* Opciones rápidas (panel "Propiedades"): grupos de clases "u-<grupo>-<valor>". */
const UTILIDADES = {
  alinear: ["Alineación", [["", "Izquierda"], ["centro", "Centro"], ["derecha", "Derecha"]]],
  tamano: ["Tamaño", [["chico", "Chico"], ["", "Normal"], ["grande", "Grande"]]],
  color: ["Color", [["", "Normal"], ["rojo", "Rojo"], ["gris", "Gris"], ["negro", "Negro"]]],
  ancho: ["Ancho", [["", "Original"], ["chico", "Chico"], ["medio", "Mediano"], ["completo", "Todo"]]],
  estilo: ["Estilo", [["", "Lleno"], ["borde", "Con borde"]]],
  cols: ["Columnas", [["", "Automático"], ["dos", "2"], ["tres", "3"]]],
  tono: ["Color", [["", "Bordó"], ["claro", "Rosa"]]],
  fondo: ["Fondo", [["", "Ninguno"], ["gris", "Gris"], ["rosa", "Rosa"]]],
};

const CONTENEDORES = {
  "u-encabezado": { nombre: "Encabezado", grupos: ["alinear", "fondo"] },
  "u-tarjetas": { nombre: "Tarjetas", grupos: ["cols"] },
  "u-tarjeta": { nombre: "Tarjeta", grupos: [] },
  "u-pasos": { nombre: "Pasos", grupos: [] },
  "u-aviso": { nombre: "Aviso", grupos: ["tono"] },
  "u-preguntas": { nombre: "Preguntas frecuentes", grupos: [] },
  "u-faq": { nombre: "Pregunta", grupos: [] },
  "u-checks": { nombre: "Lista con checks", grupos: [] },
  "u-accesos": { nombre: "Accesos", grupos: ["cols"] },
  "u-tabla": { nombre: "Tabla", grupos: [] },
  "u-columnas": { nombre: "Dos columnas", grupos: ["fondo"] },
};

const TEXTO = ["alinear", "tamano", "color"];

/* Partes de las páginas del sitio (al editar una página entera): nombre y si
   es un texto. */
const DEL_SITIO = {
  pagina__hero: ["Encabezado de la página", false],
  pagina__titulo: ["Título de la página", true],
  pagina__destacado: ["Palabra destacada", true],
  pagina__bajada: ["Bajada", true],
  "seccion-alt": ["Sección con fondo", false],
  encabezado: ["Encabezado de sección", false],
  chip: ["Etiqueta", true],
  titulo: ["Título", true],
  titulo__destacado: ["Palabra destacada", true],
  descripcion: ["Descripción", true],
  linea: ["Pasos", false],
  linea__item: ["Paso", false],
  linea__numero: ["Número (se pone solo)", false],
  linea__titulo: ["Título del paso", true],
  linea__texto: ["Texto del paso", true],
  aviso: ["Aviso", false],
  aviso__titulo: ["Título del aviso", true],
  aviso__texto: ["Texto del aviso", true],
  contenedor: ["Contenedor", false],
  texto: ["Texto", true],
  hero: ["Portada", false],
  hero__contenido: ["Contenido de la portada", false],
  hero__chip: ["Etiqueta de la portada", true],
  hero__titulo: ["Título de la portada", true],
  hero__bajada: ["Bajada de la portada", true],
  hero__img: ["Imagen de fondo", false],
  hero__card: ["Tarjeta de la portada", false],
  identidad: ["Identidad", false],
  puntos: ["Puntos", false],
  punto: ["Punto", false],
  punto__numero: ["Número (se pone solo)", false],
  punto__titulo: ["Título del punto", true],
  punto__texto: ["Texto del punto", true],
  insignia: ["Insignia de la escuela", false],
  insignia__nombre: ["Nombre de la escuela", true],
  insignia__ciclo: ["Ciclo lectivo", true],
  "tarjetas-3": ["Tarjetas", false],
  "tarjetas-4": ["Tarjetas", false],
  mini: ["Tarjeta", false],
  mini__icono: ["Ícono", false],
  mini__titulo: ["Título de la tarjeta", true],
  mini__texto: ["Texto de la tarjeta", true],
  valoracion: ["Valoración", false],
  valoracion__sigla: ["Sigla", true],
  valoracion__titulo: ["Nombre de la valoración", true],
  valoracion__texto: ["Texto de la valoración", true],
  "lista-check": ["Lista con tildes", false],
  faqs: ["Preguntas frecuentes", false],
  faq: ["Pregunta", false],
  faq__pregunta: ["Pregunta", true],
  faq__respuesta: ["Respuesta", true],
};

/* Qué es cada elemento: su nombre (capas, cartel) y sus propiedades. */
function describir(componente) {
  const tipo = componente.get("type");
  const tag = componente.get("tagName");
  const clases = componente.getClasses();
  const tiene = (clase) => clases.includes(clase);
  const enPadre = (clase) => !!componente.parent()?.getClasses().includes(clase);

  if (tipo === "dinamico") return { nombre: componente.get("name") || "Bloque automático", grupos: [] };
  if (tipo === "image") return { nombre: "Imagen", grupos: ["ancho", "alinear"], imagen: true };
  if (tipo === "insertar") return { nombre: "Video o Drive", grupos: ["ancho", "alinear"], video: true };
  if (tipo === "celda") return { nombre: tag === "th" ? "Encabezado de columna" : "Celda", grupos: [], tabla: true };
  if (tipo === "link") {
    if (tiene("u-acceso")) return { nombre: "Acceso", grupos: [], link: true };
    if (tiene("u-boton")) return { nombre: "Botón", grupos: ["estilo", "alinear"], link: true };
    return { nombre: "Link", grupos: [], link: true };
  }
  if (tag === "hr") return { nombre: "Divisor", grupos: [] };

  const contenedor = Object.keys(CONTENEDORES).find(tiene);
  if (contenedor) return CONTENEDORES[contenedor];

  const delSitio = Object.keys(DEL_SITIO).find(tiene);
  if (delSitio) {
    const [nombre, esTexto] = DEL_SITIO[delSitio];
    return { nombre, grupos: esTexto ? TEXTO : [] };
  }
  if (tag === "section") return { nombre: "Sección", grupos: [] };

  if (tag === "li" && enPadre("u-pasos")) return { nombre: "Paso", grupos: [] };
  if (tag === "li" && enPadre("u-checks")) return { nombre: "Punto de la lista", grupos: TEXTO };
  if (tag === "tr") return { nombre: "Fila", grupos: [] };
  if (tag === "div" && enPadre("u-columnas")) return { nombre: "Columna", grupos: [] };
  if (tag === "div") return { nombre: "Caja", grupos: ["alinear", "fondo"] };

  if (tipo === "text") {
    const nombre = tiene("u-chip")
      ? "Etiqueta"
      : tiene("u-destacado")
        ? "Palabra destacada"
        : tiene("u-bajada")
          ? "Bajada"
          : { h2: "Título", h3: "Subtítulo" }[tag] || "Texto";
    return { nombre, grupos: TEXTO };
  }
  return null;
}

/* ---------- Tabla: sumar y quitar filas o columnas ---------- */
function tablaDe(celda) {
  let tabla = celda;
  while (tabla && tabla.get("tagName") !== "table") tabla = tabla.parent();
  return tabla;
}

const vaciar = (celda) => celda.components(celda.get("tagName") === "th" ? "Columna" : "—");

function sumarFila(celda) {
  const fila = celda.parent();
  const cuerpo = tablaDe(celda).find("tbody")[0];
  const enCuerpo = fila.parent() === cuerpo;
  const nueva = (enCuerpo ? fila : cuerpo.components().at(0)).clone();
  nueva.components().forEach(vaciar);
  cuerpo.append(nueva, { at: enCuerpo ? fila.index() + 1 : 0 });
}

function sumarColumna(celda) {
  const i = celda.index();
  for (const fila of tablaDe(celda).find("tr")) {
    const nueva = fila.components().at(i).clone();
    vaciar(nueva);
    fila.append(nueva, { at: i + 1 });
  }
}

function quitarFila(celda) {
  const fila = celda.parent();
  if (fila.parent().get("tagName") === "tbody" && fila.parent().components().length > 1) fila.remove();
}

function quitarColumna(celda) {
  const i = celda.index();
  const filas = tablaDe(celda).find("tr");
  if (filas[0]?.components().length > 1) for (const fila of filas) fila.components().at(i).remove();
}

/* ---------- Propiedades de cada elemento ---------- */
function propiedadesDe(componente) {
  const datos = describir(componente);
  if (!datos) return [];
  /* Los botones corren sobre lo que esté elegido al tocarlos. */
  const conElegido = (hacer) => (editor) => editor.getSelected() && hacer(editor.getSelected(), editor);

  const lista = datos.grupos.map((grupo) => ({
    type: "utilidad",
    name: `u-${grupo}`,
    label: UTILIDADES[grupo][0],
    opciones: UTILIDADES[grupo][1],
    changeProp: true,
  }));
  if (datos.link) lista.push({ type: "text", name: "href", label: "Link", placeholder: "https://…" });
  if (datos.imagen)
    lista.push(
      { type: "text", name: "alt", label: "Descripción", placeholder: "Qué muestra la imagen" },
      {
        type: "button",
        text: "Cambiar imagen",
        full: true,
        command: conElegido((imagen, editor) =>
          editor.runCommand("open-assets", { target: imagen, types: ["image"], accept: "image/*" }),
        ),
      },
    );
  if (datos.video)
    lista.push({ type: "text", name: "link", label: "Link de YouTube o Drive", placeholder: "https://…", changeProp: true });
  if (datos.tabla)
    lista.push(
      { type: "button", text: "Sumar fila", full: true, command: conElegido(sumarFila) },
      { type: "button", text: "Sumar columna", full: true, command: conElegido(sumarColumna) },
      { type: "button", text: "Quitar fila", full: true, command: conElegido(quitarFila) },
      { type: "button", text: "Quitar columna", full: true, command: conElegido(quitarColumna) },
    );
  return lista;
}

/* ---------- Piezas de las partes automáticas ----------
   Adentro de un bloque automático (cronograma, notas, proyectos…) cada pieza
   viene marcada con su clave (Texto.jsx, useMarca). Tocarla muestra sus
   opciones en Propiedades; doble clic en un texto lo deja escribir. Los
   cambios no son HTML de la página: van a su clave (`datos`), como en el
   editor de páginas, y la vista previa se vuelve a armar con ellos. */
const TIPOS_DE_PIEZA = ["texto", "campo", "dato", "imagen", "enlace", "bloque"];
const MARCAS = TIPOS_DE_PIEZA.map((tipo) => `[data-${tipo}]`).join(",");
const tipoDePieza = (nodo) => TIPOS_DE_PIEZA.find((tipo) => nodo.hasAttribute(`data-${tipo}`));

const FONDOS = [
  ["", "Original"],
  ["blanco", "Blanco"],
  ["gris", "Gris"],
  ["rosa", "Rosa"],
];

const NOMBRES_DE_BLOQUE = {
  "campo--busca": "Buscador",
  filtros__chips: "Botones de filtro",
  filtros__carpeta: "Botón de la carpeta de Drive",
  "tabla-scroll": "Tabla",
  "avisos-publicados": "Avisos",
  cuadernillo: "Cuadernillo",
  hero__acciones: "Botones de la portada",
  hero__boton: "Botón",
  giro: "Tarjeta que gira",
  card: "Tarjeta del curso",
  atajo: "Acceso",
  programa: "Programa",
  nota: "Nota",
};

function nombreDeBloque(nodo) {
  for (const clase of nodo.classList) {
    if (NOMBRES_DE_BLOQUE[clase]) return NOMBRES_DE_BLOQUE[clase];
    if (DEL_SITIO[clase]) return DEL_SITIO[clase][0];
  }
  return nodo.dataset.lista ? "Elemento de la lista" : "Bloque";
}

/* Las piezas desde la tocada hasta el bloque automático: un texto, el link
   que lo tiene, el bloque que tiene al link… todas con sus opciones. */
function cadenaDe(nodo, hasta) {
  const cadena = [];
  for (let actual = nodo; actual && actual !== hasta; actual = actual.parentElement)
    if (actual.matches?.(MARCAS)) cadena.push(actual);
  return cadena;
}

/* ---------- Estilos: los sectores del panel, con la paleta del sitio ---------- */
const color = (property, label) => ({ property, label, type: "paleta", default: "" });

const ESTILOS = [
  {
    name: "Texto",
    open: true,
    properties: [
      { extend: "font-size", label: "Tamaño" },
      {
        extend: "font-weight",
        label: "Grosor",
        options: [
          { id: "300", label: "Liviano" },
          { id: "400", label: "Normal" },
          { id: "600", label: "Semi negrita" },
          { id: "700", label: "Negrita" },
        ],
      },
      color("color", "Color"),
      { extend: "text-align", label: "Alineación" },
      { extend: "line-height", label: "Interlineado" },
      { extend: "letter-spacing", label: "Espaciado" },
      {
        property: "text-transform",
        label: "Mayúsculas",
        type: "select",
        default: "none",
        options: [
          { id: "none", label: "Como está" },
          { id: "uppercase", label: "TODO MAYÚSCULAS" },
          { id: "capitalize", label: "Cada Palabra" },
        ],
      },
    ],
  },
  { name: "Espacios", open: false, properties: [{ extend: "margin", label: "Margen" }, { extend: "padding", label: "Relleno" }] },
  {
    name: "Tamaño",
    open: false,
    properties: [
      { extend: "width", label: "Ancho" },
      { extend: "max-width", label: "Ancho máximo" },
      { extend: "height", label: "Alto" },
      { extend: "min-height", label: "Alto mínimo" },
    ],
  },
  {
    name: "Fondo y bordes",
    open: false,
    properties: [
      color("background-color", "Fondo"),
      { extend: "border-radius", label: "Esquinas redondeadas" },
      { property: "border-width", label: "Borde (grosor)", type: "number", units: ["px"], default: "0" },
      {
        property: "border-style",
        label: "Borde (tipo)",
        type: "select",
        default: "none",
        options: [
          { id: "none", label: "Sin borde" },
          { id: "solid", label: "Línea" },
          { id: "dashed", label: "Guiones" },
          { id: "dotted", label: "Puntos" },
        ],
      },
      color("border-color", "Borde (color)"),
      { extend: "box-shadow", label: "Sombra" },
      { extend: "opacity", label: "Opacidad" },
    ],
  },
  {
    name: "Diseño",
    open: false,
    properties: [
      {
        extend: "display",
        label: "Mostrar como",
        options: [
          { id: "block", label: "Bloque" },
          { id: "flex", label: "Fila o columna (flex)" },
          { id: "grid", label: "Grilla" },
          { id: "inline-block", label: "En línea" },
          { id: "none", label: "Oculto" },
        ],
      },
      { extend: "flex-direction", label: "Dirección" },
      { extend: "justify-content", label: "Repartir" },
      { extend: "align-items", label: "Alinear" },
      { property: "gap", label: "Separación", type: "number", units: ["px"], default: "0" },
    ],
  },
];

/* Tocar un bloque (además de arrastrarlo): va después de lo elegido, o al final. */
function agregarBloque(bloque, editor) {
  const wrapper = editor.getWrapper();
  let referencia = editor.getSelected();
  while (referencia?.parent() && referencia.parent() !== wrapper) referencia = referencia.parent();
  const at = referencia?.parent() === wrapper ? referencia.index() + 1 : wrapper.components().length;

  const contenido = bloque.get("content");
  const [agregado] = wrapper.append(typeof contenido === "string" ? contenido : { ...contenido }, { at });
  editor.select(agregado);
  editor.Canvas.scrollTo(agregado, { behavior: "smooth" });
  if (bloque.get("activate")) {
    const imagen = agregado.is("image") ? agregado : agregado.find("img")[0];
    if (imagen) editor.runCommand("open-assets", { target: imagen, types: ["image"], accept: "image/*" });
  }
}

const MAX_IMAGEN = 1024 * 1024;

/* Lo que se ve sólo en el lienzo del editor. */
const LIENZO = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; }
  .libre { margin: 0 !important; min-height: 100vh; padding: 24px; }
  .libre:empty::before {
    content: "Tocá o arrastrá un bloque del panel de la derecha para empezar.";
    color: #7a7474; font: 15px Arial, sans-serif;
  }
  .u-insertar iframe { pointer-events: none; }
  .u-insertar:empty { display: grid; place-items: center; }
  .u-insertar:empty::before {
    content: "Pegá un link de YouTube o Drive en Propiedades.";
    color: #7a7474; font-size: 14px;
  }
  img:not([src]), img[src=""] { min-height: 120px; min-width: 200px; background: #f0eeee; }
  .libre div:empty { min-height: 60px; border: 1px dashed #e6e6e6; border-radius: 12px; }
  .u-acceso, .u-boton { cursor: default; }
`;

/* Al editar una página entera: el lienzo es la página, con los estilos del
   sitio, y los bloques automáticos se ven como vista previa marcada. */
const LIENZO_PAGINA = `
  body { margin: 0; background: #fff; }
  .pagina-libre { min-height: 100vh; }
  .pagina-libre:empty::before {
    content: "Tocá o arrastrá un bloque del panel de la derecha para empezar.";
    display: block; padding: 24px; color: #7a7474; font: 15px Arial, sans-serif;
  }
  /* Como en el sitio: sin marcos ni carteles. Qué es se ve al elegirlo (el
     cartel de arriba dice "· parte automática"). */
  body .pagina-libre [data-dinamico] { display: block; position: relative; }
  body .pagina-libre .encabezado > [data-dinamico] { flex: 1 1 260px; max-width: 340px; }
  @media (max-width: 760px) {
    body .pagina-libre .encabezado > [data-dinamico] { flex: 0 0 auto; max-width: none; align-self: stretch; }
  }
  /* Piezas sueltas de una barra (buscador, filtros, botón): del tamaño de lo
     que tienen, como en el sitio. */
  body .pagina-libre .filtros > [data-dinamico="buscador"] { flex: 1 1 240px; }
  body .pagina-libre .filtros > [data-dinamico] > .campo--busca { width: 100%; }
  .dinamico-vacio {
    margin: 0; padding: 34px 24px 24px; color: #7a7474; font: 14px Arial, sans-serif; text-align: center;
  }
  /* Piezas de adentro: se tocan para cambiarlas. */
  [data-dinamico] :is([data-texto], [data-campo], [data-dato], [data-imagen], [data-enlace]) { cursor: pointer; }
  [data-dinamico] :is([data-texto], [data-campo], [data-dato], [data-imagen], [data-enlace]):hover {
    outline: 2px solid rgba(139, 30, 30, 0.45); outline-offset: 2px;
  }
  [data-dinamico] [data-bloque]:hover { outline: 1px dashed rgba(139, 30, 30, 0.45); outline-offset: 3px; }
  [data-dinamico] .pieza--elegida { outline: 2px solid #8b1e1e !important; outline-offset: 2px; }
  [data-dinamico] [data-texto][contenteditable="true"] {
    outline: 2px solid #8b1e1e; outline-offset: 2px; background: #fff; color: #5c0f0f; cursor: text;
  }
  [data-dinamico] [data-oculto] { opacity: 0.45; }
  [data-dinamico] input, [data-dinamico] textarea, [data-dinamico] select { cursor: pointer; }
  /* Las tarjetas que giran muestran las dos caras, para editar el dorso. */
  [data-dinamico] .giro__interior { transform: none !important; display: flex; flex-direction: column; gap: 12px; }
  [data-dinamico] .giro__cara { backface-visibility: visible; -webkit-backface-visibility: visible; }
  [data-dinamico] .giro__dorso { transform: none; pointer-events: auto; }
  [data-dinamico] .fact__pista { display: none; }
  a, button { cursor: default; }
`;

/* El HTML sale del lienzo, no del modelo: así incluye lo que se está
   escribiendo en un texto sin haber salido de él. La limpieza saca lo que
   agrega el editor (clases "gjs-…", contenteditable), los ids sin estilo y
   la vista previa de los bloques automáticos. */
const exportar = (editor, modo) =>
  limpiarZona(editor.getWrapper()?.getEl()?.innerHTML ?? "", editor.getCss({ avoidProtected: true }), "", modo);

/* Al editar una página entera, cada bloque va en su propia sección. */
function enSeccion(contenido) {
  const libre = { tagName: "div", classes: ["libre"], components: contenido };
  return { tagName: "section", classes: ["seccion", "contenedor"], components: [libre] };
}

const clave = ({ html, css }) => `${html}\n/*css*/\n${css}`;

async function svgDe(nombre, alto = 26) {
  const datos = await loadIcon(nombre);
  const { attributes, body } = buildIcon(datos, { height: alto });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${attributes.width}" height="${attributes.height}" viewBox="${attributes.viewBox}" fill="currentColor">${body}</svg>`;
}

/* `previas()` y `datos()` dan lo último que mandó la página (cambian con el
   editor abierto); `avisar` muestra un aviso arriba. */
function registrar(editor, { previas, dinamicos = [], datos, avisar }) {
  const { Components, TraitManager, StyleManager } = editor;
  const nombreDinamico = (id) => dinamicos.find((d) => d.id === id)?.nombre || "Bloque automático";

  /* Doble clic en un texto de adentro: se escribe ahí mismo. Las teclas no
     salen del texto (si no, Borrar quitaría el bloque entero). */
  const escribir = (nodo) => {
    const id = nodo.dataset.texto;
    const original = nodo.dataset.original;
    const doc = nodo.ownerDocument;
    const guardar = () => datos()?.cambiar(id, nodo.textContent.trim(), original);
    const teclas = (e) => {
      e.stopPropagation();
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        nodo.blur();
      }
    };
    const pegar = (e) => {
      e.preventDefault();
      doc.execCommand("insertText", false, e.clipboardData?.getData("text/plain") ?? "");
    };
    nodo.contentEditable = "true";
    nodo.addEventListener("keydown", teclas);
    nodo.addEventListener("keyup", teclas);
    nodo.addEventListener("paste", pegar);
    nodo.addEventListener("input", guardar);
    nodo.addEventListener(
      "blur",
      () => {
        nodo.removeAttribute("contenteditable");
        nodo.removeEventListener("keydown", teclas);
        nodo.removeEventListener("keyup", teclas);
        nodo.removeEventListener("paste", pegar);
        nodo.removeEventListener("input", guardar);
        guardar();
      },
      { once: true },
    );
    nodo.focus();
    const rango = doc.createRange();
    rango.selectNodeContents(nodo);
    doc.getSelection().removeAllRanges();
    doc.getSelection().addRange(rango);
  };

  /* Las opciones de una pieza, para el panel de Propiedades. */
  const propiedadesDePieza = (nodo, n) => {
    const tipo = tipoDePieza(nodo);
    const id = nodo.getAttribute(`data-${tipo}`);
    const original = nodo.dataset.original;
    const nombre = (parte) => `pieza-${n}-${parte}`;
    const titulo = (texto) => ({ type: "titulo-pieza", name: nombre("titulo"), label: false, text: texto });
    const entrada = (props) => ({ type: "pieza", name: nombre(props.entrada), ...props });
    const boton = (texto, hacer) => ({ type: "button", name: nombre(texto), label: false, text: texto, full: true, command: hacer });
    const fijarYVer = (clave, valor) => {
      datos()?.fijar(clave, valor);
      datos()?.refrescar();
    };

    if (tipo === "texto")
      return [
        titulo("Texto (o doble clic sobre él)"),
        entrada({
          entrada: "textarea",
          label: false,
          valor: nodo.textContent.trim(),
          alCambiar: (valor) => {
            nodo.textContent = valor;
            datos()?.cambiar(id, valor.trim(), original);
          },
        }),
      ];

    if (tipo === "campo")
      return [
        titulo("Campo"),
        entrada({
          entrada: "text",
          label: "Texto de ayuda",
          valor: nodo.getAttribute("placeholder") || "",
          alCambiar: (valor) => {
            nodo.setAttribute("placeholder", valor);
            datos()?.cambiar(id, valor.trim(), original);
          },
        }),
      ];

    if (tipo === "dato") {
      const hora = nodo.dataset.tipo === "time";
      return [
        titulo(hora ? "Hora" : "Fecha"),
        entrada({
          entrada: hora ? "time" : "date",
          label: false,
          valor: nodo.dataset.valor || "",
          alCambiar: (valor) => {
            datos()?.cambiar(id, valor, original);
            datos()?.refrescar();
          },
        }),
      ];
    }

    if (tipo === "imagen")
      return [
        titulo("Imagen"),
        boton("Cambiar imagen", (ed) =>
          ed.AssetManager.open({
            types: ["image"],
            accept: "image/*",
            select(asset, completo) {
              const url = asset.getSrc();
              nodo.setAttribute("src", url);
              fijarYVer(`img:${id}`, url === original ? undefined : url);
              if (completo) ed.AssetManager.close();
            },
          }),
        ),
        ...(original ? [boton("Volver a la imagen original", () => fijarYVer(`img:${id}`, undefined))] : []),
      ];

    if (tipo === "enlace")
      return [
        titulo("Link"),
        entrada({
          entrada: "url",
          label: "Adónde lleva",
          placeholder: "https://…",
          valor: nodo.getAttribute("href") || "",
          alCambiar: (valor) => {
            const url = valor.trim();
            if (url && !esLinkValido(url)) return avisar("El link tiene que empezar con https://");
            fijarYVer(`link:${id}`, url === original ? undefined : url);
          },
        }),
      ];

    /* Bloque: mostrar u ocultar, fondo, y si es de una lista, su lugar. */
    const { lista, item, copia } = nodo.dataset;
    const ids = (nodo.dataset.ids || "").split(" ").filter(Boolean);
    const pos = ids.indexOf(item);
    const extras = () => (Array.isArray(datos()?.leer(`extra:${lista}`)) ? datos().leer(`extra:${lista}`) : []);
    const mover = (paso) => {
      const nuevo = [...ids];
      [nuevo[pos], nuevo[pos + paso]] = [nuevo[pos + paso], nuevo[pos]];
      fijarYVer(`orden:${lista}`, nuevo);
    };
    /* Si es la parte automática entera, su lugar se cambia arrastrándola. */
    const raiz = nodo.parentElement?.hasAttribute("data-dinamico");
    const lugar = lista && pos >= 0 && !raiz;

    return [
      titulo(nombreDeBloque(nodo)),
      entrada({
        entrada: "checkbox",
        label: "Se ve en el sitio",
        valor: !nodo.dataset.oculto,
        alCambiar: (visible) => fijarYVer(`oculto:${id}`, visible ? undefined : true),
      }),
      entrada({
        entrada: "select",
        label: "Fondo",
        opciones: FONDOS,
        valor: nodo.dataset.fondo || "",
        alCambiar: (fondo) => fijarYVer(`fondo:${id}`, fondo || undefined),
      }),
      ...(lugar && pos > 0 ? [boton("Subir", () => mover(-1))] : []),
      ...(lugar && pos < ids.length - 1 ? [boton("Bajar", () => mover(1))] : []),
      ...(lugar && nodo.dataset.duplicable
        ? [
            boton("Duplicar", () => {
              const nuevoId = `c${Date.now().toString(36)}`;
              datos()?.fijar(`extra:${lista}`, [...extras(), { id: nuevoId, de: copia || item }]);
              const nuevo = [...ids];
              nuevo.splice(pos + 1, 0, nuevoId);
              fijarYVer(`orden:${lista}`, nuevo);
            }),
          ]
        : []),
      ...(lugar && copia
        ? [
            boton("Quitar esta copia", () => {
              datos()?.fijar(`extra:${lista}`, extras().filter((extra) => extra.id !== item));
              fijarYVer(
                `orden:${lista}`,
                ids.filter((otro) => otro !== item),
              );
            }),
          ]
        : []),
    ];
  };

  /* Lo elegido adentro de cada bloque automático: fuera del modelo (son
     nodos del lienzo, no datos de la página). */
  const elegidas = new WeakMap();

  const propiedadesDeDinamico = (componente) => {
    const piezas = (elegidas.get(componente)?.piezas || []).filter((nodo) => nodo.isConnected);
    const aviso = (name, text) => ({ type: "titulo-pieza", name, label: false, text, aviso: true });
    return [
      aviso("pieza-que-es", `⚡ ${componente.getName()} · parte automática: se arma con los datos de la página.`),
      ...(piezas.length
        ? piezas.flatMap((nodo, n) => propiedadesDePieza(nodo, n))
        : [aviso("pieza-ayuda", "Tocá un texto, botón, link o imagen de adentro para cambiarlo. Doble clic en un texto para escribir.")]),
    ];
  };

  /* Tocar una pieza: queda marcada y sus opciones van a Propiedades. */
  const elegirPiezas = (componente, piezas) => {
    const el = componente.getEl();
    el?.querySelectorAll(".pieza--elegida").forEach((nodo) => nodo.classList.remove("pieza--elegida"));
    piezas[0]?.classList.add("pieza--elegida");
    const primera = piezas[0] && tipoDePieza(piezas[0]);
    elegidas.set(componente, { piezas, clave: primera ? [primera, piezas[0].getAttribute(`data-${primera}`)] : null });
    if (editor.getSelected() !== componente) editor.select(componente);
    componente.setTraits(propiedadesDeDinamico(componente));
    if (piezas.length) editor.Panels.getButton("views", "open-tm")?.set("active", true);
  };

  /* Lugar de un bloque automático (cronograma, avisos…): se mueve o se borra
     entero, y sus piezas se cambian una por una. Adentro se ve una vista
     previa que no es parte de la página (no se guarda). */
  Components.addType("dinamico", {
    isComponent: (el) =>
      el.getAttribute?.("data-dinamico") && { type: "dinamico", dinamico: el.getAttribute("data-dinamico") },
    model: {
      /* Sin estilos propios: en el sitio el lugar no se dibuja (display: contents). */
      defaults: { tagName: "div", droppable: false, editable: false, copyable: false, stylable: false, dinamico: "" },
      init() {
        this.components("");
        this.addAttributes({ "data-dinamico": this.get("dinamico") });
        this.set({ name: nombreDinamico(this.get("dinamico")) }, { silent: true });
      },
    },
    view: {
      onRender({ el, model }) {
        el.innerHTML =
          previas()[model.get("dinamico")]?.trim() ||
          '<p class="dinamico-vacio">Ahora no muestra nada: aparece solo cuando hay contenido cargado.</p>';
        /* La vista previa no responde como en el sitio: ni links, ni botones,
           ni campos para escribir. */
        el.querySelectorAll("input, textarea").forEach((campo) => {
          campo.readOnly = true;
          campo.tabIndex = -1;
        });
        if (el.dataset.piezas) return;
        el.dataset.piezas = "si";
        el.addEventListener("mousedown", (e) => {
          if (e.target.tagName === "SELECT") e.preventDefault();
        });
        el.addEventListener("click", (e) => {
          if (e.target.isContentEditable) return;
          e.preventDefault();
          const piezas = cadenaDe(e.target, el);
          /* Después de que GrapesJS elige el bloque con el mismo clic. */
          setTimeout(() => elegirPiezas(model, piezas));
        });
        el.addEventListener("dblclick", (e) => {
          const texto = e.target.closest?.("[data-texto]");
          if (!texto || !el.contains(texto) || texto.isContentEditable) return;
          e.preventDefault();
          e.stopPropagation();
          escribir(texto);
        });
      },
    },
  });

  /* Llegó una vista previa nueva (cambió un dato): se vuelve a dibujar y la
     pieza que estaba elegida se vuelve a elegir. */
  editor.on("previas:nuevas", () => {
    for (const componente of editor.getWrapper()?.findType("dinamico") ?? []) {
      const [tipo, id] = elegidas.get(componente)?.clave || [];
      componente.view?.render();
      if (!tipo) continue;
      const nodo = componente.getEl()?.querySelector(`[data-${tipo}="${CSS.escape(id)}"]`);
      if (editor.getSelected() === componente) elegirPiezas(componente, nodo ? cadenaDe(nodo, componente.getEl()) : []);
    }
  });

  editor.on("component:deselected", (componente) => {
    if (componente.get("type") !== "dinamico") return;
    componente.getEl()?.querySelectorAll(".pieza--elegida").forEach((nodo) => nodo.classList.remove("pieza--elegida"));
    elegidas.delete(componente);
  });

  /* Opciones de una pieza: un campo cuyo cambio va a `alCambiar` (no a un
     atributo del bloque). La caja de afuera no tiene "value": así GrapesJS
     no guarda nada por su cuenta. */
  TraitManager.addType("pieza", {
    createInput({ trait }) {
      const caja = document.createElement("div");
      caja.className = "pieza-campo";
      const tipo = trait.get("entrada");
      let control;
      if (tipo === "textarea") {
        control = document.createElement("textarea");
        control.rows = 3;
      } else if (tipo === "select") {
        control = document.createElement("select");
        for (const [valor, texto] of trait.get("opciones")) control.add(new Option(texto, valor));
      } else {
        control = document.createElement("input");
        control.type = tipo;
      }
      if (tipo === "checkbox") control.checked = !!trait.get("valor");
      else control.value = trait.get("valor") ?? "";
      if (trait.get("placeholder")) control.placeholder = trait.get("placeholder");
      caja.append(control);
      return caja;
    },
    onEvent({ elInput, trait }) {
      const control = elInput.firstElementChild;
      trait.get("alCambiar")(control.type === "checkbox" ? control.checked : control.value);
    },
  });

  TraitManager.addType("titulo-pieza", {
    noLabel: true,
    createInput({ trait }) {
      const titulo = document.createElement("p");
      titulo.className = trait.get("aviso") ? "pieza-titulo pieza-titulo--aviso" : "pieza-titulo";
      titulo.textContent = trait.get("text");
      return titulo;
    },
  });

  /* Video o documento: se guarda el link; el iframe se arma con comoInsertar. */
  Components.addType("insertar", {
    isComponent: (el) =>
      el.classList?.contains("u-insertar") && { type: "insertar", link: el.getAttribute("data-link") || "" },
    model: {
      defaults: { name: "Video o Drive", tagName: "div", droppable: false, link: "" },
      init() {
        this.on("change:link", this.armar);
        this.armar();
      },
      armar() {
        const link = String(this.get("link") || "").trim();
        const src = esLinkValido(link) ? comoInsertar(link).src : null;
        this.addClass("u-insertar");
        this.addAttributes({ "data-link": link });
        this.components(
          src
            ? { tagName: "iframe", attributes: { src }, selectable: false, hoverable: false, draggable: false, layerable: false }
            : "",
        );
      },
    },
  });

  /* Las celdas de GrapesJS no se pueden escribir: acá son textos. */
  Components.addType("celda", {
    extend: "text",
    isComponent: (el) => (el.tagName === "TD" || el.tagName === "TH") && { type: "celda" },
    model: { defaults: { name: "Celda", draggable: false, droppable: false } },
  });

  /* Opción rápida: elige una clase "u-<grupo>-<valor>" de un grupo. */
  TraitManager.addType("utilidad", {
    createInput({ trait }) {
      const lista = document.createElement("select");
      for (const [valor, texto] of trait.get("opciones")) lista.add(new Option(texto, valor));
      return lista;
    },
    onEvent({ elInput, component, trait }) {
      const prefijo = `${trait.get("name")}-`;
      component.getClasses().filter((c) => c.startsWith(prefijo)).forEach((c) => component.removeClass(c));
      if (elInput.value) component.addClass(prefijo + elInput.value);
    },
    onUpdate({ elInput, component, trait }) {
      const prefijo = `${trait.get("name")}-`;
      elInput.value = component.getClasses().find((c) => c.startsWith(prefijo))?.slice(prefijo.length) ?? "";
    },
  });

  /* Color: sólo los de la paleta del sitio, como muestras para tocar. */
  StyleManager.addType("paleta", {
    create({ change }) {
      const caja = document.createElement("div");
      caja.className = "paleta";
      caja.innerHTML = [["", "Sin color"], ...PALETA]
        .map(
          ([hex, nombre]) =>
            `<button type="button" class="paleta__color" data-color="${hex}" title="${nombre}" style="background:${hex || "transparent"}"></button>`,
        )
        .join("");
      caja.addEventListener("click", (event) => {
        const muestra = event.target.closest("[data-color]");
        if (muestra) change({ event, color: muestra.dataset.color });
      });
      return caja;
    },
    emit({ updateStyle }, { color: elegido }) {
      updateStyle(elegido);
    },
    update({ value, el }) {
      const actual = value ? normalizarColor(value) : "";
      for (const muestra of el.querySelectorAll("[data-color]")) {
        const suyo = muestra.dataset.color ? normalizarColor(muestra.dataset.color) : "";
        muestra.classList.toggle("paleta__color--elegido", suyo === actual);
      }
    },
  });

  /* Nombres en castellano (capas, cartel) y propiedades según qué es. */
  const nombrar = (componente) => {
    const datos = describir(componente);
    if (datos && componente.get("name") !== datos.nombre) componente.set({ name: datos.nombre }, { silent: true });
  };
  editor.on("component:add", nombrar);
  editor.on("load", () => editor.getWrapper().onAll(nombrar));
  editor.on("component:selected", (componente) =>
    componente.setTraits(
      componente.get("type") === "dinamico" ? propiedadesDeDinamico(componente) : propiedadesDe(componente),
    ),
  );

  /* Botones de arriba: deshacer y rehacer. */
  editor.Panels.addButton("options", [
    { id: "deshacer", command: "core:undo", attributes: { title: "Deshacer" }, label: "" },
    { id: "rehacer", command: "core:redo", attributes: { title: "Rehacer" }, label: "" },
  ]);
}

/* `modo`: "zona" (una zona libre) o "pagina" (una página entera, con sus
   bloques automáticos: `dinamicos` [{ id, nombre }] y su vista previa `previas`).
   `datos`: dónde van los cambios de las piezas de los bloques automáticos
   { cambiar(clave, valor, original), fijar(clave, valor), leer(clave), refrescar() };
   al refrescar, la página manda `previas` nuevas. */
export default function EditorLibre({
  titulo,
  html,
  css,
  alCambiar,
  cerrar,
  modo = "zona",
  dinamicos = [],
  previas = {},
  datos,
}) {
  const pagina = modo === "pagina";
  const lienzo = useRef(null);
  const gjs = useRef(null);
  const [aviso, setAviso] = useState("");
  const avisar = useRef(alCambiar);
  avisar.current = alCambiar;
  const ultimasPrevias = useRef(previas);
  const ultimosDatos = useRef(datos);
  ultimosDatos.current = datos;

  /* Vista previa nueva (cambió un dato): se redibujan los bloques automáticos. */
  useEffect(() => {
    if (ultimasPrevias.current === previas) return;
    ultimasPrevias.current = previas;
    gjs.current?.trigger("previas:nuevas");
  }, [previas]);

  /* Mientras está abierto, la página de atrás no se mueve. */
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  useEffect(() => {
    let espera;
    let cargando = true;
    let ultimo = null;

    const subir = (ev) => {
      const archivos = [...(ev.dataTransfer?.files || ev.target?.files || [])];
      for (const archivo of archivos) {
        if (!archivo.type.startsWith("image/")) continue;
        if (archivo.size > MAX_IMAGEN) {
          setAviso(`“${archivo.name}” pesa más de 1 MB. Achicala o pegá el link de la imagen.`);
          continue;
        }
        const lector = new FileReader();
        lector.onload = () => editor.AssetManager.add({ type: "image", src: lector.result });
        lector.readAsDataURL(archivo);
      }
    };

    /* Cada apertura arma el editor en su propia caja: si React lo desarma y
       lo vuelve a armar (en desarrollo lo hace siempre), el que se va no toca
       al que llega. */
    const lugar = document.createElement("div");
    lugar.style.height = "100%";
    lienzo.current.append(lugar);

    const editor = (gjs.current = grapesjs.init({
      container: lugar,
      height: "100%",
      width: "auto",
      components: html,
      style: css,
      storageManager: false,
      noticeOnUnload: false,
      undoManager: { trackSelection: false },
      selectorManager: { componentFirst: true },
      styleManager: { sectors: ESTILOS },
      deviceManager: {
        devices: [
          { id: "computadora", name: "Computadora", width: "" },
          { id: "tablet", name: "Tablet", width: "768px", widthMedia: "992px" },
          { id: "celular", name: "Celular", width: "375px", widthMedia: "480px" },
        ],
      },
      blockManager: {
        appendOnClick: agregarBloque,
        blocks: [
          ...[...BASICOS, ...SECCIONES].map(([id, , label, content]) => ({
            id,
            label,
            content: pagina ? enSeccion(content) : content,
            category: BASICOS.some(([basico]) => basico === id) ? "Básicos" : "Como en el sitio",
            activate: id === "imagen",
          })),
          /* Para volver a poner un bloque automático que se borró. */
          ...dinamicos.map(({ id, nombre }) => ({
            id: `dinamico-${id}`,
            label: nombre,
            content: { type: "dinamico", dinamico: id },
            category: "Partes automáticas de la página",
            media: "",
          })),
        ],
      },
      assetManager: { uploadFile: subir, assets: [] },
      protectedCss: pagina ? estilosApp + estilosPaginas + estilosPanel + estilosLibre + LIENZO_PAGINA : estilosLibre + LIENZO,
      /* El cartel sobre lo que se toca o elige: su nombre, y si es un bloque
         automático, el rayo de los automáticos (corto: al lado van los
         botones de mover y borrar). */
      canvas: {
        customBadgeLabel: (componente) => {
          const nombre = describir(componente)?.nombre ?? componente.getName();
          return componente.get("type") === "dinamico" ? `⚡ ${nombre}` : nombre;
        },
      },
      i18n: { locale: "es", detectLocale: false, messages: { es } },
      plugins: [
        (ed) =>
          registrar(ed, {
            previas: () => ultimasPrevias.current,
            dinamicos,
            datos: () => ultimosDatos.current,
            avisar: setAviso,
          }),
      ],
    }));

    /* Íconos de los bloques y de deshacer/rehacer: llegan de Iconify, quizás
       con el editor ya cerrado. */
    let cerrado = false;
    const cuandoLlegue = (icono, alto, poner) => svgDe(icono, alto).then((svg) => !cerrado && poner(svg));
    for (const [id, icono] of [...BASICOS, ...SECCIONES])
      cuandoLlegue(icono, 26, (svg) => editor.Blocks.get(id)?.set("media", svg));
    for (const { id } of dinamicos)
      cuandoLlegue("ph:lightning", 26, (svg) => editor.Blocks.get(`dinamico-${id}`)?.set("media", svg));
    cuandoLlegue("ph:arrow-counter-clockwise", 17, (svg) => editor.Panels.getButton("options", "deshacer")?.set("label", svg));
    cuandoLlegue("ph:arrow-clockwise", 17, (svg) => editor.Panels.getButton("options", "rehacer")?.set("label", svg));

    const mandar = () => {
      clearTimeout(espera);
      espera = undefined;
      const actual = exportar(editor, modo);
      if (clave(actual) === ultimo) return;
      ultimo = clave(actual);
      avisar.current(actual.html, actual.css);
    };
    const cambio = () => {
      if (cargando || cerrado) return;
      clearTimeout(espera);
      espera = setTimeout(mandar, 250);
    };

    editor.on("load", () => {
      const wrapper = editor.getWrapper();
      wrapper.addClass(pagina ? "pagina-libre" : "libre");
      wrapper.set({ selectable: false, hoverable: false, name: pagina ? "Página" : "Zona libre" });
      editor.UndoManager.clear();
      ultimo = clave(exportar(editor, modo));
      /* Arranca mostrando los bloques, no los estilos (que es lo de fábrica:
         GrapesJS los prende después de "load", por eso va en el turno siguiente). */
      setTimeout(() => {
        if (cerrado) return;
        editor.Panels.getButton("views", "open-sm")?.set("active", false);
        editor.Panels.getButton("views", "open-blocks")?.set("active", true);
        /* Sin las líneas punteadas en todo: el lienzo se ve como el sitio y se
           marca sólo lo que se toca (se prenden con el botón del cuadrado). */
        editor.Panels.getButton("options", "sw-visibility")?.set("active", false);
      });
      cargando = false;
    });
    editor.on("update component:input undo redo", cambio);

    return () => {
      if (espera) mandar();
      cerrado = true;
      if (gjs.current === editor) gjs.current = null;
      lugar.remove();
      const escribiendo = editor.getEditing()?.getView();
      if (!escribiendo?.disableEditing) return editor.destroy();
      /* Un texto a medio escribir: GrapesJS lo termina en diferido, así que el
         editor se desarma después (si no, lo terminaría ya desarmado). */
      Promise.resolve(escribiendo.disableEditing())
        .catch(() => {})
        .finally(() => editor.destroy());
    };
    // Se arma una vez por apertura, con lo que había en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* "Listo": si hay un texto a medio escribir, GrapesJS lo termina antes de
     cerrarse (si no, lo terminaría con el editor ya desarmado). */
  const terminar = async () => {
    await gjs.current?.getEditing()?.getView()?.disableEditing?.();
    cerrar();
  };

  return createPortal(
    <div className="editor-completo" role="dialog" aria-modal="true" aria-label={`Editor completo: ${titulo}`}>
      <header className="editor-completo__barra">
        <div className="editor-completo__nombre">
          <span className="editor-completo__chip">{pagina ? "Página completa" : "Zona libre"}</span>
          <strong>{titulo}</strong>
        </div>
        <p className="editor-completo__ayuda">
          Tocá o arrastrá bloques desde la derecha · doble clic para escribir · los cambios quedan en la página hasta
          que la publiques.
        </p>
        <button type="button" className="boton boton--primario boton--fino" onClick={terminar}>
          <Icon icon="ph:check" width={16} height={16} aria-hidden="true" />
          Listo
        </button>
      </header>
      {aviso && (
        <p className="flash flash--error editor-completo__aviso">
          <Icon icon="ph:warning" width={18} height={18} aria-hidden="true" />
          {aviso}
          <button type="button" className="flash__cerrar" onClick={() => setAviso("")}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}
      <div className="editor-completo__gjs">
        <div ref={lienzo} />
      </div>
    </div>,
    document.body,
  );
}
