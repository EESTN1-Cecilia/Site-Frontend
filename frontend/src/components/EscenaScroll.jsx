import { useEffect, useRef, useState } from "react";
import "../styles/robotScroll.css";

/* Motor genérico de las escenas 3D (CSS 3D, sin librerías) controladas por el
   scroll: el modelo gira, se desarma pieza por pieza con la cámara siguiendo a
   cada una y, al final, se vuelve a armar. Usa los mismos estilos que el robot
   de 3° año (styles/robotScroll.css).

   Cada escena se describe con un objeto `config`:
   - piezas: [{ id, nombre, texto, etiqueta: [titulo, detalle], vec, base, zoom }]
       vec   hacia dónde se separa la pieza (y negativo = arriba)
       base  centro de la pieza armada (hacia ahí apunta la cámara)
       zoom  acercamiento de la cámara sobre esa pieza
   - Modelo: componente que dibuja una <Pieza> por cada id.
   - textos y encuadres generales (intro, vista explosionada, armado). */

export const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t) => {
  const x = lim(t);
  return x * x * (3 - 2 * x);
};

/* Caja con seis caras. x, y, z es su centro; w (ancho), h (alto), d (profundo). */
export function Caja({ w, h, d, x = 0, y = 0, z = 0, c, imp = false, eti = null, tex = null }) {
  return (
    <div
      className={`rs-caja${imp ? " rs-imp" : ""}`}
      style={{
        "--c": c,
        "--w": `${w}px`,
        "--h": `${h}px`,
        "--d": `${d}px`,
        transform: `translate3d(${x}px, ${y}px, ${z}px)`,
      }}
    >
      <i className="rs-cara rs-f" />
      <i className="rs-cara rs-t" />
      <i className="rs-cara rs-r" />
      <i className="rs-cara rs-l" />
      <i className="rs-cara rs-u" style={tex || undefined}>
        {eti}
      </i>
      <i className="rs-cara rs-d" />
    </div>
  );
}

/* Cilindro acostado a lo largo de x. */
export function Cil({ r, len, x = 0, y = 0, z = 0, c, lados = 12, tapas = true, tapaC = null }) {
  const ap = r * Math.cos(Math.PI / lados);
  const ancho = 2 * r * Math.sin(Math.PI / lados) + 1;
  return (
    <div className="rs-cil" style={{ "--c": c, transform: `translate3d(${x}px, ${y}px, ${z}px)` }}>
      {Array.from({ length: lados }, (_, k) => (
        <i
          key={k}
          className="rs-cara rs-cilindro"
          style={{
            width: len,
            height: ancho,
            left: -len / 2,
            top: -ancho / 2,
            transform: `rotateX(${(360 / lados) * k}deg) translateZ(${ap}px)`,
          }}
        />
      ))}
      {tapas &&
        [len / 2, -len / 2].map((dx) => (
          <i
            key={dx}
            className="rs-cara rs-tapa"
            style={{
              background: tapaC || undefined,
              width: r * 2,
              height: r * 2,
              left: -r,
              top: -r,
              transform: `rotateY(${dx > 0 ? 90 : -90}deg) translateZ(${Math.abs(dx)}px)`,
            }}
          />
        ))}
    </div>
  );
}

