import { Fragment, useEffect, useRef, useState } from "react";
import "../styles/robotScroll.css";

/* Robot de Fútbol Robot en 3D (CSS 3D, sin librerías) controlado por el
   scroll: entra rodando, se desarma pieza por pieza mientras la cámara gira
   y, al final, se vuelve a armar y se va. Los textos salen del cuadernillo
   de 3° año. */

/* En el orden en que se desarma. `vec` es hacia dónde se separa cada copia
   de la pieza (x adelante, y arriba es negativo, z hacia un costado). */
const PIEZAS = [
  {
    id: "bluetooth",
    nombre: "Módulo Bluetooth HC-06",
    texto:
      "Recibe las órdenes del celular. VCC → 5V, GND → GND, RX → pin 10 y TX → pin 11 del Arduino.",
  },
  {
    id: "arduino",
    nombre: "Arduino UNO",
    texto:
      "El cerebro del robot. Toma 5V del L298N y comanda los motores desde los pines 3, 4, 5, 6, 7 y 9.",
  },
  {
    id: "pilas",
    nombre: "Porta pilas con baterías",
    texto:
      "Dos baterías 18650 (3,7 V). El positivo va al interruptor; el negativo a GND del L298N y del Arduino.",
  },
  {
    id: "l298n",
    nombre: "Puente H L298N",
    texto:
      "Maneja los motores: motor izquierdo → Out1 y Out2, motor derecho → Out3 y Out4. Recibe +12V desde el interruptor.",
  },
  {
    id: "interruptor",
    nombre: "Interruptor",
    texto: "Va entre el positivo de las baterías y el +12V del L298N: enciende y apaga el robot.",
  },
  {
    id: "motores",
    nombre: "Motorreductores",
    texto: "Uno a cada lado del chasis: dan la tracción diferencial con la que el robot avanza y gira.",
  },
  {
    id: "ruedas",
    nombre: "Ruedas de 65 mm",
    texto: "Una rueda de 65 mm de diámetro en cada motorreductor.",
  },
  {
    id: "chasis",
    nombre: "Carcasas impresas en 3D",
    texto: "El chasis modelado en 3D e impreso: tiene un alojamiento para cada componente.",
  },
];

/* Hacia dónde se separa cada copia de la pieza (x adelante, y arriba es negativo, z a un costado). */
const COPIAS = {
  bluetooth: [[70, -330, 0]],
  arduino: [[-10, -235, 0]],
  pilas: [[115, -150, 0]],
  l298n: [[-125, -150, -20]],
  interruptor: [[-100, -95, -110]],
  motores: [[0, -70, 105], [0, -70, -105]],
  ruedas: [[0, 0, 215], [0, 0, -215]],
  chasis: [[0, 45, 0]],
};

/* Centro de cada pieza ya separada: hacia ahí apunta la cámara. */
const BASES = {
  bluetooth: [100, -52, 0],
  arduino: [5, -14, 0],
  pilas: [105, -22, 0],
  l298n: [-105, -20, 0],
  interruptor: [-140, -20, -45],
  motores: [-30, -24, 0],
  ruedas: [-30, 7, 0],
  chasis: [0, -20, 0],
};
const CENTROS = PIEZAS.map((p) => {
  const v = COPIAS[p.id];
  const b = BASES[p.id];
  return [b[0] + v[0][0], b[1] + v[0][1], v.length > 1 ? 0 : b[2] + v[0][2]];
});
const ZOOM = [3.0, 2.3, 2.3, 2.4, 3.4, 1.35, 1.25, 1.3];
const ARMADO = [0, -20, 0];
const VISTA = [0, -150, 0];

/* Texto corto de los carteles que acompañan a cada pieza. */
const ETIQUETAS = {
  bluetooth: ["Módulo HC-06", "RX → pin 10 · TX → pin 11"],
  arduino: ["Arduino UNO", "El cerebro del robot"],
  pilas: ["Porta pilas", "2 baterías 18650 · 3,7 V"],
  l298n: ["Puente H L298N", "Maneja los 2 motores"],
  interruptor: ["Interruptor", "Enciende y apaga"],
  motores: ["Motorreductor", "Tracción diferencial"],
  ruedas: ["Rueda", "Ø 65 mm"],
  chasis: ["Carcasa impresa en 3D", "Aloja cada componente"],
};

