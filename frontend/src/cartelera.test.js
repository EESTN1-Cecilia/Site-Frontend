import { describe, it } from "node:test";
import assert from "node:assert";
import { avanceDelMinuto, girar, minutosParaLaProxima, recorteDe, paginaDe, pisoDelMomento, tocanTurnos, turnosDe, turnosProximos, urlPantalla, FILAS_POR_PAGINA } from "./cartelera.js";

const pisos = [{ id: "pb" }, { id: "1p" }];
// Lunes 26 de octubre de 2026.
const lunes = (h, m, s = 0) => new Date(2026, 9, 26, h, m, s);
const salones = [
  { id: "pb-8", nombre: "Aula 1" },
  { id: "pb-9", nombre: "Aula 2" },
  { id: "pb-15", nombre: "PAÑOL", comun: true },
];
const clase = (id, salon_id, inicio, fin, extra = {}) => ({
  id, dia: "Lunes", salon_id, inicio, fin, estado: "activa", docente: `Docente ${id}`, grupo: `1.${id}`, materia: "Taller", ...extra,
});

describe("Televisor: una planta por minuto", () => {
  it("cada minuto cambia de planta", () => {
    assert.notStrictEqual(pisoDelMomento(lunes(8, 0), pisos), pisoDelMomento(lunes(8, 1), pisos));
    assert.strictEqual(pisoDelMomento(lunes(8, 0, 10), pisos), pisoDelMomento(lunes(8, 0, 50), pisos));
    assert.ok(Math.abs(avanceDelMinuto(lunes(8, 0, 30)) - 0.5) < 1e-9);
  });

  it("el plano vertical se gira 90° en el sentido del reloj (los carteles quedan derechos)", () => {
    assert.deepStrictEqual(girar([0, 0]), [100, 0]); // arriba a la izquierda → arriba a la derecha
    assert.deepStrictEqual(girar([100, 100]), [0, 100]);
    assert.deepStrictEqual(girar([25, 40]), [60, 25]);
  });

  it("cada planta se recorta a la parte con espacios (sin las franjas en blanco del dibujo)", () => {
    assert.deepStrictEqual(recorteDe([[10, 20], [60, 50], [30, 5]]), { x0: 8.5, y0: 3.5, x1: 61.5, y1: 51.5 });
    assert.deepStrictEqual(recorteDe([[1, 99]], 4), { x0: 0, y0: 95, x1: 5, y1: 100 });
    assert.deepStrictEqual(recorteDe([]), { x0: 0, y0: 0, x1: 100, y1: 100 });
  });
});

describe("Televisor: tablero de turnos de una planta", () => {
  const clases = [
    clase(1, "pb-9", "08:00", "10:00"),
    clase(2, "pb-8", "08:00", "09:00"),
    clase(3, "pb-8", "08:00", "10:00", { estado: "docente_ausente" }),
    clase(4, "pb-15", "08:00", "10:00"),
    clase(5, "1p-4", "08:00", "10:00"),
    clase(6, "pb-8", "10:00", "12:00"),
    clase(7, "pb-9", "10:00", "12:00", { dia: "Martes" }),
  ];

  it("ahora: aula, docente y grupo de cada clase de esa planta, por aula; ausencias con su aviso", () => {
    const t = turnosDe(clases, salones, lunes(8, 55));
    assert.strictEqual(t.titulo, "Ahora");
    assert.deepStrictEqual(t.filas.map((f) => [f.aula, f.grupo, f.estado]), [
      ["Aula 1", "1.2", "por-finalizar"],
      ["Aula 1", "1.3", "docente_ausente"],
      ["Aula 2", "1.1", "ocupado"],
    ]);
    assert.deepStrictEqual([t.filas[2].docente, t.filas[2].desde, t.filas[2].hasta], ["Docente 1", "8:00", "10:00"]);
  });

  it("si no hay clases ahora, las próximas de hoy", () => {
    const t = turnosDe(clases, salones, lunes(7, 30));
    assert.match(t.titulo, /Próximas · desde las 8:00/);
    assert.deepStrictEqual(t.filas.map((f) => f.grupo), ["1.2", "1.1"]);
    assert.deepStrictEqual(turnosDe(clases, salones, lunes(13, 0)).filas, []);
  });

  it("si no entra, pasa de a páginas", () => {
    const muchas = Array.from({ length: FILAS_POR_PAGINA + 2 }, (_, i) => ({ id: i }));
    const a = paginaDe(muchas, lunes(8, 0, 0));
    const b = paginaDe(muchas, lunes(8, 0, 15));
    assert.deepStrictEqual([a.paginas, a.filas.length, b.filas.length], [2, FILAS_POR_PAGINA, 2]);
  });

  it("dentro de cada planta pasan todas las páginas (no queda siempre la misma)", () => {
    const filas = Array.from({ length: 5 }, (_, i) => ({ id: i }));
    // Plantas de 10 s: en todas, la primera mitad muestra la página 1 y la segunda la 2.
    for (const s of [0, 10, 20, 30]) {
      assert.strictEqual(paginaDe(filas, lunes(8, 0, s), 4, 10).pagina, 1);
      assert.strictEqual(paginaDe(filas, lunes(8, 0, s + 6), 4, 10).pagina, 2);
    }
  });

  it("el enlace del televisor lleva su clave", () => {
    assert.strictEqual(urlPantalla("abc_123", { origin: "http://escuela", pathname: "/" }), "http://escuela/#/tv?p=abc_123");
  });
});

