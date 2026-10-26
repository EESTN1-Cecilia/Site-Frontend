import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cambiarAula, conflictosLocales, explicar, useAsignaciones } from "../asignaciones.js";

/* Cambio de aula excepcional de una clase (vale para esta semana): el
   backend lo resuelve en una sola operación y avisa a todos los que miran
   (el plano cambia en el momento). */

const horario = (a) => (a.inicio ? `${a.inicio} a ${a.fin}` : a.modulo_nombre || a.hora);

/* Caja común: fondo difuminado, Escape cierra y el foco queda adentro. */
function Caja({ titulo, chip, id, alCerrar, alEnviar, pie, children }) {
  const caja = useRef(null);
  useEffect(() => {
    const anterior = document.activeElement;
    caja.current?.querySelector("input, button:not(.cajon__cerrar)")?.focus();
    return () => anterior?.focus?.();
  }, []);

  const alTeclear = (e) => {
    if (e.key === "Escape") alCerrar();
    if (e.key !== "Tab") return;
    const enfocables = [...caja.current.querySelectorAll("button:not([disabled]), input:not([disabled]), select")];
    const [primero, ultimo] = [enfocables[0], enfocables[enfocables.length - 1]];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return (
    <div className="modal modal--difuminado" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()} onKeyDown={alTeclear}>
      <form className="modal__caja asignacion" role="dialog" aria-modal="true" aria-labelledby={id} onSubmit={alEnviar} ref={caja} noValidate>
        <header className="modal__barra">
          <div>
            <p className="chip">{chip}</p>
            <h2 className="modal__titulo" id={id}>{titulo}</h2>
          </div>
          <button type="button" className="cajon__cerrar" aria-label="Cerrar" onClick={alCerrar}>
            <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__cuerpo">{children}</div>
        <footer className="modal__pie">{pie}</footer>
      </form>
    </div>
  );
}

/* ---------- Cambio de aula excepcional ---------- */
export function CambioAulaModal({ clase, alCerrar, alHecho }) {
  const { datos } = useAsignaciones();
  const [buscar, setBuscar] = useState("");
  const [elegida, setElegida] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  /* Las aulas, con lo que ocupa cada una en ese momento (según lo cargado:
     el servidor lo vuelve a revisar al guardar). */
  const aulas = useMemo(
    () =>
      datos.salones
        .filter((s) => s.clasificacion === "AULA" && s.tipo !== "institucional" && s.id !== clase.salon_id)
        .map((s) => {
          const choque = conflictosLocales({ ...clase, estado: "activa", salon_id: s.id }, [clase.id]).find((c) => c.recurso === "espacio");
          const motivo = !s.habilitado
            ? "Deshabilitada"
            : choque
              ? `Ocupada: ${choque.asignacion.materia ?? "otra clase"} · ${choque.asignacion.grupo ?? "sin grupo"}`
              : s.capacidad && clase.alumnos > s.capacidad
                ? `Capacidad ${s.capacidad}: no entran ${clase.alumnos} alumnos`
                : "";
          return { ...s, motivo, habitual: s.id === clase.salon_habitual };
        })
        .sort((a, b) => !!a.motivo - !!b.motivo || b.habitual - a.habitual || a.nombre.localeCompare(b.nombre, "es", { numeric: true })),
    [datos.salones, clase],
  );
  const filtradas = aulas.filter((s) => !buscar || s.nombre.toLocaleLowerCase("es").includes(buscar.toLocaleLowerCase("es")));
  const libres = aulas.filter((s) => !s.motivo).length;

  const enviar = async (e) => {
    e.preventDefault();
    if (!elegida) return setError("Elegí el aula a la que pasa la clase.");
    setGuardando(true);
    setError("");
    try {
      const nueva = await cambiarAula(clase.id, clase.version, elegida);
      alHecho(
        nueva.salon_habitual
          ? `Cambio de aula: ${nueva.materia ?? "la clase"} (${nueva.grupo ?? "sin grupo"}) pasa a ${nueva.salon} el ${nueva.dia} ${horario(nueva)}. Su aula habitual es ${nueva.salon_habitual_nombre}.`
          : `${nueva.materia ?? "La clase"} vuelve a su aula habitual (${nueva.salon}).`,
      );
    } catch (err) {
      setError(explicar(err));
      setGuardando(false);
    }
  };

  return (
    <Caja
      id="cambio-aula-titulo"
      chip="Cambio de aula excepcional"
      titulo={`${clase.materia ?? "Clase"} · ${clase.grupo ?? "sin grupo"}`}
      alCerrar={alCerrar}
      alEnviar={enviar}
      pie={
        <>
          <button className="boton boton--primario" type="submit" disabled={guardando || !elegida}>
            <Icon icon="ph:arrows-left-right" width={16} height={16} aria-hidden="true" />
            {guardando ? "Guardando…" : "Cambiar de aula"}
          </button>
          <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
        </>
      }
    >
      <p className="tarjeta__bajada">
        {clase.dia} · {horario(clase)} · {clase.docente ?? "sin docente"}. Ahora en <strong>{clase.salon ?? "ningún espacio"}</strong>
        {clase.salon_habitual ? ` (aula habitual: ${clase.salon_habitual_nombre})` : ""}. El cambio vale para esta clase y se
        puede deshacer con «Volver a su aula»; la semana que viene la clase vuelve sola a su aula habitual.
      </p>
      <label className="campo">
        <span>Buscar aula</span>
        <input type="search" value={buscar} placeholder="Aula 9, Taller grande…" onChange={(e) => setBuscar(e.target.value)} />
      </label>
      <p className="cambio-aula__resumen" role="status">{libres} aula{libres === 1 ? "" : "s"} libre{libres === 1 ? "" : "s"} en ese horario</p>
      <ul className="cambio-aula__lista" aria-label="Aulas">
        {filtradas.map((s) => (
          <li key={s.id}>
            <label className={`cambio-aula__opcion ${s.motivo ? "cambio-aula__opcion--ocupada" : ""} ${elegida === s.id ? "cambio-aula__opcion--elegida" : ""}`}>
              <input type="radio" name="aula" value={s.id} disabled={!!s.motivo} checked={elegida === s.id} onChange={() => setElegida(s.id)} />
              <span className="cambio-aula__nombre">
                {s.nombre}
                {s.habitual && <span className="cambio-aula__habitual">aula habitual</span>}
              </span>
              <span className="cambio-aula__estado">
                {s.motivo || `Libre${s.capacidad ? ` · ${s.capacidad} lugares` : ""}`} · {datos.pisos[s.piso] ?? s.piso}
              </span>
            </label>
          </li>
        ))}
        {!filtradas.length && <li className="nota-interna">Ningún aula coincide con «{buscar}».</li>}
      </ul>
      {error && <p className="selector__error" role="alert">{error}</p>}
    </Caja>
  );
}
