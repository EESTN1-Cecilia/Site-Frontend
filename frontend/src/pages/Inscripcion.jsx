import { respuestasSitio } from "../contenido.js";
import CirculosEncabezado from "../components/CirculosEncabezado.jsx";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import Texto, {
  Bloque,
  Enlace,
  Imagen,
  useLista,
} from "../components/Texto.jsx";
import ZonaLibre from "../components/ZonaLibre.jsx";
import { Dinamico, PaginaEditable, usePaginaGuardada } from "../components/PaginaEditable.jsx";
import { pasosInscripcion, requisitos } from "../contenido.js";
import { useAjustes } from "../ajustes.js";

/* El año del ciclo lectivo se escribe una sola vez: todas las piezas con este id
   comparten el valor, así que cambiarlo en una lo cambia en toda la página. */
const AYUDA_ANIO = "Año del ciclo lectivo. Si lo cambiás acá, se actualiza en toda la página de Inscripción";
const Anio = () => (
  <Texto id="inscripcion.anio" ayuda={AYUDA_ANIO}>
    2027
  </Texto>
);

const secciones = [
  { id: "pasos", clase: "seccion contenedor inscripcion-pasos" },
  { id: "formulario", clase: "seccion contenedor inscripcion-reserva" },
  { id: "requisitos", clase: "seccion-alt" },
];

