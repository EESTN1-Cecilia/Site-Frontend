import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { ir } from "../../router.js";
import { usePlano } from "../../plano.js";
import { cargarAsignaciones, useAsignaciones, vigentes } from "../../asignaciones.js";
import { DIAS, ESTADOS, diaDe, estadoEnMomento, estadoEspacio, intervalo, useReloj } from "../../horario.js";
import AsignacionModal from "../../components/AsignacionModal.jsx";
import { moduloConTurno } from "../../exportarGrilla.js";
import EspacioComunModal from "../../components/EspacioComunModal.jsx";

/* Plano del colegio: cada espacio es una zona del dibujo que se puede elegir
   con el mouse o el teclado (Tab y Enter). El color dice si está libre,
   ocupado o por terminar la clase:

   - "Ahora": según la hora de ESTE dispositivo (horario.js). Se actualiza
     solo al cambiar el minuto.
   - "Elegir día y módulo": cómo queda ese momento de la semana.

   Los datos son los mismos que Espacios y horarios (asignaciones.js): lo que
   se cambia acá aparece allá y al revés, también si lo cambia otra persona.
   Sólo cuentan las grillas vigentes (las semanas archivadas no ocupan).

   La Jefatura de Área es un recinto institucional: en el dibujo queda sólo
   el contorno con un rayado diagonal, sin rótulo; al pasar el mouse, al
   enfocarla o al hacer clic aparece «Jefatura de Área». */

