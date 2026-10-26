import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert";
import {
  estadoEspacio,
  estadoEnMomento,
  seSuperponen,
  suscribirReloj,
  diaDe,
  fechaYHoraLarga,
} from "./horario.js";

/* Lunes 3 de noviembre de 2025 a la hora indicada (hora local). */
const lunes = (hhmm, segundos = 0) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2025, 10, 3, h, m, segundos);
};
const clase = (inicio, fin, extra = {}) => ({
  id: `${inicio}-${fin}`,
  dia: "Lunes",
  hora: "m",
  inicio,
  fin,
  estado: "activa",
  ...extra,
});

describe("Estado de un espacio según el reloj", () => {
  it("sin asignaciones queda libre (verde)", () => {
    assert.strictEqual(estadoEspacio([], lunes("08:30")).estado, "libre");
  });

  it("con una clase en curso queda ocupado (rojo)", () => {
    const r = estadoEspacio([clase("08:00", "09:20")], lunes("08:00"));
    assert.strictEqual(r.estado, "ocupado");
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], lunes("09:09", 59)).estado, "ocupado");
  });

  it("en los últimos 10 minutos queda por finalizar (amarillo)", () => {
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], lunes("09:10")).estado, "por-finalizar");
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], lunes("09:19", 59)).estado, "por-finalizar");
  });

  it("al terminar la clase queda libre si no hay otra", () => {
    const r = estadoEspacio([clase("08:00", "09:20")], lunes("09:20"));
    assert.strictEqual(r.estado, "libre");
    assert.strictEqual(r.actual, null);
  });

  it("una clase consecutiva toma el lugar sin hueco", () => {
    const clases = [clase("08:00", "09:20"), clase("09:20", "10:40")];
    const r = estadoEspacio(clases, lunes("09:20"));
    assert.strictEqual(r.estado, "ocupado");
    assert.strictEqual(r.actual.inicio, "09:20");
    assert.strictEqual(estadoEspacio(clases, lunes("09:15")).proxima.inicio, "09:20");
  });

  it("otro día, una clase suspendida o con docente ausente no ocupan", () => {
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20", { dia: "Martes" })], lunes("08:30")).estado, "libre");
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20", { estado: "docente_ausente" })], lunes("08:30")).estado, "libre");
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], new Date(2025, 10, 8, 8, 30)).estado, "libre"); // sábado
  });

  it("si la clase de hoy no tiene hora cargada, no se inventa: sin-horario", () => {
    assert.strictEqual(estadoEspacio([clase(null, null)], lunes("08:30")).estado, "sin-horario");
  });

  it("vista planificada: ocupado si alguna clase se superpone con el momento elegido", () => {
    const momento = { dia: "Lunes", hora: "m", inicio: "09:00", fin: "09:40" };
    assert.strictEqual(estadoEnMomento([clase("08:00", "09:20")], momento).estado, "ocupado");
    assert.strictEqual(estadoEnMomento([clase("09:40", "10:40")], momento).estado, "libre");
  });

  it("superposición: mismas reglas que el backend", () => {
    assert.ok(seSuperponen(clase("08:00", "09:20"), clase("09:00", "10:00")));
    assert.ok(!seSuperponen(clase("08:00", "09:20"), clase("09:20", "10:40")));
    assert.ok(seSuperponen(clase(null, null), clase(null, null)));
  });

  it("el día de la semana sale de la fecha local", () => {
    assert.strictEqual(diaDe(lunes("08:00")), "Lunes");
    assert.strictEqual(diaDe(new Date(2025, 10, 9)), null);
  });
});

describe("Fecha y hora del encabezado", () => {
  it("en español, con el día en mayúscula y la hora en 24 h", () => {
    assert.strictEqual(fechaYHoraLarga(new Date(2026, 9, 24, 23, 30)), "Sábado, 24 de octubre de 2026 · 23:30");
    assert.strictEqual(fechaYHoraLarga(new Date(2026, 9, 26, 8, 5)), "Lunes, 26 de octubre de 2026 · 08:05");
  });
});

describe("Reloj compartido", () => {
  afterEach(() => mock.timers.reset());

  it("avisa solo al cambiar el minuto, con un único temporizador, y se apaga al no haber nadie", () => {
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: lunes("09:09", 30).getTime() });
    const vistos = [];
    const otros = [];
    const salir = suscribirReloj((fecha) => vistos.push(fecha));
    const salirOtro = suscribirReloj((fecha) => otros.push(fecha));

    mock.timers.tick(29000);
    assert.strictEqual(vistos.length, 0);
    mock.timers.tick(1000); // 09:10:00 (más los 50 ms de margen)
    mock.timers.tick(50);
    assert.strictEqual(vistos.length, 1);
    assert.strictEqual(otros.length, 1);
    assert.strictEqual(vistos[0].getMinutes(), 10);
    // El estado cambia solo con el reloj: a las 09:10 la clase de 08:00 a 09:20 pasa a amarillo.
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], vistos[0]).estado, "por-finalizar");

    mock.timers.tick(60000);
    assert.strictEqual(vistos.length, 2);
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], vistos[1]).estado, "por-finalizar");
    mock.timers.tick(9 * 60000);
    assert.strictEqual(estadoEspacio([clase("08:00", "09:20")], vistos.at(-1)).estado, "libre");

    salir();
    salirOtro();
    const cantidad = vistos.length;
    mock.timers.tick(5 * 60000);
    assert.strictEqual(vistos.length, cantidad);
  });
});
