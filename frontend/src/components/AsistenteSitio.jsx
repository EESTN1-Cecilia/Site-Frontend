import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { usePlano } from "./Texto.jsx";
import { respuestasSitio } from "../contenido.js";
import { SUGERENCIA, temasDeConsulta } from "../asistenteRespuestas.js";
import { useAjustes } from "../ajustes.js";

function saludoDe(consulta, hayTemas) {
  const texto = ` ${consulta.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
  const tiene = (patron) => patron.test(texto);

  const saluda =
    tiene(/\s(hola+|holi+)\s/) ||
    tiene(/^\s(ola|buenas|buen dia|buenos dias|hello|hi|hey|saludos)\s/);
  const pregunta = tiene(/\s(como estas|como andas|como va|como te va|como te encuentras|que tal|todo ?bien|todo ok)\s/);
  const agradece = tiene(/\s(gracias|muchas gracias|mil gracias|te agradezco|agradezco|muy amable)\s/);
  const celebra = tiene(/\s(genial|buenisimo|excelente|perfecto|barbaro|bárbaro|espectacular|joya|de diez)\s/);
  const despide = tiene(/\s(chau|chao|adios|hasta luego|hasta pronto|nos vemos|buen fin de semana)\s/);
  const quien = tiene(/\s(quien sos|quien eres|como te llamas|que sos|que haces|para que servis)\s/);

  const partes = [];
  if (saluda) {
    partes.push(
      texto.includes(" buenos dias") || texto.includes(" buen dia")
        ? "¡Buen día!"
        : texto.includes(" buenas tardes")
          ? "¡Buenas tardes!"
          : texto.includes(" buenas noches")
            ? "¡Buenas noches!"
            : "¡Hola! 😊",
    );
  }
  if (pregunta) partes.push("¡Todo bien, gracias por preguntar! Qué lindo que te intereses por saber cómo estoy. 💛");
  if (agradece) partes.push("¡De nada, es un placer ayudarte! 💛");
  else if (celebra) partes.push("¡Me pone muy contento! 😊");
  if (quien) partes.push("Soy el asistente virtual de Técnica 1: te cuento cómo contactar a la escuela, los horarios, las carreras, la inscripción, el boletín, las previas y las novedades.");
  if (despide) partes.push("¡Hasta luego! Que tengas un día hermoso. 🌷");
  if (partes.length === 0) return null;

  if (!hayTemas) {
    if ((despide && !saluda && !pregunta) || quien) return partes.join(" ");
    partes.push(agradece || celebra ? "Si necesitás algo más, acá estoy para ayudarte. 😊" : SUGERENCIA);
  }
  return partes.join(" ");
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
      const saludo = saludoDe(pendiente, resultados.length > 0);
      setConversacion((previa) => [...previa, { pregunta: pendiente, resultados, saludo }]);
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
          <p className="asistente-sitio__bienvenida">¡Hola! Soy el asistente de Técnica 1 y estoy acá para ayudarte con mucho cariño. 😊 ¿Qué querés saber sobre la escuela?</p>
          {conversacion.map(({ pregunta, resultados, saludo }, indice) => (
            <div key={indice} className="asistente-sitio__turno">
              <p className="asistente-sitio__pregunta">{pregunta}</p>
              {saludo && (
                <div className="asistente-sitio__respuesta">
                  <p>{saludo}</p>
                </div>
              )}
              {resultados.map((tema) => (
                <div key={tema.id} className="asistente-sitio__respuesta">
                  <strong>{tema.titulo}</strong>
                  <p style={{ whiteSpace: "pre-line" }}>{tema.respuesta ?? (tema.id === "reserva" && !inscripcionAbierta
                    ? mensajeCierre
                    : plano(tema.texto, respuestasSitio[tema.id]))}</p>
                  {tema.ruta && (
                    <a href={`#${tema.ruta}`} onClick={() => alCerrar(false)}>
                      {tema.accion ?? "Ver sección"} <Icon icon="ph:arrow-up-right" width={14} aria-hidden="true" />
                    </a>
                  )}
                  {tema.enlaces?.map(({ href, etiqueta }) => (
                    <a
                      key={href}
                      href={href}
                      {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {etiqueta} <Icon icon="ph:arrow-up-right" width={14} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ))}
              {resultados.length > 0 && (
                <p className="asistente-sitio__respuesta">¿Te ayudo con algo más? 😊</p>
              )}
              {resultados.length === 0 && !saludo && (
                <div className="asistente-sitio__respuesta">
                  <p>Uy, todavía no sé cómo responderte eso, ¡perdoname! 🙈 Probá con «contacto», «horarios», «carreras», «inscripción», «boletín», «previas» o «novedades», o escribinos a eest1estebanecheverria@abc.gob.ar y te ayudamos con mucho gusto.</p>
                </div>
              )}
            </div>
          ))}
          {pendiente && (
            <div className="asistente-sitio__turno">
              <p className="asistente-sitio__pregunta">{pendiente}</p>
              <p className="asistente-sitio__respuesta">Un ratito, ya lo busco para vos… 💛</p>
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
