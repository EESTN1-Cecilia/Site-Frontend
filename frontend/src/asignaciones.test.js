import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";

/* La grilla y el plano leen del mismo store: lo que se guarda desde uno tiene
   que verse en el otro, y lo que guarda otra persona tiene que llegar por el
   canal de avisos. Acá el backend es un fetch falso con estado propio. */

const almacen = new Map([["site_token", "token-de-prueba"]]);
globalThis.localStorage = { getItem: (k) => almacen.get(k) ?? null, setItem() {}, removeItem() {} };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const servidor = {
  asignaciones: [],
  grillas: [],
  siguiente: 1,
  avisar: null, // escribe un aviso en el canal abierto
  pedidos: [],
};

const fila = (datos, id, version = 1) => ({
  id,
  version,
  grilla_id: "Básico",
  modulo_nombre: datos.hora,
  inicio: "08:00",
  fin: "09:20",
  estado: "activa",
  salon: datos.salon_id === "pb-8" ? "Aula 1" : "Aula 2",
  docente: "Prof. Paz",
  materia: "Matemática",
  ...datos,
});

globalThis.fetch = async (url, opciones = {}) => {
  const { pathname, searchParams } = new URL(url);
  const metodo = opciones.method || "GET";
  servidor.pedidos.push(`${metodo} ${pathname}`);
  const json = (cuerpo, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(cuerpo) });

  if (pathname === "/api/eventos") {
    const codificar = new TextEncoder();
    const body = new ReadableStream({
      start(control) {
        servidor.avisar = (texto) => control.enqueue(codificar.encode(texto));
        control.enqueue(codificar.encode('event: hola\ndata: {"version":1}\n\n'));
        opciones.signal?.addEventListener("abort", () => control.close());
      },
    });
    return { ok: true, status: 200, body };
  }
  if (pathname === "/api/asignaciones" && metodo === "GET") {
    return json({ asignaciones: structuredClone(servidor.asignaciones), salones: [], grillas: servidor.grillas, dias: [] });
  }
  if (pathname === "/api/asignaciones" && metodo === "POST") {
    const nueva = fila(JSON.parse(opciones.body), servidor.siguiente++);
    servidor.asignaciones.push(nueva);
    return json({ asignacion: nueva }, 201);
  }
  const aula = /^\/api\/asignaciones\/(\d+)\/cambiar-aula$/.exec(pathname);
  if (aula && metodo === "POST") {
    const a = servidor.asignaciones.find((x) => x.id === Number(aula[1]));
    const { salon_id, version } = JSON.parse(opciones.body);
    if (version !== a.version) return json({ error: "cambió", cambio: true }, 409);
    const vuelve = salon_id === a.salon_habitual;
    Object.assign(a, { salon_habitual: vuelve ? null : a.salon_habitual ?? a.salon_id, salon_id, version: a.version + 1 });
    return json({ asignacion: a });
  }
  if (pathname === "/api/docentes" && metodo === "POST") {
    const { nombre } = JSON.parse(opciones.body);
    servidor.docentes ??= [];
    const existente = servidor.docentes.find((d) => d.nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) return json({ docente: existente });
    const docente = { id: 100 + servidor.docentes.length, nombre };
    servidor.docentes.push(docente);
    return json({ docente }, 201);
  }
  if (pathname === "/api/asignaciones" && metodo === "PUT") {
    const { altas, cambios, bajas } = JSON.parse(opciones.body);
    // Todo o nada, como el servidor.
    if (cambios.some((c) => servidor.asignaciones.find((a) => a.id === c.id)?.version !== c.version)) {
      return json({ error: "Otra persona cambió esta asignación", cambio: true }, 409);
    }
    servidor.asignaciones = servidor.asignaciones.filter((a) => !bajas.some((b) => b.id === a.id));
    const guardadas = [];
    for (const c of cambios) {
      const a = servidor.asignaciones.find((x) => x.id === c.id);
      const { id, version, ...cuerpo } = c;
      Object.assign(a, fila(cuerpo, id, version + 1));
      guardadas.push(a);
    }
    for (const n of altas) {
      const a = fila(n, servidor.siguiente++);
      servidor.asignaciones.push(a);
      guardadas.push(a);
    }
    return json({ asignaciones: guardadas, bajas: bajas.map((b) => b.id) });
  }
  const copia = /^\/api\/grillas\/([^/]+)\/copiar$/.exec(pathname);
  if (copia && metodo === "POST") {
    const origen = decodeURIComponent(copia[1]);
    const { nombre, archivarOriginal } = JSON.parse(opciones.body);
    const nueva = { id: `${origen}-c`, nombre, vigente: !!archivarOriginal, horas: [] };
    if (archivarOriginal) servidor.grillas.find((g) => g.id === origen).vigente = false;
    servidor.grillas.push(nueva);
    const clases = servidor.asignaciones.filter((a) => a.grilla_id === origen);
    for (const a of clases) {
      servidor.asignaciones.push({ ...a, id: servidor.siguiente++, grilla_id: nueva.id, estado: "activa", salon_habitual: null, grilla_vigente: nueva.vigente ? 1 : 0 });
    }
    for (const a of servidor.asignaciones) if (a.grilla_id === origen) a.grilla_vigente = archivarOriginal ? 0 : 1;
    return json({ grilla: nueva, clases: clases.length }, 201);
  }
  const id = Number(pathname.split("/").pop());
  const existente = servidor.asignaciones.find((a) => a.id === id);
  if (metodo === "PUT") {
    const { version, ...cuerpo } = JSON.parse(opciones.body);
    if (version !== existente.version) {
      return json({ error: "Otra persona cambió esta asignación", cambio: true }, 409);
    }
    Object.assign(existente, fila(cuerpo, id, existente.version + 1));
    return json({ asignacion: existente });
  }
  if (metodo === "DELETE") {
    if (Number(searchParams.get("version")) !== existente.version) return json({ error: "cambió", cambio: true }, 409);
    servidor.asignaciones = servidor.asignaciones.filter((a) => a.id !== id);
    return json({ ok: true });
  }
  throw new Error(`pedido inesperado ${metodo} ${pathname}`);
};

