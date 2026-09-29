import { Icon } from "@iconify/react";
import Texto, { Bloque, Enlace, Imagen, useEdicionTextos } from "./Texto.jsx";
import { ir } from "../router.js";

/* Tarjeta de cada orientación en la portada. Todo se edita en el lugar:
   imagen, textos y el link de Drive de cada división. */
export default function ProposalCard({ propuesta, course, destino, bloque }) {
  const edicion = useEdicionTextos();
  const base = `inicio.propuestas.${propuesta.id}`;
  const abrir = () => ir(`/proyectos/${destino}`);

  return (
    <Bloque {...bloque} como="article" className="card">
      <button className="card__media" onClick={abrir} aria-label={`Ver proyectos de ${propuesta.title}`}>
        <Imagen id={`${base}.imagen`} className="card__img" src={propuesta.image} alt={propuesta.title} />
        <span className="card__numero">{String(propuesta.i + 1).padStart(2, "0")}</span>
        <span className="card__lupa">
          <Icon icon="ph:arrow-up-right" width={20} height={20} aria-hidden="true" />
        </span>
      </button>
      <p className="card__meta">
        <span>
          <Texto id={`${base}.meta`}>{course.eyebrow}</Texto>
        </span>
        <span>·</span>
        <span>{course.items.length} planes de trabajo</span>
      </p>
      <button className="card__titulo card__titulo--enlace" onClick={abrir}>
        <Texto id={`${base}.titulo`}>{propuesta.title}</Texto>
      </button>
      <p className="card__texto">
        <Texto id={`${base}.texto`}>{propuesta.text}</Texto>
      </p>
      <button className="card__link" onClick={abrir}>
        <Texto id={`${base}.enlace`}>Ver proyectos y herramientas</Texto>
        <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
      </button>

      {/* Arranca cerrado en cada carga; mientras se edita queda abierto. */}
      <details className="desplegable" open={edicion ? true : undefined}>
        <summary className="desplegable__boton">
          <Texto id="inicio.divisiones.ver">Ver planes de trabajo</Texto>
          <Icon className="desplegable__flecha" icon="ph:caret-down" width={16} height={16} aria-hidden="true" />
        </summary>
        <div className="card__lista">
          {course.items.map((division) => {
            const [etiqueta, url] = Array.isArray(division) ? division : [division, null];

            return (
              <Enlace
                key={etiqueta}
                id={`inicio.divisiones.${propuesta.id}.${etiqueta}`}
                href={url || ""}
                className="division"
                claseVacia="division--vacia"
                title={url ? undefined : "Sin materiales cargados"}
              >
                {etiqueta}
              </Enlace>
            );
          })}
        </div>
      </details>
    </Bloque>
  );
}
