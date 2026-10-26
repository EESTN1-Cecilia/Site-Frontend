/* Exporta una grilla de Espacios y horarios a PDF con el formato de la
   organización institucional («ORGANIZACION OCTUBRE.pdf»): A4 apaisado, una
   franja (turno + módulo) por página, columnas de lunes a viernes y filas
   numeradas. Cada celda lleva, como en el original:

     ┌──────────────┬──────────────────────────┐
     │ 7:10 a 9:10  │         MATERIA          │
     │ 1.9          ├────────────┬─────────────┤
     │ (17 Alumnos) │  ESPACIO   │   DOCENTE   │
     └──────────────┴────────────┴─────────────┘

   Es un PDF real (texto y tablas con jsPDF + jspdf-autotable), armado con los
   datos guardados: lo que se cambia en la grilla o en el plano sale en la
   siguiente exportación. Si una franja no entra en una página sigue en la
   próxima, repitiendo el título y los días; ninguna celda se corta. */

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const MARGEN = 18;
const ANCHO_FILA = 20;

/* Cada franja del PDF tiene las filas 1 a 17 (más si hiciera falta). */
export const FILAS = 17;

/* Colores del PDF institucional: encabezado del módulo en verde, días en
   celeste y el grupo resaltado según el año: 1° a 3° amarillo, 4° a 6°
   salmón, 7° celeste. */
export const COLORES = {
  modulo: [182, 215, 168],
  dias: [208, 224, 227],
  amarillo: [255, 255, 0],
  salmon: [253, 233, 217],
  celeste: [201, 218, 248],
};
export const colorDeGrupo = (grupo) => {
  const anio = Number(/^(\d)/.exec(grupo ?? "")?.[1]);
  if (anio >= 7) return "celeste";
  if (anio >= 4) return "salmon";
  return "amarillo";
};

const hora = (hhmm) => (hhmm ? hhmm.replace(/^0/, "") : "");
export const horario = (a) => (a.inicio ? `${hora(a.inicio)} a ${hora(a.fin)}` : a.modulo_nombre ?? "");
const mayus = (texto) => (texto ?? "").toLocaleUpperCase("es-AR");

/* El espacio que figura: el del plano o, si la clase vino del PDF con un
   espacio que no está en el plano (SUM, AULA 9…), ese nombre. */
export const espacioDe = (a) =>
  a.salon ?? /espacio en el PDF: ([^;]+)/.exec(a.observaciones ?? "")?.[1] ?? "";

/* Orden dentro de un día, como en el PDF: por grupo (1.1, 1.3… 7.8) y hora. */
const ordenGrupo = (g) => (g ?? "").split(".").map((n) => n.padStart(3, "0")).join(".");
export const ordenar = (a, b) =>
  ordenGrupo(a.grupo).localeCompare(ordenGrupo(b.grupo)) || (a.inicio ?? "").localeCompare(b.inicio ?? "") || a.id - b.id;

/* Las franjas de la grilla: una por módulo, con sus clases por día. */
export function franjas(grilla, asignaciones) {
  const dias = DIAS.filter((d) => (grilla.dias ?? DIAS).includes(d));
  return grilla.horas.map((modulo) => {
    const porDia = Object.fromEntries(
      dias.map((d) => [d, asignaciones.filter((a) => a.grilla_id === grilla.id && a.hora === modulo.id && a.dia === d).sort(ordenar)]),
    );
    return { modulo, dias, porDia, filas: Math.max(FILAS, ...Object.values(porDia).map((l) => l.length)) };
  });
}

/* «Mañana · 1° módulo»: para listas donde hay módulos de los dos turnos. */
export const moduloConTurno = (modulo, turnos = {}) =>
  modulo.turno ? `${turnos[modulo.turno] ?? modulo.turno} · ${modulo.nombre}` : modulo.nombre;

/* El módulo en la esquina de la tabla, como en el PDF: «1°/2°», «3°». */
export const nombreModulo = (modulo) => (modulo.nombre ?? "").replace(/\s*m[oó]dulo\s*/i, "").trim() || "#";

/* Los horarios de una franja, como en el encabezado del PDF («7:10 a 9:10 -
   7:30 a 9:30»): el del módulo y los que trae del PDF (o, si no tiene, el
   otro más usado por sus clases). */
