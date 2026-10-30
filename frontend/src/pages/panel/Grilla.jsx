import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import AsignacionModal from "../../components/AsignacionModal.jsx";
import GrillaFormModal from "../../components/GrillaFormModal.jsx";
import EditorCelda from "../../components/EditorCelda.jsx";
import { CambioAulaModal } from "../../components/AccionesGrillaModal.jsx";
import PlanillaGrilla from "./PlanillaGrilla.jsx";
import { exportarGrillaPdf } from "../../exportarGrilla.js";
import { ir } from "../../router.js";
import { puedeEditar } from "../../sesion.js";
import { tokenActual } from "../../conexion.js";
import { obtenerRegistro } from "../../services/api.js";
import { cambiarGrillas, useGrillas } from "../../grillas.js";
import { cambiarAula, estadoActual, explicar, guardar, guardarLote, useAsignaciones } from "../../asignaciones.js";
import { DIAS, aMinutos } from "../../horario.js";

/* Espacios y horarios: la planilla semanal de cada grilla, con la forma de
   la organización institucional (ciclo básico y superior, mañana y tarde,
   lunes a viernes, filas 1 a 17). Cada clase es una asignación
   (asignaciones.js), la misma que muestra el plano del Tablero.

   Editar: un clic en la clase la abre con la misma forma de la celda. Lo
   que se aplica queda marcado en la planilla y se guarda todo junto con
   «Guardar cambios» (o se descarta). La grilla es la misma todas las
   semanas: ausencias, cancelaciones y cambios de aula valen sólo para la
   semana en curso y se guardan al momento. */

const horario = (a) => (a.inicio ? `${a.inicio} a ${a.fin}` : a.modulo_nombre);
const sinPendientes = () => ({ cambios: new Map(), altas: [], bajas: new Map() });

/* Horario semanal de un grupo (o curso) en texto, para bajar. */
const exportarLista = (clase, asignaciones) => {
  const delGrupo = asignaciones
    .filter((a) => (clase.grupo_id ? a.grupo_id === clase.grupo_id : a.id === clase.id))
    .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || (aMinutos(a.inicio) ?? 0) - (aMinutos(b.inicio) ?? 0));
  const nombre = clase.grupo ?? clase.materia ?? "clase";
  const texto = [
    `Horario de ${nombre}${clase.curso ? ` (${clase.curso})` : ""}`,
    "",
    ...delGrupo.map(
      (a) => `${a.dia.padEnd(10)} ${horario(a).padEnd(16)} ${a.materia ?? "Sin materia"} · ${a.docente ?? "sin docente"} · ${a.salon ?? "sin espacio"}`,
    ),
    "",
    `Generado desde Espacios y horarios el ${new Date().toLocaleString("es-AR")}.`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
  const enlace = Object.assign(document.createElement("a"), {
    href: url,
    download: `horario-${nombre.replace(/[^\w.-]+/g, "-")}.txt`,
  });
  enlace.click();
  URL.revokeObjectURL(url);
};

/* Lo que se manda al servidor de una clase guardada. */
const datosDe = (a, cambios = {}) => ({
  grilla_id: a.grilla_id,
  hora: a.hora,
  dia: a.dia,
  salon_id: a.salon_id,
  docente_id: a.docente_id,
  materia_id: a.materia_id,
  grupo_id: a.grupo_id,
  inicio: a.inicio_propio,
  fin: a.fin_propio,
  alumnos: a.alumnos,
  estado: a.estado,
  observaciones: a.observaciones,
  ...cambios,
});

/* ¿El editor dejó la clase igual que como está guardada? */
const igual = (a, d) =>
  ["salon_id", "docente_id", "materia_id", "grupo_id", "alumnos", "inicio", "fin"].every((k) => (a[k] ?? null) === (d[k] ?? null));

