import { useEffect } from "react";
import { Icon } from "@iconify/react";
import ProposalCard from "../components/ProposalCard.jsx";
import FactGiratorio from "../components/FactGiratorio.jsx";
import Texto, {
  Bloque,
  Enlace,
  Imagen,
  useEdicionTextos,
  useLista,
} from "../components/Texto.jsx";
import ZonaLibre from "../components/ZonaLibre.jsx";
import { Dinamico, PaginaEditable, usePaginaGuardada } from "../components/PaginaEditable.jsx";
import { courses, facade, logo, proposals } from "../data.js";
import { useAjustes } from "../ajustes.js";
import { useProgramas } from "../programas.js";
import { dominio } from "../links.js";
import { ir } from "../router.js";

const destinos = ["ciclo-basico", "informatica", "programacion"];
const PROGRAMAS = "/panel/programas";

/* Contenido original de la portada. Lo que se cambie desde gestión se guarda
   aparte (textos.js) y se aplica encima. */
const facts = [
  {
    id: "f1",
    icono: "ph:wrench",
    tono: "rose",
    titulo: "Aprendizaje práctico",
    texto: "Proyectos que conectan teoría y realidad.",
    detalle: [
      "Taller desde 1° año: electricidad, madera, metal y dibujo técnico.",
      "Proyectos reales que se presentan en la muestra anual.",
      "Prácticas profesionalizantes en 7° año.",
    ],
  },
  {
    id: "f2",
    icono: "ph:users-three",
    tono: "gray",
    titulo: "Comunidad educativa",
    texto: "Una escuela abierta, inclusiva y participativa.",
    detalle: [
      "Equipo de orientación que acompaña cada trayectoria.",
      "Preceptores que siguen a cada curso durante el año.",
      "Jornadas abiertas para conocer la escuela con las familias.",
    ],
  },
  {
    id: "f3",
    icono: "ph:rocket-launch",
    tono: "white",
    titulo: "Mirada hacia el futuro",
    texto: "Tecnología, creatividad y compromiso.",
    detalle: [
      "Dos orientaciones técnicas: Informática y Programación.",
      "Título de técnico al egresar.",
      "Base para seguir estudiando o empezar a trabajar.",
    ],
  },
];

const atajos = [
  {
    id: "a1",
    ruta: "/evaluacion",
    icono: "ph:clipboard-text",
    titulo: "Evaluación de saberes",
    texto: "Períodos, valoraciones y cómo se lee el boletín.",
  },
  {
    id: "a2",
    ruta: "/previas",
    icono: "ph:arrows-clockwise",
    titulo: "Intensificación / Previas",
    texto: "Cronograma de mesas y pasos para acreditar.",
  },
  {
    id: "a3",
    ruta: "/novedades",
    icono: "ph:megaphone",
    titulo: "Novedades",
    texto: "Todo lo que pasa en la escuela, al día.",
  },
];

const puntos = [
  { id: "p1", titulo: "Conocimiento", texto: "Aprender para comprender." },
  { id: "p2", titulo: "Práctica", texto: "Aprender haciendo." },
  { id: "p3", titulo: "Innovación", texto: "Imaginar nuevas soluciones." },
  { id: "p4", titulo: "Comunidad", texto: "Construir juntos." },
];

const propuestas = proposals.map(([title, text, image], i) => ({
  id: `pr${i}`,
  title,
  text,
  image,
  i,
}));

/* Piezas del hero y sus botones: se reordenan, ocultan y cambian de fondo. */
const piezasHero = [{ id: "chip" }, { id: "titulo" }, { id: "bajada" }, { id: "acciones" }];
const botonesHero = [{ id: "cursos" }, { id: "inscripcion" }];

const secciones = [
  { id: "escuela", clase: "seccion contenedor" },
  { id: "propuestas", clase: "propuestas", ancla: "cursos" },
  { id: "atajos", clase: "seccion contenedor" },
  { id: "identidad", clase: "seccion contenedor" },
  { id: "programas", clase: "seccion contenedor", ancla: "programas" },
];

