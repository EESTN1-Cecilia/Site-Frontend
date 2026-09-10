import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import { pasosInscripcion, requisitos } from "../contenido.js";

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

export default function Inscripcion() {
  const [datos, setDatos] = useState(vacio);
  const [enviado, setEnviado] = useState(false);

  const cambiar = (campo) => (e) =>
    setDatos((previo) => ({ ...previo, [campo]: e.target.value }));

  /* Sin backend todavía: la solicitud queda registrada en pantalla. */
  const enviar = (e) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <main>
      <Encabezado
        chip="CICLO LECTIVO 2027"
        titulo="Inscripción"
        destacado="abierta"
        texto="Del 15 al 30 de septiembre recibimos las solicitudes de ingreso a 1° año. Completá el formulario y secretaría te asigna un turno para presentar la documentación."
      />

      <section className="seccion contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">CÓMO ES</p>
            <h2 className="titulo">
              El trámite, <span>paso a paso</span>
            </h2>
          </div>
        </div>
        <ol className="linea">
          {pasosInscripcion.map(([titulo, texto], i) => (
            <li className="linea__item" key={titulo}>
              <span className="linea__numero">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="linea__titulo">{titulo}</h3>
                <p className="linea__texto">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="seccion-alt">
        <div className="contenedor">
          <div className="encabezado">
            <div>
              <p className="chip">DOCUMENTACIÓN</p>
              <h2 className="titulo">
                Qué tenés que <span>presentar</span>
              </h2>
            </div>
          </div>
          <div className="tarjetas-3">
            {requisitos.map(([icono, titulo, texto]) => (
              <article className="mini" key={titulo}>
                <span className="mini__icono">
                  <Icon icon={icono} width={24} height={24} aria-hidden="true" />
                </span>
                <h3 className="mini__titulo">{titulo}</h3>
                <p className="mini__texto">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">FORMULARIO</p>
            <h2 className="titulo">
              Solicitud de <span>vacante</span>
            </h2>
          </div>
          <p className="descripcion">
            Es una preinscripción: la vacante se confirma al presentar la
            documentación.
          </p>
        </div>

        {enviado ? (
          <div className="exito">
            <Icon
              icon="ph:check-circle"
              width={44}
              height={44}
              aria-hidden="true"
            />
            <h3 className="exito__titulo">Solicitud registrada</h3>
            <p className="exito__texto">
              Gracias, {datos.nombre}. Secretaría se comunica a {datos.email}{" "}
              con el turno para presentar la documentación.
            </p>
            <button
              className="pill"
              onClick={() => {
                setDatos(vacio);
                setEnviado(false);
              }}
            >
              Cargar otra solicitud
            </button>
          </div>
        ) : (
          <form className="formulario" onSubmit={enviar}>
            <p className="formulario__grupo">Datos del estudiante</p>
            <label className="campo">
              <span>Apellido</span>
              <input required value={datos.apellido} onChange={cambiar("apellido")} />
            </label>
            <label className="campo">
              <span>Nombre</span>
              <input required value={datos.nombre} onChange={cambiar("nombre")} />
            </label>
            <label className="campo">
              <span>DNI</span>
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
              <span>Fecha de nacimiento</span>
              <input
                required
                type="date"
                value={datos.nacimiento}
                onChange={cambiar("nacimiento")}
              />
            </label>
            <label className="campo campo--ancho">
              <span>Escuela primaria de origen</span>
              <input required value={datos.escuela} onChange={cambiar("escuela")} />
            </label>
            <label className="campo">
              <span>Ingresa a</span>
              <select value={datos.orientacion} onChange={cambiar("orientacion")}>
                <option>Ciclo Básico</option>
                <option>Ciclo Superior · Informática</option>
                <option>Ciclo Superior · Programación</option>
              </select>
            </label>

            <p className="formulario__grupo">Adulto responsable</p>
            <label className="campo">
              <span>Apellido y nombre</span>
              <input required value={datos.tutor} onChange={cambiar("tutor")} />
            </label>
            <label className="campo">
              <span>Vínculo</span>
              <select value={datos.vinculo} onChange={cambiar("vinculo")}>
                <option>Madre</option>
                <option>Padre</option>
                <option>Tutor/a</option>
              </select>
            </label>
            <label className="campo">
              <span>Teléfono</span>
              <input
                required
                type="tel"
                value={datos.telefono}
                onChange={cambiar("telefono")}
              />
            </label>
            <label className="campo">
              <span>Email</span>
              <input
                required
                type="email"
                value={datos.email}
                onChange={cambiar("email")}
              />
            </label>
            <label className="campo campo--ancho">
              <span>Comentarios (opcional)</span>
              <textarea
                rows={3}
                placeholder="Condiciones de salud, accesibilidad, hermanos en la escuela…"
                value={datos.comentario}
                onChange={cambiar("comentario")}
              />
            </label>

            <button className="pill formulario__enviar" type="submit">
              Enviar solicitud
              <Icon
                icon="ph:paper-plane-tilt"
                width={16}
                height={16}
                aria-hidden="true"
              />
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
