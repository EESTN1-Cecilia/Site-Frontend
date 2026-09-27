import DOMPurify from "dompurify";
import { comoInsertar, esLinkValido } from "./links.js";
import { esObjeto, esTexto, texto } from "./almacen.js";
import { redesSociales } from "./data.js";

/* ---------------------------------------------------------------------
   Zona libre: lo que arma quien edita la página con el editor visual
   (EditorLibre.jsx), guardado como dos textos más de la página:
     "<pagina>.libre"     -> HTML  ('<h2 id="i3k2" class="u-alinear-centro">…')
     "<pagina>.libre.css" -> CSS   ("#i3k2 { color: rgb(139, 30, 30); }")

   Los dos los escribe una persona, así que antes de mostrarlos (y antes de
   guardarlos) se limpian:
   - `limpiarHtml`: pocas etiquetas, links http(s), imágenes del sitio o
     subidas, videos de YouTube/Drive, las clases "u-…" de libre.css y los
     ids que usa el CSS. Nada de scripts ni estilos sueltos.
   - `limpiarCss`: sólo reglas "#id" (y su versión para tablet o celular),
     con propiedades de una lista y los colores de la paleta del sitio. Nada
     de url(), posiciones fijas ni @import: no puede tapar ni salir del sitio.

   Lo mismo sirve para una página entera armada con el editor completo
   ("previas.pagina" y "previas.pagina.css", modo "pagina"): ahí además
   valen las etiquetas y clases del sitio (secciones, encabezados, .linea…)
   y los lugares de los bloques automáticos (<div data-dinamico="…">).
--------------------------------------------------------------------- */

const ETIQUETAS = [
  "p", "h2", "h3", "b", "strong", "i", "em", "u", "s", "a", "br",
  "ul", "ol", "li", "img", "hr", "div", "span", "iframe",
  "table", "thead", "tbody", "tr", "th", "td",
];
/* En una página, además, los íconos del sitio (<svg> simples, de Iconify). */
const SVG = ["svg", "path", "g", "circle", "rect", "line", "polyline", "polygon", "ellipse"];
const ETIQUETAS_PAGINA = [
  ...ETIQUETAS, "section", "header", "article", "h1", "h4", "figure", "figcaption", "small", ...SVG,
];
const ATRIBUTOS = ["id", "class", "href", "src", "alt", "data-link"];
const ATRIBUTOS_PAGINA = [
  ...ATRIBUTOS, "data-dinamico",
  "viewBox", "d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule",
  "clip-rule", "points", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "x2", "y1", "y2", "width", "height",
  "transform", "opacity", "aria-hidden",
];

/* En una página, las clases del sitio; nunca las del panel, el editor o
   las ventanas (que se dibujan encima de todo). */
const esClaseDelSitio = (clase) =>
  /^[a-z][a-z0-9_-]{0,60}$/.test(clase) &&
  !/^(gjs-|modal|cajon|visor|menu|header|sesion|panel|lienzo|editor-|zona-edicion|flash)/.test(clase);

/* Los colores de la escuela (app.css): los únicos que se pueden elegir. */
export const PALETA = [
  ["#8b1e1e", "Rojo institucional"],
  ["#5c0f0f", "Bordó"],
  ["#a62b2b", "Rojo"],
  ["#c97a7a", "Rosa oscuro"],
  ["#e8c5c5", "Rosa"],
  ["#5a5555", "Gris oscuro"],
  ["#7a7474", "Gris"],
  ["#e6e6e6", "Gris claro"],
  ["#f0eeee", "Gris tarjeta"],
  ["#ffffff", "Blanco"],
  ["#000000", "Negro"],
];

/* Ids que el HTML puede conservar (los que usa el CSS) y si es una página. */
let idsPermitidos = new Set();
let esPagina = false;

/* Clases de utilidad: "u-boton", "u-alinear-centro"… (las de libre.css). */
const esUtilidad = (clase) => /^u-[a-z]+(-[a-z]+)?$/.test(clase);

const esImagen = (src) =>
  esLinkValido(src) ||
  /^\/(?!\/)/.test(src) ||
  /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src);

/* Un iframe sólo se deja si viene de un link de YouTube o Drive, y se arma de
   nuevo con el src que devuelve comoInsertar: nunca con el que vino. */
const IFRAME = {
  sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation",
  allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
  loading: "lazy",
  referrerpolicy: "strict-origin-when-cross-origin",
};

/* Una instancia propia de DOMPurify: sus ganchos son sólo de la zona libre
   (y no se suman a los de otra copia de este módulo, como al recargar en
   desarrollo). */