const ZOOMS = [1, 1.5, 2, 2.5];
const hora = (fecha) => fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export default function PlanoSalones({ editable, params }) {
  const pisos = usePlano();
  const { cargando, cargado, error, enVivo, datos } = useAsignaciones();
  const fecha = useReloj();
  const grillas = datos.grillas.filter((g) => g.vigente !== false);
  const hoy = diaDe(fecha);

  const pedido = params?.get("espacio");
  const pisoPedido = pisos.find((p) => p.salones.some((s) => s.id === pedido))?.id;
  const [pisoId, setPisoId] = useState(pisoPedido ?? pisos[0].id);
  const [modo, setModo] = useState("ahora");
  const [grillaId, setGrillaId] = useState(null);
  const [dia, setDia] = useState(hoy ?? DIAS[0]);
  const [horaId, setHoraId] = useState(null);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState({ docente: "", grupo: "" });
  const [todos, setTodos] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [abierto, setAbierto] = useState(pisoPedido ? { espacioId: pedido } : null);
  const [encima, setEncima] = useState(null);
  const [fijado, setFijado] = useState(null); // recinto institucional elegido: sólo muestra su nombre
  const [aviso, setAviso] = useState("");

  const grilla = grillas.find((g) => g.id === grillaId) ?? grillas[0];
  const modulo = grilla?.horas.find((h) => h.id === horaId) ?? grilla?.horas[0];
  const piso = pisos.find((p) => p.id === pisoId) ?? pisos[0];
  const momento = modulo ? { dia, hora: modulo.id, inicio: modulo.inicio, fin: modulo.fin } : null;

  /* Clases de cada espacio (una pasada, no una búsqueda por espacio). */
  const porEspacio = useMemo(() => {
    const mapa = new Map();
    for (const a of vigentes(datos.asignaciones)) {
      if (!a.salon_id) continue;
      if (!mapa.has(a.salon_id)) mapa.set(a.salon_id, []);
      mapa.get(a.salon_id).push(a);
    }
    return mapa;
  }, [datos.asignaciones]);

  /* Estado de cada espacio en el momento elegido. Se recalcula cuando cambian
     los datos, el minuto del reloj o el momento elegido. */
  const claveMomento = momento ? `${momento.dia}|${momento.hora}|${momento.inicio}|${momento.fin}` : "";
  const situacion = useMemo(() => {
    const mapa = new Map();
    for (const p of pisos) {
      for (const s of p.salones) {
        const clases = porEspacio.get(s.id) ?? [];
        const r =
          modo === "ahora" || !momento ? estadoEspacio(clases, fecha) : estadoEnMomento(clases, momento);
        // Un espacio común (PAÑOL, E.O.E.…) no está "libre": no admite clases.
        mapa.set(s.id, {
          ...r,
          estado: s.institucional ? "institucional" : s.comun ? "comun" : s.habilitado ? r.estado : "deshabilitado",
        });
      }
    }
    return mapa;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pisos, porEspacio, modo, fecha, claveMomento]);

  const buscado = buscar.trim().toLowerCase();
  const hayFiltro = filtro.docente || filtro.grupo;
  const coincide = (s) => {
    const { actual } = situacion.get(s.id);
    if (hayFiltro) {
      if (!actual) return false;
      if (filtro.docente && String(actual.docente_id) !== filtro.docente) return false;
      if (filtro.grupo && String(actual.grupo_id) !== filtro.grupo) return false;
    }
    return !buscado || s.nombre.toLowerCase().includes(buscado);
  };
  // Por defecto: aulas y los espacios comunes institucionales (PAÑOL, E.O.E.).
  const visible = (s) => todos || !s.comun || s.tipo === "comun" || s.institucional;
  const visibles = piso.salones.filter(visible);
  const enOtroPiso = buscado || hayFiltro
    ? pisos.filter((p) => p.id !== piso.id && p.salones.some((s) => visible(s) && coincide(s)))
    : [];

  const sinHoraHoy =
    modo === "ahora" && hoy && vigentes(datos.asignaciones).some((a) => a.dia === hoy && a.estado === "activa" && !intervalo(a));
  const resumen = visibles.reduce((acc, s) => {
    const e = situacion.get(s.id).estado;
    acc[e] = (acc[e] ?? 0) + 1;
    return acc;
  }, {});

  /* Un clic fija el rótulo de la Jefatura; otro clic, Escape o un clic
     afuera lo sacan. No abre ventana: no hay nada que asignar. */
  useEffect(() => {
    if (!fijado) return undefined;
    const soltar = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !e.target.closest?.(`[data-espacio="${fijado}"]`)) setFijado(null);
    };
    document.addEventListener("keydown", soltar);
    document.addEventListener("mousedown", soltar);
    return () => {
      document.removeEventListener("keydown", soltar);
      document.removeEventListener("mousedown", soltar);
    };
  }, [fijado]);

  const abrir = (salon) => {
    if (salon.institucional) {
      setFijado((f) => (f === salon.id ? null : salon.id));
      return;
    }
    setAviso("");
    const { actual } = situacion.get(salon.id);
    setAbierto({ espacioId: salon.id, asignacion: actual ?? null });
  };
  const etiquetaEstado = (s) => {
    const { estado, actual } = situacion.get(s.id);
    if (estado === "institucional") return "Espacio institucional reservado: no asignable";
    if (estado === "comun") return "Espacio común: no admite clases";
    if (estado === "deshabilitado") return "Deshabilitado";
    const texto = ESTADOS[estado].texto;
    return actual ? `${texto}: ${actual.materia ?? "clase"}, ${actual.grupo ?? "sin grupo"}` : texto;
  };
  // Se decide al dibujar (no al abrir): con ?espacio= los datos pueden llegar después.
  const espacioAbierto = abierto && pisos.flatMap((p) => p.salones).find((s) => s.id === abierto.espacioId);
  const irAGrilla = (a) => ir(`/panel/grilla?grilla=${encodeURIComponent(a.grilla_id)}&clase=${a.id}`);
  const opciones = (lista) => lista.map((x) => [String(x.id), x.nombre]);

  return (
    <section className="tarjeta plano-tarjeta" id="plano" aria-labelledby="plano-titulo">
      <div className="tarjeta__barra">
        <div>
          <h2 className="tarjeta__titulo" id="plano-titulo">Plano del colegio</h2>
          <p className="tarjeta__bajada">
            {editable
              ? "Elegí un espacio (clic, o Tab y Enter) para ver su ocupación y asignar docente, materia, grupo y horario."
              : "Elegí un espacio para ver su ocupación y su agenda."}
          </p>
        </div>
        <button className="boton boton--fino" onClick={() => ir("/panel/grilla")}>
          <Icon icon="ph:calendar-dots" width={15} height={15} aria-hidden="true" />
          Agenda completa
        </button>
      </div>

      {/* Controles en tres bloques: qué se mira (planta y momento), qué se
          busca (espacio, docente, grupo) y las referencias de colores. */}
      <div className="plano-controles">
        <div className="plano-controles__vista">
          <div className="plano-controles__grupo">
            <span className="plano-controles__rotulo" id="rotulo-planta">Planta</span>
            <div className="segmentado" role="group" aria-labelledby="rotulo-planta">
              {pisos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`segmentado__opcion ${piso.id === p.id ? "segmentado__opcion--activa" : ""}`}
                  aria-pressed={piso.id === p.id}
                  onClick={() => setPisoId(p.id)}
                >
                  <Icon icon={p.id === "pb" ? "ph:stack-simple" : "ph:stack"} width={15} height={15} aria-hidden="true" />
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="plano-controles__grupo">
            <span className="plano-controles__rotulo" id="rotulo-momento">Momento</span>
            <div className="segmentado" role="group" aria-labelledby="rotulo-momento">
              <button
                type="button"
                className={`segmentado__opcion ${modo === "ahora" ? "segmentado__opcion--activa" : ""}`}
                aria-pressed={modo === "ahora"}
                onClick={() => setModo("ahora")}
              >
                <Icon icon="ph:clock" width={15} height={15} aria-hidden="true" /> Ahora
              </button>
              <button
                type="button"
                className={`segmentado__opcion ${modo === "momento" ? "segmentado__opcion--activa" : ""}`}
                aria-pressed={modo === "momento"}
                onClick={() => setModo("momento")}
              >
                <Icon icon="ph:calendar-blank" width={15} height={15} aria-hidden="true" /> Elegir día y módulo
              </button>
            </div>
          </div>
        </div>

        {modo === "momento" && grilla && (
          <div className="plano-controles__campos plano-controles__campos--momento">
            <Campo etiqueta="Grilla" valor={grilla.id} alCambiar={setGrillaId} opciones={grillas.map((g) => [g.id, g.nombre])} />
            <Campo etiqueta="Día" valor={dia} alCambiar={setDia} opciones={DIAS.map((d) => [d, d])} />
            <Campo
              etiqueta="Módulo"
              valor={modulo?.id ?? ""}
              alCambiar={setHoraId}
              opciones={grilla.horas.map((h) => [h.id, `${moduloConTurno(h, datos.turnos)}${h.inicio ? ` · ${h.inicio}` : ""}`])}
            />
          </div>
        )}

        <div className="plano-controles__campos">
          <label className="campo campo--buscar">
            <span>Buscar espacio</span>
            <span className="campo__con-icono">
              <Icon icon="ph:magnifying-glass" width={16} height={16} aria-hidden="true" />
              <input type="search" placeholder="Aula 12, taller…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </span>
          </label>
          <Campo etiqueta="Docente" valor={filtro.docente} alCambiar={(v) => setFiltro({ ...filtro, docente: v })} opciones={[["", "Todos"], ...opciones(datos.docentes)]} />
          <Campo etiqueta="Grupo" valor={filtro.grupo} alCambiar={(v) => setFiltro({ ...filtro, grupo: v })} opciones={[["", "Todos"], ...opciones(datos.grupos)]} />
        </div>
        <label className="casilla-filtro">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
          <span>Mostrar todos los espacios (también administración, patios y pasillos)</span>
        </label>
      </div>

      <div className="plano-referencias">
        <p className="plano-controles__rotulo">Referencias</p>
        <ul className="plano-leyenda" aria-label="Referencias">
          {["libre", "ocupado", "por-finalizar", "sin-horario"].map((e) => (
            <li key={e}>
              <span className={`plano-leyenda__marca plano-leyenda__marca--${e}`}>
                <Icon icon={ESTADOS[e].icono} width={12} height={12} aria-hidden="true" />
              </span>
              <span>
                {ESTADOS[e].texto}
                {resumen[e] ? <span className="plano-leyenda__n"> {resumen[e]}</span> : null}
              </span>
            </li>
          ))}
          <li>
            <span className="plano-leyenda__marca plano-leyenda__marca--comun">
              <Icon icon="ph:wrench" width={11} height={11} aria-hidden="true" />
            </span>
            <span>Espacio común (no admite clases)</span>
          </li>
          <li>
            <span className="plano-leyenda__marca plano-leyenda__marca--institucional" />
            <span>Institucional (no asignable)</span>
          </li>
          <li>
            <span className="plano-leyenda__marca plano-leyenda__marca--deshabilitado" />
            <span>Deshabilitado</span>
          </li>
          <li>
            <span className="plano-leyenda__marca plano-leyenda__marca--seleccionado" />
            <span>Seleccionado</span>
          </li>
        </ul>
      </div>

      <div className="plano-barra">
        <p className={`plano-reloj ${enVivo ? "" : "plano-reloj--sin-vivo"}`} role="status">
          <Icon icon={enVivo ? "ph:broadcast" : "ph:wifi-slash"} width={15} height={15} aria-hidden="true" />
          <span>
            {modo === "ahora"
              ? hoy
                ? `${hoy} ${hora(fecha)}, según la hora de este dispositivo (puede no coincidir con la de la escuela). `
                : "Hoy no hay clases: es fin de semana. "
              : `Viendo el ${dia.toLowerCase()} en ${modulo ? moduloConTurno(modulo, datos.turnos).toLowerCase() : "—"}${modulo?.inicio ? ` (${modulo.inicio} a ${modulo.fin})` : ""}. `}
            {enVivo ? "Los cambios de otras personas aparecen solos." : "Sin avisos en vivo: reintentando."}
          </span>
        </p>
        <div className="plano-zoom" role="group" aria-label="Zoom del plano">
          <button className="boton boton--fino" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Alejar">
            <Icon icon="ph:magnifying-glass-minus" width={15} height={15} aria-hidden="true" />
          </button>
          <span aria-live="polite">{Math.round(ZOOMS[zoom] * 100)}%</span>
          <button
            className="boton boton--fino"
            onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
            disabled={zoom === ZOOMS.length - 1}
            aria-label="Acercar"
          >
            <Icon icon="ph:magnifying-glass-plus" width={15} height={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {sinHoraHoy && (
        <p className="flash flash--info">
          <Icon icon="ph:info" width={18} height={18} aria-hidden="true" />
          <span>
            Hay clases hoy en módulos sin hora de inicio y fin: esos espacios aparecen como «Sin horario cargado».{" "}
            <button className="enlace" onClick={() => ir("/panel/grilla")}>Cargar las horas en Espacios y horarios</button>
          </span>
        </p>
      )}
      {error && (
        <p className="flash flash--error plano-estado" role="alert">
          <Icon icon="ph:wifi-slash" width={18} height={18} aria-hidden="true" />
          <span>No se pudieron traer los datos. {error}</span>
          <button className="boton boton--fino" onClick={cargarAsignaciones} disabled={cargando}>Reintentar</button>
        </p>
      )}
      {cargando && !cargado && <p className="plano-estado plano-estado--cargando">Cargando el plano…</p>}
      {aviso && (
        <p className="flash plano-estado" role="status">
          <Icon icon="ph:check-circle" width={18} height={18} aria-hidden="true" />
          {aviso}
        </p>
      )}
      {enOtroPiso.length > 0 && (
        <p className="plano-estado">
          También hay coincidencias en:{" "}
          {enOtroPiso.map((p) => (
            <button key={p.id} className="enlace" onClick={() => setPisoId(p.id)}>{p.nombre}</button>
          ))}
        </p>
      )}


      <div className={`plano-visor ${zoom ? "plano-visor--ampliado" : ""}`}>
        <div className="plano" style={{ aspectRatio: piso.proporcion, width: `${ZOOMS[zoom] * 100}%` }}>
          <img className="plano__dibujo" src={piso.imagen} alt={`Plano de ${piso.nombre.toLowerCase()}`} />
          <svg className="plano__zonas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Espacios de ${piso.nombre.toLowerCase()}`}>
            <defs>
              {/* Rayado de los espacios comunes (en px de pantalla, no del dibujo). */}
              <pattern id="rayado-comun" patternUnits="userSpaceOnUse" width="1.2" height="1.2" patternTransform="rotate(45)">
                <rect width="1.2" height="1.2" fill="rgba(90, 85, 85, 0.16)" />
                <rect width="0.45" height="1.2" fill="rgba(90, 85, 85, 0.42)" />
              </pattern>
              {/* Institucional: sólo líneas finas a 45°, sin relleno (como un plano de arquitectura). */}
              <pattern id="rayado-institucional" patternUnits="userSpaceOnUse" width="0.9" height="0.9" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="0.9" stroke="#5c0f0f" strokeOpacity="0.6" strokeWidth="0.1" />
              </pattern>
            </defs>
            {visibles
              .filter((s) => s.zona)
              .map((s) => {
                const { estado } = situacion.get(s.id);
                return (
                  <polygon
                    key={s.id}
                    points={s.zona.map((p) => p.join(",")).join(" ")}
                    className={`zona zona--${estado} ${coincide(s) ? "" : "zona--atenuada"} ${
                      abierto?.espacioId === s.id || fijado === s.id ? "zona--seleccionada" : ""
                    }`}
                    data-espacio={s.id}
                    role="button"
                    tabIndex={0}
                    aria-label={s.institucional ? s.nombre : `${s.nombre}: ${etiquetaEstado(s)}`}
                    {...(s.institucional ? { "aria-describedby": "plano-rotulo", "aria-pressed": fijado === s.id } : {})}
                    onClick={() => abrir(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        abrir(s);
                      }
                    }}
                    onMouseEnter={() => setEncima(s.id)}
                    onMouseLeave={() => setEncima(null)}
                    onFocus={() => setEncima(s.id)}
                    onBlur={() => setEncima(null)}
                  />
                );
              })}
          </svg>
          {/* La Jefatura no lleva rótulo en el dibujo: sólo el contorno rayado. */}
          {visibles.filter((s) => !(s.institucional && s.zona)).map((s) => {
            const { estado } = situacion.get(s.id);
            const conZona = !!s.zona;
            const Etiqueta = conZona ? "span" : "button";
            return (
              <Etiqueta
                key={s.id}
                className={`plano__salon plano__salon--${estado} ${s.chico ? "plano__salon--chico" : ""} ${
                  coincide(s) ? "" : "plano__salon--atenuado"
                } ${conZona ? "" : "plano__salon--boton"}`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                {...(conZona
                  ? { "aria-hidden": true }
                  : { type: "button", onClick: () => abrir(s), "aria-label": `${s.nombre}: ${etiquetaEstado(s)}` })}
              >
                <span className="plano__nombre">
                  {s.comun && <Icon className="plano__icono" icon={s.icono} width={s.chico ? 9 : 12} height={s.chico ? 9 : 12} aria-hidden="true" />}
                  {s.nombre}
                </span>
                {!["libre", "comun", "institucional"].includes(estado) && (
                  <span className="plano__estado">
                    <Icon icon={estado === "deshabilitado" ? "ph:prohibit" : ESTADOS[estado].icono} width={10} height={10} aria-hidden="true" />
                    {estado === "deshabilitado" ? "Deshabilitado" : ESTADOS[estado].texto}
                  </span>
                )}
              </Etiqueta>
            );
          })}
          {(() => {
            const id = encima ?? fijado;
            const salon = id && visibles.find((s) => s.id === id);
            if (!salon) return null;
            return salon.institucional ? (
              <Rotulo salon={salon} />
            ) : (
              <Tooltip salon={salon} situacion={situacion.get(id)} tipos={datos.tipos} />
            );
          })()}
        </div>
      </div>

      {/* En el celular las zonas quedan chicas: la misma información en lista. */}
      <ul className="plano-lista" aria-label={`Espacios de ${piso.nombre.toLowerCase()}`}>
        {visibles.filter(coincide).map((s) => {
          const { estado } = situacion.get(s.id);
          if (s.institucional) {
            return (
              <li key={s.id}>
                <p className={`plano-lista__item plano-lista__item--${estado}`}>
                  <span className="plano-lista__nombre">{s.nombre}</span>
                  <span className="plano-lista__detalle">{etiquetaEstado(s)}</span>
                </p>
              </li>
            );
          }
          return (
            <li key={s.id}>
              <button type="button" className={`plano-lista__item plano-lista__item--${estado}`} onClick={() => abrir(s)}>
                <span className="plano-lista__nombre">{s.nombre}</span>
                <span className="plano-lista__detalle">{etiquetaEstado(s)}</span>
                <Icon icon="ph:caret-right" width={16} height={16} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {espacioAbierto?.comun && (
        <EspacioComunModal espacio={espacioAbierto} editable={editable && cargado} alCerrar={() => setAbierto(null)} />
      )}
      {abierto && !espacioAbierto?.comun && (
        <AsignacionModal
          espacioId={abierto.espacioId}
          asignacion={abierto.asignacion}
          inicial={modo === "momento" && momento ? { grilla_id: grilla.id, hora: momento.hora, dia } : { grilla_id: grilla?.id }}
          editable={editable && cargado}
          irAGrilla={irAGrilla}
          alCerrar={() => setAbierto(null)}
          alGuardar={(mensaje) => {
            setAbierto(null);
            setAviso(mensaje);
          }}
        />
      )}
    </section>
  );
}

function Campo({ etiqueta, valor, alCambiar, opciones }) {
  return (
    <label className="campo campo--select">
      <span>{etiqueta}</span>
      <select value={valor} onChange={(e) => alCambiar(e.target.value)}>
        {opciones.map(([id, nombre]) => (
          <option key={id} value={id}>{nombre}</option>
        ))}
      </select>
    </label>
  );
}

/* Rótulo de un recinto institucional (Jefatura de Área): sólo su nombre. */
function Rotulo({ salon }) {
  return (
    <div
      id="plano-rotulo"
      className={`plano__tooltip plano__tooltip--rotulo ${salon.y < 25 ? "plano__tooltip--abajo" : ""}`}
      style={{ left: `${Math.min(Math.max(salon.x, 10), 90)}%`, top: `${salon.y}%` }}
      role="tooltip"
    >
      {salon.nombre}
    </div>
  );
}

/* Lo que se ve al pasar el mouse (o el foco) por un espacio. */
function Tooltip({ salon, situacion, tipos }) {
  const { estado, actual, proxima } = situacion;
  return (
    <div
      className={`plano__tooltip ${salon.y < 25 ? "plano__tooltip--abajo" : ""}`}
      style={{ left: `${Math.min(Math.max(salon.x, 18), 82)}%`, top: `${salon.y}%` }}
      role="tooltip"
    >
      <p className="plano__tooltip-titulo">{salon.nombre}</p>
      <p className="plano__tooltip-tipo">
        {tipos[salon.tipo] ?? salon.tipo}
        {salon.capacidad ? ` · ${salon.capacidad} personas` : ""}
      </p>
      <p className={`estado-chip estado-chip--${estado}`}>
        {estado === "institucional"
          ? "Espacio institucional reservado · No asignable"
          : estado === "comun"
            ? "Espacio común: no admite clases"
            : estado === "deshabilitado"
              ? "Deshabilitado"
              : ESTADOS[estado].texto}
      </p>
      {actual && (
        <p>
          {actual.materia ?? "Clase"} · {actual.grupo ?? "sin grupo"}
          <br />
          {actual.docente ?? "sin docente"} · {actual.inicio ? `${actual.inicio} a ${actual.fin}` : actual.modulo_nombre}
        </p>
      )}
      {proxima && (
        <p className="plano__tooltip-tipo">
          Próxima: {proxima.inicio} · {proxima.materia ?? "clase"}
        </p>
      )}
    </div>
  );
}
