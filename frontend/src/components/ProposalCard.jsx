import { Icon } from "@iconify/react";
import { ir } from "../router.js";

export default function ProposalCard({ title, text, image, course, index, destino }) {
  const abrir = () => ir(`/proyectos/${destino}`);

  return (
    <article className="card">
      <button className="card__media" onClick={abrir} aria-label={`Ver proyectos de ${title}`}>
        <img className="card__img" src={image} alt={title} />
        <span className="card__numero">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="card__lupa">
          <Icon icon="ph:arrow-up-right" width={20} height={20} aria-hidden="true" />
        </span>
      </button>
      <p className="card__meta">
        <span>{course.eyebrow}</span>
        <span>·</span>
        <span>{course.items.length} divisiones</span>
      </p>
      <button className="card__titulo card__titulo--enlace" onClick={abrir}>
        {title}
      </button>
      <p className="card__texto">{text}</p>
      <button className="card__link" onClick={abrir}>
        Ver proyectos y herramientas
        <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
      </button>
      {/* <details> arranca cerrado en cada carga; no necesita estado */}
      <details className="desplegable">
        <summary className="desplegable__boton">
          Ver divisiones
          <Icon
            className="desplegable__flecha"
            icon="ph:caret-down"
            width={16}
            height={16}
            aria-hidden="true"
          />
        </summary>
        <div className="card__lista">
          {course.items.map((item) => {
            const [label, url] = Array.isArray(item) ? item : [item, null];

            return url ? (
              <a
                className="division"
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ) : (
              <span
                className="division division--vacia"
                key={label}
                title="Sin materiales cargados"
              >
                {label}
              </span>
            );
          })}
        </div>
      </details>
    </article>
  );
}
