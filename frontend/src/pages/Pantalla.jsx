import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import logo from "../assets/images/logo-tecnica1.jpg";
import cabeceraExpo from "../assets/images/expo-cabecera.jpg";
import cabeceraPatria from "../assets/images/patria-cabecera.jpg";
import adornoPatria from "../assets/images/patria-adorno.jpg";
import { armarPisos } from "../plano.js";
import { ESTADOS, estadoEspacio, fechaYHoraLarga } from "../horario.js";
import {
  FILAS_BAJO_EL_PLANO,
  FILAS_TURNOS,
  SEGUNDOS_POR_PISO,
  avanceDelMinuto,
  girar,
  recorteDe,
  minutosParaLaProxima,
  paginaDe,
  pisoDelMomento,
  tocanTurnos,
  turnosDe,
  turnosProximos,
} from "../cartelera.js";
import { colorDeGrupo } from "../exportarGrilla.js";
import { obtenerPantalla, urlImagenCartelera } from "../services/api.js";
import "../styles/tv.css";

/* El televisor de los corredores (#/tv?p=ENLACE): pantalla completa, sin
   sesión ni menú.

   ┌─────────────────────────────────────────────────────────────────┐
   │ Escuela · fecha y hora                                          │
   ├──────────────┬──────────────────────┬───────────────────────────┤
   │ Plano en vivo│ Ahora en esta planta: │                           │
   │ (vertical, a │ aula · grupo ·        │  Imágenes de la cartelera │
   │ todo el alto;│ docente · taller ·    │  (Dirección > Jefatura >  │
   │ una planta   │ horario               │  EMATP)                   │
   │ por minuto)  │                       │                           │
   └──────────────┴──────────────────────┴───────────────────────────┘

   Cada 5 minutos (cada 2 cuando falta poco para que empiecen las clases),
   durante un minuto, en lugar del plano: los turnos, como el llamador de una
   clínica (grupo → aula de las clases que están por empezar, con sus
   novedades).

   Pide los datos cada 30 segundos; si se corta la red, sigue mostrando lo
   último que recibió. La hora es la del servidor (los televisores suelen
   tener mal la suya). */

const CADA = 30 * 1000;

/* «22:54:35» (24 horas, sin «p. m.») y «Domingo, 25 De Octubre», como en la cabecera. */
const horaConSegundos = (fecha) =>
  fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fechaDelDia = (fecha) =>
  fecha
    .toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/(^|\s)(\p{L})/gu, (_, espacio, letra) => espacio + letra.toLocaleUpperCase("es-AR"));
const ESTADO_TURNO = {
  ocupado: "En clase",
  "por-finalizar": "Por terminar",
  proxima: "Próxima",
  docente_ausente: "Docente ausente",
  suspendida: "Clase cancelada",
};

function useDatos(enlace) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [desfase, setDesfase] = useState(0);
  useEffect(() => {
    let vivo = true;
    const pedir = async () => {
      try {
        const d = await obtenerPantalla(enlace);
        if (!vivo) return;
        setDatos(d);
        setDesfase(Date.parse(d.ahora) - Date.now());
        setError("");
      } catch (e) {
        if (vivo) setError(e.status === 404 ? "enlace" : "red");
      }
    };
    pedir();
    const id = setInterval(pedir, CADA);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [enlace]);
  return { datos, error, desfase };
}

/* Reloj que avanza cada segundo, con la hora del servidor. */
function useAhora(desfase) {
  const [ahora, setAhora] = useState(() => new Date(Date.now() + desfase));
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date(Date.now() + desfase)), 1000);
    return () => clearInterval(id);
  }, [desfase]);
  return ahora;
}

/* Tamaño de un elemento (se vuelve a medir si cambia la pantalla, o si el
   elemento se reemplaza: el plano vuelve después del minuto de turnos). */
