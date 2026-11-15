import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { usePlano } from "./Texto.jsx";
import { respuestasSitio } from "../contenido.js";
import { useAjustes } from "../ajustes.js";

const temas = [
  {
    id: "boletin",
    titulo: "Notas y boletín",
    respuesta: "Para consultar tus notas o ver tu boletín, ingresá con tus credenciales en el sitio de Técnica 1.",
    ruta: "/login",
    accion: "Ingresar con mis credenciales",
    palabras: ["nota", "notas", "boletin", "boletines", "calificacion", "calificaciones"],
  },
  {
    id: "horario",
    titulo: "Horario del colegio",
    respuesta: "De lunes a viernes, de 07:10 a 18:40.",
    palabras: ["horario", "horarios", "hora abre", "hora cierra", "hora de entrada", "hora de salida"],
  },
  {
    id: "reserva",
    titulo: "Reserva para hermanos",
    ruta: "/inscripcion",
    texto: "inscripcion.reserva.descripcion",
    palabras: ["inscripcion", "inscribir", "inscribirme", "inscribo", "anotar", "anotarme", "vacante", "vacantes", "reserva", "hermano", "hermana", "hermanos", "hermanas", "matricula", "documentacion", "requisitos"],
  },
  {
    id: "evaluacion",
    titulo: "Evaluación de saberes",
    ruta: "/evaluacion",
    texto: "evaluacion.hero.texto",
    palabras: ["evaluacion", "evaluaciones", "saberes", "material", "regimen academico"],
  },
  {
    id: "previas",
    titulo: "Intensificación y previas",
    ruta: "/previas",
    texto: "previas.hero.texto",
    palabras: ["previa", "previas", "intensificacion", "intensificar", "mesa", "mesas", "materias pendientes", "plan de trabajo", "cronograma", "acreditacion"],
  },
  {
    id: "novedades",
    titulo: "Novedades",
    ruta: "/novedades",
    texto: "novedades.hero.texto",
    palabras: ["novedad", "novedades", "aviso", "avisos", "noticias", "calendario", "eventos", "comunicados"],
  },
];

function temasDeConsulta(consulta) {
  const normalizada = consulta.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const palabras = ` ${normalizada.replace(/[^a-z0-9]+/g, " ").trim()} `;
  return temas.filter((tema) => tema.palabras.some((palabra) => palabras.includes(` ${palabra} `)));
}

export default function AsistenteSitio({ alCerrar, alPensar }) {
  const [consulta, setConsulta] = useState("");
  const [conversacion, setConversacion] = useState([]);
  const [pendiente, setPendiente] = useState("");
  const registro = useRef(null);
  const plano = usePlano();
  const { inscripcionAbierta, mensajeCierre } = useAjustes();

  useEffect(() => {
    const lista = registro.current;
    lista.scrollTop = lista.scrollHeight;
  }, [conversacion, pendiente]);

  useEffect(() => {
    if (!pendiente) return;

    const espera = window.setTimeout(() => {
      const resultados = temasDeConsulta(pendiente);
      setConversacion((previa) => [...previa, { pregunta: pendiente, resultados }]);
      setPendiente("");
      alPensar(false);
    }, 650);
    return () => window.clearTimeout(espera);
  }, [pendiente, alPensar]);

  function enviar(e) {
    e.preventDefault();
    const pregunta = consulta.trim();
    if (!pregunta || pendiente) return;

    setPendiente(pregunta);
    alPensar(true);
    setConsulta("");
  }

  return (
    <section
      id="asistente-sitio"
      className="asistente-sitio"
      aria-labelledby="asistente-sitio-titulo"
      onKeyDown={(e) => {
        if (e.key === "Escape") alCerrar();
      }}
    >
      <header>
        <div className="asistente-sitio__identidad">
          <span className="asistente-sitio__icono"><Icon icon="ph:robot" width={23} aria-hidden="true" /></span>
          <div>
            <h2 id="asistente-sitio-titulo">Asistente de Técnica 1</h2>
            <span className="asistente-sitio__subtitulo">Información escolar</span>
          </div>
        </div>
        <button type="button" aria-label="Cerrar asistente" onClick={alCerrar}>
          <Icon icon="ph:x" width={20} aria-hidden="true" />
        </button>
      </header>
      <div className="asistente-sitio__contenido">
        <div ref={registro} className="asistente-sitio__conversacion" role="log" aria-label="Conversación">
          <p className="asistente-sitio__bienvenida">¡Hola! Soy el asistente de Técnica 1. ¿Qué querés saber sobre la escuela?</p>
          {conversacion.map(({ pregunta, resultados }, indice) => (
            <div key={indice} className="asistente-sitio__turno">
              <p className="asistente-sitio__pregunta">{pregunta}</p>
              {resultados.map((tema) => (
                <div key={tema.id} className="asistente-sitio__respuesta">
                  <strong>{tema.titulo}</strong>
                  <p>{tema.respuesta ?? (tema.id === "reserva" && !inscripcionAbierta
                    ? mensajeCierre
                    : plano(tema.texto, respuestasSitio[tema.id]))}</p>
                  {tema.ruta && (
                    <a href={`#${tema.ruta}`} onClick={() => alCerrar(false)}>
                      {tema.accion ?? "Ver sección"} <Icon icon="ph:arrow-up-right" width={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
              ))}
              {resultados.length === 0 && (
                <div className="asistente-sitio__respuesta">
                  <p>No encontré un tema relacionado. Probá con «horarios», «vacantes», «boletín», «previas» o «novedades».</p>
                </div>
              )}
            </div>
          ))}
          {pendiente && (
            <div className="asistente-sitio__turno">
              <p className="asistente-sitio__pregunta">{pendiente}</p>
              <p className="asistente-sitio__respuesta">Buscando en el sitio…</p>
            </div>
          )}
        </div>
        <form className="asistente-sitio__consulta" onSubmit={enviar}>
          <input
            aria-label="Escribí tu consulta"
            placeholder="Escribí tu consulta…"
            maxLength={240}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            required
          />
          <button type="submit" disabled={!!pendiente || !consulta.trim()} aria-label="Enviar consulta">
            <Icon icon="ph:paper-plane-tilt" width={20} aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
