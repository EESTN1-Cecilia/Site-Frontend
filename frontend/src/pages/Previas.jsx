import { respuestasSitio } from "../contenido.js";
import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import CirculosEncabezado from "../components/CirculosEncabezado.jsx";
import Texto, {
  Bloque,
  Campo,
  Caso,
  Dato,
  Enlace,
  Imagen,
  useLista,
  usePlano,
} from "../components/Texto.jsx";
import ZonaLibre from "../components/ZonaLibre.jsx";
import { Dinamico, PaginaEditable, usePaginaGuardada } from "../components/PaginaEditable.jsx";
import Bloques from "../components/Bloques.jsx";
import { pasosPrevias } from "../contenido.js";
import { useMesas } from "../mesas.js";
import { usePublicaciones } from "../publicaciones.js";

const MESAS = "/panel/mesas";
const PUBLICACIONES = "/panel/publicaciones";

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

/* Piezas de la barra de filtros: se mueven, ocultan y cambian de fondo. En
   el editor completo, cada una es un bloque automático aparte. */
const filtros = [{ id: "busqueda" }, { id: "anios" }, { id: "carpeta" }];
const DINAMICO_DE_FILTRO = { busqueda: "buscador", anios: "anios", carpeta: "carpeta" };

const columnas = [
  ["materia", "Materia"],
  ["anio", "Año"],
  ["drive", "Trabajo"],
];

/* Cuántas materias se ven en "Todos" antes de tocar "Ver más". */
const MATERIAS_VISIBLES = 8;

/* Botones de año. De 5° a 7° hay uno por orientación. */
const OPCIONES_ANIO = [
  { etiqueta: "Todos" },
  { etiqueta: "1°", anio: 1 },
  { etiqueta: "2°", anio: 2 },
  { etiqueta: "3°", anio: 3 },
  { etiqueta: "4°", anio: 4 },
  { etiqueta: "5° Inf", anio: 5, orientacion: "Informática" },
  { etiqueta: "5° Prog", anio: 5, orientacion: "Programación" },
  { etiqueta: "6° Inf", anio: 6, orientacion: "Informática" },
  { etiqueta: "6° Prog", anio: 6, orientacion: "Programación" },
  { etiqueta: "7° Inf", anio: 7, orientacion: "Informática" },
  { etiqueta: "7° Prog", anio: 7, orientacion: "Programación" },
];

/* Los años de una mesa pueden venir como "4°", "1° y 2°" o "1° a 3°". */
const aniosDeMesa = (texto = "") => {
  const n = (texto.match(/\d+/g) || []).map(Number);

  if (n.length < 2 || !/\sa\s/.test(texto)) return n;

  return Array.from({ length: n[n.length - 1] - n[0] + 1 }, (_, i) => n[0] + i);
};

