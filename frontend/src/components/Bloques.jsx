/* Render de sólo lectura de los bloques de una publicación.
   Lo usan la página pública y la vista previa. */
export default function Bloques({ bloques = [] }) {
  return bloques.map((bloque) => {
    if (bloque.tipo === "titulo") {
      return (
        <h3 className="nota__subtitulo" key={bloque.id}>
          {bloque.texto}
        </h3>
      );
    }

    if (bloque.tipo === "destacado") {
      return (
        <p className="nota__destacado" key={bloque.id}>
          {bloque.texto}
        </p>
      );
    }

    if (bloque.tipo === "imagen") {
      return (
        <figure className="nota__figura" key={bloque.id}>
          <img src={bloque.url} alt={bloque.epigrafe || ""} />
          {bloque.epigrafe && <figcaption>{bloque.epigrafe}</figcaption>}
        </figure>
      );
    }

    return (
      <p className="nota__texto" key={bloque.id}>
        {bloque.texto}
      </p>
    );
  });
}
