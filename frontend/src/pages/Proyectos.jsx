import { useEffect } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import Texto, { Bloque, Enlace, useEdicionTextos, useLista } from "../components/Texto.jsx";
import { preguntas, useAreas } from "../proyectos.js";
import { ir } from "../router.js";

const PROYECTOS = "/panel/proyectos";

const secciones = [
  { id: "herramientas", clase: "seccion contenedor" },
  { id: "lista", clase: "seccion-alt" },
  { id: "faq", clase: "seccion contenedor" },
  { id: "otras", clase: "seccion contenedor" },
];

/* Una tarjeta de herramientas por año, con sus ítems reordenables. */
function Herramienta({ clave, h, bloque }) {
  const base = `proyectos.${clave}.herramientas.${h.id}`;
  const [items, bloqueItem] = useLista(
    `${base}.items`,
    h.items.map((texto, j) => ({ id: `i${j}`, texto })),
    { duplicable: true },
  );

  return (
    <Bloque {...bloque} como="article" className="mini">
      <span className="mini__icono">
        <Icon icon="ph:toolbox" width={24} height={24} aria-hidden="true" />
      </span>
      <h3 className="mini__titulo">
        <Texto id={`${base}.anio`}>{h.anio}</Texto> ·{" "}
        <Texto id={`${base}.subtitulo`}>{h.subtitulo}</Texto>
      </h3>
      <ul className="lista-check">
        {items.map((item) => (
          <Bloque key={item.id} {...bloqueItem(item)} como="li">
            <Icon icon="ph:check" width={15} height={15} aria-hidden="true" />
            <Texto id={`${base}.items.${item.id}`}>{item.texto}</Texto>
          </Bloque>
        ))}
      </ul>
    </Bloque>
  );
}