describe("Televisor: turnos como en una clínica", () => {
  const clases = [
    clase(1, "pb-8", "13:00", "15:00", { salon: "Aula 1", grupo: "4.1" }),
    clase(2, "pb-9", "13:00", "15:00", { salon: "Aula 2", grupo: "2.3", salon_habitual: "Aula 7" }),
    clase(3, "pb-9", "13:30", "15:30", { salon: "Aula 2", grupo: "1.5", estado: "docente_ausente" }),
    clase(4, "pb-8", "15:10", "17:10", { salon: "Aula 1", grupo: "5.2" }),
    clase(5, "pb-8", "13:00", "15:00", { salon: "Aula 1", grupo: "3.1", reciente: "nueva" }),
  ];

  it("lista las que están por empezar; arriba la primera con novedad y después las otras con novedad", () => {
    const t = turnosProximos(clases, lunes(12, 55));
    assert.deepStrictEqual([t.destacada.grupo, t.destacada.novedad.texto], ["2.3", "Cambio de aula (antes Aula 7)"]);
    assert.deepStrictEqual(t.filas.map((f) => [f.grupo, f.aula, f.novedad?.tipo ?? null]), [
      ["3.1", "Aula 1", "nueva"],
      ["1.5", "Aula 2", "docente_ausente"],
      ["4.1", "Aula 1", null],
    ]);
    assert.strictEqual(turnosProximos(clases, lunes(18, 0)).destacada, null);
    // Un espacio que no está en el plano (SUM del PDF) también figura.
    const sum = turnosProximos([clase(9, null, "13:00", "15:00", { salon: null, grupo: "1.9", observaciones: "Importada; espacio en el PDF: SUM" })], lunes(12, 55));
    assert.deepStrictEqual([sum.destacada.grupo, sum.destacada.aula], ["1.9", "SUM"]);
  });

  it("aparece cada 5 minutos; cuando falta poco para empezar, cada 2", () => {
    const cuantas = (desde, faltan) =>
      Array.from({ length: 10 }, (_, i) => tocanTurnos(new Date(desde.getTime() + i * 60000), true, faltan)).filter(Boolean).length;
    assert.strictEqual(cuantas(lunes(10, 0), 60), 2);
    assert.strictEqual(cuantas(lunes(10, 0), 10), 5);
    assert.strictEqual(tocanTurnos(lunes(10, 4), false, 10), false);
    assert.strictEqual(minutosParaLaProxima(clases, lunes(12, 40)), 20);
    assert.strictEqual(minutosParaLaProxima(clases, lunes(18, 0)), null);
  });
});
