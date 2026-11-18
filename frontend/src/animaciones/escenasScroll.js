/* Animaciones controladas por el scroll para las páginas del cuadernillo.

   El progreso de cada animación sale de la posición real del scroll (no de
   "entró en pantalla"): al bajar avanza y al subir retrocede, igual que un
   `scrub` de ScrollTrigger. No usa dependencias ni bloquea el scroll nativo.

   Cómo funciona:
   - Cada página elegida se divide en bandas horizontales (cortes en los
     espacios en blanco del PDF) para poder animarlas por separado.
   - En cada frame se mide dónde está cada banda respecto del visor y se
     escribe sólo `transform`, `opacity` y `clip-path` (nada de layout).
   - Las posiciones se vuelven a medir en cada frame, por lo que el cambio de
     tamaño de la ventana no necesita recalcular nada aparte.
   - Con `prefers-reduced-motion` no se toca nada: la página queda estática. */

const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t) => 1 - Math.pow(1 - lim(t), 3);
const mezcla = (a, b, t) => a + (b - a) * t;
const dec = (n, d = 2) => Number(n.toFixed(d));

/* Cada efecto recibe, por banda:
   ent  0→1 mientras entra por abajo        sal  1→0 mientras sale por arriba
   p    avance de la banda por todo el visor foco 1 si el centro del visor está sobre la banda
   i, n índice y cantidad de bandas
   k    escala de amplitud (menor en celulares/tablets)
   kx   escala para movimientos horizontales (casi nula en celulares)
   k3d  escala para efectos 3D
   y devuelve { x, y, z, rx, sc, op, clip } (todo opcional). */
const EFECTOS = {
  /* Página 6 · introducción cinematográfica: cada paso del armado emerge
     desde abajo con un zoom que se asienta y una cortina que se abre. */
  intro: ({ ent, sal, k }) => {
    const e = suave(ent);
    const s = suave(sal);
    return {
      y: (1 - e) * 56 * k - (1 - s) * 14,
      sc: mezcla(1.04, 1, e) * mezcla(0.985, 1, s),
      op: mezcla(0.05, 1, e) * mezcla(0.55, 1, s),
      clip: e < 0.999 ? `inset(0 0 ${dec((1 - e) * 38, 1)}% 0)` : "",
    };
  },

  /* Página 7 · bloques que cruzan en horizontal según el scroll vertical,
     alternando el sentido y con distinta profundidad por bloque. */
  horizontal: ({ ent, sal, p, i, k, kx }) => {
    const e = suave(ent);
    const s = suave(sal);
    const dir = i % 2 ? -1 : 1;
    return {
      x: dir * ((1 - e) * 96 + (0.5 - p) * 12 - (1 - s) * 48) * kx,
      y: (1 - e) * 24 * k,
      sc: mezcla(0.94 + i * 0.012, 1, e),
      op: mezcla(0.1, 1, e) * mezcla(0.6, 1, s),
    };
  },

  /* Página 8 · narrativa: el esquema final es el protagonista; crece al
     quedar en foco mientras el resto del contenido se atenúa. */
  narrativa: ({ ent, sal, foco, i, k }) => {
    const e = suave(ent);
    const s = suave(sal);
    const principal = i === 1;
    return {
      y: (1 - e) * (principal ? 70 : 40) * k,
      sc: mezcla(principal ? 0.9 : 0.95, 1, e) + (principal ? 0.03 * foco * e : 0),
      op: mezcla(0.1, 1, e) * mezcla(0.55, 1, s) * mezcla(0.62, 1, foco),
    };
  },

  /* Página 13 · tecnológica: las capas se acercan con perspectiva 3D, cada
     una a distinta velocidad, y se alejan al salir. */
  tecnologico: ({ ent, sal, i, k, k3d }) => {
    const e = suave(ent);
    const s = suave(sal);
    const d = 1 - e;
    const o = 1 - s;
    return {
      rx: (d * 16 - o * 8) * k3d,
      z: (-d * (150 + 50 * i) - o * 90) * k3d,
      y: d * (24 + 18 * i) * k,
      op: mezcla(0.15, 1, e) * mezcla(0.5, 1, s),
    };
  },

  /* Página 14 · cierre: los bloques se integran desde los costados hacia el
     centro con escala y fundido coordinados; la última imagen cierra con
     el zoom más marcado. */
  cierre: ({ ent, sal, i, n, k }) => {
    const e = suave(ent);
    const s = suave(sal);
    const d = 1 - e;
    const ultimo = i === n - 1;
    const lado = d * (ultimo ? 22 : 12);
    return {
      y: d * (36 + 12 * i) * k - (1 - s) * 10,
      sc: mezcla(ultimo ? 0.86 : 0.93, 1, e) * mezcla(0.97, 1, s),
      op: e * mezcla(0.55, 1, s),
      clip: d > 0.001 ? `inset(0 ${dec(lado, 1)}% 0 ${dec(lado, 1)}% round 10px)` : "",
    };
  },
};

/* Qué páginas se animan en cada archivo y cómo. `bandas` son los cortes
   (fracción de la altura de la página) elegidos en espacios en blanco. */
export const PERFILES = {
  "tercer-ano.pdf": {
    6: { efecto: "intro", bandas: [0, 0.191, 0.385, 0.586, 0.846, 1] },
    7: { efecto: "horizontal", bandas: [0, 0.32, 0.565, 1] },
    8: { efecto: "narrativa", bandas: [0, 0.42, 1] },
    13: { efecto: "tecnologico", bandas: [0, 0.275, 0.54, 1] },
    14: { efecto: "cierre", bandas: [0, 0.344, 0.76, 1] },
  },
};

