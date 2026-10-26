import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { agregar, conflictosLocales, explicar } from "../asignaciones.js";
import { colorDeGrupo, espacioDe, nombreModulo } from "../exportarGrilla.js";

/* Editor de una clase con la misma forma que la celda del PDF institucional:

     ┌──────────────┬──────────────────────────┐
     │ inicio · fin │         Materia          │
     │ Grupo        ├────────────┬─────────────┤
     │ Alumnos      │    Aula    │   Docente   │
     └──────────────┴────────────┴─────────────┘

   «Aplicar» no guarda: deja el cambio pendiente en la planilla hasta
   «Guardar cambios» (todo junto, en el servidor). Las excepciones de la
   semana (docente ausente, cancelar, cambio de aula) sí se guardan al
   momento, y sólo en clases sin cambios pendientes.

   En la lista de docentes, «Otro…» agrega un profesor nuevo al catálogo
   (se guarda en el backend al momento) y lo deja elegido. */

const OTRO = "__otro";

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true });
const aTexto = (v) => (v === null || v === undefined ? "" : String(v));

export default function EditorCelda({ clase, inicial, grilla, datos, anclaId, pendiente, alAplicar, alQuitar, alAccion, alCerrar }) {
  const nueva = !clase;
  const modulo = grilla.horas.find((h) => h.id === (clase?.hora ?? inicial.hora));
  const dia = clase?.dia ?? inicial.dia;
  const [form, setForm] = useState(() => ({
    inicio: clase?.inicio ?? modulo?.inicio ?? "",
    fin: clase?.fin ?? modulo?.fin ?? "",
    grupo_id: aTexto(clase?.grupo_id),
    alumnos: aTexto(clase?.alumnos ?? ""),
    materia_id: aTexto(clase?.materia_id),
    salon_id: aTexto(clase?.salon_id),
    docente_id: aTexto(clase?.docente_id),
  }));
  const [error, setError] = useState("");
  const [nuevoDocente, setNuevoDocente] = useState(null); // texto mientras se agrega uno, o null
  const [agregando, setAgregando] = useState(false);
  const [lugar, setLugar] = useState(null);
  const caja = useRef(null);

  const grupos = useMemo(
    () => datos.grupos.filter((g) => !grilla.grupos?.length || grilla.grupos.includes(g.id)).sort(porNombre),
    [datos.grupos, grilla.grupos],
  );
  const materias = useMemo(
    () => datos.materias.filter((m) => !grilla.materias?.length || grilla.materias.includes(m.id)).sort(porNombre),
    [datos.materias, grilla.materias],
  );
  const docentes = useMemo(() => [...datos.docentes].sort(porNombre), [datos.docentes]);
  const aulas = useMemo(
    () =>
      datos.salones
        .filter((s) => s.clasificacion === "AULA" && s.tipo !== "institucional" && (s.habilitado || s.id === clase?.salon_id))
        .sort(porNombre),
    [datos.salones, clase?.salon_id],
  );
  const pdf = clase && !clase.salon_id ? espacioDe(clase) : "";
  const grupo = grupos.find((g) => String(g.id) === form.grupo_id);

  /* Junto a la celda (fijo en la ventana, la sigue si se desplaza la
     página o la tabla); en pantallas chicas, abajo. */
  useLayoutEffect(() => {
    const ubicar = () => {
      const ancla = document.getElementById(anclaId)?.getBoundingClientRect();
      const propia = caja.current?.getBoundingClientRect();
      if (!ancla || !propia || window.innerWidth < 640) return setLugar({});
      const abajo = ancla.bottom + 6 + propia.height <= window.innerHeight;
      return setLugar({
        top: abajo ? ancla.bottom + 6 : Math.max(8, ancla.top - propia.height - 6),
        left: Math.max(8, Math.min(ancla.left, window.innerWidth - propia.width - 8)),
      });
    };
    ubicar();
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    return () => {
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
    };
  }, [anclaId]);

  useEffect(() => {
    caja.current?.querySelector("input, select")?.focus();
    const fuera = (e) => !caja.current?.contains(e.target) && !document.getElementById(anclaId)?.contains(e.target) && alCerrar();
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [alCerrar, anclaId]);

  const cambiar = (campo) => (e) => {
    const valor = e.target.value;
    if (campo === "docente_id" && valor === OTRO) {
      setNuevoDocente("");
      return;
    }
    setError("");
    setForm((f) => {
      const nuevo = { ...f, [campo]: valor };
      // Al elegir el grupo, sus alumnos (si no se escribieron otros).
      if (campo === "grupo_id") {
        const antes = datos.grupos.find((g) => String(g.id) === f.grupo_id);
        const ahora = datos.grupos.find((g) => String(g.id) === valor);
        if (ahora?.alumnos && (!f.alumnos || Number(f.alumnos) === antes?.alumnos)) nuevo.alumnos = String(ahora.alumnos);
      }
      return nuevo;
    });
  };

  /* Guarda el profesor en el catálogo del backend (si ya existía con ese
     nombre, devuelve el mismo) y lo deja elegido en la clase. */
  const agregarDocente = async () => {
    const nombre = (nuevoDocente ?? "").trim().replace(/\s+/g, " ");
    if (nombre.length < 2) return setError("Escribí el nombre del profesor.");
    setAgregando(true);
    try {
      const docente = await agregar("docentes", { nombre });
      setForm((f) => ({ ...f, docente_id: String(docente.id) }));
      setNuevoDocente(null);
      setError("");
    } catch (e) {
      setError(explicar(e));
    } finally {
      setAgregando(false);
    }
  };

  const datosNuevos = () => ({
    grilla_id: grilla.id,
    hora: modulo.id,
    dia,
    inicio: form.inicio || null,
    fin: form.fin || null,
    grupo_id: form.grupo_id ? Number(form.grupo_id) : null,
    alumnos: form.alumnos === "" ? 0 : Number(form.alumnos),
    materia_id: form.materia_id ? Number(form.materia_id) : null,
    salon_id: form.salon_id || null,
    docente_id: form.docente_id ? Number(form.docente_id) : null,
    estado: clase?.estado ?? "activa",
    observaciones: clase?.observaciones ?? "",
  });

  const avisos = useMemo(() => {
    const d = datosNuevos();
    if (!d.inicio || !d.fin) return [];
    return conflictosLocales({ ...d, compartida: clase?.compartida }, clase ? [clase.id] : []).map((c) => c.mensaje);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const aplicar = (e) => {
    e.preventDefault();
    const d = datosNuevos();
    if (!d.materia_id) return setError("Elegí la materia.");
    if (!d.docente_id) return setError("Elegí el docente.");
    if (!d.inicio !== !d.fin) return setError("Poné el horario de inicio y de fin.");
    if (d.inicio && d.inicio >= d.fin) return setError("El fin tiene que ser después del inicio.");
    if (!Number.isInteger(d.alumnos) || d.alumnos < 0) return setError("Alumnos tiene que ser un número.");
    alAplicar(d);
  };

  const alTeclear = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      alCerrar(true);
    }
  };

  const bloqueadas = pendiente ? "Guardá o descartá los cambios de esta clase primero" : "";
  const completa = clase?.docente_id && clase?.materia_id && clase?.salon_id;
  const acciones = clase && !nueva && clase.id > 0
    ? [
        clase.estado !== "suspendida" && {
          id: "ausente",
          texto: clase.estado === "docente_ausente" ? "Docente presente" : "Docente ausente esta semana",
          icono: clase.estado === "docente_ausente" ? "ph:user-check" : "ph:user-minus",
          motivo: bloqueadas || (!completa && clase.estado === "activa" ? "Completá docente, materia y aula primero" : ""),
        },
        {
          id: "cancelar",
          texto: clase.estado === "suspendida" ? "Reactivar la clase" : "Cancelar esta semana",
          icono: clase.estado === "suspendida" ? "ph:arrow-counter-clockwise" : "ph:prohibit",
          motivo: bloqueadas,
          peligro: clase.estado !== "suspendida",
        },
        { id: "aula", texto: "Cambio de aula esta semana", icono: "ph:arrows-left-right", motivo: bloqueadas },
        clase.salon_habitual && { id: "volver", texto: `Volver a ${clase.salon_habitual_nombre}`, icono: "ph:arrow-u-up-left", motivo: bloqueadas },
        clase.salon_id && { id: "plano", texto: "Ver en el plano", icono: "ph:map-pin" },
        { id: "mas", texto: "Día, módulo y notas", icono: "ph:dots-three-outline", motivo: bloqueadas },
        clase.grupo_id && { id: "horario-grupo", texto: "Horario del grupo", icono: "ph:download-simple" },
      ].filter(Boolean)
    : [];

  return (
    <div
      className={`editor-celda ${lugar && !("top" in lugar) ? "editor-celda--abajo" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-label={nueva ? `Nueva clase, ${dia} ${nombreModulo(modulo)}` : `Editar ${clase.materia ?? "clase"}, ${dia}`}
      ref={caja}
      style={lugar ?? { visibility: "hidden" }}
      onKeyDown={alTeclear}
    >
      <form onSubmit={aplicar} noValidate>
        <p className="editor-celda__cabeza">
          <strong>{nueva ? "Nueva clase" : "Editar clase"}</strong> · {dia} · {nombreModulo(modulo)}
          <button type="button" className="editor-celda__cerrar" aria-label="Cerrar" onClick={() => alCerrar(true)}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>

        <div className="editor-celda__celda">
          <div className="editor-celda__izq">
            <span className="editor-celda__hora">
              <input type="time" step="300" aria-label="Hora de inicio" value={form.inicio} onChange={cambiar("inicio")} />
              <span aria-hidden="true">a</span>
              <input type="time" step="300" aria-label="Hora de fin" value={form.fin} onChange={cambiar("fin")} />
            </span>
            <span className={`editor-celda__grupo planilla__grupo-caja--${colorDeGrupo(grupo?.nombre)}`}>
              <select aria-label="Grupo" value={form.grupo_id} onChange={cambiar("grupo_id")}>
                <option value="">Sin grupo</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              <label className="editor-celda__alumnos">
                (<input type="number" min="0" max="1000" aria-label="Alumnos" value={form.alumnos} onChange={cambiar("alumnos")} /> Alumnos)
              </label>
            </span>
          </div>
          <select className="editor-celda__materia" aria-label="Materia" value={form.materia_id} onChange={cambiar("materia_id")}>
            <option value="">Elegí la materia…</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre.toLocaleUpperCase("es-AR")}</option>)}
          </select>
          <select className="editor-celda__espacio" aria-label="Aula" value={form.salon_id} onChange={cambiar("salon_id")}>
            <option value="">{pdf ? `${pdf.toLocaleUpperCase("es-AR")} (sin aula del plano)` : "Sin aula"}</option>
            {aulas.map((s) => <option key={s.id} value={s.id}>{s.nombre.toLocaleUpperCase("es-AR")}</option>)}
          </select>
          <select className="editor-celda__docente" aria-label="Docente" value={form.docente_id} onChange={cambiar("docente_id")}>
            <option value="">Elegí el docente…</option>
            {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre.toLocaleUpperCase("es-AR")}</option>)}
            <option value={OTRO}>Otro… (agregar un profesor)</option>
          </select>
        </div>

        {nuevoDocente !== null && (
          <div className="editor-celda__nuevo" role="group" aria-label="Agregar un profesor">
            <label className="campo">
              <span>Nuevo profesor</span>
              <input
                autoFocus
                maxLength={120}
                value={nuevoDocente}
                placeholder="Apellido (e inicial si hace falta), p. ej. «Grasso E.»"
                onChange={(e) => setNuevoDocente(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarDocente();
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setNuevoDocente(null);
                  }
                }}
              />
            </label>
            <button type="button" className="boton boton--fino boton--primario" disabled={agregando || nuevoDocente.trim().length < 2} onClick={agregarDocente}>
              <Icon icon="ph:user-plus" width={14} height={14} aria-hidden="true" /> {agregando ? "Agregando…" : "Agregar"}
            </button>
            <button type="button" className="boton boton--fino" onClick={() => setNuevoDocente(null)}>Cancelar</button>
          </div>
        )}

        {avisos.length > 0 && (
          <ul className="editor-celda__avisos" role="status">
            {avisos.map((m) => (
              <li key={m}><Icon icon="ph:warning" width={13} height={13} aria-hidden="true" /> {m}</li>
            ))}
          </ul>
        )}
        {error && <p className="selector__error" role="alert">{error}</p>}

        <div className="editor-celda__botones">
          {(clase || nueva) && alQuitar && (
            <button type="button" className="boton boton--fino boton--peligro" onClick={alQuitar}>
              <Icon icon="ph:trash" width={14} height={14} aria-hidden="true" />
              {nueva || clase.id < 0 ? "Descartar clase" : "Quitar clase"}
            </button>
          )}
          <span className="editor-celda__espacio-libre" />
          <button type="button" className="boton boton--fino" onClick={() => alCerrar(true)}>Cancelar</button>
          <button type="submit" className="boton boton--fino boton--primario">
            <Icon icon="ph:check" width={14} height={14} aria-hidden="true" /> Aplicar
          </button>
        </div>
      </form>

      {acciones.length > 0 && (
        <div className="editor-celda__acciones" aria-label="Esta semana y más">
          {acciones.map((x) => (
            <button
              key={x.id}
              type="button"
              className={`editor-celda__accion ${x.peligro ? "editor-celda__accion--peligro" : ""}`}
              disabled={!!x.motivo}
              title={x.motivo || undefined}
              onClick={() => alAccion(x.id)}
            >
              <Icon icon={x.icono} width={13} height={13} aria-hidden="true" /> {x.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