let purificador;
function enganchar() {
  if (purificador) return;
  purificador = DOMPurify(window);

  /* El lugar de un bloque automático va vacío: lo llena el sitio (y en el
     editor, la vista previa que no se guarda). */
  purificador.addHook("uponSanitizeElement", (nodo) => {
    if (nodo.nodeType === 1 && nodo.hasAttribute("data-dinamico")) nodo.replaceChildren();
  });

  purificador.addHook("afterSanitizeAttributes", (nodo) => {
    if (nodo.id && !idsPermitidos.has(nodo.id)) nodo.removeAttribute("id");

    if (nodo.hasAttribute("data-dinamico") && !/^[a-z][a-z-]{0,30}$/.test(nodo.getAttribute("data-dinamico")))
      nodo.removeAttribute("data-dinamico");

    if (nodo.hasAttribute("class")) {
      const vale = (clase) => esUtilidad(clase) || (esPagina && esClaseDelSitio(clase));
      const clases = nodo.getAttribute("class").split(/\s+/).filter(vale);
      if (clases.length) nodo.setAttribute("class", clases.join(" "));
      else nodo.removeAttribute("class");
    }

    if (nodo.tagName === "A") {
      const href = nodo.getAttribute("href") || "";
      if (esLinkValido(href)) {
        nodo.setAttribute("target", "_blank");
        nodo.setAttribute("rel", "noopener noreferrer");
      } else if (!/^\/(?!\/)/.test(href) && !/^mailto:/i.test(href) && !/^#[\w/-]*$/.test(href)) {
        /* Quedan: páginas del sitio ("/docs/…", "#/inscripcion"), anclas y mails. */
        nodo.removeAttribute("href");
      }
    }

    if (nodo.tagName === "IMG" && !esImagen(nodo.getAttribute("src") || "")) nodo.remove();

    if (nodo.tagName === "IFRAME") {
      const link = nodo.parentElement?.getAttribute("data-link") || "";
      const src = esLinkValido(link) ? comoInsertar(link.trim()).src : null;
      if (!src) return nodo.remove();
      nodo.setAttribute("src", src);
      nodo.setAttribute("title", comoInsertar(link.trim()).nombre);
      for (const [nombre, valor] of Object.entries(IFRAME)) nodo.setAttribute(nombre, valor);
    }
  });
}

/* `ids`: los ids que se conservan (los que usa el CSS); el resto se saca.
   `modo`: "zona" (una zona libre) o "pagina" (una página entera). */
export function limpiarHtml(html, ids = [], modo = "zona") {
  if (!esTexto(html) || !html.trim()) return "";
  enganchar();
  idsPermitidos = new Set(ids);
  esPagina = modo === "pagina";
  try {
    return purificador.sanitize(html, {
      ALLOWED_TAGS: esPagina ? ETIQUETAS_PAGINA : ETIQUETAS,
      ALLOWED_ATTR: esPagina ? ATRIBUTOS_PAGINA : ATRIBUTOS,
      ALLOW_DATA_ATTR: false,
    }).trim();
  } finally {
    idsPermitidos = new Set();
    esPagina = false;
  }
}

/* ---------- CSS ---------- */
const PROPIEDADES = new Set([
  "color", "font-size", "font-weight", "font-style", "line-height", "letter-spacing",
  "text-align", "text-transform", "text-decoration-line", "vertical-align",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  ...["top", "right", "bottom", "left"].flatMap((lado) => [`margin-${lado}`, `padding-${lado}`]),
  ...["top", "right", "bottom", "left"].flatMap((lado) =>
    ["width", "style", "color"].map((parte) => `border-${lado}-${parte}`),
  ),
  "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius",
  "background-color", "box-shadow", "opacity", "object-fit",
  "display", "flex-direction", "flex-wrap", "justify-content", "align-items", "row-gap", "column-gap",
]);

const DISPLAY = new Set(["block", "inline", "inline-block", "flex", "inline-flex", "grid", "none"]);
const esColorProp = (prop) => prop === "color" || prop.endsWith("-color");

/* La paleta como la escribe el navegador ("rgb(139, 30, 30)"). */
let paletaNormal;
export const normalizarColor = (valor) => {
  const estilo = document.createElement("div").style;
  estilo.color = valor;
  return estilo.color;
};
const enPaleta = (valor) => {
  paletaNormal ??= new Set([...PALETA.map(([hex]) => normalizarColor(hex)), "transparent", "currentcolor", "inherit"]);
  return paletaNormal.has(valor);
};

