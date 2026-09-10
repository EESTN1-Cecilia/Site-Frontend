import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import Editable from "../../components/Editable.jsx";
import { aulas, dias, grillaInicial, horas } from "../../panelData.js";
import { puedeEditar } from "../../sesion.js";

const ciclos = ["Todos", "Básico", "Superior"];

export default function Grilla({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const [grilla, setGrilla] = useState(grillaInicial);
  const [ciclo, setCiclo] = useState("Todos");
  const [activa, setActiva] = useState(null);
  const [registro, setRegistro] = useState([]);
  const origen = useRef(null);
  const [moviendo, setMoviendo] = useState(null);
  const [encima, setEncima] = useState(null);
  const [tomado, setTomado] = useState(false);

  const visibles = grilla.filter(
    (clase) => ciclo === "Todos" || clase.ciclo === ciclo,
  );
  const clase = grilla.find((c) => c.id === activa);

  const cambiar = (id, campo, valor) =>
    setGrilla((previo) =>
      previo.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)),
    );

  const alternarAusencia = (id) => {
    setGrilla((previo) =>
      previo.map((c) => (c.id === id ? { ...c, ausente: !c.ausente } : c)),
    );

    const afectada = grilla.find((c) => c.id === id);
    setRegistro((previo) => [
      {
        id: `${id}-${Date.now()}`,
        texto: afectada.ausente
          ? `${afectada.profesor} vuelve a figurar presente en ${afectada.curso} (${afectada.dia} ${afectada.hora}).`
          : `${afectada.profesor} ausente en ${afectada.curso} (${afectada.dia} ${afectada.hora}). ${afectada.aula} queda libre. Se avisó a preceptoría y dirección.`,
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
          : `${movida.grupo} pasó a ${dia} ${hora}. Se avisó a preceptoría y dirección.`,
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
          ? "Hacé clic sobre cualquier dato para corregirlo y arrastrá un bloque del manijero para cambiarlo de día u hora."
          : "Grilla de aulas y talleres del ciclo básico y del superior."
      }
      acciones={
        <div className="filtros__chips">
          {ciclos.map((valor) => (
            <button
              key={valor}
              className={`filtro ${ciclo === valor ? "filtro--activo" : ""}`}
              onClick={() => setCiclo(valor)}
            >
              {valor}
            </button>
          ))}
        </div>
      }
    >
      <div className="tabla-scroll">
        <div className="grilla">
          <div className="grilla__celda grilla__celda--esquina" />
          {dias.map((dia) => (
            <div className="grilla__celda grilla__celda--dia" key={dia}>
              {dia}
            </div>
          ))}

          {horas.map((hora) => (
            <div className="grilla__fila" key={hora}>
              <div className="grilla__celda grilla__celda--hora">{hora}</div>
              {dias.map((dia) => {
                const bloque = visibles.find(
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
                        } ${moviendo === bloque.id ? "bloque--moviendo" : ""}`}
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
                      </div>
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
              <dt>Ciclo</dt>
              <dd>{clase.ciclo}</dd>
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
                {clase.dia} · {clase.hora}
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
                    {aulas.map((aula) => (
                      <option key={aula}>{aula}</option>
                    ))}
                  </select>
                </label>
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
