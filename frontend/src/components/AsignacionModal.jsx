import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SelectorBuscable from "./SelectorBuscable.jsx";
import { usePlano } from "../plano.js";
import {
  agregar,
  conflictosLocales,
  explicar,
  guardar,
  guardarEspacio,
  quitar,
  useAsignaciones,
  verificar,
  vigentes,
} from "../asignaciones.js";
import { moduloConTurno } from "../exportarGrilla.js";
import { DIAS, ESTADOS, aMinutos, diaDe, estadoEnMomento, estadoEspacio, useReloj } from "../horario.js";

/* Ventana de un espacio (aula, taller, laboratorio…) y de una clase.

   La abren el plano (clic en un espacio) y Espacios y horarios (clic en una
   clase o en un casillero vacío): es el mismo formulario y guarda en el mismo
   lugar, así lo que se carga en uno aparece en el otro.

   Se cierra con la X, Escape o un clic afuera; si hay cambios sin guardar,
   antes pregunta. El foco queda adentro mientras está abierta. */

const aTexto = (valor) => (valor === null || valor === undefined ? "" : String(valor));
const horario = (a) => (a.inicio ? `${a.inicio} a ${a.fin}` : a.modulo_nombre || a.hora);

export default function AsignacionModal({
  espacioId = null,
  asignacion = null,
  inicial = {},
  editable,
  vistaInicial = "formulario",
  alCerrar,
  alGuardar,
  irAGrilla,
}) {
  const { datos, enVivo } = useAsignaciones();
  const pisos = usePlano();
  const fecha = useReloj();
  const espacios = useMemo(() => pisos.flatMap((p) => p.salones.map((s) => ({ ...s, pisoNombre: p.nombre }))), [pisos]);
  const grillas = datos.grillas;

  const modulosDe = (grillaId) => grillas.find((g) => g.id === grillaId)?.horas ?? [];

  const formularioInicial = useMemo(() => {
    if (asignacion) {
      return {
        grilla_id: asignacion.grilla_id,
        hora: asignacion.hora,
        dia: asignacion.dia,
        salon_id: aTexto(asignacion.salon_id),
        docente_id: aTexto(asignacion.docente_id),
        materia_id: aTexto(asignacion.materia_id),
        grupo_id: aTexto(asignacion.grupo_id),
        inicio: aTexto(asignacion.inicio),
        fin: aTexto(asignacion.fin),
        alumnos: aTexto(asignacion.alumnos ?? 0),
        estado: asignacion.estado ?? "activa",
        observaciones: asignacion.observaciones ?? "",
      };
    }
    const grillaId = inicial.grilla_id ?? grillas[0]?.id ?? "";
    const modulo = modulosDe(grillaId).find((h) => h.id === inicial.hora) ?? modulosDe(grillaId)[0];
    return {
      grilla_id: grillaId,
      hora: modulo?.id ?? "",
      dia: inicial.dia ?? diaDe(new Date()) ?? DIAS[0],
      salon_id: aTexto(espacioId),
      docente_id: "",
      materia_id: "",
      grupo_id: "",
      inicio: aTexto(modulo?.inicio),
      fin: aTexto(modulo?.fin),
      alumnos: "0",
      estado: "activa",
      observaciones: "",
    };
    // Se arma una sola vez, al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(formularioInicial);
  const [vista, setVista] = useState(vistaInicial);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState("");
  const [servidor, setServidor] = useState(null); // { conflictos, alternativas } del último intento o verificación
  const [enviando, setEnviando] = useState(false);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [pidiendoSalir, setPidiendoSalir] = useState(false);
  const caja = useRef(null);

  const espacio = espacios.find((s) => s.id === form.salon_id) ?? null;
  const modulo = modulosDe(form.grilla_id).find((h) => h.id === form.hora) ?? null;
  const sucio = JSON.stringify(form) !== JSON.stringify(formularioInicial);
  const deEspacio = vigentes(datos.asignaciones).filter((a) => espacio && a.salon_id === espacio.id);
  const ahora = espacio ? estadoEspacio(deEspacio, fecha) : null;

  /* Lo que se manda: la hora vacía vale la del módulo. */
  const pedido = {
    grilla_id: form.grilla_id,
    hora: form.hora,
    dia: form.dia,
    salon_id: form.salon_id,
    docente_id: form.docente_id ? Number(form.docente_id) : null,
    materia_id: form.materia_id ? Number(form.materia_id) : null,
    grupo_id: form.grupo_id ? Number(form.grupo_id) : null,
    inicio: form.inicio || null,
    fin: form.fin || null,
    alumnos: form.alumnos === "" ? 0 : Number(form.alumnos),
    estado: form.estado,
    observaciones: form.observaciones.trim(),
  };
  const efectivo = { ...pedido, inicio: pedido.inicio || modulo?.inicio, fin: pedido.fin || modulo?.fin };

  /* ---------- Validación ---------- */
  const validar = () => {
    const e = {};
    if (!form.docente_id) e.docente_id = "Elegí un docente.";
    if (!form.materia_id) e.materia_id = "Elegí una materia o actividad.";
    if (!form.salon_id) e.salon_id = "Elegí un espacio.";
    else if (espacio?.institucional) {
      e.salon_id = `La ${espacio.nombre} es un espacio institucional reservado y no puede asignarse a actividades académicas.`;
    } else if (espacio?.comun) e.salon_id = `${espacio.nombre} es un espacio común: no admite clases. Elegí un aula.`;
    else if (espacio && !espacio.habilitado) e.salon_id = `${espacio.nombre} está deshabilitado.`;
    if (!form.grilla_id || !form.hora) e.hora = "Elegí un módulo.";
    if (!DIAS.includes(form.dia)) e.dia = "Elegí un día.";
    if (!!form.inicio !== !!form.fin) e.fin = "Poné inicio y fin, o ninguno (vale el del módulo).";
    else if (form.inicio && aMinutos(form.inicio) >= aMinutos(form.fin)) e.fin = "El fin tiene que ser después del inicio.";
    const alumnos = Number(form.alumnos || 0);
    if (!Number.isInteger(alumnos) || alumnos < 0 || alumnos > 1000) e.alumnos = "Entre 0 y 1000.";
    else if (espacio?.capacidad && alumnos > espacio.capacidad) e.alumnos = `${espacio.nombre} tiene capacidad para ${espacio.capacidad}.`;
    if (form.observaciones.length > 500) e.observaciones = "Hasta 500 caracteres.";
    return e;
  };

  const completo = form.docente_id && form.materia_id && form.salon_id && form.hora && form.dia;
  const locales = completo ? conflictosLocales(efectivo, asignacion ? [asignacion.id] : []) : [];
  const conflictos = servidor?.conflictos ?? locales;

  /* El servidor confirma los conflictos (y propone espacios libres) mientras
   se completa el formulario. */
  const clave = JSON.stringify(pedido);
  useEffect(() => {
    setServidor(null);
    if (!editable || !completo || !form.grilla_id) return undefined;
    const espera = setTimeout(() => {
      verificar({ ...pedido, id: asignacion?.id })
        .then(setServidor)
        .catch(() => {
          /* inválido o sin conexión: lo dice el guardado */
        });
    }, 400);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, editable]);

  const cambiar = (campo) => (valor) => {
    setForm((f) => {
      const nuevo = { ...f, [campo]: valor };
      if (campo === "grupo_id" && (!f.alumnos || f.alumnos === "0")) {
        const grupo = datos.grupos.find((g) => String(g.id) === String(valor));
        if (grupo?.alumnos) nuevo.alumnos = String(grupo.alumnos);
      }
      // Al cambiar de grilla o módulo, la hora sigue al módulo si no se tocó a mano.
      if (campo === "grilla_id" || campo === "hora") {
        const anterior = modulosDe(f.grilla_id).find((h) => h.id === f.hora);
        const seguia = (f.inicio || "") === (anterior?.inicio || "") && (f.fin || "") === (anterior?.fin || "");
        if (campo === "grilla_id") nuevo.hora = modulosDe(valor).find((h) => h.id === f.hora)?.id ?? modulosDe(valor)[0]?.id ?? "";
        const nuevoModulo = modulosDe(nuevo.grilla_id).find((h) => h.id === nuevo.hora);
        if (seguia) {
          nuevo.inicio = aTexto(nuevoModulo?.inicio);
          nuevo.fin = aTexto(nuevoModulo?.fin);
        }
      }
      return nuevo;
    });
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setAviso("");
    setConfirmarQuitar(false);
  };

  /* ---------- Cerrar ---------- */
  const intentarCerrar = () => {
    if (sucio && editable && !enviando) setPidiendoSalir(true);
    else alCerrar();
  };

  useEffect(() => {
    const anterior = document.activeElement;
    caja.current?.querySelector("input, select, textarea, button:not(.cajon__cerrar)")?.focus();
    return () => anterior?.focus?.();
  }, []);

  /* Escape cierra; Tab no se escapa de la ventana. */
  const alTeclear = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      intentarCerrar();
    }
    if (e.key === "Tab") {
      const enfocables = [...caja.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
      )];
      if (!enfocables.length) return;
      const [primero, ultimo] = [enfocables[0], enfocables[enfocables.length - 1]];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  };

  /* ---------- Guardar y quitar ---------- */
  const enviar = async (e) => {
    e.preventDefault();
    const e2 = validar();
    setErrores(e2);
    if (Object.keys(e2).length) {
      setAviso("Revisá los campos marcados.");
      return;
    }
    if (conflictos.length) {
      setAviso("Hay conflictos: no se puede guardar así.");
      return;
    }
    setEnviando(true);
    setAviso("");
    try {
      const guardada = await guardar(asignacion?.id ?? null, asignacion?.version, pedido);
      alGuardar?.(
        `${asignacion ? "Guardado" : "Asignado"}: ${guardada.materia} · ${guardada.grupo ?? "sin grupo"} en ${guardada.salon}, ${guardada.dia} ${horario(guardada)}.`,
        guardada,
      );
    } catch (error) {
      setEnviando(false);
      if (error?.status === 409 && error.datos?.conflictos) {
        setServidor({ conflictos: error.datos.conflictos, alternativas: error.datos.alternativas ?? [] });
      }
      setAviso(explicar(error));
    }
  };

  const quitarActual = async () => {
    if (!confirmarQuitar) return setConfirmarQuitar(true);
    setEnviando(true);
    try {
      await quitar(asignacion.id, asignacion.version);
      alGuardar?.(`Se quitó ${asignacion.materia ?? "la clase"} de ${asignacion.salon ?? "la grilla"} (${asignacion.dia} ${horario(asignacion)}).`);
    } catch (error) {
      setEnviando(false);
      setConfirmarQuitar(false);
      setAviso(explicar(error));
    }
  };

  /* ---------- Catálogos ---------- */
  const opcionesEspacio = espacios
    // Sólo aulas habilitadas: PAÑOL, E.O.E. y los demás espacios comunes no admiten clases.
    .filter((s) => (s.habilitado && !s.comun) || s.id === form.salon_id)
    .map((s) => ({ id: s.id, nombre: s.nombre, detalle: `${s.pisoNombre} · ${datos.tipos[s.tipo] ?? s.tipo}` }));
  const grillaElegida = grillas.find((g) => g.id === form.grilla_id);
  const admite = (lista, id) => !lista?.length || lista.includes(Number(id));
  const opcionesGrupo = datos.grupos
    .filter((g) => admite(grillaElegida?.grupos, g.id) || String(g.id) === form.grupo_id)
    .map((g) => ({ ...g, detalle: [g.curso, g.alumnos ? `${g.alumnos} al.` : ""].filter(Boolean).join(" · ") || undefined }));
  const opcionesMateria = datos.materias.filter((m) => admite(grillaElegida?.materias, m.id) || String(m.id) === form.materia_id);
  const diasGrilla = grillaElegida?.dias ?? DIAS;
  const sumar = (tipo) => async (nombre) => {
    try {
      return await agregar(tipo, { nombre });
    } catch (error) {
      setAviso(explicar(error));
      return null;
    }
  };

  const titulo = espacio?.nombre ?? (asignacion ? "Clase" : "Nueva clase");
  const delDia = deEspacio
    .filter((a) => a.dia === form.dia)
    .sort((a, b) => (aMinutos(a.inicio) ?? 9999) - (aMinutos(b.inicio) ?? 9999));

  return (
    <div
      className="modal modal--difuminado"
      onMouseDown={(e) => e.target === e.currentTarget && intentarCerrar()}
      onKeyDown={alTeclear}
    >
      <form
        className="modal__caja asignacion"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asignacion-titulo"
        aria-describedby="asignacion-estado"
        onSubmit={enviar}
        ref={caja}
        noValidate
      >
        <header className="modal__barra asignacion__barra">
          <div className="asignacion__cabeza">
            <p className="chip">{espacio ? espacio.pisoNombre : "Espacios y horarios"}</p>
            <h2 className="modal__titulo" id="asignacion-titulo">{titulo}</h2>
            <p className="asignacion__sub" id="asignacion-estado">
              {ahora ? (
                <span className={`estado-chip estado-chip--${ahora.estado}`}>
                  <Icon icon={ESTADOS[ahora.estado].icono} width={14} height={14} aria-hidden="true" />
                  {ESTADOS[ahora.estado].texto} ahora
                </span>
              ) : (
                <span className="estado-chip">Elegí un espacio</span>
              )}
              {espacio && !espacio.habilitado && <span className="estado-chip estado-chip--deshabilitado">Deshabilitado</span>}
              <span className={`vivo ${enVivo ? "vivo--si" : ""}`}>{enVivo ? "En vivo" : "Sin avisos en vivo"}</span>
            </p>
          </div>
          <button type="button" className="cajon__cerrar" aria-label="Cerrar" onClick={intentarCerrar}>
            <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal__cuerpo asignacion__cuerpo">
          {espacio && (
            <section className="asignacion__info" aria-label="Datos del espacio">
              <dl className="asignacion__datos">
                <div><dt>Tipo</dt><dd>{datos.tipos[espacio.tipo] ?? espacio.tipo}</dd></div>
                <div><dt>Planta</dt><dd>{espacio.pisoNombre}</dd></div>
                <div><dt>Capacidad</dt><dd>{espacio.capacidad ? `${espacio.capacidad} personas` : "Sin cargar"}</dd></div>
                <div>
                  <dt>Ocupación ahora</dt>
                  <dd>
                    {ahora.actual
                      ? `${ESTADOS[ahora.estado].texto} hasta las ${ahora.actual.fin}`
                      : ahora.estado === "sin-horario"
                        ? "Hay clases hoy sin hora cargada"
                        : "Libre"}
                  </dd>
                </div>
                {/* La clase que se está editando o, si no, la que está en curso. */}
                {(asignacion ?? ahora.actual) && (
                  <>
                    <div><dt>Docente</dt><dd>{(asignacion ?? ahora.actual).docente ?? "Sin asignar"}</dd></div>
                    <div><dt>Materia o actividad</dt><dd>{(asignacion ?? ahora.actual).materia ?? "Sin asignar"}</dd></div>
                    <div><dt>Grupo</dt><dd>{(asignacion ?? ahora.actual).grupo ?? "Sin grupo"}</dd></div>
                    <div>
                      <dt>Día y horario</dt>
                      <dd>{(asignacion ?? ahora.actual).dia} · {horario(asignacion ?? ahora.actual)}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>Próxima clase</dt>
                  <dd>{ahora.proxima ? `${ahora.proxima.inicio} · ${ahora.proxima.materia ?? "Clase"}` : "No hay más hoy"}</dd>
                </div>
              </dl>
              <div className="asignacion__dia">
                <p className="bloque__titulo">Horarios del {form.dia.toLowerCase()}</p>
                {delDia.length ? (
                  <ul className="asignacion__lista">
                    {delDia.map((a) => (
                      <li key={a.id} className={asignacion?.id === a.id ? "asignacion__item--actual" : ""}>
                        <strong>{horario(a)}</strong> {a.materia ?? "Sin materia"} · {a.grupo ?? "sin grupo"} · {a.docente ?? "sin docente"}
                        {a.estado !== "activa" && <em> ({datos.estados[a.estado]})</em>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="asignacion__vacio">Libre todo el {form.dia.toLowerCase()}.</p>
                )}
              </div>
            </section>
          )}

          {vista === "agenda" ? (
            <Agenda
              espacio={espacio}
              grillaId={form.grilla_id}
              datos={datos}
              editable={editable}
              irAGrilla={irAGrilla}
              alElegirLibre={(dia, hora) => {
                cambiar("dia")(dia);
                cambiar("hora")(hora);
                setVista("formulario");
              }}
            />
          ) : (
            <fieldset className="asignacion__form" disabled={!editable || enviando}>
              <legend className="bloque__titulo">{asignacion ? "Editar asignación" : "Nueva asignación"}</legend>

              <div className="asignacion__seccion">
                <p className="asignacion__seccion-titulo">Clase</p>
                <div className="formulario formulario--panel">
                  <SelectorBuscable
                    etiqueta="Docente"
                    requerido
                    opciones={datos.docentes}
                    valor={form.docente_id}
                    alCambiar={cambiar("docente_id")}
                    alAgregar={sumar("docentes")}
                    textoAgregar="Agregar docente"
                    desactivado={!editable}
                    error={errores.docente_id}
                  />
                  <SelectorBuscable
                    etiqueta="Materia o actividad"
                    requerido
                    opciones={opcionesMateria}
                    valor={form.materia_id}
                    alCambiar={cambiar("materia_id")}
                    alAgregar={sumar("materias")}
                    textoAgregar="Agregar materia"
                    desactivado={!editable}
                    error={errores.materia_id}
                  />
                  <SelectorBuscable
                    etiqueta="Grupo"
                    opciones={opcionesGrupo}
                    valor={form.grupo_id}
                    alCambiar={cambiar("grupo_id")}
                    alAgregar={sumar("grupos")}
                    textoAgregar="Agregar grupo"
                    placeholder="Curso, división o grupo de taller"
                    desactivado={!editable}
                  />
                  <label className="campo">
                    <span>Alumnos</span>
                    <input
                      type="number"
                      min="0"
                      max={espacio?.capacidad ?? 1000}
                      inputMode="numeric"
                      value={form.alumnos}
                      aria-invalid={!!errores.alumnos}
                      onChange={(e) => cambiar("alumnos")(e.target.value)}
                    />
                    {errores.alumnos && <span className="campo__error">{errores.alumnos}</span>}
                  </label>
                </div>
              </div>

              <div className="asignacion__seccion">
                <p className="asignacion__seccion-titulo">Lugar y horario</p>
                <div className="formulario formulario--panel">
                  <SelectorBuscable
                    etiqueta="Espacio"
                    requerido
                    opciones={opcionesEspacio}
                    valor={form.salon_id}
                    alCambiar={cambiar("salon_id")}
                    desactivado={!editable}
                    error={errores.salon_id}
                  />
                  <label className="campo">
                    <span>Grilla (ciclo)</span>
                    <select value={form.grilla_id} onChange={(e) => cambiar("grilla_id")(e.target.value)}>
                      {grillas.map((g) => (
                        <option key={g.id} value={g.id}>{g.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Día</span>
                    <select value={form.dia} onChange={(e) => cambiar("dia")(e.target.value)}>
                      {diasGrilla.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Módulo</span>
                    <select value={form.hora} aria-invalid={!!errores.hora} onChange={(e) => cambiar("hora")(e.target.value)}>
                      {modulosDe(form.grilla_id).map((h) => (
                        <option key={h.id} value={h.id}>
                          {moduloConTurno(h, datos.turnos)}{h.inicio ? ` (${h.inicio} a ${h.fin})` : " (sin hora)"}
                        </option>
                      ))}
                    </select>
                    {errores.hora && <span className="campo__error">{errores.hora}</span>}
                  </label>
                  <label className="campo">
                    <span>Inicio</span>
                    <input type="time" step="300" value={form.inicio} onChange={(e) => cambiar("inicio")(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Fin</span>
                    <input
                      type="time"
                      step="300"
                      value={form.fin}
                      aria-invalid={!!errores.fin}
                      onChange={(e) => cambiar("fin")(e.target.value)}
                    />
                    {errores.fin && <span className="campo__error">{errores.fin}</span>}
                  </label>
                </div>
                {!modulo?.inicio && !form.inicio && (
                  <p className="asignacion__nota">
                    <Icon icon="ph:info" width={14} height={14} aria-hidden="true" /> Este módulo no tiene hora cargada:
                    sin hora, el plano no puede mostrar si el espacio está ocupado en este momento. Cargala acá o en
                    Espacios y horarios.
                  </p>
                )}
              </div>

              <div className="asignacion__seccion">
                <p className="asignacion__seccion-titulo">Otros datos</p>
                <div className="formulario formulario--panel">
                  <label className="campo">
                    <span>Estado de la asignación</span>
                    <select value={form.estado} onChange={(e) => cambiar("estado")(e.target.value)}>
                      {Object.entries(datos.estados).map(([id, texto]) => (
                        <option key={id} value={id}>{texto}</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo campo--ancho">
                    <span>Observaciones</span>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={form.observaciones}
                      aria-invalid={!!errores.observaciones}
                      onChange={(e) => cambiar("observaciones")(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </fieldset>
          )}

          {vista === "formulario" && conflictos.length > 0 && (
            <section className="conflictos" role="alert" aria-label="Conflictos">
              <p className="conflictos__titulo">
                <Icon icon="ph:warning-octagon" width={18} height={18} aria-hidden="true" />
                No se puede guardar: se superpone con otra clase
              </p>
              <ul>
                {conflictos.map((c, i) => (
                  <li key={i}>
                    <strong>{{ espacio: "Espacio", docente: "Docente", grupo: "Grupo" }[c.recurso]}:</strong> {c.mensaje}.
                  </li>
                ))}
              </ul>
              {servidor?.alternativas?.length > 0 && (
                <div className="conflictos__alternativas">
                  <p>Espacios libres en ese horario:</p>
                  {servidor.alternativas.map((s) => (
                    <button key={s.id} type="button" className="boton boton--fino" onClick={() => cambiar("salon_id")(s.id)}>
                      {s.nombre} <span className="conflictos__piso">· {s.piso}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {aviso && (
            <p className="selector__error" role="alert">
              <Icon icon="ph:warning" width={16} height={16} aria-hidden="true" /> {aviso}
            </p>
          )}

          {editable && espacio && vista === "formulario" && (
            <DatosEspacio espacio={espacio} tipos={datos.tipos} clasificaciones={datos.clasificaciones} alAvisar={setAviso} />
          )}
        </div>

        <footer className="modal__pie asignacion__pie">
          {pidiendoSalir ? (
            <>
              <span className="asignacion__salir" role="alert">Hay cambios sin guardar.</span>
              <button type="button" className="boton boton--peligro" onClick={alCerrar}>Descartar cambios</button>
              <button type="button" className="boton" onClick={() => setPidiendoSalir(false)}>Seguir editando</button>
            </>
          ) : (
            <>
              {editable && vista === "formulario" && (
                <button className="boton boton--primario" type="submit" disabled={enviando || conflictos.length > 0}>
                  <Icon icon={enviando ? "ph:spinner-gap" : "ph:floppy-disk"} className={enviando ? "girando" : ""} width={16} height={16} aria-hidden="true" />
                  {enviando ? "Guardando…" : "Guardar asignación"}
                </button>
              )}
              {editable && asignacion && vista === "formulario" && (
                <button
                  type="button"
                  className={`boton ${confirmarQuitar ? "boton--peligro" : ""}`}
                  onClick={quitarActual}
                  disabled={enviando}
                >
                  <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                  {confirmarQuitar ? "Sí, quitar asignación" : "Quitar"}
                </button>
              )}
              <button
                type="button"
                className="boton"
                disabled={!espacio}
                title={espacio ? undefined : "Elegí un espacio para ver su agenda"}
                onClick={() => setVista(vista === "agenda" ? "formulario" : "agenda")}
              >
                <Icon icon={vista === "agenda" ? "ph:pencil-simple" : "ph:calendar-dots"} width={16} height={16} aria-hidden="true" />
                {vista === "agenda" ? "Volver al formulario" : "Ver agenda"}
              </button>
              <button type="button" className="boton" onClick={intentarCerrar}>
                {editable ? "Cancelar" : "Cerrar"}
              </button>
            </>
          )}
        </footer>
      </form>
    </div>
  );
}

/* Semana del espacio: sus clases por día y los módulos libres de la grilla
   elegida (para ver disponibilidad y cargar ahí). */
function Agenda({ espacio, grillaId, datos, editable, irAGrilla, alElegirLibre }) {
  const grilla = datos.grillas.find((g) => g.id === grillaId);
  const clases = vigentes(datos.asignaciones).filter((a) => a.salon_id === espacio.id);
  return (
    <section className="agenda" aria-label={`Agenda de ${espacio.nombre}`}>
      <p className="bloque__titulo">Agenda semanal de {espacio.nombre}</p>
      <div className="agenda__dias">
        {DIAS.map((dia) => {
          const delDia = clases
            .filter((a) => a.dia === dia)
            .sort((a, b) => (aMinutos(a.inicio) ?? 9999) - (aMinutos(b.inicio) ?? 9999));
          const libres = (grilla?.horas ?? []).filter(
            (h) => estadoEnMomento(clases, { dia, hora: h.id, inicio: h.inicio, fin: h.fin }).estado === "libre",
          );
          return (
            <div className="agenda__dia" key={dia}>
              <h3>{dia}</h3>
              {delDia.map((a) => (
                <article key={a.id} className={`agenda__clase ${a.estado !== "activa" ? "agenda__clase--inactiva" : ""}`}>
                  <p className="agenda__hora">{horario(a)}</p>
                  <p>{a.materia ?? "Sin materia"}</p>
                  <p className="agenda__detalle">{a.grupo ?? "sin grupo"} · {a.docente ?? "sin docente"}</p>
                  {a.estado !== "activa" && <p className="agenda__detalle">{datos.estados[a.estado]}</p>}
                  {irAGrilla && (
                    <button type="button" className="enlace" onClick={() => irAGrilla(a)}>
                      Ver en la grilla
                    </button>
                  )}
                </article>
              ))}
              {libres.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="agenda__libre"
                  disabled={!editable}
                  onClick={() => alElegirLibre(dia, h.id)}
                  title={editable ? "Cargar una clase en este horario" : undefined}
                >
                  Libre · {moduloConTurno(h, datos.turnos)}{h.inicio ? ` (${h.inicio})` : ""}
                </button>
              ))}
              {!delDia.length && !libres.length && <p className="agenda__detalle">Sin módulos en esta grilla.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* Nombre, tipo, capacidad y habilitado del espacio (Jefatura y Dirección). */
export function DatosEspacio({ espacio, tipos, clasificaciones = {}, alAvisar }) {
  const [datos, setDatos] = useState({
    nombre: espacio.nombre,
    tipo: espacio.tipo,
    capacidad: espacio.capacidad ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  const guardarCambios = async (cambios) => {
    setGuardando(true);
    try {
      await guardarEspacio(espacio.id, cambios);
      alAvisar("");
    } catch (error) {
      alAvisar(explicar(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <details className="asignacion__espacio">
      <summary>Datos del espacio (nombre, tipo, capacidad, habilitado)</summary>
      <div className="formulario formulario--panel">
        <label className="campo">
          <span>Nombre en el plano</span>
          <input
            value={datos.nombre}
            maxLength={100}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            onBlur={() => datos.nombre.trim() !== espacio.nombre && guardarCambios({ nombre: datos.nombre.trim() || "Sin nombre" })}
          />
        </label>
        <label className="campo">
          <span>Tipo</span>
          <select
            value={datos.tipo}
            onChange={(e) => {
              setDatos({ ...datos, tipo: e.target.value });
              guardarCambios({ tipo: e.target.value });
            }}
          >
            {Object.entries(tipos).map(([id, texto]) => (
              <option key={id} value={id}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Clasificación</span>
          <select
            value={espacio.clasificacion}
            disabled={guardando}
            onChange={(e) => guardarCambios({ clasificacion: e.target.value })}
          >
            {Object.entries(clasificaciones).map(([id, texto]) => (
              <option key={id} value={id}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Capacidad</span>
          <input
            type="number"
            min="1"
            max="1000"
            placeholder="Sin cargar"
            value={datos.capacidad}
            onChange={(e) => setDatos({ ...datos, capacidad: e.target.value })}
            onBlur={() =>
              String(datos.capacidad) !== String(espacio.capacidad ?? "") &&
              guardarCambios({ capacidad: datos.capacidad === "" ? null : Number(datos.capacidad) })
            }
          />
        </label>
      </div>
      <button
        type="button"
        className="boton boton--fino"
        disabled={guardando}
        onClick={() => guardarCambios({ habilitado: !espacio.habilitado })}
      >
        <Icon icon={espacio.habilitado ? "ph:prohibit" : "ph:arrow-counter-clockwise"} width={14} height={14} aria-hidden="true" />
        {espacio.habilitado ? "Deshabilitar el espacio (en obra, clausurado…)" : "Volver a habilitar el espacio"}
      </button>
    </details>
  );
}
