import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { alumnos as alumnosIniciales, cursos, tutores } from "../../panelData.js";
import { logo } from "../../data.js";
import { puedeEditar } from "../../sesion.js";
import Editable from "../../components/Editable.jsx";

/* Acá van los datos de la persona, no su trayectoria: faltas, condición y
   materias deudoras quedan fuera de este sector. */

/* 1° 1 pasa a 2° 1; 7° egresa. */
const promover = (curso) => {
  const [anio, division] = curso.split(" ");
  const numero = Number(anio.replace("°", ""));
  return numero >= 7 ? "Egresado" : `${numero + 1}° ${division}`;
};

export default function Alumnos({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const [lista, setLista] = useState(alumnosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [curso, setCurso] = useState("Todos");
  const [seleccion, setSeleccion] = useState([]);
  const [rapido, setRapido] = useState(null);
  const [completo, setCompleto] = useState(null);
  const [constancia, setConstancia] = useState(null);
  const [aviso, setAviso] = useState("");

  const texto = busqueda.trim().toLowerCase();
  const filtrados = lista.filter(
    (alumno) =>
      (`${alumno.apellido} ${alumno.nombre}`.toLowerCase().includes(texto) ||
        alumno.dni.includes(texto) ||
        alumno.curso.toLowerCase().includes(texto)) &&
      (curso === "Todos" || alumno.curso === curso),
  );

  const alumnoRapido = lista.find((a) => a.id === rapido);
  const alumnoCompleto = lista.find((a) => a.id === completo);

  const editarAlumno = (id, campo, valor) =>
    setLista((previo) =>
      previo.map((alumno) =>
        alumno.id === id ? { ...alumno, [campo]: valor } : alumno,
      ),
    );

  const marcar = (id) =>
    setSeleccion((previo) =>
      previo.includes(id) ? previo.filter((x) => x !== id) : [...previo, id],
    );

  const marcarTodos = () =>
    setSeleccion(
      seleccion.length === filtrados.length ? [] : filtrados.map((a) => a.id),
    );

  const pasarDeAnio = () => {
    setLista((previo) =>
      previo.map((alumno) =>
        seleccion.includes(alumno.id)
          ? { ...alumno, curso: promover(alumno.curso) }
          : alumno,
      ),
    );
    setAviso(`${seleccion.length} alumno/s pasaron de año.`);
    setSeleccion([]);
  };

  return (
    <Layout
      ruta={ruta}
      chip="SECRETARÍA"
      titulo="Alumnos"
      texto="Buscá por DNI, apellido o curso. Si falta un dato, alcanza con cualquiera de los otros."
      acciones={
        editable && (
          <button
            className="boton boton--primario"
            disabled={seleccion.length === 0}
            onClick={pasarDeAnio}
          >
            <Icon
              icon="ph:arrow-fat-line-up"
              width={16}
              height={16}
              aria-hidden="true"
            />
            Pasar de año ({seleccion.length})
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

      <div className="filtros">
        <label className="campo campo--busca">
          <Icon icon="ph:magnifying-glass" width={18} height={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="DNI, apellido, nombre o curso"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label className="campo campo--select">
          <span>Curso</span>
          <select value={curso} onChange={(e) => setCurso(e.target.value)}>
            <option>Todos</option>
            {cursos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tabla-scroll">
        <table className="tabla tabla--panel">
          <thead>
            <tr>
              <th className="tabla__check">
                {editable && (
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    checked={
                      filtrados.length > 0 &&
                      seleccion.length === filtrados.length
                    }
                    onChange={marcarTodos}
                  />
                )}
              </th>
              <th>Curso</th>
              <th>Apellido y nombre</th>
              <th>DNI</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((alumno) => (
              <tr
                key={alumno.id}
                className={rapido === alumno.id ? "tabla__fila--activa" : ""}
              >
                <td className="tabla__check">
                  {editable && (
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${alumno.apellido}`}
                      checked={seleccion.includes(alumno.id)}
                      onChange={() => marcar(alumno.id)}
                    />
                  )}
                </td>
                <td data-label="Curso">{alumno.curso}</td>
                <td data-label="Alumno">
                  <button className="enlace" onClick={() => setRapido(alumno.id)}>
                    {alumno.apellido}, {alumno.nombre}
                  </button>
                </td>
                <td data-label="DNI">{alumno.dni}</td>
                <td>
                  <button
                    className="boton boton--fino"
                    onClick={() => setRapido(alumno.id)}
                  >
                    Vista rápida
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtrados.length === 0 && (
        <p className="vacio">Ningún alumno coincide con la búsqueda.</p>
      )}

      {/* Vista rápida: pocos datos y un botón al perfil completo. */}
      {alumnoRapido && (
        <div className="cajon">
          <div className="cajon__panel">
            <div className="cajon__barra">
              <p className="cajon__titulo">
                {alumnoRapido.apellido}, {alumnoRapido.nombre}
              </p>
              <button
                className="cajon__cerrar"
                aria-label="Cerrar"
                onClick={() => setRapido(null)}
              >
                <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
              </button>
            </div>
            <dl className="datos">
              <div>
                <dt>Curso</dt>
                <dd>{alumnoRapido.curso}</dd>
              </div>
              <div>
                <dt>DNI</dt>
                <dd>{alumnoRapido.dni}</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>{alumnoRapido.telefono}</dd>
              </div>
            </dl>
            <button
              className="boton boton--primario boton--ancho"
              onClick={() => {
                setCompleto(alumnoRapido.id);
                setRapido(null);
              }}
            >
              Ver perfil completo
              <Icon icon="ph:arrow-right" width={16} height={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {alumnoCompleto && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__caja">
            <div className="modal__barra">
              <div>
                <p className="chip">LEGAJO COMPLETO</p>
                <h2 className="modal__titulo">
                  {alumnoCompleto.apellido}, {alumnoCompleto.nombre}
                </h2>
              </div>
              <button
                className="cajon__cerrar"
                aria-label="Cerrar"
                onClick={() => setCompleto(null)}
              >
                <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
              </button>
            </div>

            <div className="modal__cuerpo">
              <section>
                <h3 className="bloque__titulo">Datos personales</h3>
                <dl className="datos">
                  {[
                    ["DNI", "dni"],
                    ["Curso", "curso"],
                    ["Email", "email"],
                    ["Teléfono", "telefono"],
                    ["Libro", "libro"],
                    ["Folio", "folio"],
                  ].map(([etiqueta, campo]) => (
                    <div key={campo}>
                      <dt>{etiqueta}</dt>
                      <dd>
                        <Editable
                          activo={editable}
                          valor={alumnoCompleto[campo]}
                          alCambiar={(v) =>
                            editarAlumno(alumnoCompleto.id, campo, v)
                          }
                        />
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Mayor de edad</dt>
                    <dd>{alumnoCompleto.mayorEdad ? "Sí" : "No"}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="bloque__titulo">Tutores</h3>
                <div className="tabla-scroll">
                  <table className="tabla tabla--panel">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Vínculo</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tutores[alumnoCompleto.id] || []).map((tutor) => (
                        <tr key={tutor[0]}>
                          <td data-label="Nombre">{tutor[0]}</td>
                          <td data-label="Vínculo">{tutor[1]}</td>
                          <td data-label="Teléfono">{tutor[2]}</td>
                          <td data-label="Email">{tutor[3]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>

            <div className="modal__pie">
              {!editable ? (
                <p className="bloqueado">
                  <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
                  Sólo consulta: la constancia y el pase los emite Secretaría.
                </p>
              ) : (
                <button
                  className="boton boton--primario"
                  onClick={() => setConstancia(alumnoCompleto)}
                >
                  <Icon icon="ph:printer" width={16} height={16} aria-hidden="true" />
                  Imprimir constancia de alumno regular
                </button>
              )}

              {!editable ? null : alumnoCompleto.libro && alumnoCompleto.folio ? (
                <button
                  className="boton"
                  onClick={() =>
                    setAviso(
                      `Pase iniciado para ${alumnoCompleto.apellido}, ${alumnoCompleto.nombre}. Queda pendiente el visto de Dirección.`,
                    )
                  }
                >
                  <Icon
                    icon="ph:arrows-left-right"
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                  Cambio de colegio
                </button>
              ) : (
                <p className="bloqueado">
                  <Icon icon="ph:lock" width={16} height={16} aria-hidden="true" />
                  Cambio de colegio no disponible: falta el asiento en el Libro
                  Matriz.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {constancia && (
        <div className="modal modal--imprimir" role="dialog" aria-modal="true">
          <div className="modal__caja modal__caja--angosta">
            <article className="constancia">
              <img className="constancia__logo" src={logo} alt="" />
              <h2 className="constancia__titulo">
                Constancia de alumno regular
              </h2>
              <p className="constancia__texto">
                Se deja constancia de que <strong>{constancia.apellido},{" "}
                {constancia.nombre}</strong>, DNI {constancia.dni}, es alumno/a
                regular de la E.E.S. Técnica N°1 “Cecilia Berdichevski”, cursando{" "}
                {constancia.curso} durante el ciclo lectivo 2026.
              </p>
              <p className="constancia__texto">
                Libro {constancia.libro} · Folio {constancia.folio}.
              </p>
              <p className="constancia__pie">
                Esteban Echeverría, {new Date().toLocaleDateString("es-AR")}
              </p>
            </article>
            <div className="modal__pie">
              <button className="boton boton--primario" onClick={() => window.print()}>
                <Icon icon="ph:printer" width={16} height={16} aria-hidden="true" />
                Imprimir
              </button>
              <button className="boton" onClick={() => setConstancia(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
