import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { EdicionTextos } from "./components/Texto.jsx";
import { ModoInstantanea } from "./components/PaginaEditable.jsx";
import { limpiarCss } from "./libre.js";

/* ---------------------------------------------------------------------
   "Foto" de una página del sitio para abrirla en el editor completo.

   Monta la página como la ve un alumno, con los textos del borrador, en una
   caja fuera de la vista, y copia el HTML. Se monta de verdad (no alcanza
   con dibujarla a texto): los íconos, por ejemplo, aparecen recién montados.

   Las partes automáticas (<Dinamico>) quedan como lugares vacíos; lo que
   mostraban va aparte, como vista previa para el editor, con cada pieza
   marcada para poder cambiarla ahí (las que `puedeDato(dueno)` permite).
   Si la página tenía zona libre, su contenido y sus estilos entran en la
   foto (la página entera pasa a ser libre).
--------------------------------------------------------------------- */

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

/* Un ícono que todavía no llegó (se pide a Iconify la primera vez) se dibuja
   como un <span> vacío, sin nada: se espera a que no quede ninguno (o un
   máximo, si alguno no llega). */
const faltanIconos = (caja) =>
  [...caja.querySelectorAll("span")].some((span) => !span.attributes.length && !span.childNodes.length);

async function quieta(caja) {
  for (let vuelta = 0; vuelta < 80; vuelta++) {
    await esperar(50);
    if (!faltanIconos(caja)) return;
  }
}

export async function instantanea(Pagina, ruta, borrador, zona, puedeDato = () => false) {
  const caja = document.createElement("div");
  caja.setAttribute("aria-hidden", "true");
  caja.style.cssText = "position:fixed;left:-20000px;top:0;width:1280px;visibility:hidden;pointer-events:none";
  document.body.append(caja);
  const raiz = createRoot(caja);

  try {
    flushSync(() =>
      raiz.render(
        <ModoInstantanea.Provider value>
          <EdicionTextos.Provider value={{ borrador, puede: () => false, foto: true, puedeDato }}>
            <Pagina ruta={ruta} params={new URLSearchParams()} />
          </EdicionTextos.Provider>
        </ModoInstantanea.Provider>,
      ),
    );
    await quieta(caja);

    const foto = (caja.querySelector("main") ?? caja).cloneNode(true);
    const previas = {};
    for (const lugar of foto.querySelectorAll("[data-dinamico]")) {
      previas[lugar.getAttribute("data-dinamico")] = lugar.innerHTML;
      lugar.replaceChildren();
    }
    /* Los estilos de la zona libre van en el CSS de la página, no sueltos. */
    foto.querySelectorAll("style").forEach((estilo) => estilo.remove());

    return { html: foto.innerHTML, css: limpiarCss(borrador[`${zona}.css`]), previas };
  } finally {
    raiz.unmount();
    caja.remove();
  }
}