export function crearEscenas(scroller, perfil) {
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pantallaChica = window.matchMedia("(max-width: 720px)");
  const tactil = window.matchMedia("(max-width: 1024px), (pointer: coarse)");

  const escenas = [];
  let cuadro = 0;
  let vivo = true;

  const estiloBase = (el) => {
    el.style.transform = "";
    el.style.opacity = "";
    el.style.clipPath = "";
    el.style.willChange = "";
  };

  const limpiar = () => {
    for (const esc of escenas) for (const b of esc.bandas) {
      estiloBase(b.el);
      b.ultimo = "";
    }
  };

  const escribir = (b, r) => {
    const rx = r.rx || 0;
    const z = r.z || 0;
    const x = r.x || 0;
    const y = r.y || 0;
    const sc = r.sc ?? 1;
    const op = r.op ?? 1;
    const clip = r.clip || "";

    const partes = [];
    if (rx || z) partes.push("perspective(1100px)");
    if (x || y || z) partes.push(`translate3d(${dec(x)}px, ${dec(y)}px, ${dec(z, 1)}px)`);
    if (rx) partes.push(`rotateX(${dec(rx)}deg)`);
    if (Math.abs(sc - 1) > 0.0005) partes.push(`scale(${dec(sc, 4)})`);
    const transform = partes.join(" ");
    const opacidad = op >= 0.999 ? "" : String(dec(Math.max(0, op), 3));

    const firma = `${transform}|${opacidad}|${clip}`;
    if (firma === b.ultimo) return;
    b.ultimo = firma;
    b.el.style.transform = transform;
    b.el.style.opacity = opacidad;
    b.el.style.clipPath = clip;
  };

  const actualizar = () => {
    cuadro = 0;
    if (!vivo) return;
    if (movimientoReducido.matches) {
      limpiar();
      return;
    }

    const v = scroller.getBoundingClientRect();
    const T = v.top;
    const H = v.height;
    if (!H) return;

    const compacto = pantallaChica.matches;
    const reducida = tactil.matches;
    const ctx = {
      k: reducida ? 0.45 : 1,
      kx: compacto ? 0.12 : reducida ? 0.5 : 1,
      k3d: compacto ? 0 : reducida ? 0.4 : 1,
    };
    const centro = T + H / 2;
    const ventana = H * 0.55;

    /* Primero se lee todo, después se escribe: sin forzar layouts en medio. */
    const lecturas = escenas.map((esc) => esc.caja.getBoundingClientRect());

    escenas.forEach((esc, n) => {
      const r = lecturas[n];
      const cerca = r.bottom > T - H && r.top < T + 2 * H;

      for (let i = 0; i < esc.bandas.length; i++) {
        const b = esc.bandas[i];
        if (cerca !== b.activa) {
          b.activa = cerca;
          b.el.style.willChange = cerca ? "transform, opacity" : "";
        }
        if (!cerca) continue;

        const alto = r.height;
        const arriba = r.top + b.desde * alto;
        const abajo = r.top + b.hasta * alto;
        const dist = centro < arriba ? arriba - centro : centro > abajo ? centro - abajo : 0;

        escribir(
          b,
          esc.efecto({
            ...ctx,
            i,
            n: esc.bandas.length,
            ent: lim((T + H * 0.95 - arriba) / ventana),
            sal: lim((abajo - T) / ventana),
            p: lim((T + H - arriba) / (H + (abajo - arriba))),
            foco: 1 - lim(dist / (H * 0.6)),
          }),
        );
      }
    });
  };

  const pedir = () => {
    if (!cuadro && vivo) cuadro = requestAnimationFrame(actualizar);
  };

  scroller.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
  const observador = new ResizeObserver(pedir);
  observador.observe(scroller);
  movimientoReducido.addEventListener("change", pedir);

  return {
    /* Reemplaza el canvas de una página ya dibujada por su escena animada.
       Devuelve false si esa página no se anima. */
    preparar(numero, lienzo) {
      const conf = perfil?.[numero];
      if (!conf || !EFECTOS[conf.efecto] || movimientoReducido.matches) return false;

      const caja = document.createElement("div");
      caja.className = "visor-pdf__escena";
      const grupo = document.createElement("div");
      grupo.className = "visor-pdf__bandas";
      grupo.style.width = lienzo.style.width;

      const bandas = [];
      const cortes = conf.bandas;
      for (let i = 0; i < cortes.length - 1; i++) {
        const y0 = Math.round(cortes[i] * lienzo.height);
        const y1 = i === cortes.length - 2 ? lienzo.height : Math.round(cortes[i + 1] * lienzo.height);
        const tira = document.createElement("canvas");
        tira.className = "visor-pdf__banda";
        tira.width = lienzo.width;
        tira.height = y1 - y0;
        tira.getContext("2d").drawImage(lienzo, 0, y0, lienzo.width, y1 - y0, 0, 0, lienzo.width, y1 - y0);
        grupo.appendChild(tira);
        bandas.push({ el: tira, desde: cortes[i], hasta: cortes[i + 1], ultimo: "", activa: false });
      }

      caja.appendChild(grupo);
      lienzo.replaceWith(caja);
      escenas.push({ caja, bandas, efecto: EFECTOS[conf.efecto] });
      /* Se aplica ya mismo para que no haya un frame con la página sin animar. */
      actualizar();
      return true;
    },

    destruir() {
      vivo = false;
      if (cuadro) cancelAnimationFrame(cuadro);
      scroller.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      observador.disconnect();
      movimientoReducido.removeEventListener("change", pedir);
      escenas.length = 0;
    },
  };
}
