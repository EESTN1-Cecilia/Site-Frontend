import { Component } from "react";
import { Icon } from "@iconify/react";
import { ir } from "../router.js";

/* Si una página falla al dibujarse (por ejemplo, un dato publicado con una
   forma que no se esperaba), se muestra este aviso en su lugar y el resto
   del sitio —encabezado, menú, pie— sigue andando. Sin esto React desmonta
   toda la aplicación y queda la pantalla en blanco.

   Tiene que ser una clase: React sólo atrapa errores de render así. Se
   reinicia al cambiar de página (App le pasa la ruta como key). */
export default class LimiteDeError extends Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error) {
    console.error("[Página] No se pudo mostrar:", error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <main className="seccion contenedor">
        <div className="centrado">
          <p className="chip">ALGO FALLÓ</p>
          <h1 className="titulo">
            Esta página no se pudo <span className="titulo__destacado">mostrar</span>.
          </h1>
          <p className="texto">
            Probá de nuevo en un rato. Si sigue pasando, avisale a la escuela.
          </p>
          <div className="hero__acciones" style={{ justifyContent: "center" }}>
            <button className="pill" onClick={() => this.setState({ fallo: false })}>
              <Icon icon="ph:arrow-clockwise" width={16} height={16} aria-hidden="true" />
              Reintentar
            </button>
            <button className="pill" onClick={() => ir("/")}>
              Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }
}