const store = await import("./asignaciones.js");
const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const hasta = async (condicion) => {
  for (let i = 0; i < 100 && !condicion(); i++) await esperar(10);
  assert.ok(condicion(), "no pasó a tiempo");
};

/* Dos "pantallas" mirando el mismo store, como la grilla y el plano. */
const pantallas = () => {
  const vistas = { grilla: null, plano: null };
  store.suscribir((e) => (vistas.grilla = e.datos.asignaciones));
  store.suscribir((e) => (vistas.plano = e.datos.asignaciones));
  return vistas;
};
const clase = { grilla_id: "Básico", hora: "1°/2°", dia: "Lunes", salon_id: "pb-8", docente_id: 1, materia_id: 1 };

describe("Una sola fuente de datos para la grilla y el plano", () => {
  beforeEach(async () => {
    store.reiniciar();
    servidor.asignaciones = [];
    servidor.grillas = [{ id: "Básico", nombre: "Básico", vigente: true, horas: [] }];
    servidor.pedidos = [];
    await store.cargarAsignaciones();
  });

  it("crear desde la grilla actualiza el plano (y al revés)", async () => {
    const vistas = pantallas();
    const desdeGrilla = await store.guardar(null, null, clase);
    assert.ok(vistas.plano.some((a) => a.id === desdeGrilla.id));
    const desdeModal = await store.guardar(null, null, { ...clase, salon_id: "pb-9", hora: "3°/4°" });
    assert.ok(vistas.grilla.some((a) => a.id === desdeModal.id));
    assert.deepStrictEqual(vistas.grilla, vistas.plano);
  });

  it("editar y quitar actualizan las dos vistas", async () => {
    const vistas = pantallas();
    const creada = await store.guardar(null, null, clase);
    const editada = await store.guardar(creada.id, creada.version, { ...clase, dia: "Martes" });
    assert.strictEqual(vistas.plano.find((a) => a.id === creada.id).dia, "Martes");
    assert.strictEqual(vistas.grilla.find((a) => a.id === creada.id).version, 2);
    await store.quitar(editada.id, editada.version);
    assert.deepStrictEqual([vistas.grilla.length, vistas.plano.length], [0, 0]);
  });

  it("si otra persona cambió lo mismo: error claro y se traen los datos nuevos", async () => {
    const creada = await store.guardar(null, null, clase);
    servidor.asignaciones[0].version = 5; // la editó otra persona
    servidor.asignaciones[0].dia = "Jueves";
    await assert.rejects(
      store.guardar(creada.id, creada.version, { ...clase, dia: "Martes" }),
      (error) => error.status === 409 && error.datos.cambio === true,
    );
    assert.strictEqual(store.estadoActual().datos.asignaciones[0].dia, "Jueves");
  });

  it("lo que guarda otra persona llega por el canal de avisos, sin recargar", async () => {
    const vistas = pantallas();
    store.abrirCanal();
    await hasta(() => store.estadoActual().enVivo);
    // Otra sesión guarda directo en el servidor y el servidor avisa.
    servidor.asignaciones.push(fila(clase, 99));
    servidor.avisar('event: cambio\ndata: {"tipo":"asignaciones","version":2}\n\n');
    await hasta(() => vistas.plano?.some((a) => a.id === 99));
    assert.ok(vistas.grilla.some((a) => a.id === 99));
    store.cerrarCanal();
    assert.strictEqual(store.estadoActual().enVivo, false);
  });

  it("sin conexión: mensaje que dice que no se guardó", () => {
    assert.match(store.explicar({ sinConexion: true }), /no se guardó nada/);
    assert.match(store.explicar({ status: 403 }), /permiso/);
  });

  it("los conflictos se avisan antes de mandar (mismo criterio que el backend)", async () => {
    await store.guardar(null, null, clase);
    const choques = store.conflictosLocales({ ...clase, salon_id: "pb-9", inicio: "09:00", fin: "10:00", estado: "activa" });
    assert.deepStrictEqual(choques.map((c) => c.recurso), ["docente"]);
    const consecutiva = store.conflictosLocales({ ...clase, inicio: "09:20", fin: "10:40", estado: "activa" });
    assert.deepStrictEqual(consecutiva, []);
  });

  it("cambio de aula excepcional: las dos vistas ven el aula nueva y la habitual", async () => {
    const vistas = pantallas();
    const creada = await store.guardar(null, null, clase);
    const movida = await store.cambiarAula(creada.id, creada.version, "pb-9");
    assert.deepStrictEqual([movida.salon_id, movida.salon_habitual], ["pb-9", "pb-8"]);
    assert.strictEqual(vistas.plano.find((a) => a.id === creada.id).salon_id, "pb-9");
    const vuelta = await store.cambiarAula(movida.id, movida.version, "pb-8");
    assert.deepStrictEqual([vuelta.salon_id, vuelta.salon_habitual], ["pb-8", null]);
    assert.deepStrictEqual(vistas.grilla, vistas.plano);
  });

  it("copiar la semana: se traen los datos y la semana archivada no ocupa ni choca", async () => {
    await store.guardar(null, null, clase);
    const r = await store.copiarGrilla("Básico", { nombre: "Básico · semana 2", archivarOriginal: true });
    assert.strictEqual(r.clases, 1);
    assert.ok(servidor.pedidos.at(-1) === "GET /api/asignaciones", "recarga después de copiar");
    const { datos } = store.estadoActual();
    assert.strictEqual(datos.asignaciones.length, 2);
    assert.deepStrictEqual(store.vigentes(datos.asignaciones).map((a) => a.grilla_id), ["Básico-c"]);
    // Una clase nueva en la copia (vigente) sólo choca con la copia, no con la semana archivada.
    const choques = store.conflictosLocales({ ...clase, grilla_id: "Básico-c", docente_id: 2, materia_id: 2, estado: "activa" });
    assert.deepStrictEqual(choques.map((c) => c.asignacion.grilla_id), ["Básico-c"]);
  });

  it("«Guardar cambios»: altas, cambios y bajas de una vez; las dos vistas lo ven", async () => {
    const vistas = pantallas();
    const a = await store.guardar(null, null, clase);
    const b = await store.guardar(null, null, { ...clase, hora: "3°/4°", salon_id: "pb-9" });
    await store.guardarLote({
      cambios: [{ ...clase, alumnos: 22, id: a.id, version: a.version }],
      bajas: [{ id: b.id, version: b.version }],
      altas: [{ ...clase, dia: "Viernes" }],
    });
    assert.deepStrictEqual(vistas.plano.map((x) => [x.dia, x.alumnos ?? null]).sort(), [["Lunes", 22], ["Viernes", null]]);
    assert.deepStrictEqual(vistas.grilla, vistas.plano);
  });

  it("si otra persona cambió una clase, no se guarda nada y se traen los datos nuevos", async () => {
    const a = await store.guardar(null, null, clase);
    servidor.asignaciones[0].version = 7;
    await assert.rejects(
      store.guardarLote({ cambios: [{ ...clase, alumnos: 5, id: a.id, version: a.version }] }),
      (error) => error.status === 409 && error.datos.cambio,
    );
    assert.strictEqual(store.estadoActual().datos.asignaciones[0].version, 7);
  });
});

