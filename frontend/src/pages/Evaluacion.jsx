import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import VisorPdf from "../components/VisorPdf.jsx";
import Texto, { Bloque, Imagen, useLista } from "../components/Texto.jsx";
import { criterios, periodos, valoraciones } from "../contenido.js";
import { cuadernillos } from "../saberes.js";
import { logo } from "../data.js";
import { ir } from "../router.js";

/* Visor del cuadernillo: se cierra con Esc y bloquea el scroll de atrás. */
function Visor({ doc, cerrar }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && cerrar();

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cerrar]);

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={cerrar}>
      <div className="modal__caja visor" onClick={(e) => e.stopPropagation()}>
        <div className="modal__barra">
          <div>
            <p className="chip">{doc.anio}</p>
            <h2 className="modal__titulo">{doc.titulo}</h2>
          </div>
          <div className="visor__acciones">
            <a className="boton" href={doc.pdf} target="_blank" rel="noopener noreferrer">
              <Icon icon="ph:arrow-square-out" width={16} height={16} aria-hidden="true" />
              <span className="visor__texto">Abrir en pestaña</span>
            </a>
            <a className="boton boton--primario" href={doc.pdf} download={doc.archivo}>
              <Icon icon="ph:download-simple" width={16} height={16} aria-hidden="true" />
              <span className="visor__texto">Descargar PDF</span>
            </a>
            <button className="cajon__cerrar" aria-label="Cerrar visor" onClick={cerrar}>
              <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <VisorPdf url={doc.pdf} archivo={doc.archivo} />
      </div>
    </div>
  );
}

const secciones = [
  { id: "cuadernillos", clase: "seccion contenedor" },
  { id: "valoraciones", clase: "seccion-alt" },
  { id: "periodos", clase: "seccion contenedor" },
  { id: "criterios", clase: "seccion contenedor" },
  { id: "aviso", clase: "seccion contenedor" },
];

