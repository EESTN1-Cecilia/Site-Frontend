import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import VisorPdf from "../components/VisorPdf.jsx";
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
            <a
              className="boton"
              href={doc.pdf}
              target="_blank"
              rel="noopener noreferrer"
            >
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

export default function Evaluacion() {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null);

  const texto = busqueda.trim().toLowerCase();
  const lista = cuadernillos.filter((doc) =>
    [doc.titulo, doc.anio, doc.ciclo, doc.descripcion]
      .join(" ")
      .toLowerCase()
      .includes(texto),
  );

  return (
    <main>
      <Encabezado
        chip="RÉGIMEN ACADÉMICO"
        titulo="Evaluación de"
        destacado="saberes"
        texto="Todo el material de primero, segundo y tercer año en un solo lugar, más cómo se lee el boletín y cómo sigue tu trayectoria."
      >
        <div className="insignia">
          <img className="insignia__logo" src={logo} alt="" />
          <span>
            <span className="insignia__nombre">
              E.E.S. TÉCNICA N°1 · CECILIA BERDICHEVSKI
            </span>
            <span className="insignia__ciclo">Ciclo lectivo 2026</span>
          </span>
        </div>
      </Encabezado>

      <section className="seccion contenedor">
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">CURSOS · CICLO LECTIVO 2026</p>
            <h2 className="titulo">
              Cuadernillos <span>oficiales</span>
            </h2>
            <p className="texto">
              Elegí tu año para leer o descargar el cuadernillo de evaluación de
              saberes.
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
            Resultados para “<strong>{busqueda}</strong>”: {lista.length}{" "}
            documento(s).
            <button className="enlace" onClick={() => setBusqueda("")}>
              Ver todos
            </button>
          </p>
        )}

        {lista.length > 0 ? (
          <div className="cuadernillos">
            {lista.map((doc) => (
              <article className="cuadernillo" key={doc.id}>
                <span className="cuadernillo__acento" />
                <div className="cuadernillo__cabecera">
                  <span className="cuadernillo__anio">{doc.anio}</span>
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
                  <img
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
                  <h3 className="cuadernillo__titulo">{doc.titulo}</h3>
                  <p className="cuadernillo__meta">
                    {doc.ciclo} · {doc.paginas} páginas · {doc.peso}
                  </p>
                  <div className="cuadernillo__acciones">
                    <button className="card__link" onClick={() => setAbierto(doc)}>
                      Leer
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
              </article>
            ))}
          </div>
        ) : (
          <div className="sin-resultados">
            <Icon icon="ph:magnifying-glass" width={44} height={44} aria-hidden="true" />
            <h3 className="exito__titulo">No se encontraron documentos</h3>
            <p className="exito__texto">
              No hay cuadernillos que coincidan con “{busqueda}”.
            </p>
            <button className="pill" onClick={() => setBusqueda("")}>
              Borrar la búsqueda
            </button>
          </div>
        )}
      </section>

      <section className="seccion-alt">
        <div className="contenedor">
          <div className="encabezado encabezado--barra">
            <div>
              <p className="chip">VALORACIONES</p>
              <h2 className="titulo">
                Qué dice tu <span>boletín</span>
              </h2>
              <p className="texto">
                Cada materia cierra el período con una de estas tres
                valoraciones.
              </p>
            </div>
          </div>
          <div className="tarjetas-3">
            {valoraciones.map(([sigla, nombre, texto]) => (
              <article className={`valoracion valoracion--${sigla}`} key={sigla}>
                <span className="valoracion__sigla">{sigla}</span>
                <h3 className="valoracion__titulo">{nombre}</h3>
                <p className="valoracion__texto">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">CALENDARIO</p>
            <h2 className="titulo">
              Períodos del <span>ciclo lectivo</span>
            </h2>
          </div>
        </div>
        <ol className="linea">
          {periodos.map(([titulo, fechas, texto], i) => (
            <li className="linea__item" key={titulo}>
              <span className="linea__numero">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="linea__titulo">{titulo}</h3>
                <p className="linea__fecha">{fechas}</p>
                <p className="linea__texto">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="seccion contenedor">
        <div className="encabezado encabezado--barra">
          <div>
            <p className="chip">CRITERIOS</p>
            <h2 className="titulo">
              Cómo <span>evaluamos</span>
            </h2>
          </div>
        </div>
        <div className="tarjetas-4">
          {criterios.map(([icono, titulo, texto]) => (
            <article className="mini" key={titulo}>
              <span className="mini__icono">
                <Icon icon={icono} width={24} height={24} aria-hidden="true" />
              </span>
              <h3 className="mini__titulo">{titulo}</h3>
              <p className="mini__texto">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="aviso">
          <div>
            <h3 className="aviso__titulo">
              ¿Te quedaron materias sin acreditar?
            </h3>
            <p className="aviso__texto">
              Las materias con TED pasan a intensificación. Mirá el cronograma
              de mesas y el plan de trabajo de cada una.
            </p>
          </div>
          <button className="pill" onClick={() => ir("/previas")}>
            Ver intensificación
            <Icon icon="ph:arrow-up-right" width={16} height={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      {abierto && <Visor doc={abierto} cerrar={() => setAbierto(null)} />}
    </main>
  );
}
