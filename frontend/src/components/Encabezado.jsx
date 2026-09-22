import { Bloque, Imagen } from "./Texto.jsx";
import { logo } from "../data.js";

/* Encabezado común a todas las páginas internas del sitio público.
   Es un bloque: desde el editor se le cambia el fondo o se oculta.
   El logo del chip es propio de cada página, como el del hero de Inicio. */
export default function Encabezado({ id, chip, titulo, destacado, texto, children }) {
  return (
    <Bloque id={id} como="header" className="pagina__hero">
      <div className="contenedor">
        <p className="chip chip--claro chip--logo">
          <Imagen id={`${id}.logo`} src={logo} alt="" />
          {chip}
        </p>
        <h1 className="pagina__titulo">
          {titulo}{" "}
          {destacado && <span className="pagina__destacado">{destacado}</span>}
        </h1>
        {texto && <p className="pagina__bajada">{texto}</p>}
        {children}
      </div>
    </Bloque>
  );
}