describe("Aula compartida según la organización", () => {
  it("dos clases «compartidas» no se avisan como choque de aula; el docente sí", async () => {
    store.reiniciar();
    servidor.asignaciones = [fila({ ...clase, compartida: 1 }, 1)];
    await store.cargarAsignaciones();
    const otra = { ...clase, docente_id: 2, estado: "activa", compartida: 1 };
    assert.deepStrictEqual(store.conflictosLocales(otra), []);
    assert.deepStrictEqual(store.conflictosLocales({ ...otra, compartida: 0 }).map((c) => c.recurso), ["espacio"]);
    assert.deepStrictEqual(store.conflictosLocales({ ...otra, docente_id: 1 }).map((c) => c.recurso), ["docente"]);
  });
});

describe("Agregar un profesor desde el editor («Otro…»)", () => {
  it("se guarda en el servidor, aparece en la lista y si ya existe devuelve el mismo", async () => {
    const nuevo = await store.agregar("docentes", { nombre: "Grasso E." });
    assert.ok(store.estadoActual().datos.docentes.some((d) => d.id === nuevo.id && d.nombre === "Grasso E."));
    const otraVez = await store.agregar("docentes", { nombre: "grasso e." });
    assert.strictEqual(otraVez.id, nuevo.id);
    assert.strictEqual(store.estadoActual().datos.docentes.filter((d) => d.id === nuevo.id).length, 1);
  });
});
