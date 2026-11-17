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
import emblema from "../assets/images/emblema-tecnica.webp";
import { useAjustes } from "../ajustes.js";

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

  const formulario = (
    <article className="reserva-hermanos">
      <div className="reserva-hermanos__contenido">
        <p className="reserva-hermanos__etiqueta">
          <Texto id="inscripcion.reserva.ciclo">Ciclo lectivo 2027</Texto>
        </p>
        <h2 className="reserva-hermanos__titulo">
          <Texto id="inscripcion.reserva.titulo">Reserva de vacante para hermanos</Texto>
        </h2>
        {inscripcionAbierta ? (
          <>
            <p className="reserva-hermanos__texto">
              <Texto id="inscripcion.reserva.descripcion">{respuestasSitio.reserva}</Texto>
            </p>
            <p className="reserva-hermanos__fecha">
              <Icon icon="ph:calendar-blank" width={20} height={20} aria-hidden="true" />
              <Texto id="inscripcion.reserva.fecha">Fecha de apertura: martes 13 de octubre</Texto>
            </p>
            <Enlace
              id="inscripcion.reserva.formulario"
              href="https://docs.google.com/forms/d/e/1FAIpQLSfg73E2ygRCgE6OkJS3yWRq-NOomQ_SKQqSe1Ob9XXt_OJ49Q/viewform"
              className="pill reserva-hermanos__enlace"
              target="_self"
              vacio={
                <p className="reserva-hermanos__texto">
                  <Texto id="inscripcion.reserva.pendiente">El enlace al formulario todavía no está publicado.</Texto>
                </p>
              }
            >
              <Icon icon="ph:info" width={18} height={18} aria-hidden="true" />
              <Texto id="inscripcion.reserva.accion">Abrir formulario de inscripción</Texto>
              <Icon icon="ph:arrow-up-right" width={18} height={18} aria-hidden="true" />
            </Enlace>
          </>
        ) : (
          <p className="reserva-hermanos__texto">{mensajeCierre}</p>
        )}
      </div>
      <div className="reserva-hermanos__sello">
        <Imagen id="inscripcion.reserva.logo" src={emblema} alt="" />
      </div>
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

    formulario: <Dinamico id="formulario">{formulario}</Dinamico>,
  };

  /* Parte automática: el encabezado dice "abierta" o "cerrada" según el ajuste. */
  const encabezado = (
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
          <Texto id="inscripcion.hero.reserva">
            Encontrá el acceso a la reserva de vacante para hermanos para el ciclo lectivo 2027.
          </Texto>
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
        <PaginaEditable clave="inscripcion.pagina" pagina={guardada} dinamicos={{ encabezado, formulario }} />
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
