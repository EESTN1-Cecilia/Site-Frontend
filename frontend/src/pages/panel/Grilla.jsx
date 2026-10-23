import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import Editable from "../../components/Editable.jsx";
import { dias } from "../../panelData.js";
import { nombresSalones, salonCancelado } from "../../plano.js";
import { puedeEditar } from "../../sesion.js";
import { cambiarGrillas, horasBase, useGrillas } from "../../grillas.js";

const nuevoId = (prefijo) => `${prefijo}-${Date.now().toString(36)}`;

/* La grilla sale sola en el PDF: el resto de la pantalla se oculta al imprimir. */
const exportarPdf = () => {
  document.body.classList.add("imprimir-grilla");
  window.addEventListener("afterprint", () => document.body.classList.remove("imprimir-grilla"), {
    once: true,
  });
  window.print();
};

export default function Grilla({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const grillas = useGrillas();
  const setGrillas = cambiarGrillas;
  const [actualId, setActualId] = useState(null);
  const [activa, setActiva] = useState(null);
  const [registro, setRegistro] = useState([]);
  const origen = useRef(null);
  const [moviendo, setMoviendo] = useState(null);
  const [encima, setEncima] = useState(null);
  const [tomado, setTomado] = useState(false);


  const actual = grillas.find((g) => g.id === actualId) ?? grillas[0];
  const grilla = actual.clases;
  const clase = grilla.find((c) => c.id === activa);
  const nombreHora = (id) => actual.horas.find((h) => h.id === id)?.nombre ?? "";

  /* Todos los cambios caen sobre la grilla que se está viendo. */
  const enActual = (cambio) =>
    setGrillas((previo) =>
      previo.map((g) => (g.id === actual.id ? { ...g, ...cambio(g) } : g)),
    );
  const setGrilla = (cambio) => enActual((g) => ({ clases: cambio(g.clases) }));

  const cambiar = (id, campo, valor) =>
    setGrilla((previo) =>
      previo.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)),
    );

  /* ---------- Grillas ---------- */
  const elegir = (id) => {
    setActualId(id);
    setActiva(null);
  };

  const crearGrilla = () => {
    const nueva = { id: nuevoId("gr"), nombre: "Nueva grilla", horas: horasBase(), clases: [] };
    setGrillas((previo) => [...previo, nueva]);
    elegir(nueva.id);
  };

  const quitarGrilla = () => {
    if (
      actual.clases.length &&
      !window.confirm(`¿Eliminar la grilla “${actual.nombre}” con sus ${actual.clases.length} clases?`)
    )
      return;
    setGrillas((previo) => previo.filter((g) => g.id !== actual.id));
    elegir(null);
  };

  /* ---------- Horarios (las filas) ---------- */
  const agregarHora = () =>
    enActual((g) => ({ horas: [...g.horas, { id: nuevoId("h"), nombre: "Nuevo horario" }] }));

  const renombrarHora = (id, nombre) =>
    enActual((g) => ({
      horas: g.horas.map((h) => (h.id === id ? { ...h, nombre: nombre || "Sin nombre" } : h)),
    }));

  const quitarHora = (hora) => {
    const ocupadas = grilla.filter((c) => c.hora === hora.id).length;
    if (
      ocupadas &&
      !window.confirm(`¿Eliminar el horario “${hora.nombre}”? Se quitan también sus ${ocupadas} clases.`)
    )
      return;
    enActual((g) => ({
      horas: g.horas.filter((h) => h.id !== hora.id),
      clases: g.clases.filter((c) => c.hora !== hora.id),
    }));
    if (clase?.hora === hora.id) setActiva(null);
  };

  /* ---------- Clases ---------- */
  const agregarClase = (dia, hora) => {
    const nueva = {
      id: nuevoId("g"),
      ciclo: actual.nombre,
      grupo: "Grupo",
      curso: "Curso",
      alumnos: 0,
      materia: "Materia",
      profesor: "Sin asignar",
      aula: nombresSalones()[0],
      dia,
      hora,
      ausente: false,
    };
    setGrilla((previo) => [...previo, nueva]);
    setActiva(nueva.id);
  };

  const quitarClase = (id) => {
    setGrilla((previo) => previo.filter((c) => c.id !== id));
    setActiva(null);
  };

  const alternarAusencia = (id) => {
    setGrilla((previo) =>
      previo.map((c) => (c.id === id ? { ...c, ausente: !c.ausente } : c)),
    );

    const afectada = grilla.find((c) => c.id === id);
    const cuando = `${afectada.dia} ${nombreHora(afectada.hora)}`;
    setRegistro((previo) => [
      {
        id: `${id}-${Date.now()}`,
        texto: afectada.ausente
          ? `${afectada.profesor} vuelve a figurar presente en ${afectada.curso} (${cuando}).`
          : `${afectada.profesor} ausente en ${afectada.curso} (${cuando}). ${afectada.aula} queda libre. Se avisó a preceptoría y dirección.`,
      },
      ...previo,
    ]);
  };

  const limpiar = () => {
    origen.current = null;
    setMoviendo(null);
    setEncima(null);
    setTomado(false);
  };

  /* Soltar en una celda mueve la clase a ese día y hora.
     Si la celda está ocupada, las dos clases intercambian lugar. */
  const soltarEn = (dia, hora) => {
    const id = origen.current;
    if (!id) return limpiar();

    const movida = grilla.find((c) => c.id === id);
    if (movida.dia === dia && movida.hora === hora) return limpiar();

    const ocupante = grilla.find(
      (c) => c.dia === dia && c.hora === hora && c.id !== id,
    );

    setGrilla((previo) =>
      previo.map((c) => {
        if (c.id === id) return { ...c, dia, hora };
        if (ocupante && c.id === ocupante.id)
          return { ...c, dia: movida.dia, hora: movida.hora };
        return c;
      }),
    );

    setRegistro((previo) => [
      {
        id: `${id}-${Date.now()}`,
        texto: ocupante
          ? `${movida.grupo} y ${ocupante.grupo} intercambiaron horario. Se avisó a preceptoría y dirección.`
          : `${movida.grupo} pasó a ${dia} ${nombreHora(hora)}. Se avisó a preceptoría y dirección.`,
      },
      ...previo,
    ]);
    limpiar();
  };

  const exportarLista = (curso) => {
    const url = URL.createObjectURL(
      new Blob([`Listado de ${curso}\n(generado desde la grilla)\n`], {
        type: "text/plain",
      }),
    );
    const enlace = Object.assign(document.createElement("a"), {
      href: url,
      download: `listado-${curso.replace(/[°\s]/g, "")}.txt`,
    });
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout
      ruta={ruta}
      chip="JEFATURA DE ÁREA"
      titulo="Espacios y horarios"
      texto={
        editable
          ? "Hacé clic sobre cualquier dato para corregirlo y arrastrá un bloque del manijero para cambiarlo de día u hora. Un casillero vacío agrega una clase."
          : "Grilla de aulas y talleres del ciclo básico y del superior."
      }
      acciones={
        <div className="filtros__chips">
          {grillas.map((g) => (
            <button
              key={g.id}
              className={`filtro ${actual.id === g.id ? "filtro--activo" : ""}`}
              onClick={() => elegir(g.id)}
            >
              {g.nombre}
            </button>
          ))}
          {editable && (
            <button className="filtro" onClick={crearGrilla}>
              <Icon icon="ph:plus" width={14} height={14} aria-hidden="true" /> Nueva grilla
            </button>
          )}
        </div>
      }
    >
      <div className="grilla__barra">
        <Editable
          key={actual.id}
          etiqueta="h2"
          clase="tarjeta__titulo"
          activo={editable}
          detener
          valor={actual.nombre}
          alCambiar={(v) => enActual(() => ({ nombre: v || "Sin nombre" }))}
        />
        <div className="acciones-fila">
          <button className="boton boton--fino" onClick={exportarPdf}>
            <Icon icon="ph:file-pdf" width={15} height={15} aria-hidden="true" />
            Exportar PDF
          </button>
          {editable && (
            <button
              className="boton boton--fino boton--peligro"
              disabled={grillas.length === 1}
              title={grillas.length === 1 ? "Tiene que quedar al menos una grilla" : undefined}
              onClick={quitarGrilla}
            >
              <Icon icon="ph:trash" width={15} height={15} aria-hidden="true" />
              Eliminar grilla
            </button>
          )}
        </div>
      </div>

      <div className="tabla-scroll grilla__scroll">
        <div className="grilla">
          <div className="grilla__celda grilla__celda--esquina" />
          {dias.map((dia) => (
            <div className="grilla__celda grilla__celda--dia" key={dia}>
              {dia}
            </div>
          ))}

          {actual.horas.map(({ id: hora, nombre }) => (
            <div className="grilla__fila" key={hora}>
              <div className="grilla__celda grilla__celda--hora">
                <Editable
                  activo={editable}
                  detener
                  valor={nombre}
                  alCambiar={(v) => renombrarHora(hora, v)}
                />
                {editable && (
                  <button
                    className="grilla__quitar"
                    aria-label={`Eliminar el horario ${nombre}`}
                    title="Eliminar este horario"
                    onClick={() => quitarHora({ id: hora, nombre })}
                  >
                    <Icon icon="ph:x" width={12} height={12} aria-hidden="true" />
                  </button>
                )}
              </div>
              {dias.map((dia) => {
                const bloque = grilla.find(
                  (c) => c.dia === dia && c.hora === hora,
                );
                const marca = `${dia}-${hora}`;

                return (
                  <div
                    className={`grilla__celda ${
                      encima === marca ? "grilla__celda--destino" : ""
                    }`}
                    key={marca}
                    onDragOver={(e) => {
                      if (!editable) return;
                      e.preventDefault();
                      setEncima(marca);
                    }}
                    onDragLeave={() => setEncima(null)}
                    onDrop={() => editable && soltarEn(dia, hora)}
                  >
                    {bloque ? (
                      <div
                        className={`bloque ${bloque.ausente ? "bloque--libre" : ""} ${
                          activa === bloque.id ? "bloque--activo" : ""
                        } ${moviendo === bloque.id ? "bloque--moviendo" : ""} ${
                          salonCancelado(bloque.aula) ? "bloque--cancelada" : ""
                        }`}
                        onClick={() => setActiva(bloque.id)}
                        draggable={editable && tomado}
                        onDragStart={() => {
                          origen.current = bloque.id;
                          setMoviendo(bloque.id);
                        }}
                        onDragEnd={limpiar}
                      >
                        {editable && (
                          <span
                            className="bloque__manijero"
                            title="Arrastrar a otro día u hora"
                            onMouseDown={() => setTomado(true)}
                            onMouseUp={() => setTomado(false)}
                          >
                            <Icon
                              icon="ph:dots-six-vertical"
                              width={16}
                              height={16}
                              aria-hidden="true"
                            />
                          </span>
                        )}

                        <Editable
                          clase="bloque__grupo"
                          activo={editable}
                          valor={bloque.grupo}
                          alCambiar={(v) => cambiar(bloque.id, "grupo", v)}
                        />

                        {bloque.ausente ? (
                          <span className="bloque__materia">LIBRE</span>
                        ) : (
                          <Editable
                            clase="bloque__materia"
                            activo={editable}
                            valor={bloque.materia}
                            alCambiar={(v) => cambiar(bloque.id, "materia", v)}
                          />
                        )}

                        <span className="bloque__pie">
                          <Editable
                            activo={editable}
                            valor={bloque.aula}
                            alCambiar={(v) => cambiar(bloque.id, "aula", v)}
                          />
                          {" · "}
                          <Editable
                            activo={editable}
                            valor={String(bloque.alumnos)}
                            alCambiar={(v) =>
                              cambiar(bloque.id, "alumnos", Number(v) || 0)
                            }
                          />
                          {" al."}
                        </span>
                        {salonCancelado(bloque.aula) && (
                          <span className="bloque__aviso">Aula cancelada: reubicar</span>
                        )}
                      </div>
                    ) : editable ? (
                      <button
                        className="bloque bloque--vacio bloque--agregar"
                        aria-label={`Agregar una clase el ${dia} en ${nombre}`}
                        title="Agregar una clase"
                        onClick={() => agregarClase(dia, hora)}
                      >
                        <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="bloque bloque--vacio">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {editable && (
        <button className="boton boton--fino grilla__agregar" onClick={agregarHora}>
          <Icon icon="ph:plus" width={15} height={15} aria-hidden="true" />
          Agregar horario
        </button>
      )}

      {clase && (
        <section className="tarjeta">
          <div className="tarjeta__barra">
            <div>
              <p className="chip">{clase.grupo}</p>
              <h2 className="tarjeta__titulo">
                <Editable
                  activo={editable}
                  valor={clase.materia}
                  alCambiar={(v) => cambiar(clase.id, "materia", v)}
                />
              </h2>
            </div>
            <button
              className="cajon__cerrar"
              aria-label="Cerrar"
              onClick={() => setActiva(null)}
            >
              <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
            </button>
          </div>

          <dl className="datos">
            <div>
              <dt>Curso</dt>
              <dd>
                <Editable
                  activo={editable}
                  valor={clase.curso}
                  alCambiar={(v) => cambiar(clase.id, "curso", v)}
                />
              </dd>
            </div>
            <div>
              <dt>Grilla</dt>
              <dd>{actual.nombre}</dd>
            </div>
            <div>
              <dt>Alumnos</dt>
              <dd>
                <Editable
                  activo={editable}
                  valor={String(clase.alumnos)}
                  alCambiar={(v) =>
                    cambiar(clase.id, "alumnos", Number(v) || 0)
                  }
                />
              </dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>
                {clase.dia} · {nombreHora(clase.hora)}
              </dd>
            </div>
            <div>
              <dt>Profesor</dt>
              <dd>
                <Editable
                  activo={editable}
                  valor={clase.profesor}
                  alCambiar={(v) => cambiar(clase.id, "profesor", v)}
                />
              </dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                {clase.ausente ? "Docente ausente · aula libre" : "Normal"}
              </dd>
            </div>
          </dl>

          <div className="acciones-fila">
            {editable && (
              <>
                <button
                  className={`boton ${clase.ausente ? "" : "boton--peligro"}`}
                  onClick={() => alternarAusencia(clase.id)}
                >
                  <Icon
                    icon={
                      clase.ausente
                        ? "ph:arrow-counter-clockwise"
                        : "ph:user-minus"
                    }
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                  {clase.ausente
                    ? "Deshacer ausencia"
                    : "Marcar ausencia del docente"}
                </button>

                <label className="campo campo--select">
                  <span>Reasignar aula</span>
                  <select
                    value={clase.aula}
                    onChange={(e) => cambiar(clase.id, "aula", e.target.value)}
                  >
                    {/* Los salones del plano; si la clase tenía otro, se mantiene. */}
                    {[...new Set([clase.aula, ...nombresSalones()])].map((aula) => (
                      <option key={aula}>{aula}</option>
                    ))}
                  </select>
                </label>

                <button className="boton boton--peligro" onClick={() => quitarClase(clase.id)}>
                  <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                  Quitar de la grilla
                </button>
              </>
            )}

            <button className="boton" onClick={() => exportarLista(clase.curso)}>
              <Icon
                icon="ph:download-simple"
                width={16}
                height={16}
                aria-hidden="true"
              />
              Exportar listado
            </button>

            <a
              className="boton"
              href="https://drive.google.com/drive/my-drive"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon
                icon="ph:google-drive-logo"
                width={16}
                height={16}
                aria-hidden="true"
              />
              Abrir en Drive
            </a>
          </div>
        </section>
      )}

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Registro de avisos</h2>
        <p className="tarjeta__bajada">
          Cada cambio en la grilla deja constancia y notifica a preceptores y
          dirección.
        </p>
        {registro.length ? (
          <ul className="avisos">
            {registro.map((item) => (
              <li className="avisos__item avisos__item--ausencia" key={item.id}>
                <Icon icon="ph:bell" width={20} height={20} aria-hidden="true" />
                <div>
                  <p className="avisos__titulo">{item.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nota-interna">Todavía no hubo cambios en esta sesión.</p>
        )}
      </section>
    </Layout>
  );
}
