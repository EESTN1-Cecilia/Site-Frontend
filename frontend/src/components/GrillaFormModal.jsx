import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SelectorMultiple from "./SelectorMultiple.jsx";
import { DIAS } from "../horario.js";

/* Crear o configurar una grilla de Espacios y horarios: nombre, organización,
   período, ciclo, turno, módulos con su horario, días de actividad y qué
   grupos y materias admite (sin elegir ninguno, todos). */

/* Módulos de cada turno según la organización institucional
   («ORGANIZACION OCTUBRE.pdf»: encabezado de cada página). */
export const MODULOS_POR_TURNO = {
  manana: [
    { id: "manana-1°", nombre: "1° módulo", turno: "manana", inicio: "07:10", fin: "09:10" },
    { id: "manana-2°", nombre: "2° módulo", turno: "manana", inicio: "09:10", fin: "11:10" },
  ],
  tarde: [
    { id: "tarde-1°", nombre: "1° módulo", turno: "tarde", inicio: "13:00", fin: "15:00" },
    { id: "tarde-2°", nombre: "2° módulo", turno: "tarde", inicio: "15:10", fin: "17:10" },
  ],
};
/* Una grilla con los dos turnos (ciclo básico y superior juntos), como el PDF. */
const modulosDe = (turno) =>
  structuredClone(turno ? MODULOS_POR_TURNO[turno] ?? [] : [...MODULOS_POR_TURNO.manana, ...MODULOS_POR_TURNO.tarde]);