export default function Inscripcion() {
  const { inscripcionAbierta, mensajeCierre } = useAjustes();

  const guardada = usePaginaGuardada("inscripcion.pagina");
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

  const ingresantes = (
    <article className="inscripcion-cartel">
      <div className="inscripcion-cartel__cuerpo">
        <p className="inscripcion-cartel__chip">
          <Icon icon="ph:calendar-blank" width={18} height={18} aria-hidden="true" />
          <span>
            <Texto id="inscripcion.ingresantes.etiqueta" ayuda="Texto de la etiqueta (el año se cambia en el número)">
              CICLO LECTIVO
            </Texto>{" "}
            <Anio />
          </span>
        </p>
        <h3 className="inscripcion-cartel__titulo">
          <span>
            <Texto id="inscripcion.ingresantes.encabezado" ayuda="Título del cartel">
              Inscripción
            </Texto>{" "}
            <Anio />
          </span>
          <span className="inscripcion-cartel__subtitulo">
            <Texto id="inscripcion.ingresantes.subtitulo" ayuda="Segunda línea del título">
              ingresantes a primer año
            </Texto>
          </span>
        </h3>
        <p className="inscripcion-cartel__texto">
          <Texto id="inscripcion.ingresantes.detalle" ayuda="Descripción del cartel (el año se cambia en el número)">
            Toda la información para realizar tu inscripción al primer año, en el ciclo lectivo
          </Texto>{" "}
          <Anio />.
        </p>
      </div>
      <div className="inscripcion-cartel__icono" aria-hidden="true">
        <Icon icon="ph:clipboard-text" />
      </div>
      <div className="inscripcion-cartel__pie">
        <p className="inscripcion-cartel__fecha">
          <Icon icon="ph:clock" width={22} height={22} aria-hidden="true" />
          <Texto id="inscripcion.ingresantes.periodo" ayuda="Fechas de la inscripción. Ejemplo: Del 01/11 al 19/12">
            Del 01/11 al 19/12
          </Texto>
          <span className="inscripcion-cartel__separador" aria-hidden="true" />
          <Texto id="inscripcion.ingresantes.horario" ayuda="Horario de la inscripción. Ejemplo: De 9:00 a 17:00 hs">
            De 9:00 a 17:00 hs
          </Texto>
        </p>
        <Enlace
          id="inscripcion.ingresantes.info"
          ayuda="Adónde lleva el botón «Abrir información»"
          href="https://drive.google.com/file/d/1hr5bgn9UG5fT3RHQrO_DHddjk8a9a2aC/view?usp=sharing"
          className="inscripcion-cartel__boton"
          target="_blank"
          vacio={
            <p className="inscripcion-cartel__pendiente">
              <Texto id="inscripcion.ingresantes.pendiente">El enlace todavía no está publicado.</Texto>
            </p>
          }
        >
          <Texto id="inscripcion.ingresantes.boton" ayuda="Texto del botón">
            Abrir información
          </Texto>
          <Icon icon="ph:caret-right" width={18} height={18} aria-hidden="true" />
        </Enlace>
      </div>
    </article>
  );

  const formulario = (
    <article className="inscripcion-cartel">
      <div className="inscripcion-cartel__cuerpo">
        <p className="inscripcion-cartel__chip">
          <Icon icon="ph:calendar-blank" width={18} height={18} aria-hidden="true" />
          <span>
            <Texto id="inscripcion.reserva.etiqueta" ayuda="Texto de la etiqueta (el año se cambia en el número)">
              CICLO LECTIVO
            </Texto>{" "}
            <Anio />
          </span>
        </p>
        <h3 className="inscripcion-cartel__titulo">
          <Texto id="inscripcion.reserva.titulo" ayuda="Título del cartel">
            Reserva de vacante para hermanos
          </Texto>
        </h3>
        <p className="inscripcion-cartel__texto">
          {inscripcionAbierta ? (
            <Texto id="inscripcion.reserva.descripcion" ayuda="Descripción del cartel">
              {respuestasSitio.reserva}
            </Texto>
          ) : (
            mensajeCierre
          )}
        </p>
      </div>
      <div className="inscripcion-cartel__icono inscripcion-cartel__icono--check" aria-hidden="true">
        <Icon icon="ph:users-three" />
        <Icon className="inscripcion-cartel__insignia" icon="ph:check-circle-fill" />
      </div>
      {inscripcionAbierta && (
        <div className="inscripcion-cartel__pie">
          <p className="inscripcion-cartel__fecha">
            <Icon icon="ph:calendar-dots" width={22} height={22} aria-hidden="true" />
            <Texto
              id="inscripcion.reserva.fecha"
              ayuda="Fecha de apertura de la reserva. Ejemplo: Fecha de apertura: martes 13 de octubre"
            >
              Fecha de apertura: martes 13 de octubre
            </Texto>
          </p>
          <Enlace
            id="inscripcion.reserva.formulario"
            ayuda="Adónde lleva el botón «Abrir formulario» (link del formulario)"
            href="https://docs.google.com/forms/d/e/1FAIpQLSfg73E2ygRCgE6OkJS3yWRq-NOomQ_SKQqSe1Ob9XXt_OJ49Q/viewform"
            className="inscripcion-cartel__boton"
            target="_self"
            vacio={
              <p className="inscripcion-cartel__pendiente">
                <Texto id="inscripcion.reserva.pendiente">El enlace al formulario todavía no está publicado.</Texto>
              </p>
            }
          >
            <Texto id="inscripcion.reserva.boton" ayuda="Texto del botón">
              Abrir formulario
            </Texto>
            <Icon icon="ph:caret-right" width={18} height={18} aria-hidden="true" />
          </Enlace>
        </div>
      )}
    </article>
  );

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
      <div className="reserva-par">
        <div className="reserva-par__col">
          <h2 className="reserva-par__titulo">
            <Texto id="inscripcion.par.ingresantes">Ingresantes a primer año</Texto>
          </h2>
          <Dinamico id="ingresantes">{ingresantes}</Dinamico>
        </div>
        <div className="reserva-par__col">
          <h2 className="reserva-par__titulo">
            <Texto id="inscripcion.par.hermanos">Hermanos de estudiantes</Texto>
          </h2>
          <Dinamico id="formulario">{formulario}</Dinamico>
        </div>
      </div>
    ),
  };

  /* Parte automática: el encabezado dice "abierta" o "cerrada" según el ajuste. */
  const encabezado = (
    <Encabezado id="inscripcion.hero"
      chip={
        <>
          <Texto id="inscripcion.hero.etiqueta">CICLO LECTIVO</Texto> <Anio />
        </>
      }
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
          <>
            <Texto id="inscripcion.hero.acceso">
              Encontrá el acceso a la reserva de vacante para hermanos para el ciclo lectivo
            </Texto>{" "}
            <Anio />.
          </>
        ) : (
          mensajeCierre
        )
      }
    >
      <CirculosEncabezado />
    </Encabezado>
  );

  if (guardada)
    return (
      <main>
        <PaginaEditable clave="inscripcion.pagina" pagina={guardada} dinamicos={{ encabezado, ingresantes, formulario }} />
      </main>
    );

  return (
    <main>
      <Dinamico id="encabezado">{encabezado}</Dinamico>

      {listaSecciones.map((seccion) => (
        <Bloque key={seccion.id} {...bloqueSeccion(seccion)} como="section" className={seccion.clase}>
          {contenido[seccion.id]}
        </Bloque>
      ))}

      <ZonaLibre seccion zona="inscripcion.libre" titulo="Inscripción" />
    </main>
  );
}
