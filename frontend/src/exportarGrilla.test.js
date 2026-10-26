import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { construirPdf, franjas, tituloFranja, espacioDe, ordenar, nombreModulo, colorDeGrupo, FILAS } from "./exportarGrilla.js";

/* Datos de prueba: las celdas reales del PDF institucional (las extrae
   scripts/extraer-organizacion.mjs), convertidas en asignaciones como las
   que devuelve la API. */
const org = JSON.parse(readFileSync(new URL("../../backend/src/datos/organizacion-octubre-2026.json", import.meta.url), "utf8"));
const manana = org.franjas.filter((f) => f.turno === "MAÑANA");
const grilla = {
  id: "org-manana",
  nombre: "Talleres · Mañana",
  organizacion: "Talleres del Ciclo Básico y Superior",
  periodo: "Octubre 2026",
  turno: "manana",
  ciclo: "ambos",
  dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  horas: manana.map((f) => ({ id: `${f.modulo}°`, nombre: `${f.modulo}° módulo`, ...f.rangos[0] })),
};
let id = 0;
const asignaciones = manana.flatMap((f) =>
  f.celdas.map((c) => ({
    id: ++id,
    grilla_id: grilla.id,
    hora: `${f.modulo}°`,
    modulo_nombre: `${f.modulo}° módulo`,
    dia: c.dia,
    inicio: c.inicio,
    fin: c.fin,
    materia: c.materia,
    grupo: c.grupo,
    alumnos: c.alumnos,
    salon: c.espacio === "SUM" ? null : c.espacio,
    observaciones: c.espacio === "SUM" ? "Importada; espacio en el PDF: SUM" : "",
    docente: c.docente,
    estado: "activa",
  })),
);

async function textoDelPdf(doc) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(doc.output("arraybuffer")), verbosity: 0 }).promise;
  const paginas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    paginas.push(items.map((i) => i.str).join(" "));
  }
  return paginas;
}

describe("Exportación de la grilla a PDF", () => {
  it("arma una franja por módulo, con los días como columnas y las clases ordenadas por grupo", () => {
    const [primera, segunda] = franjas(grilla, asignaciones);
    assert.deepStrictEqual(primera.dias, ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
    assert.strictEqual(primera.filas, 17);
    assert.strictEqual(segunda.filas, 17); // 15 clases, pero la franja tiene las 17 filas
    assert.deepStrictEqual(primera.porDia.Lunes.slice(0, 3).map((a) => a.grupo), ["1.9", "1.11", "2.1"]);
    assert.ok([...primera.porDia.Lunes].sort(ordenar).every((a, i, l) => !i || a.grupo >= l[i - 1].grupo || a.grupo.length !== l[i - 1].grupo.length));
  });

  it("el título es el del PDF: organización, turno, módulo y sus dos horarios", () => {
    assert.strictEqual(
      tituloFranja(grilla, grilla.horas[0], { manana: "Mañana" }, asignaciones),
      "TALLERES DEL CICLO BÁSICO Y SUPERIOR - TURNO MAÑANA - 1° 7:10 a 9:10 - 7:30 a 9:30",
    );
  });

  it("cada franja tiene las filas 1 a 17, como el PDF", () => {
    assert.strictEqual(FILAS, 17);
    for (const f of franjas(grilla, asignaciones)) assert.ok(f.filas >= 17);
    assert.strictEqual(franjas(grilla, [])[0].filas, 17);
  });

  it("el grupo lleva el color de su año: 1° a 3° amarillo, 4° a 6° salmón, 7° celeste", () => {
    assert.deepStrictEqual(["1.9", "3.11", "4.1", "6.8", "7.3", null].map(colorDeGrupo), ["amarillo", "amarillo", "salmon", "salmon", "celeste", "amarillo"]);
  });

  it("es un PDF real: A4 apaisado, con texto de todas las clases y sin cortar ninguna", async () => {
    const doc = construirPdf(jsPDF, autoTable, { grilla, asignaciones, turnos: { manana: "Mañana" }, ciclos: { ambos: "Ciclo Básico y Superior" } });
    const [ancho, alto] = [doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight()];
    assert.ok(ancho > alto, "apaisado");
    const paginas = await textoDelPdf(doc);
    assert.ok(paginas.length >= 2, "al menos una página por módulo");
    const todo = paginas.join(" ");
    for (const a of asignaciones) {
      for (const dato of [a.grupo, `(${a.alumnos} Alumnos)`]) assert.ok(todo.includes(dato), `falta ${dato}`);
    }
    // Docentes y materias (en mayúsculas, como en el original), con tildes y ñ.
    for (const docente of new Set(asignaciones.map((a) => a.docente))) assert.ok(todo.includes(docente), `falta ${docente}`);
    assert.ok(todo.includes("SISTEMAS TECNOLOGICOS") && todo.includes("DISEÑO"));
    assert.ok(todo.includes("SUM"), "el espacio que figura en el PDF aunque no esté en el plano");
    // Cada página repite el título y los días, y está numerada.
    paginas.forEach((p, i) => {
      assert.ok(p.includes("LUNES") && p.includes("VIERNES"), `página ${i + 1} sin días`);
      assert.ok(p.includes("TURNO MAÑANA"), `página ${i + 1} sin título`);
      assert.ok(p.includes(`Página ${i + 1} de ${paginas.length}`), `página ${i + 1} sin número`);
    });
  });

  it("si una clase no tiene espacio del plano, muestra el del PDF", () => {
    assert.strictEqual(espacioDe({ salon: null, observaciones: "Importada de X; espacio en el PDF: AULA 9" }), "AULA 9");
    assert.strictEqual(espacioDe({ salon: "Aula 17", observaciones: "" }), "Aula 17");
  });
});

describe("Encabezado de cada franja", () => {
  it("la esquina muestra el módulo como en el PDF, sin perder los símbolos", () => {
    assert.strictEqual(nombreModulo({ nombre: "1°/2°" }), "1°/2°");
    assert.strictEqual(nombreModulo({ nombre: "3°/4°" }), "3°/4°");
    assert.strictEqual(nombreModulo({ nombre: "1° módulo" }), "1°");
    assert.strictEqual(nombreModulo({ nombre: "" }), "#");
  });
});

describe("Horarios del encabezado", () => {
  it("si el módulo trae los del PDF, se usan tal cual", () => {
    const modulo = { id: "manana-2°", nombre: "2° módulo", turno: "manana", inicio: "09:10", fin: "11:10", rangos: [["09:30", "11:30"]] };
    assert.strictEqual(
      tituloFranja({ organizacion: "Talleres del Ciclo Básico y Superior" }, modulo, { manana: "Mañana" }),
      "TALLERES DEL CICLO BÁSICO Y SUPERIOR - TURNO MAÑANA - 2° 9:10 a 11:10 - 9:30 a 11:30",
    );
  });
});
