import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { PERFILES, crearEscenas } from "../animaciones/escenasScroll.js";

/* Dibuja el PDF con PDF.js en lugar de usar el visor del navegador:
   Brave, Android e iOS no muestran PDFs dentro de un iframe.
   La librería se descarga recién cuando se abre el visor. */
export default function VisorPdf({ url, archivo, soloPaginas }) {
  const contenedor = useRef(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    const caja = contenedor.current;
    let cancelado = false;
    let documento;
    /* Algunas páginas del cuadernillo se animan con el scroll del visor. */
    const escenas = PERFILES[archivo]
      ? crearEscenas(caja.closest(".visor-pdf"), PERFILES[archivo])
      : null;

    (async () => {
      try {
        const [pdfjs, { default: worker }] = await Promise.all([
          import("pdfjs-dist/legacy/build/pdf.min.mjs"),
          import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker;

        documento = await pdfjs.getDocument(url).promise;
        const densidad = window.devicePixelRatio || 1;
        const ancho = (caja.clientWidth || 800) - 32;

        const lista = soloPaginas
          ? soloPaginas.filter((n) => n >= 1 && n <= documento.numPages)
          : Array.from({ length: documento.numPages }, (_, i) => i + 1);

        for (const n of lista) {
          const pagina = await documento.getPage(n);
          if (cancelado) return;

          const base = pagina.getViewport({ scale: 1 });
          const vista = pagina.getViewport({
            scale: (ancho / base.width) * densidad,
          });

          const lienzo = document.createElement("canvas");
          lienzo.className = "visor-pdf__pagina";
          lienzo.width = vista.width;
          lienzo.height = vista.height;
          lienzo.style.width = `${vista.width / densidad}px`;
          caja.appendChild(lienzo);

          await pagina.render({
            canvasContext: lienzo.getContext("2d"),
            viewport: vista,
          }).promise;

          if (cancelado) return;
          escenas?.preparar(n, lienzo);

          setEstado("listo");
        }
      } catch {
        if (!cancelado) setEstado("error");
      }
    })();

    return () => {
      cancelado = true;
      escenas?.destruir();
      documento?.destroy();
      caja.replaceChildren();
    };
  }, [url, archivo, soloPaginas]);

  return (
    <div className="visor-pdf">
      {estado === "cargando" && (
        <p className="visor-pdf__estado">
          <Icon
            className="visor-pdf__giro"
            icon="ph:spinner-gap"
            width={28}
            height={28}
            aria-hidden="true"
          />
          Cargando el cuadernillo…
        </p>
      )}

      {estado === "error" && (
        <div className="visor-pdf__estado">
          <Icon icon="ph:file-x" width={36} height={36} aria-hidden="true" />
          <p>No se pudo mostrar el PDF acá.</p>
          <div className="acciones-fila">
            <a className="boton" href={url} target="_blank" rel="noopener noreferrer">
              Abrir en pestaña
            </a>
            <a className="boton boton--primario" href={url} download={archivo}>
              Descargar PDF
            </a>
          </div>
        </div>
      )}

      {/* Sin hijos de React: las páginas se agregan como canvas. */}
      <div className="visor-pdf__paginas" ref={contenedor} />
    </div>
  );
}