export default function Previas({ params }) {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState("Todos");
  const [verTodas, setVerTodas] = useState(false);
  /* Como en Drive: lista o tarjetas. Por defecto, tarjetas en el celular y lista en pantallas grandes. */
  const [vista, setVista] = useState(() => {
    try {
      const guardada = localStorage.getItem("previas.vista");
      if (guardada === "lista" || guardada === "tarjetas") return guardada;
    } catch {
      /* sin almacenamiento: se usa el valor por defecto */
    }
    return typeof window !== "undefined" && window.matchMedia?.("(max-width: 760px)").matches
      ? "tarjetas"
      : "lista";
  });
  const elegirVista = (nueva) => {
    setVista(nueva);
    try {
      localStorage.setItem("previas.vista", nueva);
    } catch {
      /* no pasa nada si no se puede guardar */
    }
  };
  const publicaciones = usePublicaciones();

  const enVistaPrevia = publicaciones.find(
    (pub) => pub.id === params?.get("preview") && pub.ruta === "/previas" && pub.estado !== "publicada",
  );
  const avisos = [
    ...(enVistaPrevia ? [{ ...enVistaPrevia, borrador: true }] : []),
    ...publicaciones.filter((pub) => pub.estado === "publicada" && pub.ruta === "/previas"),
  ];

  const { carpeta, subcarpetas, mesas } = useMesas();
  const opcion = OPCIONES_ANIO.find((o) => o.etiqueta === anio) || OPCIONES_ANIO[0];

  /* Por fecha y hora; las que no tienen fecha van al final. */
  const filtradas = [...mesas]
    .sort((a, b) =>
      `${a.fecha || "9999"} ${a.hora}`.localeCompare(`${b.fecha || "9999"} ${b.hora}`),
    )
    .filter(
      (m) =>
        m.materia.toLowerCase().includes(busqueda.trim().toLowerCase()) &&
        (!opcion.anio ||
          (aniosDeMesa(m.anio).includes(opcion.anio) &&
            /* Sin orientación es de las dos: se ve en ambos botones. */
            (!opcion.orientacion || !m.orientacion || m.orientacion === opcion.orientacion))),
    );

  /* En "Todos" (sin buscar) se muestran las primeras materias y un botón para ver el resto. */
  const limitar = anio === "Todos" && !busqueda.trim() && filtradas.length > MATERIAS_VISIBLES;
  const visibles = limitar && !verTodas ? filtradas.slice(0, MATERIAS_VISIBLES) : filtradas;

  const plano = usePlano();
  const columna = (clave) =>
    plano(`previas.cronograma.columnas.${clave}`, columnas.find(([c]) => c === clave)[1]);

  const [listaSecciones, bloqueSeccion] = useLista("previas.secciones", secciones);
  const [listaFiltros, bloqueFiltro] = useLista("previas.filtros", filtros);
  const [pasos, bloquePaso] = useLista(
    "previas.pasos",
    pasosPrevias.map(([titulo, detalle], i) => ({ id: `p${i}`, titulo, detalle })),
    { duplicable: true },
  );
  const guardada = usePaginaGuardada("previas.pagina");

  /* Partes automáticas: se arman con datos y responden a clics. Si la página
     está armada con el editor completo, van en sus lugares de ahí. */
  const avisosPublicados = avisos.length > 0 && (
    <Bloque id="previas.avisos" como="section" className="seccion contenedor avisos-publicados">
      {avisos.map((pub) => (
        <Aviso pub={pub} key={pub.id} />
      ))}
    </Bloque>
  );

  const piezaDeFiltro = (filtro) => {
    const b = bloqueFiltro(filtro);

    if (filtro.id === "busqueda")
      return (
        <Bloque key={filtro.id} {...b} como="label" className="campo campo--busca">
          <Icon icon="ph:magnifying-glass" width={18} height={18} aria-hidden="true" />
          <Campo
            id="previas.cronograma.buscar"
            placeholder="Buscar materia"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </Bloque>
      );

    if (filtro.id === "anios")
      return (
        <Bloque key={filtro.id} {...b} className="filtros__chips">
          {OPCIONES_ANIO.map(({ etiqueta }) => (
            <button
              key={etiqueta}
              className={`filtro ${anio === etiqueta ? "filtro--activo" : ""}`}
              aria-pressed={anio === etiqueta}
              onClick={() => setAnio(etiqueta)}
            >
              {etiqueta === "Todos" ? <Texto id="previas.cronograma.todos">Todos</Texto> : etiqueta}
            </button>
          ))}
        </Bloque>
      );

    return (
      <Bloque key={filtro.id} {...b} className="filtros__carpeta">
        <Enlace
          id="mesas:carpeta"
          dueno={MESAS}
          href={carpeta}
          className="boton boton--primario"
          ocultarVacio
        >
          <Icon icon="ph:google-drive-logo" width={16} height={16} aria-hidden="true" />
          <Texto id="previas.cronograma.carpeta">Todos los trabajos</Texto>
        </Enlace>
        {subcarpetas.map((sub) => (
          <Enlace
            key={sub.id}
            id={`mesas:subcarpeta:${sub.id}:link`}
            dueno={MESAS}
            href={sub.link}
            className="boton boton--fino"
            ocultarVacio
          >
            <Icon icon="ph:google-drive-logo" width={15} height={15} aria-hidden="true" />
            <Texto id={`mesas:subcarpeta:${sub.id}:nombre`} dueno={MESAS}>
              {sub.nombre}
            </Texto>
          </Enlace>
        ))}
      </Bloque>
    );
  };
  const filtro = (id) => piezaDeFiltro(listaFiltros.find((f) => f.id === id) ?? { id });

  const barraDeFiltros = (
    <div className="filtros">
      {listaFiltros.map((f) => (
        <Dinamico key={f.id} id={DINAMICO_DE_FILTRO[f.id]}>
          {piezaDeFiltro(f)}
        </Dinamico>
      ))}
    </div>
  );

  const tablaDeMesas = (
    <>
      <div className="vista-toggle" role="group" aria-label="Forma de ver las materias">
        <button
          type="button"
          className={`vista-toggle__boton ${vista === "lista" ? "vista-toggle__boton--activo" : ""}`}
          aria-pressed={vista === "lista"}
          aria-label="Ver como lista"
          title="Lista"
          onClick={() => elegirVista("lista")}
        >
          <Icon icon="ph:list" width={20} height={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`vista-toggle__boton ${vista === "tarjetas" ? "vista-toggle__boton--activo" : ""}`}
          aria-pressed={vista === "tarjetas"}
          aria-label="Ver como tarjetas"
          title="Tarjetas"
          onClick={() => elegirVista("tarjetas")}
        >
          <Icon icon="ph:squares-four" width={20} height={20} aria-hidden="true" />
        </button>
      </div>
      <Bloque id="previas.cronograma.tabla" className={`tabla-scroll tabla-scroll--${vista}`}>
        <table className="tabla">
          <thead>
            <tr>
              {columnas.map(([clave, nombre]) => (
                <th key={clave}>
                  <Texto id={`previas.cronograma.columnas.${clave}`}>{nombre}</Texto>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((mesa) => {
              const clave = (campo) => `mesa:${mesa.id}:${campo}`;

              return (
                <tr key={mesa.id}>
                  <td data-label={columna("materia")}>
                    <strong>
                      <Texto id={clave("materia")} dueno={MESAS}>{mesa.materia}</Texto>
                    </strong>
                  </td>
                  <td data-label={columna("anio")}>
                    <Texto id={clave("anio")} dueno={MESAS}>{mesa.anio}</Texto>
                    {mesa.orientacion && <span className="orientacion">{mesa.orientacion}</span>}
                  </td>
                  <td data-label={columna("drive")}>
                    <Enlace
                      id={clave("drive")}
                      dueno={MESAS}
                      href={mesa.drive}
                      className="boton boton--fino"
                      aria-label={`Drive de ${mesa.materia}`}
                      vacio={
                        <span className="sin-link">
                          <Texto id="previas.cronograma.sinDrive">Sin trabajo</Texto>
                        </span>
                      }
                    >
                      <Icon icon="ph:google-drive-logo" width={15} height={15} aria-hidden="true" />
                      <Texto id="previas.cronograma.abrir">Abrir Trabajo</Texto>
                    </Enlace>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Bloque>
      {limitar && (
        <div className="ver-mas">
          <button
            type="button"
            className="boton boton--fino"
            aria-expanded={verTodas}
            onClick={() => setVerTodas((abierto) => !abierto)}
          >
            {verTodas ? "Ver menos" : `Ver más (${filtradas.length - MATERIAS_VISIBLES})`}
          </button>
        </div>
      )}
      <Caso visible={filtradas.length === 0} cuando="cuando ninguna mesa coincide con la búsqueda o el año elegido">
        <p className="vacio">
          <Texto id="previas.cronograma.vacio">No hay mesas con esos filtros.</Texto>
        </p>
      </Caso>
    </>
  );

  /* Como estaba antes de separarlo en piezas (páginas armadas antes). */
  const buscadorYTabla = (
    <>
      <div className="filtros">{listaFiltros.map(piezaDeFiltro)}</div>
      {tablaDeMesas}
    </>
  );

  if (guardada)
    return (
      <main>
        <PaginaEditable
          clave="previas.pagina"
          pagina={guardada}
          dinamicos={{
            avisos: avisosPublicados,
            buscador: filtro("busqueda"),
            anios: filtro("anios"),
            carpeta: filtro("carpeta"),
            tabla: tablaDeMesas,
            cronograma: buscadorYTabla,
          }}
        />
      </main>
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

        {barraDeFiltros}
        <Dinamico id="tabla">{tablaDeMesas}</Dinamico>
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
      <Encabezado id="previas.hero"
        chip={<Texto id="previas.hero.chip">TRAYECTORIAS</Texto>}
        titulo={<Texto id="previas.hero.titulo">Intensificación y</Texto>}
        destacado={<Texto id="previas.hero.destacado">previas</Texto>}
        texto={
          <Texto id="previas.hero.texto">{respuestasSitio.previas}</Texto>
        }
      >
        <CirculosEncabezado variante="trayectorias" />
      </Encabezado>

      <Dinamico id="avisos">{avisosPublicados}</Dinamico>

      {listaSecciones.map((seccion) => (
        <Bloque key={seccion.id} {...bloqueSeccion(seccion)} como="section" className={seccion.clase}>
          {contenido[seccion.id]}
        </Bloque>
      ))}

      <ZonaLibre seccion zona="previas.libre" titulo="Intensificación y previas" />
    </main>
  );
}