export default function Proyectos({ ruta, params }) {
  const areas = useAreas();
  const edicion = useEdicionTextos();
  const destacado = params?.get("preview");

  /* Al previsualizar un proyecto puntual, la página abre en ese. */
  useEffect(() => {
    if (!destacado) return;
    document.getElementById(destacado)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destacado]);

  const clave = ruta.replace("/proyectos/", "");
  const area = areas[clave];

  const [listaSecciones, bloqueSeccion] = useLista(`proyectos.${clave}.secciones`, secciones);
  const [herramientas, bloqueHerramienta] = useLista(
    `proyectos.${clave}.herramientas`,
    (area?.herramientas || []).map(([anio, subtitulo, items], i) => ({
      id: `h${i}`,
      anio,
      subtitulo,
      items,
    })),
    { duplicable: true },
  );
  const [faq, bloqueFaq] = useLista(
    "proyectos.faq",
    preguntas.map(([pregunta, respuesta], i) => ({ id: `q${i}`, pregunta, respuesta })),
    { duplicable: true },
  );

  if (!area) {
    return (
      <main className="seccion contenedor">
        <p className="vacio">No encontramos esa orientación.</p>
      </main>
    );
  }

  const otras = Object.entries(areas).filter(([otra]) => otra !== clave);
  const t = (parte) => `proyectos.${clave}.${parte}`;
  const p = (proyecto, parte) => `proy:${clave}:${proyecto.id}:${parte}`;

  const contenido = {
    herramientas: (
      <>
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="proyectos.herramientas.chip">QUÉ SE APRENDE</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="proyectos.herramientas.titulo">Herramientas</Texto>{" "}
              <Texto id="proyectos.herramientas.destacado" clase="titulo__destacado">
                por año
              </Texto>
            </h2>
          </div>
          <p className="descripcion">
            <Texto id="proyectos.herramientas.descripcion">
              El recorrido completo, para saber qué viene después de cada año.
            </Texto>
          </p>
        </div>
        <div className="tarjetas-3">
          {herramientas.map((h) => (
            <Herramienta key={h.id} clave={clave} h={h} bloque={bloqueHerramienta(h)} />
          ))}
        </div>
      </>
    ),

    lista: (
      <div className="contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="proyectos.lista.chip">HECHO POR ALUMNOS</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="proyectos.lista.titulo">Proyectos</Texto>{" "}
              <Texto id="proyectos.lista.destacado" clase="titulo__destacado">
                del área
              </Texto>
            </h2>
          </div>
          <p className="descripcion">
            <Texto id="proyectos.lista.descripcion">
              Con el equipo que lo hizo, las tecnologías usadas y qué se aprende
              en el camino.
            </Texto>
          </p>
        </div>

        {area.proyectos.length === 0 && (
          <p className="vacio">
            <Texto id="proyectos.lista.vacio">
              Todavía no hay proyectos cargados en esta orientación.
            </Texto>
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
                  <p className="proyecto__anio">
                    <Texto id={p(proyecto, "anio")} dueno={PROYECTOS}>{proyecto.anio}</Texto>
                  </p>
                  <h3 className="proyecto__titulo">
                    <Texto id={p(proyecto, "titulo")} dueno={PROYECTOS}>{proyecto.titulo}</Texto>
                  </h3>
                </div>
                <Enlace id={p(proyecto, "repo")} dueno={PROYECTOS} href={proyecto.repo || ""} className="boton" ocultarVacio>
                  <Icon icon="ph:github-logo" width={16} height={16} aria-hidden="true" />
                  <Texto id="proyectos.etiquetas.repo">Ver repositorio</Texto>
                </Enlace>
              </div>

              <p className="proyecto__texto">
                <Texto id={p(proyecto, "resumen")} dueno={PROYECTOS}>{proyecto.resumen}</Texto>
              </p>

              <h4 className="bloque__titulo">
                <Texto id="proyectos.etiquetas.equipo">Equipo</Texto>
              </h4>
              {proyecto.equipo?.length ? (
                <div className="etiquetas">
                  {proyecto.equipo.map((alumno, j) => (
                    <span className="etiqueta" key={`${alumno}-${j}`}>
                      <Icon icon="ph:user" width={14} height={14} aria-hidden="true" />
                      <Texto id={p(proyecto, `equipo:${j}`)} dueno={PROYECTOS}>{alumno}</Texto>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="nota-interna">
                  <Texto id="proyectos.etiquetas.sinEquipo">Equipo a completar por jefatura de área.</Texto>
                </p>
              )}

              <h4 className="bloque__titulo">
                <Texto id="proyectos.etiquetas.stack">Lenguajes y herramientas</Texto>
              </h4>
              <div className="etiquetas">
                {(proyecto.stack || []).map((tecnologia, j) => (
                  <span className="etiqueta etiqueta--stack" key={`${tecnologia}-${j}`}>
                    <Texto id={p(proyecto, `stack:${j}`)} dueno={PROYECTOS}>{tecnologia}</Texto>
                  </span>
                ))}
              </div>

              <h4 className="bloque__titulo">
                <Texto id="proyectos.etiquetas.aprendizajes">Qué se aprende acá</Texto>
              </h4>
              <ul className="lista-check">
                {(proyecto.aprendizajes || []).map((item, j) => (
                  <li key={`${item}-${j}`}>
                    <Icon icon="ph:check" width={15} height={15} aria-hidden="true" />
                    <Texto id={p(proyecto, `aprendizajes:${j}`)} dueno={PROYECTOS}>{item}</Texto>
                  </li>
                ))}
              </ul>

              {proyecto.docs?.length > 0 && (
                <>
                  <h4 className="bloque__titulo">
                    <Texto id="proyectos.etiquetas.docs">Documentación</Texto>
                  </h4>
                  <div className="descargas">
                    {proyecto.docs.map((doc, j) => (
                      <a className="descarga" key={doc.archivo} href={doc.archivo} download>
                        <span className="descarga__icono">
                          <Icon icon="ph:file-pdf" width={22} height={22} aria-hidden="true" />
                        </span>
                        <span className="descarga__datos">
                          <span className="descarga__nombre">
                            <Texto id={p(proyecto, `docs:${j}:nombre`)} dueno={PROYECTOS}>{doc.nombre}</Texto>
                          </span>
                          <span className="descarga__meta">
                            PDF · {doc.paginas} páginas · {doc.peso}
                          </span>
                        </span>
                        <Icon className="descarga__flecha" icon="ph:download-simple" width={20} height={20} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    ),

    faq: (
      <>
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="proyectos.faq.chip">PREGUNTAS FRECUENTES</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="proyectos.faq.titulo">Si recién</Texto>{" "}
              <Texto id="proyectos.faq.destacado" clase="titulo__destacado">
                llegás
              </Texto>
            </h2>
          </div>
        </div>
        <div className="faqs">
          {faq.map((q) => {
            const pregunta = <Texto id={`proyectos.faq.${q.id}.pregunta`}>{q.pregunta}</Texto>;
            const respuesta = <Texto id={`proyectos.faq.${q.id}.respuesta`}>{q.respuesta}</Texto>;

            /* Al editar se muestran abiertas: el desplegable se tragaría el clic. */
            return edicion ? (
              <Bloque key={q.id} {...bloqueFaq(q)} className="faq">
                <p className="faq__pregunta">{pregunta}</p>
                <p className="faq__respuesta">{respuesta}</p>
              </Bloque>
            ) : (
              <Bloque key={q.id} {...bloqueFaq(q)} como="details" className="faq">
                <summary className="faq__pregunta">
                  {pregunta}
                  <Icon className="desplegable__flecha" icon="ph:caret-down" width={16} height={16} aria-hidden="true" />
                </summary>
                <p className="faq__respuesta">{respuesta}</p>
              </Bloque>
            );
          })}
        </div>
      </>
    ),

    otras: (
      <>
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="proyectos.otras.chip">SEGUIR MIRANDO</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="proyectos.otras.titulo">Las otras</Texto>{" "}
              <Texto id="proyectos.otras.destacado" clase="titulo__destacado">
                orientaciones
              </Texto>
            </h2>
          </div>
        </div>
        <div className="atajos">
          {otras.map(([otraClave, otra]) => (
            <button className="atajo" key={otraClave} onClick={() => ir(`/proyectos/${otraClave}`)}>
              <Icon icon="ph:folders" width={26} height={26} aria-hidden="true" />
              <span className="atajo__titulo">
                <Texto id={`proyectos.${otraClave}.hero.destacado`}>{otra.titulo}</Texto>
              </span>
              <span className="atajo__texto">
                <Texto id={`proyectos.${otraClave}.hero.chip`}>{otra.chip}</Texto>
              </span>
              <span className="atajo__mas">
                <Texto id="proyectos.otras.ver">Ver proyectos</Texto>
                <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </>
    ),
  };

  return (
    <main>
      <Encabezado id={t("hero")}
        chip={<Texto id={t("hero.chip")}>{area.chip}</Texto>}
        titulo={<Texto id="proyectos.hero.titulo">Proyectos de</Texto>}
        destacado={<Texto id={t("hero.destacado")}>{area.titulo}</Texto>}
        texto={<Texto id={t("hero.texto")}>{area.resumen}</Texto>}
      />

      {listaSecciones.map((seccion) => (
        <Bloque key={seccion.id} {...bloqueSeccion(seccion)} como="section" className={seccion.clase}>
          {contenido[seccion.id]}
        </Bloque>
      ))}
    </main>
  );
}
