import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import Texto, {
  Bloque,
  Campo,
  Caso,
  useEdicionTextos,
  useLista,
  usePlano,
} from "../components/Texto.jsx";
import { pasosInscripcion, requisitos } from "../contenido.js";
import { useAjustes } from "../ajustes.js";

const vacio = {
  apellido: "",
  nombre: "",
  dni: "",
  nacimiento: "",
  escuela: "",
  orientacion: "Ciclo Básico",
  tutor: "",
  vinculo: "Madre",
  telefono: "",
  email: "",
  comentario: "",
};

const secciones = [
  { id: "pasos", clase: "seccion contenedor" },
  { id: "requisitos", clase: "seccion-alt" },
  { id: "formulario", clase: "seccion contenedor" },
];

/* Etiqueta de un campo del formulario, editable desde gestión. */
const Rotulo = ({ id, children }) => (
  <span>
    <Texto id={`inscripcion.campos.${id}`}>{children}</Texto>
  </span>
);

/* Desplegable con opciones editables. El valor que se envía es el original;
   lo que se edita es el texto que se muestra. En el editor, un <option> no
   admite texto editable, así que las opciones se listan una debajo de otra. */
function Selector({ id, opciones, ...resto }) {
  const edicion = useEdicionTextos();
  const plano = usePlano();
  const clave = (i) => `inscripcion.opciones.${id}.${i}`;

  if (edicion?.puede())
    return (
      <span className="campo__opciones">
        {opciones.map((opcion, i) => (
          <Texto key={opcion} id={clave(i)}>
            {opcion}
          </Texto>
        ))}
      </span>
    );

  return (
    <select {...resto}>
      {opciones.map((opcion, i) => (
        <option key={opcion} value={opcion}>
          {plano(clave(i), opcion)}
        </option>
      ))}
    </select>
  );
}

