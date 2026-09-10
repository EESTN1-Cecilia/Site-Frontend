import { useRef } from "react";
import { Icon } from "@iconify/react";
import ProposalCard from "../components/ProposalCard.jsx";
import Editable from "../components/Editable.jsx";
import { courses, facade, logo, proposals } from "../data.js";
import { useInicio } from "../inicio.js";
import { ir } from "../router.js";

const destinos = ["ciclo-basico", "informatica", "programacion"];

/* Envuelve cada elemento de una lista para poder moverlo o quitarlo.
   Sin edición no agrega nada: se renderiza el hijo tal cual. */
function Movible({ editable, acciones, lista, indice, children }) {
  if (!editable) return children;

  const { arrastre, mover } = acciones;

  return (
    <div
      className={`movible ${arrastre.encima === `${lista}-${indice}` ? "movible--encima" : ""}`}
      draggable={arrastre.tomado}
      onDragStart={() => arrastre.iniciar(lista, indice)}
      onDragEnd={arrastre.limpiar}
      onDragOver={(e) => {
        e.preventDefault();
        arrastre.sobre(lista, indice);
      }}
      onDrop={() => mover(lista, indice)}
    >
      <span
        className="movible__manijero"
        title="Arrastrar para reordenar"
        onMouseDown={() => arrastre.tomar(true)}
        onMouseUp={() => arrastre.tomar(false)}
      >
        <Icon icon="ph:dots-six-vertical" width={16} height={16} aria-hidden="true" />
      </span>
      <button
        className="movible__quitar"
        aria-label="Quitar"
        onClick={() => acciones.quitar(lista, indice)}
      >
        <Icon icon="ph:trash" width={14} height={14} aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}

export default function Inicio({ editable = false, contenido, acciones }) {
  const guardado = useInicio();
  const c = contenido || guardado;
  const secciones = useRef({});

  const bajar = (nombre) =>
    secciones.current[nombre]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  /* En modo edición los textos escriben sobre el borrador del panel. */
  const campo = (seccion, clave) => ({
    activo: editable,
    valor: c[seccion][clave],
    alCambiar: (v) => acciones?.editar(seccion, clave, v),
  });

  const item = (lista, indice, clave) => ({
    activo: editable,
    valor: c[lista][indice][clave],
    alCambiar: (v) => acciones?.editarItem(lista, indice, clave, v),
  });

  return (
    <main className={editable ? "lienzo-inicio" : undefined}>
      <section className="hero">
        <div className="hero__card">
          <img className="hero__img" src={facade} alt="Fachada de la escuela" />
          <div className="hero__velo" />
          <div className="hero__contenido">
            <p className="hero__chip">
              <img src={logo} alt="" />
              <Editable {...campo("hero", "chip")} />
            </p>
            <h1 className="hero__titulo">
              <Editable {...campo("hero", "titulo")} />
              <br />
              <Editable clase="hero__destacado" {...campo("hero", "destacado")} />
            </h1>
            <p className="hero__bajada">
              <Editable {...campo("hero", "bajada")} />
            </p>
            <div className="hero__acciones">
              <button className="pill" onClick={() => !editable && bajar("cursos")}>
                <Editable {...campo("hero", "accionPrimaria")} />
                <Icon
                  icon="ph:arrow-up-right"
                  width={16}
                  height={16}
                  aria-hidden="true"
                />
              </button>
              <button
                className="pill pill--ghost"
                onClick={() => !editable && ir("/inscripcion")}
              >
                <Editable {...campo("hero", "accionSecundaria")} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="centrado">
          <p className="chip">
            <Editable {...campo("escuela", "chip")} />
          </p>
          <h2 className="titulo">
            <Editable {...campo("escuela", "titulo")} />{" "}
            <Editable clase="titulo__destacado" {...campo("escuela", "destacado")} />
            .
          </h2>
          <p className="texto">
            <Editable {...campo("escuela", "texto")} />
          </p>
        </div>

        <div className="facts">
          {c.facts.map((fact, indice) => (
            <Movible
              key={fact.id}
              editable={editable}
              acciones={acciones}
              lista="facts"
              indice={indice}
            >
              <article className={`fact fact--${fact.tono}`}>
                <span className="fact__marca">
                  <Icon icon={fact.icono} width={110} height={110} aria-hidden="true" />
                </span>
                <span className="fact__icono">
                  <Icon icon={fact.icono} width={30} height={30} aria-hidden="true" />
                </span>
                <h3 className="fact__titulo">
                  <Editable {...item("facts", indice, "titulo")} />
                </h3>
                <p className="fact__texto">
                  <Editable {...item("facts", indice, "texto")} />
                </p>
              </article>
            </Movible>
          ))}
        </div>

        {editable && (
          <button
            className="boton boton--fino agregar-item"
            onClick={() => acciones.agregar("facts")}
          >
            <Icon icon="ph:plus" width={15} height={15} aria-hidden="true" />
            Agregar destacado
          </button>
        )}
      </section>

      <section
        className="propuestas"
        ref={(node) => {
          secciones.current.cursos = node;
        }}
      >
        <div className="propuestas__inner">
          <div className="encabezado">
            <div>
              <p className="chip">
                <Editable {...campo("propuestas", "chip")} />
              </p>
              <h2 className="titulo">
                <Editable {...campo("propuestas", "titulo")} />{" "}
                <Editable
                  clase="titulo__destacado"
                  {...campo("propuestas", "destacado")}
                />
              </h2>
            </div>
            <p className="descripcion">
              <Editable {...campo("propuestas", "descripcion")} />
            </p>
          </div>
          <div className="cards">
            {proposals.map(([title, text, image], index) => (
              <ProposalCard
                key={title}
                title={title}
                text={text}
                image={image}
                course={courses[index]}
                index={index}
                destino={destinos[index]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="atajos">
          {c.atajos.map((atajo, indice) => (
            <Movible
              key={atajo.id}
              editable={editable}
              acciones={acciones}
              lista="atajos"
              indice={indice}
            >
              <button
                className="atajo"
                onClick={() => !editable && ir(atajo.ruta)}
              >
                <Icon icon={atajo.icono} width={26} height={26} aria-hidden="true" />
                <span className="atajo__titulo">
                  <Editable {...item("atajos", indice, "titulo")} />
                </span>
                <span className="atajo__texto">
                  <Editable {...item("atajos", indice, "texto")} />
                </span>
                <span className="atajo__mas">
                  Entrar
                  <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
                </span>
              </button>
            </Movible>
          ))}
        </div>

        {editable && (
          <button
            className="boton boton--fino agregar-item"
            onClick={() => acciones.agregar("atajos")}
          >
            <Icon icon="ph:plus" width={15} height={15} aria-hidden="true" />
            Agregar atajo
          </button>
        )}
      </section>

      <section className="seccion contenedor">
        <div className="identidad">
          <div>
            <p className="chip">
              <Editable {...campo("identidad", "chip")} />
            </p>
            <h2 className="titulo">
              <Editable {...campo("identidad", "titulo")} />{" "}
              <Editable
                clase="titulo__destacado"
                {...campo("identidad", "destacado")}
              />
              .
            </h2>
            <p className="texto">
              <Editable {...campo("identidad", "texto")} />
            </p>
            <img className="identidad__logo" src={logo} alt="Logo Técnica 1" />
          </div>

          <div className="puntos">
            {c.puntos.map((punto, indice) => (
              <Movible
                key={punto.id}
                editable={editable}
                acciones={acciones}
                lista="puntos"
                indice={indice}
              >
                <article className="punto">
                  <span className="punto__numero">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="punto__titulo">
                      <Editable {...item("puntos", indice, "titulo")} />
                    </h3>
                    <p className="punto__texto">
                      <Editable {...item("puntos", indice, "texto")} />
                    </p>
                  </div>
                </article>
              </Movible>
            ))}

            {editable && (
              <button
                className="boton boton--fino agregar-item"
                onClick={() => acciones.agregar("puntos")}
              >
                <Icon icon="ph:plus" width={15} height={15} aria-hidden="true" />
                Agregar punto
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
