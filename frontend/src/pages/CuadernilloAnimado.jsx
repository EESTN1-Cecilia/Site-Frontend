import { Icon } from "@iconify/react";
import RobotScroll from "../components/RobotScroll.jsx";
import VisorPdf from "../components/VisorPdf.jsx";
import { ir } from "../router.js";

/* Páginas del cuadernillo de 3° año que tienen animación con el scroll. */
const PAGINAS = [6, 7, 8, 13, 14];

export default function CuadernilloAnimado() {
  return (
    <main>
      <section className="seccion contenedor">
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">3° AÑO · 2026</p>
            <h1 className="titulo">
              Cuadernillo con <span className="titulo__destacado">animaciones</span>
            </h1>
            <p className="texto">
              Primero el robot en 3D: bajá con el scroll y se desarma pieza por
              pieza. Más abajo, las páginas 6, 7, 8, 13 y 14 del cuadernillo
              también se animan con el scroll.
            </p>
          </div>
          <button className="pill" onClick={() => ir("/evaluacion")}>
            <Icon icon="ph:arrow-left" width={16} height={16} aria-hidden="true" />
            Volver a Evaluación
          </button>
        </div>
      </section>

      <RobotScroll />

      <section className="seccion contenedor">
        <div className="visor-animado">
          <VisorPdf url="/pdfs/tercer-ano.pdf" archivo="tercer-ano.pdf" soloPaginas={PAGINAS} />
        </div>
      </section>
    </main>
  );
}
