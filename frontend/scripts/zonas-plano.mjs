/* Calcula la zona (polígono) de cada salón a partir del dibujo del plano.

     node scripts/zonas-plano.mjs            → escribe src/zonasPlano.js
     node scripts/zonas-plano.mjs --revisar  → sólo muestra el resultado

   Cómo funciona: desde el punto del cartel de cada salón (src/planoSalones.js)
   pinta hacia afuera por el blanco hasta chocar con las paredes del dibujo
   (las líneas oscuras, engrosadas un poco para cerrar las rendijas de las
   puertas). El contorno de lo pintado, simplificado, es la zona del salón.
   Si lo pintado se escapa (un pasillo, un patio abierto), el salón queda sin
   zona y en el plano se marca sólo con su cartel: no se inventa una forma.

   Para corregir una zona a mano: editá src/zonasOverrides.js (ver ahí) y
   volvé a correr este script. Las coordenadas son % del ancho y alto. */
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { salonesPorPiso } from "../src/planoSalones.js";
import { zonasManuales } from "../src/zonasOverrides.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const imagenes = { pb: "src/assets/images/plano-pb.png", "1p": "src/assets/images/plano-1p.png" };

/* ---------- PNG (RGBA u RGB de 8 bits, sin entrelazar) ---------- */
function leerPng(ruta) {
  const datos = readFileSync(ruta);
  let pos = 8;
  let ancho, alto, tipo, profundidad, entrelazado;
  const idat = [];
  while (pos < datos.length) {
    const largo = datos.readUInt32BE(pos);
    const nombre = datos.toString("ascii", pos + 4, pos + 8);
    const cuerpo = datos.subarray(pos + 8, pos + 8 + largo);
    if (nombre === "IHDR") {
      ancho = cuerpo.readUInt32BE(0);
      alto = cuerpo.readUInt32BE(4);
      profundidad = cuerpo[8];
      tipo = cuerpo[9];
      entrelazado = cuerpo[12];
    } else if (nombre === "IDAT") idat.push(cuerpo);
    pos += 12 + largo;
  }
  if (profundidad !== 8 || entrelazado || ![2, 6].includes(tipo)) {
    throw new Error(`${ruta}: sólo PNG RGB/RGBA de 8 bits sin entrelazar`);
  }
  const canales = tipo === 6 ? 4 : 3;
  const crudo = inflateSync(Buffer.concat(idat));
  const fila = ancho * canales;
  const px = Buffer.alloc(fila * alto);
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (fila + 1)];
    for (let x = 0; x < fila; x++) {
      const v = crudo[y * (fila + 1) + 1 + x];
      const a = x >= canales ? px[y * fila + x - canales] : 0;
      const b = y ? px[(y - 1) * fila + x] : 0;
      const c = x >= canales && y ? px[(y - 1) * fila + x - canales] : 0;
      let r;
      if (filtro === 0) r = v;
      else if (filtro === 1) r = v + a;
      else if (filtro === 2) r = v + b;
      else if (filtro === 3) r = v + ((a + b) >> 1);
      else {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[y * fila + x] = r & 255;
    }
  }
  return { ancho, alto, canales, px };
}

/* Paredes: píxeles oscuros, engrosados `radio` px para cerrar rendijas. */
function paredes({ ancho, alto, canales, px }, radio = 2) {
  const oscuro = new Uint8Array(ancho * alto);
  for (let i = 0; i < ancho * alto; i++) {
    const alfa = canales === 4 ? px[i * 4 + 3] : 255;
    const luz = (px[i * canales] + px[i * canales + 1] + px[i * canales + 2]) / 3;
    oscuro[i] = alfa > 100 && luz < 170 ? 1 : 0;
  }
  const pared = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      if (!oscuro[y * ancho + x]) continue;
      for (let dy = -radio; dy <= radio; dy++)
        for (let dx = -radio; dx <= radio; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < ancho && ny < alto) pared[ny * ancho + nx] = 1;
        }
    }
  return pared;
}

