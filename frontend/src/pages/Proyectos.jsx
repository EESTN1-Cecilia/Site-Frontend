import { useEffect } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import { preguntas, useAreas } from "../proyectos.js";
import { ir } from "../router.js";

export default function Proyectos({ ruta, params }) {
  const areas = useAreas();
  const destacado = params?.get("preview");

  /* Al previsualizar un proyecto puntual, la página abre en ese. */
  useEffect(() => {
    if (!destacado) return;
    document
      .getElementById(destacado)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destacado]);
  const clave = ruta.replace("/proyectos/", "");
  const area = areas[clave];

  if (!area) {
    return (
      <main className="seccion contenedor">
        <p className="vacio">No encontramos esa orientación.</p>
      </main>
    );
  }

  const otras = Object.entries(areas).filter(([otra]) => otra !== clave);

  return (
    <main>
      <Encabezado
        chip={area.chip}
        titulo="Proyectos de"
        destacado={area.titulo}
        texto={area.resumen}
      />

      <section className="seccion contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">QUÉ SE APRENDE</p>
            <h2 className="titulo">
              Herramientas <span>por año</span>
            </h2>
          </div>
          <p className="descripcion">
            El recorrido completo, para saber qué viene después de cada año.
          </p>
        </div>
        <div className="tarjetas-3">
          {area.herramientas.map(([anio, subtitulo, items]) => (
            <article className="mini" key={anio}>
              <span className="mini__icono">
                <Icon icon="ph:toolbox" width={24} height={24} aria-hidden="true" />
              </span>
              <h3 className="mini__titulo">
                {anio} · {subtitulo}
              </h3>
              <ul className="lista-check">
                {items.map((item) => (
                  <li key={item}>
                    <Icon icon="ph:check" width={15} height={15} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion-alt">
        <div className="contenedor">
          <div className="encabezado">
            <div>
              <p className="chip">HECHO POR ALUMNOS</p>
              <h2 className="titulo">
                Proyectos <span>del área</span>
              </h2>
            </div>
            <p className="descripcion">
              Con el equipo que lo hizo, las tecnologías usadas y qué se aprende
              en el camino.
            </p>
          </div>

          {area.proyectos.length === 0 && (
            <p className="vacio">
              Todavía no hay proyectos cargados en esta orientación.
            </p>
          )}

          <div className="proyectos">
            {area.proyectos.map((proyecto) => (
              <article
                className={`proyecto ${destacado === proyecto.id ? "proyecto--destacado" : ""}`}
                id={proyecto.id}
                key={proyecto.id}
              >
                <div className="proyecto__cabecera">
                  <div>
                    <p className="proyecto__anio">{proyecto.anio}</p>
                    <h3 className="proyecto__titulo">{proyecto.titulo}</h3>
                  </div>
                  {proyecto.repo && (
                    <a
                      className="boton"
                      href={proyecto.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon
                        icon="ph:github-logo"
                        width={16}
                        height={16}
                        aria-hidden="true"
                      />
                      Ver repositorio
                    </a>
                  )}
                </div>

                <p className="proyecto__texto">{proyecto.resumen}</p>

                <h4 className="bloque__titulo">Equipo</h4>
                {proyecto.equipo?.length ? (
                  <div className="etiquetas">
                    {proyecto.equipo.map((alumno) => (
                      <span className="etiqueta" key={alumno}>
                        <Icon
                          icon="ph:user"
                          width={14}
                          height={14}
                          aria-hidden="true"
                        />
                        {alumno}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="nota-interna">
                    Equipo a completar por jefatura de área.
                  </p>
                )}

                <h4 className="bloque__titulo">Lenguajes y herramientas</h4>
                <div className="etiquetas">
                  {(proyecto.stack || []).map((tecnologia) => (
                    <span className="etiqueta etiqueta--stack" key={tecnologia}>
                      {tecnologia}
                    </span>
                  ))}
                </div>

                <h4 className="bloque__titulo">Qué se aprende acá</h4>
                <ul className="lista-check">
                  {(proyecto.aprendizajes || []).map((item) => (
                    <li key={item}>
                      <Icon
                        icon="ph:check"
                        width={15}
                        height={15}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                {proyecto.docs?.length > 0 && (
                  <>
                    <h4 className="bloque__titulo">Documentación</h4>
                    <div className="descargas">
                      {proyecto.docs.map((doc) => (
                        <a
                          className="descarga"
                          key={doc.archivo}
                          href={doc.archivo}
                          download
                        >
                          <span className="descarga__icono">
                            <Icon
                              icon="ph:file-pdf"
                              width={22}
                              height={22}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="descarga__datos">
                            <span className="descarga__nombre">{doc.nombre}</span>
                            <span className="descarga__meta">
                              PDF · {doc.paginas} páginas · {doc.peso}
                            </span>
                          </span>
                          <Icon
                            className="descarga__flecha"
                            icon="ph:download-simple"
                            width={20}
                            height={20}
                            aria-hidden="true"
                          />
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">PREGUNTAS FRECUENTES</p>
            <h2 className="titulo">
              Si recién <span>llegás</span>
            </h2>
          </div>
        </div>
        <div className="faqs">
          {preguntas.map(([pregunta, respuesta]) => (
            <details className="faq" key={pregunta}>
              <summary className="faq__pregunta">
                {pregunta}
                <Icon
                  className="desplegable__flecha"
                  icon="ph:caret-down"
                  width={16}
                  height={16}
                  aria-hidden="true"
                />
              </summary>
              <p className="faq__respuesta">{respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">SEGUIR MIRANDO</p>
            <h2 className="titulo">
              Las otras <span>orientaciones</span>
            </h2>
          </div>
        </div>
        <div className="atajos">
          {otras.map(([otraClave, otra]) => (
            <button
              className="atajo"
              key={otraClave}
              onClick={() => ir(`/proyectos/${otraClave}`)}
            >
              <Icon icon="ph:folders" width={26} height={26} aria-hidden="true" />
              <span className="atajo__titulo">{otra.titulo}</span>
              <span className="atajo__texto">{otra.chip}</span>
              <span className="atajo__mas">
                Ver proyectos
                <Icon
                  icon="ph:arrow-right"
                  width={15}
                  height={15}
                  aria-hidden="true"
                />
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