export function rangosDe(modulo, clases = []) {
  if (modulo.rangos?.length) {
    return [[modulo.inicio, modulo.fin], ...modulo.rangos].filter(([i]) => i).map(([i, f]) => `${hora(i)} a ${hora(f)}`);
  }
  const cuenta = new Map();
  for (const a of clases) {
    if (a.hora !== modulo.id || !a.inicio) continue;
    const k = `${a.inicio}|${a.fin}`;
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  const propio = modulo.inicio ? `${modulo.inicio}|${modulo.fin}` : null;
  const otros = [...cuenta.entries()].filter(([k, n]) => k !== propio && n >= 3).sort((a, b) => b[1] - a[1]);
  return [propio, otros[0]?.[0]].filter(Boolean).map((k) => {
    const [i, f] = k.split("|");
    return `${hora(i)} a ${hora(f)}`;
  });
}

export function tituloFranja(grilla, modulo, turnos = {}, clases = []) {
  const partes = [mayus(grilla.organizacion || grilla.nombre)];
  // Cada módulo lleva su turno (una grilla puede tener mañana y tarde).
  const turno = modulo.turno || grilla.turno;
  if (turno) partes.push(`TURNO ${mayus(turnos[turno] ?? turno)}`);
  const rangos = rangosDe(modulo, clases);
  partes.push(`${nombreModulo(modulo)}${rangos.length ? ` ${rangos[0]}` : ""}`, ...rangos.slice(1));
  return partes.join(" - ");
}

/* Arma el documento. jsPDF y autoTable se pasan desde afuera: en el
   navegador se cargan sólo al exportar; en los tests, directo. */
export function construirPdf(jsPDF, autoTable, { grilla, asignaciones, turnos = {}, ciclos = {} }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const lista = franjas(grilla, asignaciones);
  const anchoDia = (ancho - 2 * MARGEN - ANCHO_FILA) / Math.max(1, lista[0]?.dias.length ?? 5);
  const subtitulo = [ciclos[grilla.ciclo], grilla.periodo].filter(Boolean).join(" · ");

  /* Como en el original: a la izquierda el horario y, resaltados en
     amarillo, el grupo y los alumnos; a la derecha la materia en su
     recuadro y, debajo, espacio | docente en dos casilleros. */
  const IZQ = 0.31; // parte de la celda para horario, grupo y alumnos
  const renglones = (a) => {
    const derecha = anchoDia * (1 - IZQ);
    doc.setFont("helvetica", "bold").setFontSize(6.6);
    const materia = doc.splitTextToSize(mayus(a.materia ?? "Sin materia"), derecha - 5);
    doc.setFont("helvetica", "normal").setFontSize(5.9);
    const espacio = doc.splitTextToSize(mayus(espacioDe(a) || "—"), derecha / 2 - 3);
    const docente = doc.splitTextToSize(mayus(a.docente ?? "—"), derecha / 2 - 3);
    const alto = Math.max(14, 3.5 + materia.length * 6.6);
    const abajo = Math.max(10, 3.5 + Math.max(espacio.length, docente.length) * 6);
    return { materia, espacio, docente, alto, abajo, altura: Math.max(alto + abajo, 25) };
  };

  lista.forEach((franja, n) => {
    if (n > 0) doc.addPage();
    const titulo = tituloFranja(grilla, franja.modulo, turnos, asignaciones);
    const cuerpo = Array.from({ length: franja.filas }, (_, i) => [
      String(i + 1),
      ...franja.dias.map((d) => franja.porDia[d][i] ?? null),
    ]);
    const primeraPagina = doc.getNumberOfPages();

    autoTable(doc, {
      startY: MARGEN + 20,
      margin: { top: MARGEN + 20, left: MARGEN, right: MARGEN, bottom: MARGEN + 4 },
      head: [[nombreModulo(franja.modulo), ...franja.dias.map(mayus)]],
      body: cuerpo,
      theme: "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      styles: { font: "helvetica", fontSize: 7, cellPadding: 0, lineColor: [60, 60, 60], lineWidth: 0.5, textColor: [0, 0, 0], valign: "middle" },
      headStyles: { fillColor: COLORES.dias, textColor: [0, 0, 0], fontStyle: "bold", halign: "center", fontSize: 8.5, minCellHeight: 13 },
      columnStyles: Object.fromEntries([[0, { cellWidth: ANCHO_FILA, halign: "center", fontStyle: "bold" }], ...franja.dias.map((_, i) => [i + 1, { cellWidth: anchoDia }])]),
      didParseCell: (d) => {
        // La esquina con el módulo, en verde como en el original.
        if (d.section === "head" && d.column.index === 0) d.cell.styles.fillColor = COLORES.modulo;
        if (d.section !== "body" || d.column.index === 0) return;
        const a = d.cell.raw;
        d.cell.text = [];
        d.cell.styles.minCellHeight = a ? renglones(a).altura : 25;
      },
      didDrawCell: (d) => {
        if (d.section !== "body" || d.column.index === 0 || !d.cell.raw) return;
        const a = d.cell.raw;
        const r = renglones(a);
        const { x, y, width, height } = d.cell;
        const xr = x + width * IZQ; // donde empieza la derecha
        const xm = xr + (x + width - xr) / 2; // entre espacio y docente
        const ym = y + height - r.abajo; // arriba de espacio y docente

        // Grupo y alumnos resaltados con el color de su año, como en el original.
        doc.setFillColor(...COLORES[colorDeGrupo(a.grupo)]);
        doc.rect(x + 0.6, y + 8.2, width * IZQ - 1.2, height - 8.8, "F");
        doc.setDrawColor(60).setLineWidth(0.5);
        doc.line(xr, y, xr, y + height);
        doc.line(xr, ym, x + width, ym);
        doc.line(xm, ym, xm, y + height);

        doc.setTextColor(0);
        doc.setFont("helvetica", "normal").setFontSize(5.8);
        doc.text(horario(a), x + (width * IZQ) / 2, y + 6, { align: "center" });
        const medio = y + 8.2 + (height - 8.8) / 2;
        doc.setFont("helvetica", "bold").setFontSize(8.2);
        doc.text(a.grupo ?? "", x + 3, medio - (a.alumnos ? 0.6 : -2.5));
        doc.setFont("helvetica", "normal").setFontSize(5.6);
        if (a.alumnos) doc.text(`(${a.alumnos} Alumnos)`, x + 3, medio + 6);

        doc.setFont("helvetica", "bold").setFontSize(6.6);
        const arribaMateria = y + (ym - y - r.materia.length * 6.6) / 2 + 5;
        r.materia.forEach((linea, i) => doc.text(linea, (xr + x + width) / 2, arribaMateria + i * 6.6, { align: "center" }));
        doc.setFont("helvetica", "normal").setFontSize(5.9);
        const centrado = (lineas, cx) => {
          const arriba = ym + (r.abajo - lineas.length * 6) / 2 + 4.4;
          lineas.forEach((linea, i) => doc.text(linea, cx, arriba + i * 6, { align: "center" }));
        };
        centrado(r.espacio, (xr + xm) / 2);
        centrado(r.docente, (xm + x + width) / 2);
      },
      didDrawPage: () => {
        const continua = doc.getNumberOfPages() > primeraPagina;
        doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(0);
        doc.text(`${titulo}${continua ? " (continuación)" : ""}`, ancho / 2, MARGEN + 5, { align: "center", maxWidth: ancho - 2 * MARGEN });
        doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(90);
        if (subtitulo) doc.text(subtitulo, ancho / 2, MARGEN + 14, { align: "center" });
      },
    });
  });

  /* Numeración y pie en todas las páginas. */
  const total = doc.getNumberOfPages();
  const generado = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(90);
    doc.text(`E.E.S. Técnica N° 1 «Cecilia Berdichevski» · generado el ${generado}`, MARGEN, alto - MARGEN + 8);
    doc.text(`Página ${i} de ${total}`, ancho - MARGEN, alto - MARGEN + 8, { align: "right" });
  }
  return doc;
}

const nombreArchivo = (grilla) =>
  `${[grilla.nombre, grilla.periodo].filter(Boolean).join(" ")}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "grilla";

/* En el navegador: arma el PDF y lo descarga. */
export async function exportarGrillaPdf(datos) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  construirPdf(jsPDF, autoTable, datos).save(`${nombreArchivo(datos.grilla)}.pdf`);
}