export default function Evaluacion() {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null);

  const texto = busqueda.trim().toLowerCase();
  const [listaSecciones, bloqueSeccion] = useLista("evaluacion.secciones", secciones);
  const [docs, bloqueDoc] = useLista("evaluacion.cuadernillos", cuadernillos);
  const [listaValoraciones, bloqueValoracion] = useLista(
    "evaluacion.valoraciones",
    valoraciones.map(([sigla, nombre, detalle]) => ({ id: sigla, sigla, nombre, detalle })),
    { duplicable: true },
  );
  const [listaPeriodos, bloquePeriodo] = useLista(
    "evaluacion.periodos",
    periodos.map(([titulo, fechas, detalle], i) => ({ id: `p${i}`, titulo, fechas, detalle })),
    { duplicable: true },
  );
  const [listaCriterios, bloqueCriterio] = useLista(
    "evaluacion.criterios",
    criterios.map(([icono, titulo, detalle], i) => ({ id: `c${i}`, icono, titulo, detalle })),
    { duplicable: true },
  );

  const visibles = docs.filter((doc) =>
    [doc.titulo, doc.anio, doc.ciclo, doc.descripcion].join(" ").toLowerCase().includes(texto),
  );

  const contenido = {
    cuadernillos: (
      <>
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">
              <Texto id="evaluacion.cuadernillos.chip">CURSOS · CICLO LECTIVO 2026</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="evaluacion.cuadernillos.titulo">Cuadernillos</Texto>{" "}
              <Texto id="evaluacion.cuadernillos.destacado" clase="titulo__destacado">
                oficiales
              </Texto>
            </h2>
            <p className="texto">
              <Texto id="evaluacion.cuadernillos.texto">
                Elegí tu año para leer o descargar el cuadernillo de evaluación
                de saberes.
              </Texto>
            </p>
          </div>
          <label className="campo campo--busca">
            <Icon icon="ph:magnifying-glass" width={18} height={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar cuadernillo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
        </div>

        {texto && (
          <p className="resultado">
            Resultados para “<strong>{busqueda}</strong>”: {visibles.length} documento(s).
            <button className="enlace" onClick={() => setBusqueda("")}>
              Ver todos
            </button>
          </p>
        )}

        {visibles.length > 0 ? (
          <div className="cuadernillos">
            {visibles.map((doc) => {
              const base = `evaluacion.cuadernillos.${doc.id}`;

              return (
                <Bloque key={doc.id} {...bloqueDoc(doc)} como="article" className="cuadernillo">
                  <span className="cuadernillo__acento" />
                  <div className="cuadernillo__cabecera">
                    <span className="cuadernillo__anio">
                      <Texto id={`${base}.anio`}>{doc.anio}</Texto>
                    </span>
                    <span className="cuadernillo__pill">
                      <Icon icon="ph:file-pdf" width={13} height={13} aria-hidden="true" />
                      PDF
                    </span>
                  </div>

                  <button
                    className="cuadernillo__portada"
                    onClick={() => setAbierto(doc)}
                    aria-label={`Abrir ${doc.titulo}`}
                  >
                    <Imagen
                      id={`${base}.portada`}
                      className={`cuadernillo__img cuadernillo__img--${doc.ajuste}`}
                      src={doc.portada}
                      alt={`Portada de ${doc.titulo}`}
                    />
                    <span className="cuadernillo__velo">
                      <span className="cuadernillo__abrir">
                        <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
                        Abrir PDF
                      </span>
                    </span>
                  </button>

                  <div className="cuadernillo__pie">
                    <h3 className="cuadernillo__titulo">
                      <Texto id={`${base}.titulo`}>{doc.titulo}</Texto>
                    </h3>
                    <p className="cuadernillo__meta">
                      <Texto id={`${base}.meta`}>
                        {`${doc.ciclo} · ${doc.paginas} páginas · ${doc.peso}`}
                      </Texto>
                    </p>
                    <div className="cuadernillo__acciones">
                      <button className="card__link" onClick={() => setAbierto(doc)}>
                        <Texto id="evaluacion.cuadernillos.leer">Leer</Texto>
                        <Icon icon="ph:caret-right" width={15} height={15} aria-hidden="true" />
                      </button>
                      <a
                        className="cuadernillo__bajar"
                        href={doc.pdf}
                        download={doc.archivo}
                        aria-label={`Descargar ${doc.titulo}`}
                      >
                        <Icon icon="ph:download-simple" width={18} height={18} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </Bloque>
              );
            })}
          </div>
        ) : (
          <div className="sin-resultados">
            <Icon icon="ph:magnifying-glass" width={44} height={44} aria-hidden="true" />
            <h3 className="exito__titulo">No se encontraron documentos</h3>
            <p className="exito__texto">No hay cuadernillos que coincidan con “{busqueda}”.</p>
            <button className="pill" onClick={() => setBusqueda("")}>
              Borrar la búsqueda
            </button>
          </div>
        )}
      </>
    ),

    valoraciones: (
      <div className="contenedor">
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">
              <Texto id="evaluacion.valoraciones.chip">VALORACIONES</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="evaluacion.valoraciones.titulo">Qué dice tu</Texto>{" "}
              <Texto id="evaluacion.valoraciones.destacado" clase="titulo__destacado">
                boletín
              </Texto>
            </h2>
            <p className="texto">
              <Texto id="evaluacion.valoraciones.texto">
                Cada materia cierra el período con una de estas tres valoraciones.
              </Texto>
            </p>
          </div>
        </div>
        <div className="tarjetas-3">
          {listaValoraciones.map((v) => (
            <Bloque
              key={v.id}
              {...bloqueValoracion(v)}
              como="article"
              className={`valoracion valoracion--${v.sigla}`}
            >
              <span className="valoracion__sigla">
                <Texto id={`evaluacion.valoraciones.${v.id}.sigla`}>{v.sigla}</Texto>
              </span>
              <h3 className="valoracion__titulo">
                <Texto id={`evaluacion.valoraciones.${v.id}.nombre`}>{v.nombre}</Texto>
              </h3>
              <p className="valoracion__texto">
                <Texto id={`evaluacion.valoraciones.${v.id}.texto`}>{v.detalle}</Texto>
              </p>
            </Bloque>
          ))}
        </div>
      </div>
    ),

    periodos: (
      <>
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">
              <Texto id="evaluacion.periodos.chip">CALENDARIO</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="evaluacion.periodos.titulo">Períodos del</Texto>{" "}
              <Texto id="evaluacion.periodos.destacado" clase="titulo__destacado">
                ciclo lectivo
              </Texto>
            </h2>
          </div>
        </div>
        <ol className="linea">
          {listaPeriodos.map((p, i) => (
            <Bloque key={p.id} {...bloquePeriodo(p)} como="li" className="linea__item">
              <span className="linea__numero">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="linea__titulo">
                  <Texto id={`evaluacion.periodos.${p.id}.titulo`}>{p.titulo}</Texto>
                </h3>
                <p className="linea__fecha">
                  <Texto id={`evaluacion.periodos.${p.id}.fechas`}>{p.fechas}</Texto>
                </p>
                <p className="linea__texto">
                  <Texto id={`evaluacion.periodos.${p.id}.texto`}>{p.detalle}</Texto>
                </p>
              </div>
            </Bloque>
          ))}
        </ol>
      </>
    ),

    criterios: (
      <>
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">
              <Texto id="evaluacion.criterios.chip">CRITERIOS</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="evaluacion.criterios.titulo">Cómo</Texto>{" "}
              <Texto id="evaluacion.criterios.destacado" clase="titulo__destacado">
                evaluamos
              </Texto>
            </h2>
          </div>
        </div>
        <div className="tarjetas-4">
          {listaCriterios.map((c) => (
            <Bloque key={c.id} {...bloqueCriterio(c)} como="article" className="mini">
              <span className="mini__icono">
                <Icon icon={c.icono} width={24} height={24} aria-hidden="true" />
              </span>
              <h3 className="mini__titulo">
                <Texto id={`evaluacion.criterios.${c.id}.titulo`}>{c.titulo}</Texto>
              </h3>
              <p className="mini__texto">
                <Texto id={`evaluacion.criterios.${c.id}.texto`}>{c.detalle}</Texto>
              </p>
            </Bloque>
          ))}
        </div>
      </>
    ),

    aviso: (
      <div className="aviso">
        <div>
          <h3 className="aviso__titulo">
            <Texto id="evaluacion.aviso.titulo">¿Te quedaron materias sin acreditar?</Texto>
          </h3>
          <p className="aviso__texto">
            <Texto id="evaluacion.aviso.texto">
              Las materias con TED pasan a intensificación. Mirá el cronograma de
              mesas y el plan de trabajo de cada una.
            </Texto>
          </p>
        </div>
        <button className="pill" onClick={() => ir("/previas")}>
          <Texto id="evaluacion.aviso.boton">Ver intensificación</Texto>
          <Icon icon="ph:arrow-up-right" width={16} height={16} aria-hidden="true" />
        </button>
      </div>
    ),
  };

  return (
    <main>
      <Encabezado
        chip={<Texto id="evaluacion.hero.chip">RÉGIMEN ACADÉMICO</Texto>}
        titulo={<Texto id="evaluacion.hero.titulo">Evaluación de</Texto>}
        destacado={<Texto id="evaluacion.hero.destacado">saberes</Texto>}
        texto={
          <Texto id="evaluacion.hero.texto">
            Todo el material de primero, segundo y tercer año en un solo lugar,
            más cómo se lee el boletín y cómo sigue tu trayectoria.
          </Texto>
        }
      >
        <div className="insignia">
          <Imagen id="evaluacion.hero.logo" className="insignia__logo" src={logo} alt="" />
          <span>
            <span className="insignia__nombre">
              <Texto id="evaluacion.hero.escuela">
                E.E.S. TÉCNICA N°1 · CECILIA BERDICHEVSKI
              </Texto>
            </span>
            <span className="insignia__ciclo">
              <Texto id="evaluacion.hero.ciclo">Ciclo lectivo 2026</Texto>
            </span>
          </span>
        </div>
      </Encabezado>

      {listaSecciones.map((seccion) => (
        <Bloque
          key={seccion.id}
          {...bloqueSeccion(seccion)}
          como="section"
          className={seccion.clase}
        >
          {contenido[seccion.id]}
        </Bloque>
      ))}

      {abierto && <Visor doc={abierto} cerrar={() => setAbierto(null)} />}
    </main>
  );
}
