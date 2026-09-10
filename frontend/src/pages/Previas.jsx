import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import Texto, { Bloque, Dato, Enlace, Imagen, useLista } from "../components/Texto.jsx";
import Bloques from "../components/Bloques.jsx";
import { pasosPrevias } from "../contenido.js";
import { useMesas } from "../mesas.js";
import { usePublicaciones } from "../publicaciones.js";

const MESAS = "/panel/mesas";
const PUBLICACIONES = "/panel/publicaciones";

const fecha = (iso) =>
  !iso
    ? "A confirmar"
    : new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

/* Aviso publicado para esta página, o el borrador que Dirección está mirando. */
function Aviso({ pub }) {
  const bloques = pub.bloques || [];
  const portadaIndice = bloques.findIndex((b) => b.tipo === "imagen");
  const portada = portadaIndice >= 0 ? bloques[portadaIndice] : null;
  const cuerpo = bloques.filter((_, i) => i !== portadaIndice);

  return (
    <article className={`nota nota--destacada ${pub.borrador ? "nota--borrador" : ""}`}>
      {portada && (
        <div className="nota__foto">
          <Imagen id={`pub:${pub.id}:bloque:${portada.id}`} dueno={PUBLICACIONES} src={portada.url} />
          {pub.borrador && <span className="nota__sello">SIN PUBLICAR</span>}
        </div>
      )}
      <p className="nota__meta">
        <span className="nota__categoria">
          <Texto id={`pub:${pub.id}:categoria`} dueno={PUBLICACIONES}>
            {pub.categoria}
          </Texto>
        </span>
        <span>·</span>
        <span>
          <Dato id={`pub:${pub.id}:fecha`} dueno={PUBLICACIONES} tipo="date" valor={pub.fecha} />
        </span>
      </p>
      <h2 className="nota__titulo nota__titulo--grande">
        <Texto id={`pub:${pub.id}:titulo`} dueno={PUBLICACIONES}>
          {pub.titulo}
        </Texto>
      </h2>
      <Bloques pub={pub} bloques={cuerpo} />
    </article>
  );
}

const secciones = [
  { id: "pasos", clase: "seccion contenedor" },
  { id: "cronograma", clase: "seccion-alt" },
  { id: "dni", clase: "seccion contenedor" },
];

