import { Icon } from "@iconify/react";

export default function ProposalCard({ title, text, image, course, index }) {
  return (
    <article className="card">
      <div className="card__media">
        <img className="card__img" src={image} alt={title} />
        <span className="card__numero">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <p className="card__meta">
        <span>{course.eyebrow}</span>
        <span>·</span>
        <span>{course.items.length} divisiones</span>
      </p>
      <h3 className="card__titulo">{title}</h3>
      <p className="card__texto">{text}</p>
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