/* Pinta desde (x, y) por lo que no es pared. null si se escapa. */
function pintar(pared, ancho, alto, x0, y0, tope) {
  let inicio = -1;
  for (let r = 0; r <= 20 && inicio < 0; r++)
    for (let dy = -r; dy <= r && inicio < 0; dy++)
      for (let dx = -r; dx <= r && inicio < 0; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x >= 0 && y >= 0 && x < ancho && y < alto && !pared[y * ancho + x]) inicio = y * ancho + x;
      }
  if (inicio < 0) return null;
  const marca = new Uint8Array(ancho * alto);
  const cola = new Int32Array(ancho * alto);
  let cabeza = 0, fin = 0;
  cola[fin++] = inicio;
  marca[inicio] = 1;
  while (cabeza < fin) {
    const i = cola[cabeza++];
    const x = i % ancho, y = (i / ancho) | 0;
    if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1) return null; // salió del edificio
    if (fin > tope) return null;
    for (const j of [i - 1, i + 1, i - ancho, i + ancho]) {
      if (!marca[j] && !pared[j]) {
        marca[j] = 1;
        cola[fin++] = j;
      }
    }
  }
  return { marca, area: fin };
}

/* Contorno de la máscara en una grilla de celdas de `paso` px (borde de
   Moore) y simplificado con Douglas-Peucker. */
function contorno(marca, ancho, alto, paso = 3, tolerancia = 2.5) {
  const cw = Math.ceil(ancho / paso), ch = Math.ceil(alto / paso);
  const celda = new Uint8Array(cw * ch);
  for (let cy = 0; cy < ch; cy++)
    for (let cx = 0; cx < cw; cx++) {
      let llenos = 0, total = 0;
      for (let y = cy * paso; y < Math.min(alto, (cy + 1) * paso); y++)
        for (let x = cx * paso; x < Math.min(ancho, (cx + 1) * paso); x++) {
          total++;
          llenos += marca[y * ancho + x];
        }
      celda[cy * cw + cx] = llenos * 2 >= total ? 1 : 0;
    }
  // Apertura (erosión y dilatación de 2 celdas): saca las puntas finas que
  // deja el arco de las puertas sin cambiar la forma del ambiente.
  const vecindad = (fuente, x, y, r, todos) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, ny = y + dy;
        const v = nx >= 0 && ny >= 0 && nx < cw && ny < ch ? fuente[ny * cw + nx] : 0;
        if (todos && !v) return 0;
        if (!todos && v) return 1;
      }
    return todos ? 1 : 0;
  };
  const erosion = celda.map((_, i) => vecindad(celda, i % cw, (i / cw) | 0, 2, true));
  const abierta = erosion.map((_, i) => vecindad(erosion, i % cw, (i / cw) | 0, 2, false) & celda[i]);
  if (abierta.some(Boolean)) celda.set(abierta);
  const lleno = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch && celda[y * cw + x] === 1;

  // Recorre las aristas del borde (entre celda llena y vacía) en sentido horario.
  const aristas = new Map();
  const clave = (x, y) => `${x},${y}`;
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      if (!lleno(x, y)) continue;
      if (!lleno(x, y - 1)) aristas.set(clave(x, y), [x + 1, y]);
      if (!lleno(x + 1, y)) aristas.set(clave(x + 1, y) + "v", [x + 1, y + 1]);
      if (!lleno(x, y + 1)) aristas.set(clave(x + 1, y + 1) + "b", [x, y + 1]);
      if (!lleno(x - 1, y)) aristas.set(clave(x, y + 1) + "i", [x, y]);
    }
  // Une las aristas en el lazo más largo.
  const desde = new Map();
  for (const [k, hasta] of aristas) {
    const [x, y] = k.replace(/[vbi]$/, "").split(",").map(Number);
    const lista = desde.get(clave(x, y)) || [];
    lista.push(hasta);
    desde.set(clave(x, y), lista);
  }
  let mejor = [];
  const usados = new Set();
  for (const k of desde.keys()) {
    if (usados.has(k)) continue;
    const lazo = [];
    let actual = k;
    while (actual && !usados.has(actual)) {
      usados.add(actual);
      const [x, y] = actual.split(",").map(Number);
      lazo.push([x * paso, y * paso]);
      const siguientes = desde.get(actual) || [];
      const sig = siguientes.find((p) => !usados.has(clave(...p)));
      actual = sig ? clave(...sig) : null;
    }
    if (lazo.length > mejor.length) mejor = lazo;
  }
  return simplificar(mejor, tolerancia * paso);
}