export default function Grilla({ ruta, params, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const grillas = useGrillas();
  const { cargado, cargando, error: errorCarga, datos } = useAsignaciones();
  const [actualId, setActualId] = useState(params?.get("grilla") ?? null);
  const [activa, setActiva] = useState(params?.get("clase") ? Number(params.get("clase")) : null);
  const [ventana, setVentana] = useState(null); // { asignacion } | { inicial }
  const [editor, setEditor] = useState(null); // { id } | { nuevo: { dia, hora } }, con su ancla
  const [pendientes, setPendientes] = useState(sinPendientes);
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState(null); // "nueva" | "editar"
  const [cambioAula, setCambioAula] = useState(null); // la clase que cambia de aula esta semana
  const [aviso, setAviso] = useState(null); // { tipo, texto }
  const [registro, setRegistro] = useState(null);

  const vigentesG = grillas.filter((g) => g.vigente !== false);
  const archivadas = grillas.filter((g) => g.vigente === false);
  /* Al entrar se abre la grilla principal (permanente, guardada en el servidor). */
  const actual = grillas.find((g) => g.id === actualId) ?? grillas.find((g) => g.principal) ?? vigentesG[0] ?? grillas[0];
  const guardadas = useMemo(
    () => (actual ? datos.asignaciones.filter((a) => a.grilla_id === actual.id) : []),
    [datos.asignaciones, actual],
  );
  const cuantos = pendientes.cambios.size + pendientes.altas.length + pendientes.bajas.size;

  /* La planilla muestra lo guardado con lo pendiente encima. */
  const { clases, marcas } = useMemo(() => {
    const nombre = (lista, id) => lista.find((x) => x.id === id)?.nombre ?? null;
    const comoSeVe = (base, d) => {
      const modulo = actual.horas.find((h) => h.id === d.hora);
      return {
        ...base,
        ...d,
        inicio: d.inicio ?? modulo?.inicio ?? null,
        fin: d.fin ?? modulo?.fin ?? null,
        modulo_nombre: modulo?.nombre,
        materia: nombre(datos.materias, d.materia_id),
        docente: nombre(datos.docentes, d.docente_id),
        grupo: nombre(datos.grupos, d.grupo_id),
        salon: nombre(datos.salones, d.salon_id),
      };
    };
    const marcas = new Map();
    const lista = guardadas
      .filter((a) => !pendientes.bajas.has(a.id))
      .map((a) => {
        const d = pendientes.cambios.get(a.id);
        if (!d) return a;
        marcas.set(a.id, "cambio");
        return comoSeVe(a, d);
      });
    for (const n of pendientes.altas) {
      marcas.set(n.id, "nueva");
      lista.push(comoSeVe({ id: n.id, version: 0, estado: "activa", salon_habitual: null }, n.datos));
    }
    return { clases: lista, marcas };
  }, [guardadas, pendientes, datos, actual]);

  /* El historial del servidor: se vuelve a pedir cuando cambian las clases. */
  useEffect(() => {
    const token = tokenActual();
    if (!token) return;
    obtenerRegistro(token, 15)
      .then(({ registro: filas }) => setRegistro(filas))
      .catch(() => setRegistro((r) => r ?? []));
  }, [datos.asignaciones]);

  /* Al llegar desde el plano con ?clase=, se lleva la clase a la vista. */
  useEffect(() => {
    if (activa) document.getElementById(`clase-${activa}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado]);

  /* Con cambios sin guardar, el navegador avisa antes de salir. */
  useEffect(() => {
    if (!cuantos) return undefined;
    const avisarSalida = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisarSalida);
    return () => window.removeEventListener("beforeunload", avisarSalida);
  }, [cuantos]);

  const avisar = (tipo, texto) => setAviso({ tipo, texto });
  const cerrarEditor = useCallback((devolverFoco) => {
    setEditor((e) => {
      if (devolverFoco === true && e?.ancla) document.getElementById(e.ancla)?.focus();
      return null;
    });
  }, []);

  /* ---------- Grillas ---------- */
  const cambiarGrilla = async (cambio, exito) => {
    const r = await cambiarGrillas(cambio);
    if (r.ok) {
      if (exito) avisar("ok", exito);
    } else avisar("error", explicar(r.error));
    return r.ok;
  };
  const enActual = (cambio, exito) =>
    cambiarGrilla((previo) => previo.map((g) => (g.id === actual.id ? { ...g, ...cambio(g) } : g)), exito);

  const elegir = (id) => {
    if (cuantos && !window.confirm(`Tenés ${cuantos} cambio${cuantos === 1 ? "" : "s"} sin guardar en esta grilla. ¿Descartarlos?`)) return;
    setPendientes(sinPendientes());
    setEditor(null);
    setActualId(id);
    setActiva(null);
  };

  /* Lo que devuelve el formulario de la grilla (nueva o configurada). */
  const guardarGrilla = async (datosGrilla) => {
    const nueva = formulario === "nueva";
    const r = await cambiarGrillas((previo) =>
      nueva ? [...previo, datosGrilla] : previo.map((g) => (g.id === datosGrilla.id ? datosGrilla : g)),
    );
    if (!r.ok) return { ok: false, mensaje: explicar(r.error) };
    setFormulario(null);
    if (nueva) elegir(datosGrilla.id);
    avisar("ok", nueva ? `Grilla «${datosGrilla.nombre}» creada.` : "Grilla guardada.");
    return { ok: true };
  };

  /* PDF real con el formato de la organización institucional (lo guardado). */
  const exportar = async () => {
    if (cuantos && !window.confirm("Hay cambios sin guardar: el PDF sale con lo que está guardado. ¿Exportar igual?")) return;
    try {
      await exportarGrillaPdf({ grilla: actual, asignaciones: guardadas, turnos: datos.turnos, ciclos: datos.ciclos });
    } catch (error) {
      avisar("error", `No se pudo generar el PDF: ${error.message}`);
    }
  };

  const hacerVigente = () => enActual(() => ({ vigente: true }), `«${actual.nombre}» vuelve a ser vigente.`);

  const quitarGrilla = async () => {
    if (actual.principal) return;
    if (!window.confirm(`¿Eliminar la grilla “${actual.nombre}”${guardadas.length ? ` con sus ${guardadas.length} clases` : ""}?`)) return;
    if (await cambiarGrilla((previo) => previo.filter((g) => g.id !== actual.id), `Se eliminó la grilla ${actual.nombre}.`)) elegir(null);
  };

  /* ---------- Cambios pendientes ---------- */
  const aplicar = (d) => {
    const id = editor?.id;
    setPendientes((p) => {
      const sig = { cambios: new Map(p.cambios), altas: [...p.altas], bajas: new Map(p.bajas) };
      if (!id) sig.altas.push({ id: -Date.now(), datos: d });
      else if (id < 0) sig.altas = sig.altas.map((n) => (n.id === id ? { ...n, datos: d } : n));
      else {
        const base = guardadas.find((a) => a.id === id);
        if (igual({ ...base }, d)) sig.cambios.delete(id);
        else sig.cambios.set(id, { ...d, version: base.version });
      }
      return sig;
    });
    if (id) setActiva(id);
    cerrarEditor(true);
  };

  const quitarClase = () => {
    const id = editor?.id;
    setPendientes((p) => {
      const sig = { cambios: new Map(p.cambios), altas: p.altas.filter((n) => n.id !== id), bajas: new Map(p.bajas) };
      if (id > 0) {
        sig.cambios.delete(id);
        sig.bajas.set(id, guardadas.find((a) => a.id === id).version);
      }
      return sig;
    });
    setEditor(null);
  };

  const descartar = () => {
    if (!window.confirm(`¿Descartar ${cuantos} cambio${cuantos === 1 ? "" : "s"} sin guardar?`)) return;
    setPendientes(sinPendientes());
    setEditor(null);
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      await guardarLote({
        altas: pendientes.altas.map((n) => n.datos),
        cambios: [...pendientes.cambios.entries()].map(([id, d]) => ({ ...d, id })),
        bajas: [...pendientes.bajas.entries()].map(([id, version]) => ({ id, version })),
      });
      setPendientes(sinPendientes());
      avisar("ok", `Se guardaron ${cuantos} cambio${cuantos === 1 ? "" : "s"}. El plano ya muestra la planilla actualizada.`);
    } catch (error) {
      // Si otra persona cambió alguna clase, ese cambio pendiente ya no vale.
      if (error?.datos?.cambio) {
        const ahora = estadoActual().datos.asignaciones;
        setPendientes((p) => {
          const sig = { cambios: new Map(p.cambios), altas: p.altas, bajas: new Map(p.bajas) };
          for (const [id, d] of p.cambios) if (ahora.find((a) => a.id === id)?.version !== d.version) sig.cambios.delete(id);
          for (const [id, v] of p.bajas) if (ahora.find((a) => a.id === id)?.version !== v) sig.bajas.delete(id);
          return sig;
        });
        avisar("error", `${explicar(error)} Se quitaron de los pendientes las clases que cambió otra persona; el resto sigue sin guardar.`);
      } else {
        avisar("error", `${explicar(error)} No se guardó nada: corregilo y volvé a tocar «Guardar cambios».`);
      }
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Esta semana (se guarda al momento) ---------- */
  const cambiarEstado = async (a, estado, mensaje) => {
    try {
      const nueva = await guardar(a.id, a.version, datosDe(a, { estado }));
      avisar("ok", mensaje(nueva));
    } catch (error) {
      avisar("error", explicar(error));
    }
  };

  const alAccion = async (accion) => {
    const a = guardadas.find((x) => x.id === editor?.id);
    if (!a) return;
    setEditor(null);
    setActiva(a.id);
    if (accion === "ausente") {
      const ausente = a.estado !== "docente_ausente";
      cambiarEstado(a, ausente ? "docente_ausente" : "activa", (n) =>
        ausente
          ? `${n.docente} ausente esta semana (${n.dia} ${horario(n)}): ${n.salon} figura libre en el plano. La semana que viene vuelve sola.`
          : `${n.docente} vuelve a figurar presente (${n.dia} ${horario(n)}).`,
      );
    }
    if (accion === "cancelar") {
      const cancelar = a.estado !== "suspendida";
      if (cancelar && !window.confirm(`¿Cancelar ${a.materia ?? "la clase"} (${a.grupo ?? "sin grupo"}) del ${a.dia} ${horario(a)} esta semana? El aula queda libre en el plano.`)) return;
      cambiarEstado(a, cancelar ? "suspendida" : "activa", (n) =>
        cancelar
          ? `Clase cancelada esta semana: ${n.materia ?? "clase"} del ${n.dia} ${horario(n)}. La semana que viene vuelve sola.`
          : `Clase reactivada: ${n.materia ?? "clase"} del ${n.dia} ${horario(n)}.`,
      );
    }
    if (accion === "aula") setCambioAula(a);
    if (accion === "volver") {
      try {
        const nueva = await cambiarAula(a.id, a.version, a.salon_habitual);
        avisar("ok", `${nueva.materia ?? "La clase"} vuelve a su aula habitual (${nueva.salon}).`);
      } catch (error) {
        avisar("error", explicar(error));
      }
    }
    if (accion === "plano") ir(`/panel?espacio=${encodeURIComponent(a.salon_id)}`);
    if (accion === "mas") setVentana({ asignacion: a });
    if (accion === "horario-grupo") exportarLista(a, datos.asignaciones);
  };

  if (!actual) {
    return (
      <Layout ruta={ruta} chip="JEFATURA DE ÁREA" titulo="Espacios y horarios">
        {errorCarga ? (
          <p className="flash flash--error">{errorCarga}</p>
        ) : (
          <p className="nota-interna">{cargando ? "Cargando grillas…" : "No hay grillas."}</p>
        )}
      </Layout>
    );
  }

  const enEditor = editor?.id ? clases.find((a) => a.id === editor.id) : null;

  return (
    <Layout
      ruta={ruta}
      chip="JEFATURA DE ÁREA"
      titulo="Espacios y horarios"
      texto={
        editable
          ? "Hacé clic en una clase para editarla, o en «+ Clase» para agregar. Lo que cambies queda marcado hasta que toques «Guardar cambios». La grilla se mantiene de una semana a la otra."
          : "Grilla de aulas y talleres del ciclo básico y del superior."
      }
      acciones={
        <div className="filtros__chips">
          {vigentesG.map((g) => (
            <button key={g.id} className={`filtro ${actual.id === g.id ? "filtro--activo" : ""}`} onClick={() => elegir(g.id)}>
              {g.nombre}
            </button>
          ))}
          {archivadas.length > 0 && (
            <select
              className="filtro-select"
              aria-label="Grillas archivadas"
              value={actual.vigente === false ? actual.id : ""}
              onChange={(e) => e.target.value && elegir(e.target.value)}
            >
              <option value="">Archivadas ({archivadas.length})</option>
              {archivadas.map((g) => <option key={g.id} value={g.id}>{[g.nombre, g.periodo].filter(Boolean).join(" · ")}</option>)}
            </select>
          )}
          {editable && (
            <button className="filtro" onClick={() => setFormulario("nueva")}>
              <Icon icon="ph:plus" width={14} height={14} aria-hidden="true" /> Nueva grilla
            </button>
          )}
        </div>
      }
    >
      {aviso && (
        <p className={`flash ${aviso.tipo === "error" ? "flash--error" : aviso.tipo === "info" ? "flash--info" : ""}`} role={aviso.tipo === "error" ? "alert" : "status"}>
          <Icon icon={aviso.tipo === "error" ? "ph:warning" : "ph:check-circle"} width={18} height={18} aria-hidden="true" />
          <span>{aviso.texto}</span>
          <button className="flash__cerrar" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}
      {errorCarga && <p className="flash flash--error">{errorCarga}</p>}

      <div className="grilla__barra">
        <h2 className="tarjeta__titulo">{actual.nombre}</h2>
        <div className="acciones-fila">
          <button className="boton boton--fino" onClick={() => ir("/panel")}>
            <Icon icon="ph:map-trifold" width={15} height={15} aria-hidden="true" />
            Ver el plano
          </button>
          <button className="boton boton--fino" onClick={exportar}>
            <Icon icon="ph:file-pdf" width={15} height={15} aria-hidden="true" />
            Exportar PDF
          </button>
          {editable && (
            <button className="boton boton--fino boton--primario" onClick={guardarCambios} disabled={!cuantos || guardando}>
              <Icon icon="ph:floppy-disk" width={15} height={15} aria-hidden="true" />
              {guardando ? "Guardando…" : "Guardar cambios"}
              {cuantos > 0 && !guardando && <span className="boton__contador">{cuantos}</span>}
            </button>
          )}
          {editable && cuantos > 0 && (
            <button className="boton boton--fino" onClick={descartar} disabled={guardando}>
              <Icon icon="ph:arrow-counter-clockwise" width={15} height={15} aria-hidden="true" />
              Descartar
            </button>
          )}
          {editable && actual.vigente === false && (
            <button className="boton boton--fino" onClick={hacerVigente}>
              <Icon icon="ph:check-circle" width={15} height={15} aria-hidden="true" />
              Hacer vigente
            </button>
          )}
          {editable && (
            <button className="boton boton--fino" onClick={() => setFormulario("editar")}>
              <Icon icon="ph:sliders-horizontal" width={15} height={15} aria-hidden="true" />
              Configurar grilla
            </button>
          )}
          {editable && grillas.length > 1 && !actual.principal && (
            <button className="boton boton--fino boton--peligro" onClick={quitarGrilla}>
              <Icon icon="ph:trash" width={15} height={15} aria-hidden="true" />
              Eliminar grilla
            </button>
          )}
        </div>
      </div>

      {cuantos > 0 && (
        <p className="flash flash--info grilla__pendientes" role="status">
          <Icon icon="ph:pencil-simple-line" width={18} height={18} aria-hidden="true" />
          <span>
            {cuantos} cambio{cuantos === 1 ? "" : "s"} sin guardar (marcado{cuantos === 1 ? "" : "s"} en la planilla). Tocá «Guardar cambios» para
            que valgan, también en el plano.
          </span>
        </p>
      )}
      {actual.vigente === false && (
        <p className="flash flash--info" role="status">
          <Icon icon="ph:archive" width={18} height={18} aria-hidden="true" />
          <span>Grilla archivada: se puede consultar y exportar, pero no ocupa aulas en el plano.</span>
        </p>
      )}

      <dl className="grilla__datos">
        {[
          ["Organización", actual.organizacion],
          ["Ciclo", datos.ciclos[actual.ciclo]],
          ["Período", actual.periodo],
          [
            "Turno",
            datos.turnos[actual.turno] ??
              [...new Set(actual.horas.map((h) => h.turno).filter(Boolean))]
                .map((t, i) => (i ? (datos.turnos[t] ?? t).toLocaleLowerCase("es-AR") : datos.turnos[t] ?? t))
                .join(" y "),
          ],
          ["Días", actual.dias.length === 5 ? "Lunes a viernes" : actual.dias.join(", ")],
          ["Grupos", actual.grupos.length ? `${actual.grupos.length} elegidos` : "Todos"],
        ]
          .filter(([, v]) => v)
          .map(([t, v]) => (
            <div key={t}><dt>{t}</dt><dd>{v}</dd></div>
          ))}
      </dl>

      <PlanillaGrilla
        grilla={actual}
        clases={clases}
        turnos={datos.turnos}
        ciclos={datos.ciclos}
        editable={editable && cargado}
        activa={activa}
        pendientes={marcas}
        alAbrir={(a, ancla) => {
          setActiva(a.id);
          if (editable && cargado) setEditor({ id: a.id, ancla });
          else setVentana({ asignacion: a });
        }}
        alAgregar={(dia, hora, ancla) => setEditor({ nuevo: { grilla_id: actual.id, dia, hora }, ancla })}
      />

      {/* Desplegable (cerrado al entrar): el historial no compite con la planilla. */}
      <details className="tarjeta registro">
        <summary className="registro__resumen">
          <span>
            <span className="tarjeta__titulo">Registro de cambios</span>
            <span className="tarjeta__bajada">Altas, cambios y bajas de clases, de todas las personas, más nuevas primero.</span>
          </span>
          {registro?.length > 0 && <span className="registro__cantidad">Últimos {registro.length}</span>}
          <Icon className="registro__flecha" icon="ph:caret-down" width={18} height={18} aria-hidden="true" />
        </summary>
        {registro === null ? (
          <p className="nota-interna">Cargando…</p>
        ) : registro.length ? (
          <ul className="avisos">
            {registro.map((item) => (
              <li className="avisos__item avisos__item--ausencia" key={item.id}>
                <Icon
                  icon={{ alta: "ph:plus-circle", cambio: "ph:pencil-simple", baja: "ph:trash", intercambio: "ph:arrows-left-right" }[item.accion]}
                  width={20}
                  height={20}
                  aria-hidden="true"
                />
                <div>
                  <p className="avisos__titulo">{item.detalle}</p>
                  <p className="avisos__detalle">{item.usuario ?? "—"}</p>
                </div>
                <span className="avisos__fecha">
                  {new Date(`${item.created_at.replace(" ", "T")}Z`).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nota-interna">Todavía no hay cambios registrados.</p>
        )}
      </details>

      {editor && (
        <EditorCelda
          key={editor.id ?? `${editor.nuevo.dia}-${editor.nuevo.hora}`}
          clase={enEditor}
          inicial={editor.nuevo}
          grilla={actual}
          datos={datos}
          anclaId={editor.ancla}
          pendiente={!!editor.id && (pendientes.cambios.has(editor.id) || editor.id < 0)}
          alAplicar={aplicar}
          alQuitar={editor.id ? quitarClase : null}
          alAccion={alAccion}
          alCerrar={cerrarEditor}
        />
      )}

      {formulario && (
        <GrillaFormModal
          grilla={formulario === "editar" ? actual : null}
          datos={datos}
          clases={formulario === "editar" ? guardadas : []}
          alGuardar={guardarGrilla}
          alCerrar={() => setFormulario(null)}
        />
      )}

      {cambioAula && (
        <CambioAulaModal
          clase={cambioAula}
          alCerrar={() => setCambioAula(null)}
          alHecho={(mensaje) => {
            setCambioAula(null);
            avisar("ok", `${mensaje} Vale para esta semana.`);
          }}
        />
      )}

      {ventana && (
        <AsignacionModal
          espacioId={ventana.asignacion?.salon_id ?? null}
          asignacion={ventana.asignacion ?? null}
          inicial={ventana.inicial}
          editable={editable && cargado}
          alCerrar={() => setVentana(null)}
          alGuardar={(mensaje, guardada) => {
            setVentana(null);
            avisar("ok", mensaje);
            if (guardada) {
              setActiva(guardada.id);
              if (guardada.grilla_id !== actual.id) setActualId(guardada.grilla_id);
            } else setActiva(null);
          }}
        />
      )}
    </Layout>
  );
}