export default function Previas({ params }) {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState("Todos");
  const publicaciones = usePublicaciones();

  const enVistaPrevia = publicaciones.find(
    (pub) => pub.id === params?.get("preview") && pub.ruta === "/previas" && pub.estado !== "publicada",
  );
  const avisos = [
    ...(enVistaPrevia ? [{ ...enVistaPrevia, borrador: true }] : []),
    ...publicaciones.filter((pub) => pub.estado === "publicada" && pub.ruta === "/previas"),
  ];

  const { carpeta, mesas } = useMesas();
  const anios = ["Todos", ...new Set(mesas.map((m) => m.anio).filter(Boolean))];

  /* Por fecha y hora; las que no tienen fecha van al final. */
  const filtradas = [...mesas]
    .sort((a, b) =>
      `${a.fecha || "9999"} ${a.hora}`.localeCompare(`${b.fecha || "9999"} ${b.hora}`),
    )
    .filter(
      (m) =>
        m.materia.toLowerCase().includes(busqueda.trim().toLowerCase()) &&
        (anio === "Todos" || m.anio === anio),
    );

  const [listaSecciones, bloqueSeccion] = useLista("previas.secciones", secciones);
  const [pasos, bloquePaso] = useLista(
    "previas.pasos",
    pasosPrevias.map(([titulo, detalle], i) => ({ id: `p${i}`, titulo, detalle })),
    { duplicable: true },
  );

  const contenido = {
    pasos: (
      <>
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="previas.pasos.chip">CÓMO SIGUE</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="previas.pasos.titulo">Cuatro pasos para</Texto>{" "}
              <Texto id="previas.pasos.destacado" clase="titulo__destacado">
                acreditar
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
                  <Texto id={`previas.pasos.${paso.id}.titulo`}>{paso.titulo}</Texto>
                </h3>
                <p className="linea__texto">
                  <Texto id={`previas.pasos.${paso.id}.texto`}>{paso.detalle}</Texto>
                </p>
              </div>
            </Bloque>
          ))}
        </ol>
      </>
    ),

    cronograma: (
      <div className="contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">
              <Texto id="previas.cronograma.chip">DICIEMBRE 2026</Texto>
            </p>
            <h2 className="titulo">
              <Texto id="previas.cronograma.titulo">Cronograma de</Texto>{" "}
              <Texto id="previas.cronograma.destacado" clase="titulo__destacado">
                mesas
              </Texto>
            </h2>
          </div>
          <p className="descripcion">
            <Texto id="previas.cronograma.descripcion">
              Filtrá por materia o por año para encontrar la tuya.
            </Texto>
          </p>
        </div>

        <div className="filtros">
          <label className="campo campo--busca">
            <Icon icon="ph:magnifying-glass" width={18} height={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar materia"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <div className="filtros__chips">
            {anios.map((valor) => (
              <button
                key={valor}
                className={`filtro ${anio === valor ? "filtro--activo" : ""}`}
                onClick={() => setAnio(valor)}
              >
                {valor}
              </button>
            ))}
          </div>

          <Enlace
            id="mesas:carpeta"
            dueno={MESAS}
            href={carpeta}
            className="boton boton--primario"
            ocultarVacio
          >
            <Icon icon="ph:google-drive-logo" width={16} height={16} aria-hidden="true" />
            <Texto id="previas.cronograma.carpeta">Planes de trabajo en Drive</Texto>
          </Enlace>
        </div>

        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Materia</th>
                <th>Año</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Aula</th>
                <th>Docente</th>
                <th>Drive</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((mesa) => {
                const clave = (campo) => `mesa:${mesa.id}:${campo}`;

                return (
                  <tr key={mesa.id}>
                    <td data-label="Materia">
                      <strong>
                        <Texto id={clave("materia")} dueno={MESAS}>{mesa.materia}</Texto>
                      </strong>
                    </td>
                    <td data-label="Año">
                      <Texto id={clave("anio")} dueno={MESAS}>{mesa.anio}</Texto>
                    </td>
                    <td data-label="Fecha" className="capitalizar">
                      <Dato id={clave("fecha")} dueno={MESAS} tipo="date" valor={mesa.fecha} formato={fecha} />
                    </td>
                    <td data-label="Hora">
                      <Dato id={clave("hora")} dueno={MESAS} tipo="time" valor={mesa.hora} />
                    </td>
                    <td data-label="Aula">
                      <Texto id={clave("aula")} dueno={MESAS}>{mesa.aula}</Texto>
                    </td>
                    <td data-label="Docente">
                      <Texto id={clave("docente")} dueno={MESAS}>{mesa.docente}</Texto>
                    </td>
                    <td data-label="Drive">
                      <Enlace
                        id={clave("drive")}
                        dueno={MESAS}
                        href={mesa.drive}
                        className="boton boton--fino"
                        aria-label={`Drive de ${mesa.materia}`}
                        vacio={<span className="sin-link">Sin cargar</span>}
                      >
                        <Icon icon="ph:google-drive-logo" width={15} height={15} aria-hidden="true" />
                        Abrir
                      </Enlace>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtradas.length === 0 && <p className="vacio">No hay mesas con esos filtros.</p>}
      </div>
    ),

    dni: (
      <div className="aviso">
        <div>
          <h3 className="aviso__titulo">
            <Texto id="previas.dni.titulo">Llevá tu DNI</Texto>
          </h3>
          <p className="aviso__texto">
            <Texto id="previas.dni.texto">
              Sin documento no se puede rendir. Presentate 15 minutos antes del
              horario de la mesa.
            </Texto>
          </p>
        </div>
      </div>
    ),
  };

  return (
    <main>
      <Encabezado
        chip={<Texto id="previas.hero.chip">TRAYECTORIAS</Texto>}
        titulo={<Texto id="previas.hero.titulo">Intensificación y</Texto>}
        destacado={<Texto id="previas.hero.destacado">previas</Texto>}
        texto={
          <Texto id="previas.hero.texto">
            Los espacios pendientes de acreditación se intensifican con un plan
            de trabajo por materia. Buscá tu mesa y presentate con el plan
            resuelto.
          </Texto>
        }
      />

      {avisos.length > 0 && (
        <section className="seccion contenedor avisos-publicados">
          {avisos.map((pub) => (
            <Aviso pub={pub} key={pub.id} />
          ))}
        </section>
      )}

      {listaSecciones.map((seccion) => (
        <Bloque key={seccion.id} {...bloqueSeccion(seccion)} como="section" className={seccion.clase}>
          {contenido[seccion.id]}
        </Bloque>
      ))}
    </main>
  );
}