function simplificar(puntos, tolerancia) {
  if (puntos.length < 4) return puntos;
  const distancia = ([px, py], [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay;
    const largo = Math.hypot(dx, dy) || 1;
    return Math.abs(dy * px - dx * py + bx * ay - by * ax) / largo;
  };
  const dp = (lista) => {
    let max = 0, indice = 0;
    for (let i = 1; i < lista.length - 1; i++) {
      const d = distancia(lista[i], lista[0], lista[lista.length - 1]);
      if (d > max) [max, indice] = [d, i];
    }
    if (max <= tolerancia) return [lista[0], lista[lista.length - 1]];
    return [...dp(lista.slice(0, indice + 1)).slice(0, -1), ...dp(lista.slice(indice))];
  };
  // Cerrado: se parte en el punto más lejano del primero.
  let lejos = 0;
  puntos.forEach((p, i) => {
    if (Math.hypot(p[0] - puntos[0][0], p[1] - puntos[0][1]) > Math.hypot(puntos[lejos][0] - puntos[0][0], puntos[lejos][1] - puntos[0][1])) lejos = i;
  });
  return [...dp(puntos.slice(0, lejos + 1)).slice(0, -1), ...dp([...puntos.slice(lejos), puntos[0]]).slice(0, -1)];
}

const resultado = {};
const informe = [];
for (const [piso, salones] of Object.entries(salonesPorPiso)) {
  const imagen = leerPng(join(raiz, imagenes[piso]));
  const pared = paredes(imagen);
  const tope = imagen.ancho * imagen.alto * 0.12;
  for (const [id, nombre, x, y] of salones) {
    if (zonasManuales[id] !== undefined) {
      resultado[id] = zonasManuales[id];
      informe.push(`${id.padEnd(6)} ${nombre.padEnd(15)} manual`);
      continue;
    }
    const px = Math.round((x / 100) * imagen.ancho);
    const py = Math.round((y / 100) * imagen.alto);
    const pintado = pintar(pared, imagen.ancho, imagen.alto, px, py, tope);
    if (!pintado) {
      resultado[id] = null;
      informe.push(`${id.padEnd(6)} ${nombre.padEnd(15)} SIN ZONA (se escapa o no hay recinto)`);
      continue;
    }
    const puntos = contorno(pintado.marca, imagen.ancho, imagen.alto).map(([a, b]) => [
      Math.round((a / imagen.ancho) * 10000) / 100,
      Math.round((b / imagen.alto) * 10000) / 100,
    ]);
    resultado[id] = puntos;
    const pct = ((pintado.area / (imagen.ancho * imagen.alto)) * 100).toFixed(2);
    informe.push(`${id.padEnd(6)} ${nombre.padEnd(15)} ${String(puntos.length).padStart(3)} vértices · ${pct}% del dibujo`);
  }
}

console.log(informe.join("\n"));
if (!process.argv.includes("--revisar")) {
  const cuerpo = Object.entries(resultado)
    .map(([id, puntos]) => `  "${id}": ${puntos ? JSON.stringify(puntos) : "null"},`)
    .join("\n");
  writeFileSync(
    join(raiz, "src/zonasPlano.js"),
    `/* GENERADO por scripts/zonas-plano.mjs: no editar a mano (las correcciones
   van en zonasOverrides.js). Polígono de cada salón en % del ancho y alto del
   dibujo de su piso; null = sin recinto cerrado en el dibujo (sólo cartel). */
export const zonas = {
${cuerpo}
};
`,
  );
  console.log("\nEscrito src/zonasPlano.js");
}