/* Grupo que mueve y gira a sus hijos (brazos inclinados, uniones, etc.). */
export function Giro({ x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, children }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rz}deg) rotateY(${ry}deg) rotateX(${rx}deg)`,
      }}
    >
      {children}
    </div>
  );
}

/* Una pieza que se separa del resto. `ancla` es el punto donde se apoya el cartel. */
export function Pieza({ id, ancla, children }) {
  return (
    <div className="rs-pieza" data-grupo={id}>
      <i className="rs-ancla" style={{ transform: `translate3d(${ancla[0]}px, ${ancla[1]}px, ${ancla[2]}px)` }} />
      {children}
    </div>
  );
}

export default function EscenaScroll({ config, scroller = null }) {
  const { piezas, Modelo, intro, explosion, armado, ayuda, vista, zoomVista, eje: ejeArmado, zoomArmado } = config;
  const N = piezas.length;
  const INICIO = 0.14;
  const PASO = 0.52 / N;
  const FIN_DESARME = INICIO + PASO * N;
  const REARMA = 0.84;

  const seccion = useRef(null);
  const raiz = useRef(null);
  const [foco, setFoco] = useState(-1);
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const mm = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducido(mm.matches);
    const alCambiar = () => setReducido(mm.matches);
    mm.addEventListener("change", alCambiar);
    return () => mm.removeEventListener("change", alCambiar);
  }, []);

  useEffect(() => {
    const sec = seccion.current;
    const base = raiz.current;
    const mundo = base.querySelector(".rs-mundo");
    const modelo = base.querySelector(".rs-robot");
    const sombra = base.querySelector(".rs-sombra");
    const suelo = base.querySelector(".rs-suelo");
    const escenario = base.querySelector(".rs-escenario");
    const cartel = base.querySelector(".rs-cartel");
    const lista = [...base.querySelectorAll(".rs-pieza")].map((el) => ({
      el,
      j: piezas.findIndex((p) => p.id === el.dataset.grupo),
      ultimo: "",
      e: 0,
      ancla: el.querySelector(".rs-ancla"),
    }));

    let cuadro = 0;
    let giroMano = 0;
    let arrastre = null;
    let focoActual = -2;
    let escala = 1;

    const medir = () => {
      const r = escenario.getBoundingClientRect();
      escala = lim(Math.min(r.width / 900, r.height / 780), 0.35, 1);
    };

    const actualizar = () => {
      cuadro = 0;
      const r = sec.getBoundingClientRect();
      /* Dentro de un modal el que se desplaza es el contenedor, no la ventana. */
      const arriba = scroller ? scroller.getBoundingClientRect().top : 0;
      const alto = scroller ? scroller.clientHeight : window.innerHeight;
      const recorrido = r.height - alto;
      const P = reducido ? 0.74 : recorrido > 0 ? lim(-(r.top - arriba) / recorrido) : 0;

      const desarme = 1 - suave((P - REARMA) / 0.08);
      const ry = -32 + 360 * lim(P / 0.9) + giroMano;
      const rx = -(34 + 8 * suave((P - 0.1) / 0.3));

      let nuevoFoco = -1;
      if (P >= REARMA) nuevoFoco = N + 1;
      else if (P >= FIN_DESARME) nuevoFoco = N;
      else if (P >= INICIO) nuevoFoco = Math.floor((P - INICIO) / PASO);
      if (reducido) nuevoFoco = N;

      let abierto = 0;
      for (const p of lista) {
        const e = suave((P - (INICIO + PASO * p.j)) / 0.05) * desarme;
        p.e = e;
        abierto = Math.max(abierto, e);
        const v = piezas[p.j].vec;
        const t = `translate3d(${(v[0] * e).toFixed(1)}px, ${(v[1] * e).toFixed(1)}px, ${(v[2] * e).toFixed(1)}px)`;
        if (t !== p.ultimo) {
          p.ultimo = t;
          p.el.style.transform = t;
        }
      }
      sombra.style.opacity = String((1 - 0.55 * abierto).toFixed(2));
      suelo.style.opacity = String((1 - 0.6 * abierto).toFixed(2));

      /* La cámara sigue a la pieza que se explica, da una vista general y vuelve al modelo armado. */
      const f = (P - INICIO) / PASO;
      const i0 = lim(Math.floor(f), 0, N - 1);
      const i1 = Math.min(i0 + 1, N - 1);
      const k = suave((f - i0 - 0.65) / 0.35);
      const entra = suave((P - (INICIO - 0.02)) / 0.05);
      const sale = suave((P - FIN_DESARME) / 0.05);
      const rearma = suave((P - REARMA) / 0.08);
      const wf = entra * (1 - sale);
      const wo = sale * (1 - rearma);
      const wa = Math.max(0, 1 - wf - wo);
      /* El centro de la pieza en este momento: sigue su trayecto, no el destino. */
      const actual = (j, n) => {
        const e = lista.find((p) => p.j === j).e;
        return piezas[j].base[n] + piezas[j].vec[n] * e;
      };
      const tz = piezas[i0].zoom + (piezas[i1].zoom - piezas[i0].zoom) * k;
      const zoom = escala * (tz * wf + zoomVista * wo + zoomArmado * wa);
      const eje = [0, 1, 2].map((n) => {
        const a = actual(i0, n);
        const c = a + (actual(i1, n) - a) * k;
        return c * wf + vista[n] * wo + ejeArmado[n] * wa;
      });
      mundo.style.transform = `scale(${zoom.toFixed(3)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(${(-eje[0]).toFixed(1)}px, ${(-eje[1]).toFixed(1)}px, ${(-eje[2]).toFixed(1)}px)`;

      /* Cartel: sigue a la pieza activa (proyectada en pantalla). */
      const re = escenario.getBoundingClientRect();
      const activa = nuevoFoco >= 0 && nuevoFoco < N ? lista.find((p) => p.j === nuevoFoco) : null;
      if (!activa || activa.e < 0.55) {
        cartel.style.opacity = "0";
      } else {
        const a = activa.ancla.getBoundingClientRect();
        const x = lim(a.left - re.left, 70, re.width - 70);
        const y = lim(a.top - re.top, 56, re.height - 12);
        cartel.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%)`;
        cartel.style.opacity = String(lim((activa.e - 0.55) / 0.3).toFixed(2));
      }

      if (nuevoFoco !== focoActual) {
        focoActual = nuevoFoco;
        for (const p of lista) {
          p.el.classList.toggle("rs-apagada", nuevoFoco >= 0 && nuevoFoco < N && p.j !== nuevoFoco);
          p.el.classList.toggle("rs-activa", p.j === nuevoFoco);
        }
        setFoco(nuevoFoco);
      }
    };

    const pedir = () => {
      if (!cuadro) cuadro = requestAnimationFrame(actualizar);
    };

    modelo.style.transform = "translate3d(0, 0, 0)";
    medir();
    actualizar();

    /* Con el mouse se puede agarrar el modelo y girarlo a mano (vista 360°). */
    const bajar = (ev) => {
      if (ev.pointerType !== "mouse" || ev.button !== 0) return;
      arrastre = ev.clientX - giroMano / 0.45;
      escenario.setPointerCapture(ev.pointerId);
      escenario.classList.add("rs-agarrado");
    };
    const mover = (ev) => {
      if (arrastre === null) return;
      giroMano = (ev.clientX - arrastre) * 0.45;
      pedir();
    };
    const soltar = () => {
      arrastre = null;
      escenario.classList.remove("rs-agarrado");
    };
    escenario.addEventListener("pointerdown", bajar);
    escenario.addEventListener("pointermove", mover);
    escenario.addEventListener("pointerup", soltar);
    escenario.addEventListener("pointercancel", soltar);
    const fuente = scroller || window;
    fuente.addEventListener("scroll", pedir, { passive: true });
    const observador = new ResizeObserver(() => {
      medir();
      pedir();
    });
    observador.observe(escenario);

    return () => {
      if (cuadro) cancelAnimationFrame(cuadro);
      fuente.removeEventListener("scroll", pedir);
      escenario.removeEventListener("pointerdown", bajar);
      escenario.removeEventListener("pointermove", mover);
      escenario.removeEventListener("pointerup", soltar);
      escenario.removeEventListener("pointercancel", soltar);
      observador.disconnect();
    };
  }, [reducido, scroller, config]);

  const pieza = foco >= 0 && foco < N ? piezas[foco] : null;
  const contenido = pieza
    ? { titulo: pieza.nombre, texto: pieza.texto }
    : foco === N
      ? explosion
      : foco === N + 1
        ? armado
        : intro;

  return (
    <section
      ref={seccion}
      className={`rs${reducido ? " rs--quieto" : ""}${scroller ? " rs--modal" : ""}`}
      aria-label={config.aria}
    >
      <div className="rs__fijo" ref={raiz}>
        <div className="rs__panel" aria-live="polite">
          <p className="rs__chip">{pieza ? `PIEZA ${foco + 1} DE ${N}` : config.chip}</p>
          <h2 className="rs__titulo">{contenido.titulo}</h2>
          <p className="rs__texto">{contenido.texto}</p>
          <ol className="rs__puntos" aria-hidden="true">
            {piezas.map((p, i) => (
              <li key={p.id} className={i === foco ? "rs__punto rs__punto--activo" : "rs__punto"} />
            ))}
          </ol>
          {!reducido && <p className="rs__ayuda">{ayuda}</p>}
        </div>

        <div className="rs-escenario" aria-hidden="true">
          <div className="rs-mundo">
            <div className="rs-suelo" />
            <div className="rs-robot">
              <div className="rs-sombra" />
              <Modelo />
            </div>
          </div>
          <div className="rs-cartel" style={{ opacity: 0 }}>
            <strong>{pieza ? pieza.etiqueta[0] : ""}</strong>
            <span>{pieza ? pieza.etiqueta[1] : ""}</span>
          </div>
        </div>
      </div>

      {reducido && (
        <ul className="rs__lista">
          {piezas.map((p) => (
            <li key={p.id}>
              <strong>{p.nombre}.</strong> {p.texto}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
