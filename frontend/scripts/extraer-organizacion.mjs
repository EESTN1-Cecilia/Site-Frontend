/* Extrae las grillas de un PDF de organización de talleres (como
   «ORGANIZACION OCTUBRE.pdf») a un JSON estructurado, celda por celda.

     node scripts/extraer-organizacion.mjs "<ruta al PDF>" ../backend/src/datos/organizacion-octubre-2026.json

   Cada página del PDF es una franja (turno + módulo): columnas de lunes a
   viernes y filas numeradas (el número de fila sólo ordena, no es un grupo).
   Cada celda trae, de arriba abajo: horario, materia (uno o más renglones),
   grupo («1.9»), cantidad de alumnos, espacio y docente.

   El texto se guarda tal cual figura (mayúsculas, sin tildes): la
   normalización y la comparación con la base las hace el importador del
   backend (backend/src/scripts/importar-organizacion.js), que además arma el
   informe de nuevos, coincidentes y dudosos. Usa pdfjs-dist, que ya está en
   el frontend para el visor de PDF. */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error('Uso: node scripts/extraer-organizacion.mjs "<PDF>" <salida.json>');
  process.exit(1);
}

const DIAS = { LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles", MIÉRCOLES: "Miércoles", JUEVES: "Jueves", VIERNES: "Viernes" };
const ALUMNOS = /^\(\s*(\d+)\s*Alum/i;
const GRUPO = /^\d\.\d{1,2}$/;
const HORARIO = /^(\d{1,2})(?::(\d{2}))?\s*(?:a\s*)?(\d{1,2})(?::(\d{2}))?$/i;
const ESPACIO = /^(TAL+ER|SUM|AULA\s*\d+|LABORATORIO|BIBLIOTECA)$/i;

const hora = (h, m) => `${String(h).padStart(2, "0")}:${m ?? "00"}`;

const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(entrada)), useSystemFonts: true }).promise;
const franjas = [];
const avisos = [];

for (let n = 1; n <= doc.numPages; n++) {
  const pagina = await doc.getPage(n);
  const alto = pagina.getViewport({ scale: 1 }).height;
  const items = (await pagina.getTextContent()).items
    .filter((i) => i.str.trim())
    .map((i) => ({ t: i.str.trim().replace(/\s+/g, " "), x: i.transform[4], y: alto - i.transform[5] }));

  // Encabezado: «TALLERES DEL CICLO BASICO Y SUPERIOR [2026] - TURNO MAÑANA - 1º 7:10 a 9:10 - 7:30 a 9:30»
  const lineaTitulo = items.filter((i) => Math.abs(i.y - items.find((j) => /TURNO/i.test(j.t)).y) < 3)
    .sort((a, b) => a.x - b.x).map((i) => i.t).join(" ");
  const partes = lineaTitulo.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  const titulo = partes[0].replace(/\s+\d{4}$/, "");
  const anio = /\b(\d{4})\b/.exec(partes[0])?.[1] ?? null;
  const turno = /TURNO\s+(\S+)/i.exec(lineaTitulo)[1].toUpperCase();
  const modulo = /(\d)\s*[º°]/.exec(lineaTitulo)?.[1] ?? null;
  const rangos = [...lineaTitulo.matchAll(/(\d{1,2}(?::\d{2})?)\s*a\s*(\d{1,2}(?::\d{2})?)/gi)].map((m) => {
    const [a, b] = [m[1], m[2]].map((v) => (v.includes(":") ? v.padStart(5, "0") : `${v.padStart(2, "0")}:00`));
    return { inicio: a, fin: b };
  });

  // Columnas: una por día, a partir de la posición de los encabezados.
  const cabeceras = items.filter((i) => DIAS[i.t.toUpperCase()]).sort((a, b) => a.x - b.x);
  const yCabecera = Math.max(...cabeceras.map((c) => c.y));
  const inicioColumna = (k) => cabeceras[k].x - 62;
  const columnaDe = (x) => {
    if (x < inicioColumna(0)) return -1; // números de fila
    let k = 0;
    while (k + 1 < cabeceras.length && x >= inicioColumna(k + 1)) k++;
    return k;
  };

  const cuerpo = items.filter((i) => i.y > yCabecera + 2);
  const numerosFila = cuerpo.filter((i) => columnaDe(i.x) === -1 && /^\d{1,2}$/.test(i.t));
  const celdas = [];

  cabeceras.forEach((cabecera, k) => {
    const dia = DIAS[cabecera.t.toUpperCase()];
    const enColumna = cuerpo.filter((i) => columnaDe(i.x) === k);
    const cierres = enColumna.filter((i) => ALUMNOS.test(i.t)).sort((a, b) => a.y - b.y);
    let techo = yCabecera + 2;
    for (const cierre of cierres) {
      const banda = enColumna.filter((i) => i.y > techo && i.y <= cierre.y + 2.5);
      techo = cierre.y + 2.5;
      const ultimo = banda.filter((i) => Math.abs(i.y - cierre.y) < 2.5 && i !== cierre).sort((a, b) => a.x - b.x);
      const espacio = ultimo.find((i) => ESPACIO.test(i.t));
      const docente = ultimo.filter((i) => i !== espacio).map((i) => i.t).join(" ");
      const horario = banda.find((i) => HORARIO.test(i.t));
      const grupo = banda.find((i) => GRUPO.test(i.t));
      const materia = banda
        .filter((i) => i !== horario && i !== grupo && Math.abs(i.y - cierre.y) >= 2.5)
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((i) => i.t)
        .join(" ");
      const m = horario && HORARIO.exec(horario.t);
      const filaCercana = numerosFila
        .filter((f) => grupo && Math.abs(f.y - grupo.y) < 4)
        .map((f) => Number(f.t))[0] ?? null;
      const celda = {
        fila: filaCercana,
        dia,
        horario: horario?.t ?? null,
        inicio: m ? hora(m[1], m[2]) : null,
        fin: m ? hora(m[3], m[4]) : null,
        materia: materia || null,
        grupo: grupo?.t ?? null,
        alumnos: Number(ALUMNOS.exec(cierre.t)[1]),
        espacio: espacio ? espacio.t.toUpperCase().replace(/^TAL+ER$/, "TALLER") : null,
        docente: docente || null,
      };
      const faltan = ["horario", "materia", "grupo", "espacio", "docente"].filter((c) => !celda[c]);
      if (faltan.length) avisos.push(`Página ${n}, ${dia}, fila ${celda.fila ?? "?"}: falta ${faltan.join(", ")}`);
      celdas.push(celda);
    }
  });

  franjas.push({
    pagina: n,
    titulo,
    anio,
    turno,
    modulo,
    rangos,
    filas: numerosFila.length,
    celdas: celdas.sort((a, b) => Object.values(DIAS).indexOf(a.dia) - Object.values(DIAS).indexOf(b.dia) || (a.fila ?? 99) - (b.fila ?? 99)),
  });
}

writeFileSync(
  salida,
  `${JSON.stringify({ fuente: basename(entrada), extraido: new Date().toISOString().slice(0, 10), paginas: doc.numPages, franjas, avisos }, null, 1)}\n`,
);
console.log(`${doc.numPages} páginas → ${franjas.reduce((s, f) => s + f.celdas.length, 0)} celdas`);
for (const f of franjas) console.log(`  pág. ${f.pagina}: turno ${f.turno}, ${f.modulo}° módulo, ${f.celdas.length} celdas, ${f.filas} filas`);
if (avisos.length) console.log(`Celdas incompletas (${avisos.length}):\n  ${avisos.join("\n  ")}`);