function useTamano(elemento) {
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  useLayoutEffect(() => {
    if (!elemento) return undefined;
    const medir = () => setTamano({ ancho: elemento.clientWidth, alto: elemento.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [elemento]);
  return tamano;
}

/* La parte con espacios de una planta (ya girada): zonas y carteles. */
const recortePiso = (piso) =>
  recorteDe(piso.salones.flatMap((s) => [...(s.zona ?? []).map(girar), girar([s.x, s.y])]));

/* El plano más grande que entra en el espacio libre (ancho × alto), con la
   proporción del recorte: llega al borde que toque primero. */
const ajustar = (piso, espacio, r) => {
  // ancho / alto del recorte, una vez girado el dibujo
  const razon = ((piso.alto / piso.ancho) * (r.x1 - r.x0)) / (r.y1 - r.y0);
  const ancho = Math.min(espacio.ancho, espacio.alto * razon);
  return { width: `${ancho}px`, height: `${ancho / razon}px` };
};

function Plano({ piso, situacion, tamano, recorte: r }) {
  // El dibujo es vertical: se gira 90° para ocupar el ancho, con su
  // proporción exacta (no se deforma) y los carteles derechos. Se ve sólo la
  // parte con espacios (el lienzo completo se corre y se agranda).
  const [ancho, alto] = [(r.x1 - r.x0) / 100, (r.y1 - r.y0) / 100];
  const lienzo = {
    width: `${100 / ancho}%`,
    height: `${100 / alto}%`,
    left: `${-r.x0 / ancho}%`,
    top: `${-r.y0 / alto}%`,
  };
  return (
    <div className="tv-plano" style={tamano}>
      <div className="tv-plano__lienzo" style={lienzo}>
        <img
          className="tv-plano__dibujo"
          src={piso.imagen}
          alt=""
          style={{ width: `${(piso.ancho / piso.alto) * 100}%`, height: `${(piso.alto / piso.ancho) * 100}%` }}
        />
        <svg className="tv-plano__zonas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="rayado-comun" patternUnits="userSpaceOnUse" width="1.2" height="1.2" patternTransform="rotate(45)">
              <rect width="1.2" height="1.2" fill="rgba(90, 85, 85, 0.16)" />
              <rect width="0.45" height="1.2" fill="rgba(90, 85, 85, 0.42)" />
            </pattern>
            <pattern id="rayado-institucional" patternUnits="userSpaceOnUse" width="0.9" height="0.9" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="0.9" stroke="#5c0f0f" strokeOpacity="0.6" strokeWidth="0.1" />
            </pattern>
          </defs>
          {piso.salones
            .filter((s) => s.zona && (!s.comun || s.tipo === "comun" || s.institucional))
            .map((s) => (
              <polygon key={s.id} className={`zona zona--${situacion.get(s.id)}`} points={s.zona.map((p) => girar(p).join(",")).join(" ")} />
            ))}
        </svg>
        {piso.salones
          .filter((s) => !s.institucional && (!s.comun || s.tipo === "comun"))
          .map((s) => {
            const [x, y] = girar([s.x, s.y]);
            return (
              <span
                key={s.id}
                className={`tv-plano__aula tv-plano__aula--${situacion.get(s.id)} ${s.chico ? "tv-plano__aula--chico" : ""}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {s.nombre}
              </span>
            );
          })}
      </div>
    </div>
  );
}

/* Turnos como en una clínica: arriba, grande, la novedad más importante;
   abajo, el resto de las clases que están por empezar. */
function Llamador({ llamador, ahora }) {
  const { destacada } = llamador;
  const pagina = paginaDe(llamador.filas, ahora, FILAS_TURNOS);
  const Novedad = ({ f }) =>
    f.novedad ? <span className={`tv-llamador__novedad tv-llamador__novedad--${f.novedad.tipo}`}>{f.novedad.texto}</span> : null;
  return (
    <section className="tv__mitad tv-llamador" aria-label="Turnos de clases">
      <header className="tv-llamador__cabeza">
        <h2>Turnos de clases</h2>
        <p>Grupo y aula de las clases que están por empezar</p>
        <span className="tv__cambio" style={{ "--avance": avanceDelMinuto(ahora) }} />
      </header>
      <div className="tv-llamador__columnas" aria-hidden="true">
        <span>Grupo</span>
        <span>Aula</span>
        <span>Docente</span>
        <span>Horario</span>
      </div>
      <div className={`tv-llamador__destacada ${destacada.novedad ? "tv-llamador__destacada--novedad" : ""}`}>
        <span className="tv-llamador__grupo">{destacada.grupo ?? "—"}</span>
        <span className="tv-llamador__aula">{destacada.aula}</span>
        <span className="tv-llamador__docente">
          {destacada.docente ?? "Sin docente"}
          <small>{destacada.materia}</small>
        </span>
        <span className="tv-llamador__hora">{destacada.desde} a {destacada.hasta}</span>
        {destacada.novedad && <span className="tv-llamador__aviso">{destacada.novedad.texto}</span>}
      </div>
      <ul className="tv-llamador__lista">
        {pagina.filas.map((f) => (
          <li key={f.id} className={`tv-llamador__fila ${f.novedad ? `tv-llamador__fila--${f.novedad.tipo}` : ""}`}>
            <span className="tv-llamador__grupo">{f.grupo ?? "—"}</span>
            <span className="tv-llamador__aula">{f.aula}</span>
            <span className="tv-llamador__docente">
              {f.docente ?? "Sin docente"}
              <Novedad f={f} />
            </span>
            <span className="tv-llamador__hora">{f.desde} a {f.hasta}</span>
          </li>
        ))}
      </ul>
      {pagina.paginas > 1 && <p className="tv-llamador__pagina">{pagina.pagina} / {pagina.paginas}</p>}
    </section>
  );
}

function Carrusel({ imagenes, ahora }) {
  const [indice, setIndice] = useState(0);
  const lista = imagenes ?? [];
  const actual = lista[indice % Math.max(1, lista.length)];
  const claves = lista.map((i) => i.clave).join("|");

  const siguiente = () => setIndice((i) => (i + 1) % Math.max(1, lista.length));

  // Cada imagen dura lo suyo; si cambia la lista, se empieza de nuevo. Los
  // videos pasan completos: avanzan solos cuando terminan (onEnded).
  useEffect(() => setIndice(0), [claves]);
  useEffect(() => {
    if (lista.length < 2 || actual?.tipo === "video") return undefined;
    const id = setTimeout(siguiente, (actual?.duracion ?? 10) * 1000);
    return () => clearTimeout(id);
  }, [indice, claves]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!actual) {
    return (
      <div className="tv-carrusel tv-carrusel--vacio">
        <img src={logo} alt="" />
        <p>E.E.S. Técnica N° 1 «Cecilia Berdichevsky»</p>
        <p className="tv-carrusel__fecha">{fechaYHoraLarga(ahora)}</p>
      </div>
    );
  }
  return (
    <div className="tv-carrusel">
      {lista.map((i, n) => {
        const visible = n === indice % lista.length;
        // El video se monta sólo cuando le toca (no se descargan todos de entrada)
        // y arranca desde el principio. Sin sonido: así el televisor lo reproduce solo.
        if (i.tipo === "video") {
          return visible ? (
            <video
              key={i.clave}
              className="tv-carrusel__imagen tv-carrusel__imagen--visible"
              src={urlImagenCartelera(i.clave)}
              autoPlay
              muted
              playsInline
              loop={lista.length < 2}
              onEnded={siguiente}
              // Si el televisor no puede reproducirlo, pasa al siguiente.
              onError={() => lista.length > 1 && setTimeout(siguiente, 3000)}
            />
          ) : null;
        }
        return (
          <img
            key={i.clave}
            className={`tv-carrusel__imagen ${visible ? "tv-carrusel__imagen--visible" : ""}`}
            src={urlImagenCartelera(i.clave)}
            alt={i.titulo}
          />
        );
      })}
      {(actual.titulo || lista.length > 1) && (
        <div className="tv-carrusel__pie">
          {actual.titulo && <p className="tv-carrusel__titulo">{actual.titulo}</p>}
          <span className={`tv-carrusel__origen tv-carrusel__origen--${actual.nivel}`}>{actual.origen}</span>
          {lista.length > 1 && (
            <span className="tv-carrusel__puntos" aria-hidden="true">
              {lista.map((i, n) => <span key={i.clave} className={n === indice % lista.length ? "activo" : ""} />)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Pantalla({ params }) {
  const enlace = params?.get("p") ?? "";
  const { datos, error, desfase } = useDatos(enlace);
  const ahora = useAhora(desfase);
  const [completa, setCompleta] = useState(false);
  const raiz = useRef(null);

  // Pantalla especial que eligió el panel: "expo" (Expo Técnica), "patria" (Fechas Patrias) o ninguna.
  const tema = ["expo", "patria"].includes(datos?.pantalla?.tema) ? datos.pantalla.tema : "";

  const pisos = useMemo(() => armarPisos(datos?.salones ?? []), [datos]);
  const piso = pisoDelMomento(ahora, pisos);
  const minuto = Math.floor(ahora.getTime() / 60000);

  /* Estado de cada espacio y el tablero de la planta (se recalcula por minuto
     y cuando llegan datos nuevos). */
  const { situacion, turnos } = useMemo(() => {
    const clases = datos?.clases ?? [];
    const porEspacio = new Map();
    for (const c of clases) {
      if (!c.salon_id) continue;
      if (!porEspacio.has(c.salon_id)) porEspacio.set(c.salon_id, []);
      porEspacio.get(c.salon_id).push(c);
    }
    const situacion = new Map(
      piso.salones.map((s) => [
        s.id,
        s.institucional ? "institucional" : s.comun ? "comun" : !s.habilitado ? "deshabilitado" : estadoEspacio(porEspacio.get(s.id) ?? [], ahora).estado,
      ]),
    );
    return { situacion, turnos: turnosDe(clases, piso.salones, ahora) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, piso.id, minuto]);
  const pagina = paginaDe(turnos.filas, ahora, FILAS_BAJO_EL_PLANO, SEGUNDOS_POR_PISO);
  // ¿Este minuto van los turnos (como en una clínica) en lugar del plano?
  const { llamador, faltan } = useMemo(
    () => ({ llamador: turnosProximos(datos?.clases ?? [], ahora), faltan: minutosParaLaProxima(datos?.clases ?? [], ahora) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos, minuto],
  );
  const enTurnos = tocanTurnos(ahora, !!llamador.destacada, faltan);
  // El plano usa todo el espacio libre del sector (lo que dejan la planta y
  // las clases de abajo).
  const [marco, setMarco] = useState(null);
  const espacio = useTamano(marco);
  const recorte = useMemo(() => recortePiso(piso), [piso]);
  const tamanoPlano = ajustar(piso, espacio, recorte);

  /* La letra de los títulos (Oswald) se pide sólo en el televisor; sin
     internet queda una condensada del sistema. */
  useEffect(() => {
    if (document.getElementById("tv-fuente")) return;
    const enlace = Object.assign(document.createElement("link"), {
      id: "tv-fuente",
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap",
    });
    document.head.appendChild(enlace);
  }, []);

  useEffect(() => {
    const cambio = () => setCompleta(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", cambio);
    return () => document.removeEventListener("fullscreenchange", cambio);
  }, []);

  if (error === "enlace" || !enlace) {
    return (
      <div className="tv tv--mensaje">
        <img src={logo} alt="" />
        <p>Este enlace de pantalla no existe o fue renovado.</p>
        <p className="tv__chico">Pedí el enlace nuevo en el panel: Comunicación → Cartelera digital → Televisores.</p>
      </div>
    );
  }

  return (
    <div className={`tv ${tema ? `tv--${tema}` : ""}`} ref={raiz}>
      {/* Cabecera blanca con el escudo y el reloj (con segundos), y la franja
          bordó rayada debajo. En la Expo Técnica y en las Fechas Patrias, la
          cabecera es un banner (con el escudo) y el reloj queda encima. */}
      <header className={`tv__cabeza ${tema ? `tv__cabeza--banner tv__cabeza--${tema}` : ""}`}>
        {tema ? (
          <img className="tv__banner" src={tema === "expo" ? cabeceraExpo : cabeceraPatria} alt={`${tema === "expo" ? "Expo-Técnica · " : ""}E.E.S. Técnica N° 1 «Cecilia Berdichevsky»`} />
        ) : (
          <img className="tv__logo" src={logo} alt="E.E.S. Técnica N° 1 «Cecilia Berdichevsky»" />
        )}
        {!completa && (
          <button className="tv__completa" onClick={() => raiz.current?.requestFullscreen?.()}>
            <Icon icon="ph:corners-out" width={18} height={18} aria-hidden="true" /> Pantalla completa
          </button>
        )}
        <p className="tv__reloj">
          <time className="tv__hora" dateTime={ahora.toISOString()}>{horaConSegundos(ahora)}</time>
          <span className="tv__fecha">{fechaDelDia(ahora)}</span>
        </p>
      </header>
      {tema !== "patria" && <div className="tv__franja" aria-hidden="true" />}

      <main className="tv__cuerpo">
        {enTurnos ? (
          <Llamador llamador={llamador} ahora={ahora} />
        ) : (
          <section className="tv__mitad tv__mitad--plano" aria-label={`Plano de ${piso.nombre.toLowerCase()}`}>
            <div className="tv-plano-marco" ref={setMarco}>
              {espacio.ancho > 0 && <Plano piso={piso} situacion={situacion} tamano={tamanoPlano} recorte={recorte} />}
            </div>
            <div className="tv-turnos">
              <div className="tv__planta">
                <h2>{piso.nombre}</h2>
                <span className="tv__leyenda">
                  {["libre", "ocupado", "por-finalizar"].map((e) => (
                    <span key={e}><i className={`tv__marca tv__marca--${e}`} /> {ESTADOS[e].texto}</span>
                  ))}
                </span>
                <span className="tv__cambio" style={{ "--avance": avanceDelMinuto(ahora) }} title="Cambia de planta cada minuto" />
              </div>
              {/* Sólo si hay clases: sin «Ahora» ni aviso de vacío. Las próximas
                  llevan su título para no confundirlas con las que están en curso. */}
              {pagina.filas.length > 0 && (
                <>
                  {(turnos.titulo !== "Ahora" || pagina.paginas > 1) && (
                    <p className="tv-turnos__titulo">
                      {turnos.titulo !== "Ahora" && turnos.titulo}
                      {pagina.paginas > 1 && <span>{turnos.titulo !== "Ahora" ? " · " : ""}{pagina.pagina}/{pagina.paginas}</span>}
                    </p>
                  )}
                  <ul className="tv-turnos__lista">
                    {pagina.filas.map((f) => (
                      <li key={f.id} className={`tv-turnos__fila tv-turnos__fila--${f.estado}`}>
                        <span className="tv-turnos__aula">{f.aula}</span>
                        <span className={`tv-turnos__grupo tv-turnos__grupo--${colorDeGrupo(f.grupo)}`}>{f.grupo ?? "—"}</span>
                        <span className="tv-turnos__hora">
                          {f.desde} a {f.hasta}
                          {f.estado !== "ocupado" && <span className="tv-turnos__estado">{ESTADO_TURNO[f.estado]}</span>}
                        </span>
                        <span className="tv-turnos__docente">{f.docente ?? "Sin docente"}</span>
                        <span className="tv-turnos__materia">{f.materia ?? ""}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}

        <section className="tv__mitad tv__mitad--imagenes" aria-labelledby="tv-novedades">
          <h2 className="tv__seccion" id="tv-novedades">Novedades</h2>
          <Carrusel imagenes={datos?.imagenes} ahora={ahora} />
          {tema === "patria" && <img className="tv__adorno" src={adornoPatria} alt="" />}
        </section>
      </main>

      {error === "red" && (
        <p className="tv__sin-red">
          <Icon icon="ph:wifi-slash" width={16} height={16} aria-hidden="true" /> Sin conexión: se muestra lo último recibido.
        </p>
      )}
    </div>
  );
}
