import { Icon } from "@iconify/react";
import Texto, { Imagen } from "./Texto.jsx";
import { esLinkValido } from "../links.js";

const DUENO = "/panel/publicaciones";

/* Cuerpo de una publicación. Cada bloque se puede editar en el lugar desde el
   editor de páginas; los cambios vuelven a la publicación al publicar. */
export default function Bloques({ pub, bloques = [] }) {
  return bloques.map((bloque) => {
    const id = `pub:${pub.id}:bloque:${bloque.id}`;

    if (bloque.tipo === "titulo") {
      return (
        <h3 className="nota__subtitulo" key={bloque.id}>
          <Texto id={id} dueno={DUENO}>{bloque.texto}</Texto>
        </h3>
      );
    }

    if (bloque.tipo === "destacado") {
      return (
        <p className="nota__destacado" key={bloque.id}>
          <Texto id={id} dueno={DUENO}>{bloque.texto}</Texto>
        </p>
      );
    }

    if (bloque.tipo === "imagen") {
      return (
        <figure className="nota__figura" key={bloque.id}>
          <Imagen id={id} dueno={DUENO} src={bloque.url} alt={bloque.epigrafe || ""} />
          {bloque.epigrafe && <figcaption>{bloque.epigrafe}</figcaption>}
        </figure>
      );
    }

    /* Botón que lleva a otro sitio (un formulario, un documento). Sin una
       dirección válida no se muestra. */
    if (bloque.tipo === "link") {
      if (!esLinkValido(bloque.url)) return null;
      return (
        <a
          className="nota__boton"
          key={bloque.id}
          href={bloque.url.trim()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Texto id={id} dueno={DUENO}>{bloque.texto}</Texto>
          <Icon icon="ph:arrow-square-out" width={16} height={16} aria-hidden="true" />
        </a>
      );
    }

    return (
      <p className="nota__texto" key={bloque.id}>
        <Texto id={id} dueno={DUENO}>{bloque.texto}</Texto>
      </p>
    );
  });
}