const nuevoId = (prefijo) => `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export default function GrillaFormModal({ grilla, datos, clases = [], alGuardar, alCerrar }) {
  const nueva = !grilla;
  const [form, setForm] = useState(() =>
    grilla
      ? structuredClone({ ...grilla, horas: grilla.horas.map((h) => ({ ...h, inicio: h.inicio ?? "", fin: h.fin ?? "" })) })
      : {
          id: nuevoId("gr"),
          nombre: "",
          organizacion: "Talleres del Ciclo Básico y Superior",
          periodo: "",
          ciclo: "ambos",
          turno: "",
          dias: [...DIAS],
          grupos: [],
          materias: [],
          horas: modulosDe(""),
        },
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    caja.current?.querySelector("input")?.focus();
  }, []);

  const cambiar = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setError("");
  };
  const cambiarModulo = (i, campo, valor) =>
    setForm((f) => ({ ...f, horas: f.horas.map((h, j) => (j === i ? { ...h, [campo]: valor } : h)) }));
  const clasesDe = (modulo) => clases.filter((c) => c.hora === modulo.id).length;

  const validar = () => {
    if (!form.nombre.trim()) return "Poné un nombre a la grilla.";
    if (!form.dias.length) return "Elegí al menos un día.";
    if (!form.horas.length) return "La grilla necesita al menos un módulo.";
    for (const h of form.horas) {
      if (!h.nombre.trim()) return "Cada módulo necesita un nombre.";
      if (!!h.inicio !== !!h.fin) return `En «${h.nombre}» poné inicio y fin, o ninguno.`;
      if (h.inicio && h.inicio >= h.fin) return `En «${h.nombre}» el fin tiene que ser después del inicio.`;
    }
    if (new Set(form.horas.map((h) => h.id)).size !== form.horas.length) return "Hay dos módulos iguales.";
    return "";
  };

  const enviar = async (e) => {
    e.preventDefault();
    const motivo = validar();
    if (motivo) return setError(motivo);
    const quitados = grilla?.horas.filter((h) => !form.horas.some((n) => n.id === h.id) && clasesDe(h)) ?? [];
    if (quitados.length && !window.confirm(`Se quitan ${quitados.map((h) => `«${h.nombre}» (${clasesDe(h)} clases)`).join(", ")}. ¿Seguir?`)) return;
    setGuardando(true);
    const limpio = {
      ...form,
      nombre: form.nombre.trim(),
      horas: form.horas.map((h) => ({ id: h.id, nombre: h.nombre.trim(), turno: h.turno || "", inicio: h.inicio || null, fin: h.fin || null })),
    };
    const r = await alGuardar(limpio);
    setGuardando(false);
    if (!r.ok) setError(r.mensaje);
  };

  const grupos = datos.grupos.map((g) => ({
    ...g,
    detalle: [g.curso, g.alumnos ? `${g.alumnos} al.` : "", datos.turnos[g.turno]].filter(Boolean).join(" · "),
  }));
  const delTurno = grupos.filter((g) => g.turno === form.turno).map((g) => g.id);

  return (
    <div className="modal modal--difuminado" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()} onKeyDown={(e) => e.key === "Escape" && alCerrar()}>
      <form className="modal__caja asignacion" role="dialog" aria-modal="true" aria-labelledby="grilla-titulo" onSubmit={enviar} ref={caja} noValidate>
        <header className="modal__barra">
          <div>
            <p className="chip">Espacios y horarios</p>
            <h2 className="modal__titulo" id="grilla-titulo">{nueva ? "Nueva grilla" : `Configurar «${grilla.nombre}»`}</h2>
          </div>
          <button type="button" className="cajon__cerrar" aria-label="Cerrar" onClick={alCerrar}>
            <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal__cuerpo">
          <div className="asignacion__seccion">
            <p className="asignacion__seccion-titulo">Datos de la grilla</p>
            <div className="formulario formulario--panel">
              <label className="campo">
                <span>Nombre *</span>
                <input required value={form.nombre} maxLength={100} placeholder="Talleres · Mañana" onChange={(e) => cambiar("nombre")(e.target.value)} />
              </label>
              <label className="campo">
                <span>Organización o planificación</span>
                <input value={form.organizacion} maxLength={150} onChange={(e) => cambiar("organizacion")(e.target.value)} />
              </label>
              <label className="campo">
                <span>Año o período</span>
                <input value={form.periodo} maxLength={60} placeholder="Octubre 2026" onChange={(e) => cambiar("periodo")(e.target.value)} />
              </label>
              <label className="campo">
                <span>Ciclo</span>
                <select value={form.ciclo} onChange={(e) => cambiar("ciclo")(e.target.value)}>
                  <option value="">Sin especificar</option>
                  {Object.entries(datos.ciclos).map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
                </select>
              </label>
              <label className="campo">
                <span>Turno</span>
                <select value={form.turno} onChange={(e) => cambiar("turno")(e.target.value)}>
                  <option value="">Mañana y tarde (cada módulo con su turno)</option>
                  {Object.entries(datos.turnos).map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="asignacion__seccion">
            <p className="asignacion__seccion-titulo">Franjas horarias (módulos)</p>
            {(!form.turno || MODULOS_POR_TURNO[form.turno]) && (
              <button type="button" className="boton boton--fino" onClick={() => cambiar("horas")(modulosDe(form.turno))}>
                <Icon icon="ph:clock-counter-clockwise" width={14} height={14} aria-hidden="true" />
                {form.turno
                  ? `Usar los módulos del turno ${datos.turnos[form.turno]?.toLowerCase()} (organización institucional)`
                  : "Usar los módulos de mañana y tarde (organización institucional)"}
              </button>
            )}
            <ul className="grilla-form__modulos">
              {form.horas.map((h, i) => (
                <li key={h.id}>
                  <label className="campo">
                    <span>Módulo</span>
                    <input value={h.nombre} maxLength={100} onChange={(e) => cambiarModulo(i, "nombre", e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Turno</span>
                    <select value={h.turno ?? ""} onChange={(e) => cambiarModulo(i, "turno", e.target.value)}>
                      <option value="">—</option>
                      {Object.entries(datos.turnos).map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Inicio</span>
                    <input type="time" step="300" value={h.inicio ?? ""} onChange={(e) => cambiarModulo(i, "inicio", e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Fin</span>
                    <input type="time" step="300" value={h.fin ?? ""} onChange={(e) => cambiarModulo(i, "fin", e.target.value)} />
                  </label>
                  <button
                    type="button"
                    className="grilla-form__quitar"
                    aria-label={`Quitar ${h.nombre}`}
                    title={clasesDe(h) ? `Tiene ${clasesDe(h)} clases: se quitan con el módulo` : "Quitar módulo"}
                    onClick={() => cambiar("horas")(form.horas.filter((_, j) => j !== i))}
                  >
                    <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="boton boton--fino"
              onClick={() =>
                cambiar("horas")([...form.horas, { id: nuevoId("h"), nombre: `${form.horas.length + 1}° módulo`, turno: form.turno || form.horas.at(-1)?.turno || "", inicio: "", fin: "" }])
              }
            >
              <Icon icon="ph:plus" width={14} height={14} aria-hidden="true" /> Agregar módulo
            </button>
          </div>

          <fieldset className="multiple">
            <legend className="multiple__etiqueta">Días de actividad</legend>
            <div className="grilla-form__dias">
              {DIAS.map((d) => (
                <label key={d} className="campo--casilla">
                  <input
                    type="checkbox"
                    checked={form.dias.includes(d)}
                    onChange={() => cambiar("dias")(form.dias.includes(d) ? form.dias.filter((x) => x !== d) : DIAS.filter((x) => x === d || form.dias.includes(x)))}
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <SelectorMultiple
            etiqueta="Cursos o grupos incluidos"
            ayuda="Sólo estos grupos se podrán elegir en las clases de esta grilla."
            opciones={grupos}
            valores={form.grupos}
            alCambiar={cambiar("grupos")}
            atajos={delTurno.length && form.turno ? [[`Los del turno ${datos.turnos[form.turno]?.toLowerCase()}`, delTurno]] : []}
          />
          <SelectorMultiple
            etiqueta="Materias y actividades disponibles"
            opciones={datos.materias.map((m) => ({ ...m, detalle: m.revisar ? "para revisar" : undefined }))}
            valores={form.materias}
            alCambiar={cambiar("materias")}
          />

          {error && (
            <p className="selector__error" role="alert">
              <Icon icon="ph:warning" width={16} height={16} aria-hidden="true" /> {error}
            </p>
          )}
        </div>

        <footer className="modal__pie">
          <button className="boton boton--primario" type="submit" disabled={guardando}>
            <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
            {guardando ? "Guardando…" : nueva ? "Crear grilla" : "Guardar cambios"}
          </button>
          <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
        </footer>
      </form>
    </div>
  );
}
