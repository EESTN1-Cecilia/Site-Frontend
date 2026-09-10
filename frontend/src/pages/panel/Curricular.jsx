import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { curricular as curricularInicial } from "../../panelData.js";
import { puedeEditar } from "../../sesion.js";
import Editable from "../../components/Editable.jsx";

export default function Curricular({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const [curricular, setCurricular] = useState(curricularInicial);
  const [orientacion, setOrientacion] = useState(curricularInicial[0].orientacion);
  const [anio, setAnio] = useState(curricularInicial[0].anios[0].anio);
  const [materia, setMateria] = useState(null);
  const [planificaciones, setPlanificaciones] = useState({});

  const rama = curricular.find((r) => r.orientacion === orientacion);
  const nivel = rama.anios.find((a) => a.anio === anio) || rama.anios[0];
  const elegida = nivel.materias.find((m) => m.nombre === materia);

  const cambiarOrientacion = (valor) => {
    const nueva = curricular.find((r) => r.orientacion === valor);
    setOrientacion(valor);
    setAnio(nueva.anios[0].anio);
    setMateria(null);
  };

  /* Toca sólo la materia abierta, dentro de su año y su orientación. */
  const cambiarMateria = (cambio) =>
    setCurricular((previo) =>
      previo.map((r) =>
        r.orientacion !== orientacion
          ? r
          : {
              ...r,
              anios: r.anios.map((a) =>
                a.anio !== nivel.anio
                  ? a
                  : {
                      ...a,
                      materias: a.materias.map((m) =>
                        m.nombre === materia ? { ...m, ...cambio } : m,
                      ),
                    },
              ),
            },
      ),
    );

  const cambiarTema = (indice, texto) =>
    cambiarMateria({
      temario: elegida.temario.map((t, i) => (i === indice ? texto : t)),
    });

  const subirPlanificacion = (nombre) => (e) => {
    const archivo = e.target.files?.[0];
    if (archivo)
      setPlanificaciones((previo) => ({ ...previo, [nombre]: archivo.name }));
  };

  return (
    <Layout
      ruta={ruta}
      chip="JEFATURA DE ÁREA"
      titulo="Seguimiento curricular"
      texto="Entrá por orientación, año y materia para ver docente, horario, temario oficial y planificación."
    >
      <div className="cascada">
        <div className="cascada__col">
          <p className="cascada__titulo">Orientación</p>
          {curricular.map((rama) => (
            <button
              key={rama.orientacion}
              className={`cascada__item ${
                orientacion === rama.orientacion ? "cascada__item--activo" : ""
              }`}
              onClick={() => cambiarOrientacion(rama.orientacion)}
            >
              {rama.orientacion}
              <Icon icon="ph:caret-right" width={14} height={14} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="cascada__col">
          <p className="cascada__titulo">Año</p>
          {rama.anios.map((item) => (
            <button
              key={item.anio}
              className={`cascada__item ${
                nivel.anio === item.anio ? "cascada__item--activo" : ""
              }`}
              onClick={() => {
                setAnio(item.anio);
                setMateria(null);
              }}
            >
              {item.anio}
              <Icon icon="ph:caret-right" width={14} height={14} aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="cascada__col">
          <p className="cascada__titulo">Materia</p>
          {nivel.materias.map((item) => (
            <button
              key={item.nombre}
              className={`cascada__item ${
                materia === item.nombre ? "cascada__item--activo" : ""
              }`}
              onClick={() => setMateria(item.nombre)}
            >
              {item.nombre}
              <Icon icon="ph:caret-right" width={14} height={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {elegida ? (
        <section className="tarjeta">
          <h2 className="tarjeta__titulo">{elegida.nombre}</h2>
          <dl className="datos">
            <div>
              <dt>Docente</dt>
              <dd>
                <Editable
                  activo={editable}
                  valor={elegida.profesor}
                  alCambiar={(v) => cambiarMateria({ profesor: v })}
                />
              </dd>
            </div>
            <div>
              <dt>Horario</dt>
              <dd>
                <Editable
                  activo={editable}
                  valor={elegida.horario}
                  alCambiar={(v) => cambiarMateria({ horario: v })}
                />
              </dd>
            </div>
            <div>
              <dt>Aula</dt>
              <dd>
                <Editable
                  activo={editable}
                  valor={elegida.aula}
                  alCambiar={(v) => cambiarMateria({ aula: v })}
                />
              </dd>
            </div>
            <div>
              <dt>Año</dt>
              <dd>
                {nivel.anio} · {orientacion}
              </dd>
            </div>
          </dl>

          <h3 className="bloque__titulo">Temario oficial (diseño curricular)</h3>
          <ol className="temario">
            {elegida.temario.map((tema, indice) => (
              <li key={`${tema}-${indice}`}>
                <Editable
                  activo={editable}
                  valor={tema}
                  alCambiar={(v) => cambiarTema(indice, v)}
                />
                {editable && (
                  <button
                    className="temario__quitar"
                    aria-label={`Quitar ${tema}`}
                    onClick={() =>
                      cambiarMateria({
                        temario: elegida.temario.filter((_, i) => i !== indice),
                      })
                    }
                  >
                    <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ol>

          {editable && (
            <button
              className="boton boton--fino"
              onClick={() =>
                cambiarMateria({
                  temario: [...elegida.temario, "Nuevo contenido"],
                })
              }
            >
              <Icon icon="ph:plus" width={15} height={15} aria-hidden="true" />
              Agregar contenido
            </button>
          )}

          <h3 className="bloque__titulo">Planificación docente</h3>
          {planificaciones[elegida.nombre] || elegida.planificacion ? (
            <p className="archivo">
              <Icon icon="ph:file-pdf" width={20} height={20} aria-hidden="true" />
              {planificaciones[elegida.nombre] || elegida.planificacion}
              <span className="etiqueta etiqueta--ok">Presentada</span>
            </p>
          ) : (
            <p className="archivo archivo--falta">
              <Icon icon="ph:warning" width={20} height={20} aria-hidden="true" />
              Sin planificación cargada
              <span className="etiqueta etiqueta--alerta">Pendiente</span>
            </p>
          )}

          {editable && (
            <label className="boton boton--archivo boton--primario">
              <Icon
                icon="ph:upload-simple"
                width={16}
                height={16}
                aria-hidden="true"
              />
              Adjuntar planificación
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={subirPlanificacion(elegida.nombre)}
              />
            </label>
          )}
        </section>
      ) : (
        <p className="vacio">Elegí una materia para ver el detalle.</p>
      )}
    </Layout>
  );
}