export default function Inscripcion() {
  const [datos, setDatos] = useState(vacio);
  const [enviado, setEnviado] = useState(false);
  const { inscripcionAbierta, mensajeCierre } = useAjustes();

  const [listaSecciones, bloqueSeccion] = useLista("inscripcion.secciones", secciones);
  const [pasos, bloquePaso] = useLista(
    "inscripcion.pasos",
    pasosInscripcion.map(([titulo, detalle], i) => ({ id: `p${i}`, titulo, detalle })),
    { duplicable: true },
  );
  const [listaRequisitos, bloqueRequisito] = useLista(
    "inscripcion.requisitos",
    requisitos.map(([icono, titulo, detalle], i) => ({ id: `r${i}`, icono, titulo, detalle })),
    { duplicable: true },
  );

  const cambiar = (campo) => (e) =>
    setDatos((previo) => ({ ...previo, [campo]: e.target.value }));

  /* Sin backend todavía: la solicitud queda registrada en pantalla. */
  const enviar = (e) => {
    e.preventDefault();
    setEnviado(true);
  };

  const contenido = {
    pasos: (
      <>
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="inscripcion.pasos.chip">CÓMO ES</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="inscripcion.pasos.titulo">El trámite,</Texto>{" "}
              <Texto id="inscripcion.pasos.destacado" clase="titulo__destacado">
                paso a paso
              </Texto>
            </h2>
          </div>
        </div>
        <ol className="linea">
          {pasos.map((paso, i) => (
            <Bloque key={paso.id} {...bloquePaso(paso)} como="li" className="linea__item">
              <span className="linea__numero">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="linea__titulo">
                  <Texto id={`inscripcion.pasos.${paso.id}.titulo`}>{paso.titulo}</Texto>
                </h3>
                <p className="linea__texto">
                  <Texto id={`inscripcion.pasos.${paso.id}.texto`}>{paso.detalle}</Texto>
                </p>
              </div>
            </Bloque>
          ))}
        </ol>
      </>
    ),

    requisitos: (
      <div className="contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="inscripcion.requisitos.chip">DOCUMENTACIÓN</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="inscripcion.requisitos.titulo">Qué tenés que</Texto>{" "}
              <Texto id="inscripcion.requisitos.destacado" clase="titulo__destacado">
                presentar
              </Texto>
            </h2>
          </div>
        </div>
        <div className="tarjetas-3">
          {listaRequisitos.map((r) => (
            <Bloque key={r.id} {...bloqueRequisito(r)} como="article" className="mini">
              <span className="mini__icono">
                <Icon icon={r.icono} width={24} height={24} aria-hidden="true" />
              </span>
              <h3 className="mini__titulo">
                <Texto id={`inscripcion.requisitos.${r.id}.titulo`}>{r.titulo}</Texto>
              </h3>
              <p className="mini__texto">
                <Texto id={`inscripcion.requisitos.${r.id}.texto`}>{r.detalle}</Texto>
              </p>
            </Bloque>
          ))}
        </div>
      </div>
    ),

    formulario: (
      <>
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="inscripcion.formulario.chip">FORMULARIO</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="inscripcion.formulario.titulo">Solicitud de</Texto>{" "}
              <Texto id="inscripcion.formulario.destacado" clase="titulo__destacado">
                vacante
              </Texto>
            </h2>
          </div>
          <p className="descripcion">
            <Texto id="inscripcion.formulario.descripcion">
              Es una preinscripción: la vacante se confirma al presentar la
              documentación.
            </Texto>
          </p>
        </div>

        {!inscripcionAbierta ? (
          <div className="cerrada">
            <Icon icon="ph:lock-simple" width={40} height={40} aria-hidden="true" />
            <h3 className="cerrada__titulo">
              <Texto id="inscripcion.cerrada.titulo">La inscripción está cerrada</Texto>
            </h3>
            <p className="cerrada__texto">{mensajeCierre}</p>
          </div>
        ) : (
          <>
          <Caso visible={enviado} cuando="después de enviar la solicitud">
            <div className="exito">
              <Icon icon="ph:check-circle" width={44} height={44} aria-hidden="true" />
              <h3 className="exito__titulo">
                <Texto id="inscripcion.exito.titulo">Solicitud registrada</Texto>
              </h3>
              <p className="exito__texto">
                <Texto id="inscripcion.exito.saludo">Gracias,</Texto> {datos.nombre || "[nombre]"}.{" "}
                <Texto id="inscripcion.exito.antesEmail">Secretaría se comunica a</Texto>{" "}
                {datos.email || "[email]"}{" "}
                <Texto id="inscripcion.exito.despuesEmail">
                  con el turno para presentar la documentación.
                </Texto>
              </p>
              <button
                className="pill"
                onClick={() => {
                  setDatos(vacio);
                  setEnviado(false);
                }}
              >
                <Texto id="inscripcion.exito.otra">Cargar otra solicitud</Texto>
              </button>
            </div>
          </Caso>
          {!enviado && (
          <form className="formulario" onSubmit={enviar}>
            <p className="formulario__grupo">
              <Texto id="inscripcion.campos.grupoEstudiante">Datos del estudiante</Texto>
            </p>
            <label className="campo">
              <Rotulo id="apellido">Apellido</Rotulo>
              <input required value={datos.apellido} onChange={cambiar("apellido")} />
            </label>
            <label className="campo">
              <Rotulo id="nombre">Nombre</Rotulo>
              <input required value={datos.nombre} onChange={cambiar("nombre")} />
            </label>
            <label className="campo">
              <Rotulo id="dni">DNI</Rotulo>
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{7,8}"
                title="7 u 8 dígitos, sin puntos"
                value={datos.dni}
                onChange={cambiar("dni")}
              />
            </label>
            <label className="campo">
              <Rotulo id="nacimiento">Fecha de nacimiento</Rotulo>
              <input required type="date" value={datos.nacimiento} onChange={cambiar("nacimiento")} />
            </label>
            <label className="campo campo--ancho">
              <Rotulo id="escuela">Escuela primaria de origen</Rotulo>
              <input required value={datos.escuela} onChange={cambiar("escuela")} />
            </label>
            <label className="campo">
              <Rotulo id="orientacion">Ingresa a</Rotulo>
              <Selector
                id="orientacion"
                opciones={["Ciclo Básico", "Ciclo Superior · Informática", "Ciclo Superior · Programación"]}
                value={datos.orientacion}
                onChange={cambiar("orientacion")}
              />
            </label>

            <p className="formulario__grupo">
              <Texto id="inscripcion.campos.grupoAdulto">Adulto responsable</Texto>
            </p>
            <label className="campo">
              <Rotulo id="tutor">Apellido y nombre</Rotulo>
              <input required value={datos.tutor} onChange={cambiar("tutor")} />
            </label>
            <label className="campo">
              <Rotulo id="vinculo">Vínculo</Rotulo>
              <Selector
                id="vinculo"
                opciones={["Madre", "Padre", "Tutor/a"]}
                value={datos.vinculo}
                onChange={cambiar("vinculo")}
              />
            </label>
            <label className="campo">
              <Rotulo id="telefono">Teléfono</Rotulo>
              <input required type="tel" value={datos.telefono} onChange={cambiar("telefono")} />
            </label>
            <label className="campo">
              <Rotulo id="email">Email</Rotulo>
              <input required type="email" value={datos.email} onChange={cambiar("email")} />
            </label>
            <label className="campo campo--ancho">
              <Rotulo id="comentario">Comentarios (opcional)</Rotulo>
              <Campo
                como="textarea"
                id="inscripcion.campos.comentarioAyuda"
                rows={3}
                placeholder="Condiciones de salud, accesibilidad, hermanos en la escuela…"
                value={datos.comentario}
                onChange={cambiar("comentario")}
              />
            </label>

            <button className="pill formulario__enviar" type="submit">
              <Texto id="inscripcion.campos.enviar">Enviar solicitud</Texto>
              <Icon icon="ph:paper-plane-tilt" width={16} height={16} aria-hidden="true" />
            </button>
          </form>
          )}
          </>
        )}
      </>
    ),
  };

  return (
    <main>
      <Encabezado id="inscripcion.hero"
        chip={<Texto id="inscripcion.hero.chip">CICLO LECTIVO 2027</Texto>}
        titulo={<Texto id="inscripcion.hero.titulo">Inscripción</Texto>}
        destacado={
          inscripcionAbierta ? (
            <Texto id="inscripcion.hero.abierta">abierta</Texto>
          ) : (
            <Texto id="inscripcion.hero.cerrada">cerrada</Texto>
          )
        }
        texto={
          inscripcionAbierta ? (
            <Texto id="inscripcion.hero.texto">
              Del 15 al 30 de septiembre recibimos las solicitudes de ingreso a
              1° año. Completá el formulario y secretaría te asigna un turno
              para presentar la documentación.
            </Texto>
          ) : (
            mensajeCierre
          )
        }
      />

      {listaSecciones.map((seccion) => (
        <Bloque key={seccion.id} {...bloqueSeccion(seccion)} como="section" className={seccion.clase}>
          {contenido[seccion.id]}
        </Bloque>
      ))}
    </main>
  );
}
