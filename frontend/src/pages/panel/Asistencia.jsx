import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { alumnos as alumnosIniciales, cursos } from "../../panelData.js";
import { puedeEditar } from "../../sesion.js";

const estados = ["Presente", "Ausente", "Tarde", "Justificada"];
const DIAS_ALERTA = 5;

export default function Asistencia({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const [lista, setLista] = useState(alumnosIniciales);
  const [curso, setCurso] = useState(cursos[0]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [registro, setRegistro] = useState({});
  const [observando, setObservando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [medida, setMedida] = useState("");
  const [aviso, setAviso] = useState("");

  const delCurso = lista.filter((alumno) => alumno.curso === curso);
  const alertas = lista.filter((alumno) => alumno.diasSeguidos >= DIAS_ALERTA);

  const guardar = () => {
    setLista((previo) =>
      previo.map((alumno) => {
        const estado = registro[alumno.id];
        if (!estado || alumno.curso !== curso) return alumno;

        const falta = estado === "Ausente";
        return {
          ...alumno,
          inasistencias: alumno.inasistencias + (falta ? 1 : 0),
          diasSeguidos: falta ? alumno.diasSeguidos + 1 : 0,
        };
      }),
    );
    setAviso(`Asistencia del ${fecha} guardada para ${curso}.`);
    setRegistro({});
  };

  const guardarObservacion = (e) => {
    e.preventDefault();
    setLista((previo) =>
      previo.map((alumno) =>
        alumno.id === observando.id
          ? {
              ...alumno,
              observaciones: [
                ...alumno.observaciones,
                { fecha, motivo, medida },
              ],
            }
          : alumno,
      ),
    );
    setAviso(`Observación registrada para ${observando.apellido}.`);
    setObservando(null);
    setMotivo("");
    setMedida("");
  };

  return (
    <Layout
      ruta={ruta}
      chip="PRECEPTORÍA"
      titulo="Carga de inasistencias"
      texto="Tomá lista por curso y registrá el motivo y las medidas tomadas cuando un alumno sigue faltando."
      acciones={
        editable && (
          <button
            className="boton boton--primario"
            disabled={Object.keys(registro).length === 0}
            onClick={guardar}
          >
            <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
            Guardar asistencia
          </button>
        )
      }
    >
      {aviso && (
        <p className="flash">
          <Icon icon="ph:check-circle" width={18} height={18} aria-hidden="true" />
          {aviso}
          <button className="flash__cerrar" onClick={() => setAviso("")}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}

      {alertas.length > 0 && (
        <section className="tarjeta tarjeta--alerta">
          <h2 className="tarjeta__titulo">
            <Icon icon="ph:bell-ringing" width={20} height={20} aria-hidden="true" />
            Alerta automática de ausencias prolongadas
          </h2>
          <p className="tarjeta__bajada">
            Se notificó a dirección: estos alumnos llevan {DIAS_ALERTA} días o
            más sin asistir.
          </p>
          <ul className="avisos">
            {alertas.map((alumno) => (
              <li className="avisos__item avisos__item--alerta" key={alumno.id}>
                <Icon icon="ph:warning" width={20} height={20} aria-hidden="true" />
                <div>
                  <p className="avisos__titulo">
                    {alumno.apellido}, {alumno.nombre} ({alumno.curso})
                  </p>
                  <p className="avisos__detalle">
                    {alumno.diasSeguidos} días seguidos ·{" "}
                    {alumno.inasistencias} inasistencias totales
                  </p>
                </div>
                {editable && (
                  <button
                    className="boton boton--fino"
                    onClick={() => setObservando(alumno)}
                  >
                    Registrar medida
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="filtros">
        <label className="campo campo--select">
          <span>Curso</span>
          <select value={curso} onChange={(e) => setCurso(e.target.value)}>
            {cursos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="campo campo--select">
          <span>Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>
      </div>

      <div className="tabla-scroll">
        <table className="tabla tabla--panel">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>DNI</th>
              <th>Estado del día</th>
              <th>Acumuladas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {delCurso.map((alumno) => (
              <tr key={alumno.id}>
                <td data-label="Alumno">
                  {alumno.apellido}, {alumno.nombre}
                </td>
                <td data-label="DNI">{alumno.dni}</td>
                <td data-label="Estado">
                  <div className="opciones">
                    {estados.map((estado) => (
                      <label className="opcion" key={estado}>
                        <input
                          type="radio"
                          disabled={!editable}
                          name={`asistencia-${alumno.id}`}
                          checked={registro[alumno.id] === estado}
                          onChange={() =>
                            setRegistro((previo) => ({
                              ...previo,
                              [alumno.id]: estado,
                            }))
                          }
                        />
                        <span>{estado}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td data-label="Acumuladas">{alumno.inasistencias}</td>
                <td>
                  {editable && (
                    <button
                      className="boton boton--fino"
                      onClick={() => setObservando(alumno)}
                    >
                      Observación
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {delCurso.length === 0 && (
        <p className="vacio">No hay alumnos cargados en {curso}.</p>
      )}

      {observando && (
        <div className="modal" role="dialog" aria-modal="true">
          <form className="modal__caja modal__caja--angosta" onSubmit={guardarObservacion}>
            <div className="modal__barra">
              <div>
                <p className="chip">OBSERVACIÓN</p>
                <h2 className="modal__titulo">
                  {observando.apellido}, {observando.nombre}
                </h2>
              </div>
              <button
                type="button"
                className="cajon__cerrar"
                aria-label="Cerrar"
                onClick={() => setObservando(null)}
              >
                <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
              </button>
            </div>
            <div className="modal__cuerpo">
              <label className="campo campo--ancho">
                <span>Motivo de la inasistencia</span>
                <input
                  required
                  placeholder="Turno médico, se desconoce, viaje familiar…"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
              <label className="campo campo--ancho">
                <span>Medida tomada</span>
                <textarea
                  required
                  rows={3}
                  placeholder="Llamado a los padres, nota en la libreta, citación, derivación al EOE…"
                  value={medida}
                  onChange={(e) => setMedida(e.target.value)}
                />
              </label>
              {observando.observaciones.length > 0 && (
                <>
                  <h3 className="bloque__titulo">Registro anterior</h3>
                  <ul className="observaciones">
                    {observando.observaciones.map((obs, i) => (
                      <li key={`${obs.fecha}-${i}`}>
                        <p className="observaciones__fecha">{obs.fecha}</p>
                        <p className="observaciones__motivo">
                          Motivo: {obs.motivo}
                        </p>
                        <p className="observaciones__medida">{obs.medida}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="modal__pie">
              <button className="boton boton--primario" type="submit">
                Guardar observación
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
