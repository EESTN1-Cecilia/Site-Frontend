/* Encabezado común a todas las páginas internas del sitio público. */
export default function Encabezado({ chip, titulo, destacado, texto, children }) {
  return (
    <header className="pagina__hero">
      <div className="contenedor">
        <p className="chip chip--claro">{chip}</p>
        <h1 className="pagina__titulo">
          {titulo} {destacado && <span>{destacado}</span>}
        </h1>
        {texto && <p className="pagina__bajada">{texto}</p>}
        {children}
      </div>
    </header>
  );
}