const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t) => {
  const x = lim(t);
  return x * x * (3 - 2 * x);
};

const RADIO = 48;
const LADOS = 16;
const INICIO = 0.14;
const PASO = 0.065;
const FIN_DESARME = INICIO + PASO * PIEZAS.length;
const REARMA = 0.84;

function Caja({ w, h, d, x = 0, y = 0, z = 0, c, imp = false, eti = null, tex = null }) {
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

/* Cilindro acostado a lo largo de x (pilas, cuerpo del motor). */
function Cil({ r, len, x = 0, y = 0, z = 0, c, lados = 12, tapas = true, tapaC = null }) {
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

function Rueda({ z }) {
  const apotema = RADIO * Math.cos(Math.PI / LADOS);
  const ancho = 2 * RADIO * Math.sin(Math.PI / LADOS) + 1.2;
  return (
    <div className="rs-rueda" style={{ transform: `translate3d(-30px, 7px, ${z}px)` }}>
      <div className="rs-giro">
        {Array.from({ length: LADOS }, (_, k) => (
          <i
            key={k}
            className="rs-cara rs-lado"
            style={{
              width: ancho,
              height: 30,
              left: -ancho / 2,
              top: -15,
              transform: `rotateZ(${(360 / LADOS) * k}deg) translateY(${-apotema}px) rotateX(90deg)`,
            }}
          />
        ))}
        {[15, -15].map((dz) => (
          <i
            key={dz}
            className="rs-cara rs-disco"
            style={{
              width: RADIO * 2 - 4,
              height: RADIO * 2 - 4,
              left: -(RADIO - 2),
              top: -(RADIO - 2),
              transform: `translateZ(${dz}px) ${dz < 0 ? "rotateY(180deg)" : ""}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Pieza({ grupo, i, children }) {
  return (
    <div className="rs-pieza" data-grupo={grupo} data-copia={i}>
      <i className="rs-ancla" style={{ transform: `translate3d(${BASES[grupo][0]}px, ${BASES[grupo][1] - 26}px, ${grupo === "motores" || grupo === "ruedas" ? (i === 0 ? 1 : -1) * (grupo === "ruedas" ? 122 : 71) : BASES[grupo][2]}px)` }} />
      {children}
    </div>
  );
}

const PINES = {
  backgroundImage: "radial-gradient(circle, #e8cf6a 0 1.5px, transparent 2.1px)",
  backgroundSize: "7px 7px",
};
const ALETAS = { backgroundImage: "repeating-linear-gradient(90deg, #9aa1a9 0 3px, #34383d 3px 6px)" };
const TORNILLO = { backgroundImage: "radial-gradient(circle, #cfd3d8 0 4.5px, #1d4ea8 5.5px)" };
const CIRCUITO = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
  backgroundSize: "7px 7px",
};
const ROJO = "#e2321f";

function Robot() {
  const copia = (grupo, i, hijos) => (
    <Pieza key={`${grupo}${i}`} grupo={grupo} i={i}>
      {hijos}
    </Pieza>
  );
  /* Frente del chasis: pared con la curva (scoop) hacia abajo en el centro. */
  const frente = Array.from({ length: 9 }, (_, k) => {
    const z = -88 + 22 * k;
    const h = 22 + 42 * (Math.abs(z) / 88) ** 2;
    return <Caja key={k} imp w={12} h={h} d={22} x={144} y={-7 - h / 2} z={z} c={ROJO} />;
  });

  return (
    <>
      {copia("chasis", 0, <>
        <Caja imp w={300} h={14} d={200} c={ROJO} />
        <Caja imp w={12} h={62} d={188} x={-144} y={-38} c={ROJO} />
        {[1, -1].map((s) => (
          <Fragment key={s}>
            <Caja imp w={135} h={56} d={12} x={82.5} y={-35} z={s * 94} c={ROJO} />
            <Caja imp w={65} h={56} d={12} x={-117.5} y={-35} z={s * 94} c={ROJO} />
            <Caja imp w={48} h={30} d={6} x={-30} y={-22} z={s * 52} c={ROJO} />
          </Fragment>
        ))}
        <Caja imp w={6} h={34} d={100} x={-62} y={-24} c={ROJO} />
        <Caja imp w={6} h={34} d={100} x={72} y={-24} c={ROJO} />
        {frente}
      </>)}

      {[1, -1].map((s, i) =>
        copia("motores", i, <>
          <Caja w={72} h={24} d={20} x={-28} y={-20} z={s * 71} c="#f2c51d" />
          <Caja w={20} h={16} d={20} x={-52} y={-40} z={s * 71} c="#f2c51d" />
          <Cil r={9} len={30} x={-8} y={-31} z={s * 71} c="#c9ced4" lados={10} />
          <Caja w={9} h={9} d={30} x={-30} y={-14} z={s * 95} c="#9aa0a6" />
        </>),
      )}

      {[1, -1].map((s, i) => copia("ruedas", i, <Rueda z={s * 122} />))}

      {copia("l298n", 0, <>
        <Caja w={72} h={6} d={72} x={-105} y={-12} c="#c42a1f" tex={CIRCUITO} />
        <Caja w={30} h={22} d={30} x={-96} y={-26} c="#2a2a2e" tex={ALETAS} />
        {[-24, 0, 24].map((zz) => (
          <Caja key={zz} w={14} h={12} d={14} x={-130} y={-21} z={zz} c="#1f5fd0" tex={TORNILLO} />
        ))}
        <Caja w={8} h={6} d={44} x={-76} y={-18} c="#1c1c1f" tex={PINES} />
        <Caja w={10} h={6} d={10} x={-118} y={-18} z={-34} c="#1c1c1f" />
        <Cil r={5} len={10} x={-70} y={-19} z={28} c="#2a2a2e" lados={8} tapaC="#9aa1a9" />
        <Caja w={3} h={3} d={16} x={-130} y={-30} z={-34} c="#f5d90a" />
        <Caja w={3} h={3} d={16} x={-130} y={-30} z={34} c="#2c9a3a" />
      </>)}

      {copia("pilas", 0, <>
        <Caja w={74} h={22} d={64} x={105} y={-18} c="#232326" />
        <Cil r={10} len={66} x={105} y={-39} z={-16} c="#2f7fe0" lados={14} tapaC="#cfd3d8" />
        <Cil r={10} len={66} x={105} y={-39} z={16} c="#2f7fe0" lados={14} tapaC="#cfd3d8" />
        <Caja w={5} h={9} d={9} x={140} y={-39} z={-16} c="#9aa1a9" />
        <Caja w={5} h={9} d={9} x={70} y={-39} z={16} c="#9aa1a9" />
        <Caja w={26} h={3} d={3} x={72} y={-20} z={-36} c="#d33" />
        <Caja w={26} h={3} d={3} x={72} y={-14} z={-36} c="#111" />
      </>)}

      {copia("arduino", 0, <>
        <Caja w={120} h={5} d={86} x={5} y={-13} c="#1b5fb0" eti="ARDUINO UNO" tex={CIRCUITO} />
        <Caja w={26} h={16} d={22} x={-58} y={-23} z={-22} c="#c4c9ce" />
        <Caja w={22} h={14} d={20} x={-62} y={-22} z={26} c="#1c1c1f" />
        <Caja w={96} h={9} d={7} x={8} y={-19} z={-38} c="#1c1c1f" tex={PINES} />
        <Caja w={96} h={9} d={7} x={8} y={-19} z={38} c="#1c1c1f" tex={PINES} />
        <Caja w={42} h={7} d={13} x={22} y={-18} z={4} c="#202024" />
        <Caja w={10} h={3} d={5} x={-22} y={-16} z={12} c="#c4c9ce" />
        <Caja w={8} h={5} d={8} x={-38} y={-17} z={-14} c="#d33" />
        <Caja w={12} h={4} d={8} x={50} y={-17} z={-10} c="#1c1c1f" tex={PINES} />
        {[-26, -18, -10, 14, 22].map((zz, i) => (
          <Caja key={zz} w={3} h={3} d={18} x={-6 + i * 10} y={-24} z={zz < 0 ? -52 : 52} c={["#f5d90a", "#e2762b", "#2c9a3a", "#7a4fd0", "#f5f5f5"][i]} />
        ))}
      </>)}

      {copia("bluetooth", 0, <>
        <Caja w={56} h={4} d={26} x={100} y={-52} c="#1f8a4d" eti="HC-06" tex={CIRCUITO} />
        <Caja w={24} h={7} d={17} x={112} y={-58} c="#c4c9ce" />
        <Caja w={5} h={4} d={5} x={86} y={-57} c="#2b6bff" />
        <Caja w={6} h={4} d={22} x={74} y={-56} c="#1c1c1f" tex={PINES} />
      </>)}

      {copia("interruptor", 0, <>
        <Caja w={22} h={20} d={30} x={-140} y={-17} z={-45} c="#2a2a2e" />
        <Caja w={10} h={8} d={22} x={-140} y={-31} z={-45} c="#d42a2a" />
        <Caja w={4} h={8} d={5} x={-140} y={-6} z={-56} c="#c4c9ce" />
        <Caja w={4} h={8} d={5} x={-140} y={-6} z={-34} c="#c4c9ce" />
      </>)}
    </>
  );
}

export default function RobotScroll({ scroller = null }) {
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
    const robot = base.querySelector(".rs-robot");
    const sombra = base.querySelector(".rs-sombra");
    const suelo = base.querySelector(".rs-suelo");
    const escenario = base.querySelector(".rs-escenario");
    const giros = [...base.querySelectorAll(".rs-giro")];
    const piezas = [...base.querySelectorAll(".rs-pieza")].map((el) => ({
      el,
      j: PIEZAS.findIndex((p) => p.id === el.dataset.grupo),
      vec: COPIAS[el.dataset.grupo][Number(el.dataset.copia)],
      ultimo: "",
      e: 0,
      ancla: el.querySelector(".rs-ancla"),
    }));
    const carteles = [...base.querySelectorAll(".rs-cartel")];

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

      const desde = INICIO - 0.02;
      const dx = 230 * (1 - suave(P / 0.12)) + 460 * suave((P - 0.92) / 0.08);
      const desarme = 1 - suave((P - REARMA) / 0.08);
      const ry = -32 + 360 * lim(P / 0.9) + giroMano;
      const rx = -(36 + 8 * suave((P - 0.1) / 0.3));

      robot.style.transform = `translate3d(${dx.toFixed(1)}px, 0, 0)`;

      const giro = ((dx / RADIO) * 180) / Math.PI;
      for (const g of giros) g.style.transform = `rotateZ(${giro.toFixed(2)}deg)`;

      let nuevoFoco = -1;
      if (P >= REARMA) nuevoFoco = 9;
      else if (P >= FIN_DESARME) nuevoFoco = 8;
      else if (P >= INICIO) nuevoFoco = Math.floor((P - INICIO) / PASO);
      if (reducido) nuevoFoco = 8;

      let abierto = 0;
      for (const p of piezas) {
        const e = suave((P - (INICIO + PASO * p.j)) / 0.05) * desarme;
        p.e = e;
        abierto = Math.max(abierto, e);
        const t = `translate3d(${(p.vec[0] * e).toFixed(1)}px, ${(p.vec[1] * e).toFixed(1)}px, ${(p.vec[2] * e).toFixed(1)}px)`;
        if (t !== p.ultimo) {
          p.ultimo = t;
          p.el.style.transform = t;
        }
      }
      sombra.style.opacity = String((1 - 0.55 * abierto).toFixed(2));
      suelo.style.opacity = String((1 - 0.6 * abierto).toFixed(2));

      /* La cámara sigue a la pieza que se está explicando, da una vista general y vuelve al robot armado. */
      const f = (P - INICIO) / PASO;
      const i0 = lim(Math.floor(f), 0, PIEZAS.length - 1);
      const i1 = Math.min(i0 + 1, PIEZAS.length - 1);
      const k = suave((f - i0 - 0.65) / 0.35);
      const entra = suave((P - desde) / 0.05);
      const sale = suave((P - FIN_DESARME) / 0.05);
      const rearma = suave((P - REARMA) / 0.08);
      const wf = entra * (1 - sale);
      const wo = sale * (1 - rearma);
      const wa = Math.max(0, 1 - wf - wo);
      /* El centro de la pieza en este momento: sigue su trayecto, no el destino. */
      const actual = (j, n) => {
        const e = piezas.find((p) => p.j === j).e;
        const v = COPIAS[PIEZAS[j].id][0];
        return BASES[PIEZAS[j].id][n] + (n === 2 && COPIAS[PIEZAS[j].id].length > 1 ? 0 : v[n] * e);
      };
      const tz = ZOOM[i0] + (ZOOM[i1] - ZOOM[i0]) * k;
      const zoom = escala * (tz * wf + 0.8 * wo + 1.15 * wa);
      const eje = [0, 1, 2].map((n) => {
        const a = actual(i0, n);
        const c = a + (actual(i1, n) - a) * k;
        return c * wf + VISTA[n] * wo + ARMADO[n] * wa;
      });
      mundo.style.transform = `scale(${zoom.toFixed(3)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(${(-eje[0]).toFixed(1)}px, ${(-eje[1]).toFixed(1)}px, ${(-eje[2]).toFixed(1)}px)`;

      /* Carteles: siguen a las copias de la pieza activa (proyectadas en pantalla). */
      const re = escenario.getBoundingClientRect();
      const activas = nuevoFoco >= 0 && nuevoFoco <= 7 ? piezas.filter((p) => p.j === nuevoFoco) : [];
      carteles.forEach((c, n) => {
        const p = activas[n];
        if (!p || p.e < 0.55) {
          c.style.opacity = "0";
          return;
        }
        const a = p.ancla.getBoundingClientRect();
        const x = lim(a.left - re.left, 70, re.width - 70);
        const y = lim(a.top - re.top, 56, re.height - 12);
        c.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%)`;
        c.style.opacity = String(lim((p.e - 0.55) / 0.3).toFixed(2));
      });

      if (nuevoFoco !== focoActual) {
        focoActual = nuevoFoco;
        for (const p of piezas) {
          p.el.classList.toggle("rs-apagada", nuevoFoco >= 0 && nuevoFoco <= 7 && p.j !== nuevoFoco);
          p.el.classList.toggle("rs-activa", p.j === nuevoFoco);
        }
        setFoco(nuevoFoco);
      }
    };

    const pedir = () => {
      if (!cuadro) cuadro = requestAnimationFrame(actualizar);
    };

    medir();
    actualizar();
    /* Con el mouse se puede agarrar el robot y girarlo a mano (vista 360°). */
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
  }, [reducido, scroller]);

  const pieza = foco >= 0 && foco <= 7 ? PIEZAS[foco] : null;
  const titulo = pieza
    ? pieza.nombre
    : foco === 8
      ? "Vista explosionada"
      : foco === 9
        ? "Robot armado"
        : "Robot de Fútbol Robot";
  const texto = pieza
    ? pieza.texto
    : foco === 8
      ? "Todas las piezas separadas. Seguí bajando y el robot se vuelve a armar."
      : foco === 9
        ? "Chasis, motores, ruedas y electrónica de nuevo en su lugar, listos para jugar."
        : "Tracción diferencial, controlado por Arduino y módulo Bluetooth HC-06. Bajá y lo desarmamos pieza por pieza.";

  return (
    <section
      ref={seccion}
      className={`rs${reducido ? " rs--quieto" : ""}${scroller ? " rs--modal" : ""}`}
      aria-label="Robot en 3D: ensamble pieza por pieza"
    >
      <div className="rs__fijo" ref={raiz}>
        <div className="rs__panel" aria-live="polite">
          <p className="rs__chip">
            {pieza ? `PIEZA ${foco + 1} DE ${PIEZAS.length}` : "ROBOT EN 3D"}
          </p>
          <h2 className="rs__titulo">{titulo}</h2>
          <p className="rs__texto">{texto}</p>
          <ol className="rs__puntos" aria-hidden="true">
            {PIEZAS.map((p, i) => (
              <li key={p.id} className={i === foco ? "rs__punto rs__punto--activo" : "rs__punto"} />
            ))}
          </ol>
          {!reducido && <p className="rs__ayuda">Seguí bajando con el scroll · o arrastrá el robot para girarlo 360°</p>}
        </div>

        <div className="rs-escenario" aria-hidden="true">
          <div className="rs-mundo">
            <div className="rs-suelo" />
            <div className="rs-robot">
              <div className="rs-sombra" />
              <Robot />
            </div>
          </div>
          {[0, 1].map((n) => (
            <div key={n} className="rs-cartel" style={{ opacity: 0 }}>
              <strong>{pieza ? ETIQUETAS[pieza.id][0] : ""}</strong>
              <span>{pieza ? ETIQUETAS[pieza.id][1] : ""}</span>
            </div>
          ))}
        </div>
      </div>

      {reducido && (
        <ul className="rs__lista">
          {PIEZAS.map((p) => (
            <li key={p.id}>
              <strong>{p.nombre}.</strong> {p.texto}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