const valorSeguro = (prop, valor) =>
  valor.length <= 200 &&
  !/url\(|expression|javascript:|@|\\|<|>/i.test(valor) &&
  (!esColorProp(prop) || enPaleta(valor)) &&
  (prop !== "display" || DISPLAY.has(valor));

/* Las reglas se leen con el navegador (CSSOM) y se vuelven a escribir sólo con
   lo permitido. `alcance` se antepone a cada selector: en el sitio, el CSS
   sólo alcanza a su zona. */
export function limpiarCss(css, alcance = "") {
  if (!esTexto(css) || !css.trim() || typeof CSSStyleSheet === "undefined") return "";
  const hoja = new CSSStyleSheet();
  try {
    hoja.replaceSync(css);
  } catch {
    return "";
  }

  const regla = (r) => {
    if (!(r instanceof CSSStyleRule)) return "";
    const selectores = r.selectorText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^#[a-z][\w-]{0,40}$/i.test(s));
    if (!selectores.length) return "";

    const limpio = document.createElement("div").style;
    for (const prop of r.style) {
      const valor = r.style.getPropertyValue(prop).trim();
      if (PROPIEDADES.has(prop) && valorSeguro(prop, valor)) limpio.setProperty(prop, valor);
    }
    if (!limpio.cssText) return "";
    return `${selectores.map((s) => `${alcance} ${s}`.trim()).join(", ")} { ${limpio.cssText} }`;
  };

  return [...hoja.cssRules]
    .map((r) => {
      if (r instanceof CSSMediaRule) {
        /* Sólo las de los tamaños del editor: "(max-width: 992px)". */
        if (!/^\(max-width: \d{3,4}px\)$/.test(r.media.mediaText)) return "";
        const adentro = [...r.cssRules].map(regla).filter(Boolean).join("\n");
        return adentro && `@media ${r.media.mediaText} {\n${adentro}\n}`;
      }
      return regla(r);
    })
    .filter(Boolean)
    .join("\n");
}

/* Los ids que usa un CSS ya limpio. */
export const idsDelCss = (css) => [...(css || "").matchAll(/#([a-z][\w-]*)/gi)].map((m) => m[1]);

/* HTML y CSS de una zona (o de una página, con `modo` "pagina"), limpios y
   de acuerdo entre sí. */
export function limpiarZona(html, css, alcance = "", modo = "zona") {
  const cssLimpio = limpiarCss(css);
  return {
    html: limpiarHtml(html, idsDelCss(cssLimpio), modo),
    css: alcance ? limpiarCss(cssLimpio, alcance) : cssLimpio,
  };
}

/* Lo que cambia entre el editor y el sitio: en el editor cada pregunta
   frecuente es una caja abierta (<div class="u-faq"><h3>…</h3><p>…</p>),
   fácil de escribir; en el sitio se pasa a <details> para que se abra y se
   cierre como las de las páginas. Recibe HTML ya limpio. */
export function paraElSitio(html) {
  if (!/\b(u-)?faq\b/.test(html)) return html;
  const molde = document.createElement("template");
  molde.innerHTML = html;
  /* Las de la zona libre (.u-faq) y las de las páginas del sitio (.faq, como
     en Proyectos: el editor las muestra abiertas). */
  for (const caja of molde.content.querySelectorAll("div.u-faq, div.faq")) {
    const [pregunta, ...respuesta] = caja.children;
    if (!pregunta) continue;
    const desplegable = document.createElement("details");
    desplegable.className = caja.className;
    if (caja.id) desplegable.id = caja.id;
    const resumen = document.createElement("summary");
    if (pregunta.className) resumen.className = pregunta.className;
    if (pregunta.id) resumen.id = pregunta.id;
    resumen.append(...pregunta.childNodes);
    desplegable.append(resumen, ...respuesta);
    caja.replaceWith(desplegable);
  }
  return molde.innerHTML;
}

/* ---------- Bloques del editor anterior ----------
   Antes la zona era una lista de bloques ("novedades.bloques" -> [{ id, tipo }])
   con el contenido de cada uno en su propia clave. Si todavía no se guardó
   nada con el editor nuevo, esos bloques se pasan a HTML para no perderlos. */
const escapar = (valor) =>
  texto(valor).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function deBloquesViejos(leer, zona) {
  const bloques = leer(zona);
  if (!Array.isArray(bloques)) return "";

  const orden = leer(`orden:${zona}`);
  const ordenados = Array.isArray(orden)
    ? [...bloques].sort((a, b) => orden.indexOf(a?.id) - orden.indexOf(b?.id))
    : bloques;

  return ordenados
    .filter((b) => esObjeto(b) && esTexto(b.id) && !leer(`oculto:${zona}.${b.id}`))
    .map(({ id, tipo }) => {
      const base = `${zona}.${id}`;
      const link = texto(leer(`link:${base}`));
      if (tipo === "texto") return `<p>${escapar(leer(`${base}.texto`))}</p>`;
      if (tipo === "imagen")
        return `<img src="${escapar(leer(`img:${base}`))}" alt="${escapar(leer(`${base}.epigrafe`))}">`;
      if (tipo === "boton")
        return `<a class="u-boton" href="${escapar(link)}">${escapar(leer(`${base}.texto`) || "Más información")}</a>`;
      if (tipo === "divisor") return "<hr>";
      if (tipo === "insertar") return `<div class="u-insertar" data-link="${escapar(link)}"><iframe></iframe></div>`;
      if (tipo === "redes") {
        const redes = Array.isArray(leer(`${base}.redes`)) ? leer(`${base}.redes`) : [];
        const links = redes
          .filter((r) => esObjeto(r) && esLinkValido(r.url))
          .map((r) => `<a href="${escapar(r.url)}">${escapar(redesSociales[r.red]?.[0] || "Link")}</a>`);
        return links.length ? `<p>${links.join(" · ")}</p>` : "";
      }
      return "";
    })
    .join("");
}
