import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Texto, { Bloque, useEdicionTextos, useLista } from "./Texto.jsx";

/* Tarjeta que se da vuelta y muestra más información.
   Con mouse gira al pasar por encima (CSS); en el celular gira con un toque;
   con teclado, con el botón "Más info". Mientras se edita no gira sola. */
export default function FactGiratorio({ fact, bloque }) {
  const edicion = useEdicionTextos();
  const editable = !!edicion?.puede();
  const [volteada, setVolteada] = useState(false);
  const puntero = useRef("mouse");
  const base = `inicio.facts.${fact.id}`;

  const [datos, bloqueDato] = useLista(
    `${base}.detalle`,
    fact.detalle.map((texto, j) => ({ id: `d${j}`, texto })),
    { duplicable: true },
  );

  const alternar = (e) => {
    e?.stopPropagation();
    setVolteada((v) => !v);
  };

  return (
    <Bloque
      {...bloque}
      className={`giro ${volteada ? "giro--volteada" : ""} ${editable ? "giro--edicion" : ""}`}
      onPointerDown={(e) => {
        puntero.current = e.pointerType;
      }}
      onClick={() => {
        /* El mouse ya gira con hover; el toque en pantalla gira acá. */
        if (!editable && puntero.current !== "mouse") alternar();
      }}
    >
      <div className="giro__interior">
        <article className={`fact fact--${fact.tono} giro__cara giro__frente`}>
          <span className="fact__marca">
            <Icon icon={fact.icono} width={110} height={110} aria-hidden="true" />
          </span>
          <span className="fact__icono">
            <Icon icon={fact.icono} width={30} height={30} aria-hidden="true" />
          </span>
          <h3 className="fact__titulo">
            <Texto id={`${base}.titulo`}>{fact.titulo}</Texto>
          </h3>
          <p className="fact__texto">
            <Texto id={`${base}.texto`}>{fact.texto}</Texto>
          </p>
          <button
            type="button"
            className="fact__pista control-edicion"
            aria-expanded={volteada}
            tabIndex={volteada ? -1 : 0}
            onClick={alternar}
          >
            <Icon icon="ph:arrows-clockwise" width={14} height={14} aria-hidden="true" />
            {editable ? "Ver dorso" : "Más info"}
          </button>
        </article>

        <article className={`fact fact--${fact.tono} giro__cara giro__dorso`}>
          <h3 className="fact__titulo fact__titulo--dorso">
            <Texto id={`${base}.titulo`}>{fact.titulo}</Texto>
          </h3>
          <ul className="fact__lista">
            {datos.map((dato) => (
              <Bloque key={dato.id} {...bloqueDato(dato)} como="li">
                <Icon icon="ph:check-circle" width={16} height={16} aria-hidden="true" />
                <Texto id={`${base}.detalle.${dato.id}`}>{dato.texto}</Texto>
              </Bloque>
            ))}
          </ul>

          <button
            type="button"
            className="fact__pista control-edicion"
            tabIndex={volteada ? 0 : -1}
            onClick={alternar}
          >
            <Icon icon="ph:arrow-u-up-left" width={14} height={14} aria-hidden="true" />
            {editable ? "Ver frente" : "Volver"}
          </button>
        </article>
      </div>
    </Bloque>
  );
}
