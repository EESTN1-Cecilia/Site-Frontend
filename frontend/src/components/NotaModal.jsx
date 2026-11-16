import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import Texto, { Dato, Imagen } from "./Texto.jsx";
import Bloques from "./Bloques.jsx";
import { logo } from "../data.js";
import "../styles/nota-modal.css";

const DUENO = "/panel/publicaciones";
const FOCUSABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Minutos de lectura: unas 200 palabras por minuto, mínimo uno. */
const minutosDeLectura = (bloques) => {
  const palabras = bloques.reduce(
    (total, b) =>
      b.tipo === "imagen" || b.tipo === "link"
        ? total
        : total + (b.texto || "").trim().split(/\s+/).filter(Boolean).length,
    0,
  );

  return Math.max(1, Math.round(palabras / 200));
};

/* Artículo completo de una novedad, con aire de nota de revista: titular,
   bajada, foto grande y texto. `lista` son las novedades visibles, para
   seguir con la anterior o la siguiente. */
export default function NotaModal({ novedad, lista, fecha, onCambiar, onCerrar }) {
  const panel = useRef(null);
  const scroll = useRef(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  const bloques = novedad.bloques || [];
  const portadaIndice = bloques.findIndex((b) => b.tipo === "imagen");
  const portada = portadaIndice >= 0 ? bloques[portadaIndice] : null;
  const sinPortada = bloques.filter((_, i) => i !== portadaIndice);

  /* El primer párrafo es la bajada; el resto es el cuerpo. */
  const bajada = sinPortada.find((b) => b.tipo === "parrafo");
  const cuerpo = sinPortada.filter((b) => b !== bajada);
  /* En dos columnas sólo si es texto corrido; con subtítulos, citas o fotos
     en el medio se lee mejor en una. */
  const parrafos = cuerpo.filter((b) => b.tipo === "parrafo").length;
  const enColumnas = parrafos >= 3 && cuerpo.every((b) => b.tipo === "parrafo" || b.tipo === "link");
  const clave = (resto) => `pub:${novedad.id}:${resto}`;

  const indice = lista.findIndex((n) => n.id === novedad.id);
  const masReciente = indice > 0 ? lista[indice - 1] : null;
  const masAntigua = indice >= 0 && indice < lista.length - 1 ? lista[indice + 1] : null;
  const autor = novedad.autor && novedad.autor !== "Sin asignar" ? novedad.autor : "";
  const anio = (novedad.fecha || "").slice(0, 4);

  /* Al abrir: bloquea el scroll de la página (sin que se corra el contenido),
     lleva el foco a la ventana y, al cerrar, lo devuelve a "Leer más". */
  useEffect(() => {
    const previo = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    const barra = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;
    panel.current?.focus();

    const alTeclear = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cerrar.current();
        return;
      }

      /* Tab da vueltas dentro de la ventana. */
      if (e.key !== "Tab" || !panel.current) return;

      const items = [...panel.current.querySelectorAll(FOCUSABLES)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;

      const primero = items[0];
      const ultimo = items[items.length - 1];
      const enPanel = document.activeElement === panel.current;

      if (e.shiftKey && (enPanel || document.activeElement === primero)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previo?.focus?.();
    };
  }, []);

  /* Al pasar a otra nota se vuelve al principio. */
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [novedad.id]);

  const vecina = (nota, sentido) => (
    <button
      className={`nota-modal__vecina ${sentido === "sig" ? "nota-modal__vecina--sig" : ""}`}
      onClick={() => onCambiar(nota.id)}
    >
      <small className="nota-modal__vecina-etiqueta">
        {sentido === "ant" && <Icon icon="ph:arrow-left" width={14} height={14} aria-hidden="true" />}
        {sentido === "ant" ? "Más reciente" : "Más antigua"}
        {sentido === "sig" && <Icon icon="ph:arrow-right" width={14} height={14} aria-hidden="true" />}
      </small>
      <span className="nota-modal__vecina-categoria">{nota.categoria}</span>
      <span className="nota-modal__vecina-titulo">{nota.titulo}</span>
    </button>
  );

  return createPortal(
    <div
      className="nota-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className="nota-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nota-modal-titulo"
        tabIndex={-1}
        ref={panel}
      >
        {/* Cabecera, como la de una revista: sección, nombre de la escuela y cierre. */}
        <header className="nota-modal__cabecera">
          <p className="nota-modal__seccion">
            Novedades
            {anio && <span> · {anio}</span>}
          </p>

          <span className="nota-modal__marca">
            <Imagen id="inicio.menu.logo" className="nota-modal__logo" src={logo} alt="Logo Técnica 1" />
            <span className="nota-modal__marca-texto">
              <span className="nota-modal__marca-titulo">
                <Texto id="inicio.menu.titulo">Técnica 1</Texto>
              </span>
              <span className="nota-modal__marca-bajada">
                <Texto id="inicio.menu.bajada">CECILIA BERDICHEVSKY</Texto>
              </span>
            </span>
          </span>

          <button className="nota-modal__cerrar" onClick={onCerrar} aria-label="Cerrar artículo" title="Cerrar (Esc)">
            <span className="nota-modal__cerrar-texto">Cerrar</span>
            <Icon icon="ph:x" width={16} height={16} aria-hidden="true" />
          </button>
        </header>

        <div className="nota-modal__scroll" ref={scroll}>
          <article className="nota-modal__articulo">
            <header className="nota-modal__titular">
              <p className="nota-modal__kicker">
                <Texto id={clave("categoria")} dueno={DUENO}>
                  {novedad.categoria}
                </Texto>
              </p>

              <h2 className="nota-modal__titulo" id="nota-modal-titulo">
                <Texto id={clave("titulo")} dueno={DUENO}>
                  {novedad.titulo}
                </Texto>
              </h2>

              {bajada && (
                <p className="nota-modal__bajada">
                  <Texto id={clave(`bloque:${bajada.id}`)} dueno={DUENO}>
                    {bajada.texto}
                  </Texto>
                </p>
              )}

              <p className="nota-modal__firma">
                {autor && (
                  <span>
                    Por <strong>{autor}</strong>
                  </span>
                )}
                <span>
                  <Dato id={clave("fecha")} dueno={DUENO} tipo="date" valor={novedad.fecha} formato={fecha} />
                </span>
                <span>{minutosDeLectura(sinPortada)} min de lectura</span>
              </p>
            </header>

            {portada && (
              <figure className={`nota-modal__portada ${portada.marco ? "nota-modal__portada--marco" : ""}`}>
                <div className="nota-modal__portada-marco">
                  <Imagen id={clave(`bloque:${portada.id}`)} dueno={DUENO} src={portada.url} alt={portada.epigrafe || ""} />
                  {novedad.borrador && <span className="nota__sello">SIN PUBLICAR</span>}
                </div>
                {portada.epigrafe && <figcaption>{portada.epigrafe}</figcaption>}
              </figure>
            )}

            {cuerpo.length > 0 && (
              <div className={`nota-modal__cuerpo ${enColumnas ? "nota-modal__cuerpo--columnas" : ""}`}>
                <Bloques pub={novedad} bloques={cuerpo} />
              </div>
            )}

            <p className="nota-modal__fin" aria-hidden="true">
              <span />
            </p>
          </article>

          <footer className="nota-modal__pie">
            {(masReciente || masAntigua) && (
              <nav className="nota-modal__seguir" aria-label="Otras novedades">
                <p className="nota-modal__seguir-titulo">Seguir leyendo</p>
                <div className="nota-modal__vecinas">
                  {masReciente ? vecina(masReciente, "ant") : <span />}
                  {masAntigua && vecina(masAntigua, "sig")}
                </div>
              </nav>
            )}

            <div className="nota-modal__colofon">
              <span className="nota-modal__colofon-marca">
                <Imagen id="inicio.menu.logo" className="nota-modal__logo-pie" src={logo} alt="" />
                <span>
                  <span className="nota-modal__colofon-nombre">
                    <Texto id="inicio.pie.titulo">Técnica 1 Cecilia Berdichevsky</Texto>
                  </span>
                  <span className="nota-modal__colofon-dato">
                    <Texto id="inicio.pie.direccion">
                      Güemes 2051 · Esteban Echeverría · Provincia de Buenos Aires.
                    </Texto>
                  </span>
                </span>
              </span>
              <button className="nota-modal__volver" onClick={onCerrar}>
                <Icon icon="ph:arrow-left" width={15} height={15} aria-hidden="true" />
                Volver a novedades
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