/* Secciones que responden a clics o se arman con datos: en la página armada
   con el editor completo son bloques automáticos (PaginaEditable.jsx). */
const AUTOMATICAS = { propuestas: "cursos", atajos: "accesos", programas: "programas" };

export default function Inicio({ params }) {
  const edicion = useEdicionTextos();
  const { inscripcionAbierta } = useAjustes();
  const programas = useProgramas();
  const vistaPrevia = params?.get("preview");

  /* La vista previa de gestión abre directo en la sección de programas. */
  useEffect(() => {
    if (vistaPrevia === "programas")
      document.getElementById("programas")?.scrollIntoView({ block: "start" });
  }, [vistaPrevia]);

  const [listaSecciones, bloqueSeccion] = useLista("inicio.secciones", secciones);
  const [piezas, bloquePieza] = useLista("inicio.hero.piezas", piezasHero);
  const [botones, bloqueBoton] = useLista("inicio.hero.botones", botonesHero);
  const [listaFacts, bloqueFact] = useLista("inicio.facts", facts, { duplicable: true });
  const [listaPropuestas, bloquePropuesta] = useLista("inicio.propuestas", propuestas);
  const [listaAtajos, bloqueAtajo] = useLista("inicio.atajos", atajos, { duplicable: true });
  const [listaPuntos, bloquePunto] = useLista("inicio.puntos", puntos, { duplicable: true });
  const guardada = usePaginaGuardada("inicio.pagina");

  const tarjetasQueGiran = (
    <div className="facts">
      {listaFacts.map((fact) => (
        <FactGiratorio key={fact.id} fact={fact} bloque={bloqueFact(fact)} />
      ))}
    </div>
  );

  const contenido = {
    escuela: (
      <>
        <div className="centrado">
          <p className="chip">
            <Texto id="inicio.escuela.chip">NUESTRA ESCUELA</Texto>
          </p>
          <h2 className="titulo">
            <Texto id="inicio.escuela.titulo">Una escuela para quienes</Texto>{" "}
            <Texto id="inicio.escuela.destacado" clase="titulo__destacado">
              quieren hacer
            </Texto>
            .
          </h2>
          <p className="texto">
            <Texto id="inicio.escuela.texto">
              Formamos estudiantes con curiosidad, pensamiento crítico y
              herramientas para construir su futuro. Nuestra comunidad combina
              conocimiento, práctica y trabajo colaborativo.
            </Texto>
          </p>
        </div>
        <Dinamico id="tarjetas-giran">{tarjetasQueGiran}</Dinamico>
      </>
    ),

    propuestas: (
      <div className="propuestas__inner">
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="inicio.propuestas.chip">FORMACIÓN</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="inicio.propuestas.titulo">Nuestras</Texto>{" "}
              <Texto id="inicio.propuestas.destacado" clase="titulo__destacado">
                propuestas
              </Texto>
            </h2>
          </div>
          <p className="descripcion">
            <Texto id="inicio.propuestas.descripcion">
              Buscá tu curso y accedé a los materiales de cada división.
            </Texto>
          </p>
        </div>
        <div className="cards">
          {listaPropuestas.map((propuesta) => (
            <ProposalCard
              key={propuesta.id}
              propuesta={propuesta}
              course={courses[propuesta.i]}
              destino={destinos[propuesta.i]}
              bloque={bloquePropuesta(propuesta)}
            />
          ))}
        </div>
      </div>
    ),

    atajos: (
      <div className="atajos">
        {listaAtajos.map((atajo) => (
          <Bloque key={atajo.id} {...bloqueAtajo(atajo)} className="atajo-caja">
            <button className="atajo" onClick={() => ir(atajo.ruta)}>
              <Icon icon={atajo.icono} width={26} height={26} aria-hidden="true" />
              <span className="atajo__titulo">
                <Texto id={`inicio.atajos.${atajo.id}.titulo`}>{atajo.titulo}</Texto>
              </span>
              <span className="atajo__texto">
                <Texto id={`inicio.atajos.${atajo.id}.texto`}>{atajo.texto}</Texto>
              </span>
              <span className="atajo__mas">
                <Texto id={`inicio.atajos.${atajo.id}.mas`}>Entrar</Texto>
                <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
              </span>
            </button>
          </Bloque>
        ))}
      </div>
    ),

    identidad: (
      <div className="identidad">
        <div>
          <p className="chip chip--logo">
            <Imagen id="inicio.identidad.logo" src={logo} alt="" />
            <Texto id="inicio.identidad.chip">IDENTIDAD INSTITUCIONAL</Texto>
          </p>
          <h2 className="titulo">
            <Texto id="inicio.identidad.titulo">Técnica, creatividad y</Texto>{" "}
            <Texto id="inicio.identidad.destacado" clase="titulo__destacado">
              comunidad
            </Texto>
            .
          </h2>
          <p className="texto">
            <Texto id="inicio.identidad.texto">
              Nuestra identidad se construye a partir de la educación técnica
              como herramienta de transformación. Aprender es experimentar,
              resolver problemas, trabajar con otros y animarse a crear.
            </Texto>
          </p>
        </div>
        <div className="puntos">
          {listaPuntos.map((punto, i) => (
            <Bloque key={punto.id} {...bloquePunto(punto)} como="article" className="punto">
              <span className="punto__numero">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="punto__titulo">
                  <Texto id={`inicio.puntos.${punto.id}.titulo`}>{punto.titulo}</Texto>
                </h3>
                <p className="punto__texto">
                  <Texto id={`inicio.puntos.${punto.id}.texto`}>{punto.texto}</Texto>
                </p>
              </div>
            </Bloque>
          ))}
        </div>
      </div>
    ),

    programas: (
      <>
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">
              <Texto id="inicio.programas.chip">HECHO EN LA TEC</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="inicio.programas.titulo">Programas de la</Texto>{" "}
              <Texto id="inicio.programas.destacado" clase="titulo__destacado">
                Tec
              </Texto>
            </h2>
            <p className="texto">
              <Texto id="inicio.programas.texto">
                Herramientas que desarrollaron nuestros alumnos y que cualquiera
                puede usar.
              </Texto>
            </p>
          </div>
        </div>

        <div className="programas">
          {programas.map((programa) => (
            <article className="programa" key={programa.id}>
              <span className="programa__logo">
                <Imagen
                  id={`prog:${programa.id}:logo`}
                  dueno={PROGRAMAS}
                  src={programa.logo || ""}
                  alt={`Logo de ${programa.nombre}`}
                  className="programa__logo-img"
                  vacio={<span aria-hidden="true">{programa.nombre.trim()[0]?.toUpperCase()}</span>}
                />
              </span>
              <h3 className="programa__nombre">
                <Texto id={`prog:${programa.id}:nombre`} dueno={PROGRAMAS}>
                  {programa.nombre}
                </Texto>
              </h3>
              <p className="programa__texto">
                <Texto id={`prog:${programa.id}:descripcion`} dueno={PROGRAMAS}>
                  {programa.descripcion}
                </Texto>
              </p>
              {(programa.autores || edicion) && (
                <p className="programa__autores">
                  <Icon icon="ph:users" width={15} height={15} aria-hidden="true" />
                  <Texto id={`prog:${programa.id}:autores`} dueno={PROGRAMAS}>
                    {programa.autores}
                  </Texto>
                </p>
              )}
              <div className="programa__pie">
                <Enlace
                  id={`prog:${programa.id}:url`}
                  dueno={PROGRAMAS}
                  href={programa.url}
                  className="boton boton--primario"
                  ocultarVacio
                >
                  <Texto id="inicio.programas.ingresar">Ingresar</Texto>
                  <Icon icon="ph:arrow-up-right" width={16} height={16} aria-hidden="true" />
                </Enlace>
                <span className="programa__dominio">{dominio(programa.url)}</span>
              </div>
            </article>
          ))}
        </div>
      </>
    ),
  };

  const seccionDe = (seccion) =>
    seccion.id === "programas" && programas.length === 0 ? null : (
      <Bloque
        key={seccion.id}
        {...bloqueSeccion(seccion)}
        como="section"
        className={seccion.clase}
        ancla={seccion.ancla}
      >
        {contenido[seccion.id]}
      </Bloque>
    );

  const botonesPortada = (bloque) => (
    <Bloque key="acciones" {...bloque} className="hero__acciones">
      {botones
        /* Con la inscripción cerrada el botón no se muestra en el sitio. */
        .filter((boton) => boton.id !== "inscripcion" || edicion?.puede() || inscripcionAbierta)
        .map((boton) => (
          <Bloque key={boton.id} {...bloqueBoton(boton)} como="span" className="hero__boton">
            {boton.id === "cursos" ? (
              <button
                className="pill"
                onClick={() =>
                  document.getElementById("cursos")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Texto id="inicio.hero.accionPrimaria">Ver cursos</Texto>
                <Icon icon="ph:arrow-up-right" width={16} height={16} aria-hidden="true" />
              </button>
            ) : (
              <button className="pill pill--ghost" onClick={() => ir("/inscripcion")}>
                <Texto id="inicio.hero.accionSecundaria">Inscripción 2027</Texto>
              </button>
            )}
          </Bloque>
        ))}
    </Bloque>
  );

  const flechaBajar = (
    <button
      className="hero__scroll"
      aria-label="Bajar para ver más"
      onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" })}
    />
  );

  if (guardada) {
    const acciones = piezas.find((pieza) => pieza.id === "acciones");
    const seccion = (id) => seccionDe(listaSecciones.find((s) => s.id === id) ?? secciones.find((s) => s.id === id));
    return (
      <main>
        <PaginaEditable
          clave="inicio.pagina"
          pagina={guardada}
          dinamicos={{
            botones: acciones && botonesPortada(bloquePieza(acciones)),
            bajar: flechaBajar,
            "tarjetas-giran": tarjetasQueGiran,
            cursos: seccion("propuestas"),
            accesos: seccion("atajos"),
            programas: seccion("programas"),
          }}
        />
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="hero__card">
          <Imagen id="inicio.hero.foto" className="hero__img" src={facade} alt="Fachada de la escuela" />
          <div className="hero__velo" />
          <div className="hero__contenido">
            {piezas.map((pieza) => {
              const b = bloquePieza(pieza);

              if (pieza.id === "chip")
                return (
                  <Bloque key={pieza.id} {...b} como="p" className="hero__chip">
                    <Imagen id="inicio.hero.logo" src={logo} alt="" />
                    <Texto id="inicio.hero.chip">
                      EDUCACIÓN TÉCNICA PÚBLICA · ESTEBAN ECHEVERRÍA
                    </Texto>
                  </Bloque>
                );

              if (pieza.id === "titulo")
                return (
                  <Bloque key={pieza.id} {...b} como="h1" className="hero__titulo">
                    <Texto id="inicio.hero.titulo">Técnica 1</Texto>
                    <br />
                    <Texto id="inicio.hero.destacado" clase="hero__destacado">
                      Cecilia Berdichevski
                    </Texto>
                  </Bloque>
                );

              if (pieza.id === "bajada")
                return (
                  <Bloque key={pieza.id} {...b} como="p" className="hero__bajada">
                    <Texto id="inicio.hero.bajada">
                      Un espacio para aprender, crear y transformar ideas en
                      proyectos. Formación técnica, comunidad y futuro.
                    </Texto>
                  </Bloque>
                );

              return (
                <Dinamico key={pieza.id} id="botones">
                  {botonesPortada(b)}
                </Dinamico>
              );
            })}
          </div>
        </div>

        <Dinamico id="bajar">{flechaBajar}</Dinamico>
      </section>

      {listaSecciones.map((seccion) =>
        Object.hasOwn(AUTOMATICAS, seccion.id) ? (
          <Dinamico key={seccion.id} id={AUTOMATICAS[seccion.id]}>
            {seccionDe(seccion)}
          </Dinamico>
        ) : (
          seccionDe(seccion)
        ),
      )}

      <ZonaLibre seccion zona="inicio.libre" titulo="Inicio" />
    </main>
  );
}
