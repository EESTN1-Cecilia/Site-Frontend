import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import AsistenteSitio from "./src/components/AsistenteSitio.jsx";
import { ir, separar, useRuta } from "./src/router.js";
import {
  nombrePerfil,
  puede,
  restaurarSesion,
  salir,
  useSesion,
} from "./src/sesion.js";
import Login from "./src/pages/Login.jsx";
import Inicio from "./src/pages/Inicio.jsx";
import Proyectos from "./src/pages/Proyectos.jsx";
import Evaluacion from "./src/pages/Evaluacion.jsx";
import Previas from "./src/pages/Previas.jsx";
import Novedades from "./src/pages/Novedades.jsx";
import Inscripcion from "./src/pages/Inscripcion.jsx";
import Tablero from "./src/pages/panel/Tablero.jsx";
import Grilla from "./src/pages/panel/Grilla.jsx";
import ProyectosPanel from "./src/pages/panel/ProyectosPanel.jsx";
import Publicaciones from "./src/pages/panel/Publicaciones.jsx";
import Mesas from "./src/pages/panel/Mesas.jsx";
import Programas from "./src/pages/panel/Programas.jsx";
import Sitio from "./src/pages/panel/Sitio.jsx";
import SitioPagina from "./src/pages/panel/SitioPagina.jsx";
import { useAjustes } from "./src/ajustes.js";
import { limpiarError, useConexion } from "./src/conexion.js";
import { sincronizarContenido } from "./src/sincronizar.js";
import Server from "./src/pages/panel/Server.jsx";
import Direccion from "./src/pages/panel/Direccion.jsx";
import Usuarios from "./src/pages/panel/Usuarios.jsx";
import MiClave from "./src/pages/panel/MiClave.jsx";
import Cartelera from "./src/pages/panel/Cartelera.jsx";
import Pantalla from "./src/pages/Pantalla.jsx";
import LimiteDeError from "./src/components/LimiteDeError.jsx";
import { Menu, Pie } from "./src/components/Marco.jsx";
import "./src/styles/app.css";
import "./src/styles/paginas.css";
import "./src/styles/panel.css";
import "./src/styles/flotantes.css";

const paginas = {
  "/": Inicio,
  "/login": Login,
  "/proyectos/ciclo-basico": Proyectos,
  "/proyectos/informatica": Proyectos,
  "/proyectos/programacion": Proyectos,
  "/evaluacion": Evaluacion,
  "/previas": Previas,
  "/novedades": Novedades,
  "/inscripcion": Inscripcion,
  "/panel": Tablero,
  "/panel/grilla": Grilla,
  "/panel/proyectos": ProyectosPanel,
  "/panel/publicaciones": Publicaciones,
  "/panel/mesas": Mesas,
  "/panel/programas": Programas,
  "/panel/sitio": Sitio,
  "/panel/sitio/pagina": SitioPagina,
  "/panel/server": Server,
  "/panel/direccion": Direccion,
  "/panel/usuarios": Usuarios,
  "/panel/cuenta": MiClave,
  "/panel/cartelera": Cartelera,
};

function SinAcceso({ usuario }) {
  return (
    <main className="seccion contenedor">
      <div className="centrado">
        <p className="chip">SIN PERMISO</p>
        <h1 className="titulo">
          Esta sección no está <span className="titulo__destacado">habilitada</span> para tu perfil.
        </h1>
        <p className="texto">
          Ingresaste como {nombrePerfil(usuario.rol)}. Si necesitás acceso,
          dirección puede habilitártelo desde permisos.
        </p>
        <div className="hero__acciones" style={{ justifyContent: "center" }}>
          <button className="pill" onClick={() => ir("/")}>
            Volver al inicio
          </button>
        </div>
      </div>
    </main>
  );
}

function App() {
  const ruta = useRuta();
  const usuario = useSesion();
  const { inscripcionAbierta, redes } = useAjustes();
  const conexion = useConexion();
  const [showTop, setShowTop] = useState(false);
  const ojosRobot = useRef(null);
  const botonAsistente = useRef(null);
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const [asistentePensando, setAsistentePensando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  /* Si hay token guardado, el backend confirma quién es. */
  useEffect(() => {
    restaurarSesion();
  }, []);

  /* Si en otra pestaña se entra con otra cuenta o se sale, esta pestaña se
     recarga: si no, seguiría mostrando el rol anterior mientras escribe con
     el token nuevo. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === null || e.key === "site_token" || e.key === "tec1-sesion") window.location.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* El contenido del sitio se trae del backend. Se vuelve a pedir al entrar o
     salir, porque gestión ve además las notas que esperan revisión. */
  useEffect(() => {
    sincronizarContenido();
  }, [usuario?.usuario]);

  useEffect(() => {
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ultimoParpadeo = -Infinity;
    const onScroll = () => {
      setShowTop(window.scrollY > 420);
      const ahora = performance.now();
      if (ojosRobot.current && !movimientoReducido.matches && ahora - ultimoParpadeo >= 900) {
        ultimoParpadeo = ahora;
        ojosRobot.current.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
          duration: 230,
          easing: "ease-in-out",
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuAbierto(false), [ruta]);

  const [camino, params] = separar(ruta);
  const esPanel = camino.startsWith("/panel");
  /* Object.hasOwn: un hash como "#constructor" no es una página. */
  const Pagina = Object.hasOwn(paginas, camino) ? paginas[camino] : Inicio;
  const esLogin = camino === "/login";
  const enVistaPrevia = params.has("preview");

  /* El panel es sólo para el personal: los alumnos ni lo ven en el menú. */
  const contenido = !esPanel ? (
    <Pagina ruta={camino} params={params} usuario={usuario} />
  ) : !usuario ? (
    <Login motivo="Iniciá sesión para entrar a la gestión." />
  ) : puede(usuario, camino) ? (
    <Pagina ruta={camino} params={params} usuario={usuario} />
  ) : (
    <SinAcceso usuario={usuario} />
  );

  if (esLogin) return <LimiteDeError key={ruta}><Login /></LimiteDeError>;
  /* El televisor de los corredores: pantalla completa, sin menú ni sesión. */
  if (camino === "/tv") return <LimiteDeError key={ruta}><Pantalla params={params} /></LimiteDeError>;

  return (
    <>
      <Menu
        ruta={ruta}
        usuario={usuario}
        inscripcionAbierta={inscripcionAbierta}
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        alSalir={() => {
          salir();
          ir("/");
        }}
      />

      <LimiteDeError key={ruta}>{contenido}</LimiteDeError>

      <Pie usuario={usuario} inscripcionAbierta={inscripcionAbierta} redes={redes} />

      {/* Aviso de que el servidor no responde: lo que se edite queda sólo en
          esta computadora, así que nadie debe creer que ya publicó. */}
      {conexion.error && usuario && (
        <p className="cinta-error">
          <Icon icon="ph:warning" width={16} height={16} aria-hidden="true" />
          {conexion.error}
          <button className="cinta-error__cerrar" aria-label="Cerrar aviso" onClick={limpiarError}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}

      {/* Cinta de vista previa. Sólo las publicaciones son borradores sin publicar;
          proyectos y programas ya están en el sitio. */}
      {enVistaPrevia && (
        <p className="cinta-previa">
          <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
          {["/novedades", "/previas"].includes(camino)
            ? "Vista previa · este contenido todavía no está publicado"
            : "Vista previa · así lo ven los alumnos"}
        </p>
      )}

      {!esPanel && (
        <button
          ref={botonAsistente}
          type="button"
          className={`robot-tecnica${asistentePensando ? " robot-tecnica--pensando" : ""}`}
          aria-label="Asistente de Técnica 1"
          aria-expanded={asistenteAbierto}
          aria-controls={asistenteAbierto ? "asistente-sitio" : undefined}
          onClick={() => {
            setAsistentePensando(false);
            setAsistenteAbierto(!asistenteAbierto);
          }}
        >
          <svg viewBox="0 0 992 1088" width="992" height="1088" aria-hidden="true">
            <defs>
              <clipPath id="robot-tecnica-silueta">
                <path d="M220 335C220 166 316 46 503 46C686 46 797 163 797 335C797 414 744 466 657 490L664 498C738 520 788 513 837 628C858 684 883 763 880 807C879 832 868 848 855 857C849 881 834 904 820 913C806 919 793 904 796 890C780 902 768 886 775 867C758 883 755 858 768 831C755 801 745 744 737 678C732 763 714 834 681 846C640 905 577 944 506 944C429 944 369 904 332 846C301 834 283 764 279 678C269 753 258 805 244 830C257 851 260 873 244 874L223 861C233 881 223 902 210 897C216 912 201 918 190 910C170 896 160 878 160 853C140 838 131 813 138 777C147 723 168 654 181 628C218 526 269 521 350 502L359 490C276 469 220 421 220 335Z" />
              </clipPath>
            </defs>
            <image href={`${import.meta.env.BASE_URL}robot-tecnica.jpg`} width="992" height="1088" clipPath="url(#robot-tecnica-silueta)" />
            <g className="robot-tecnica__sonrisa">
              <g fill="#152c38">
                <ellipse cx="406" cy="280" rx="41" ry="55" />
                <ellipse cx="614" cy="280" rx="41" ry="55" />
              </g>
              <path d="M380 289Q406 250 432 289M588 289Q614 250 640 289" fill="none" stroke="#64f58f" strokeWidth="11" strokeLinecap="round" />
              <path d="M446 351Q446 337 464 339Q508 350 552 339Q571 336 571 351C562 409 467 420 446 351Z" />
            </g>
            <g className="robot-tecnica__escaneo">
              <defs>
                <clipPath id="robot-tecnica-visor">
                  <path d="M385 164Q505 150 633 164C690 170 716 256 721 320C728 410 646 440 508 441C363 441 292 411 294 327C297 259 326 173 385 164Z" />
                </clipPath>
                <linearGradient id="robot-tecnica-luz">
                  <stop stopColor="#8bf9ff" stopOpacity="0" />
                  <stop offset=".5" stopColor="#b4fbff" stopOpacity=".72" />
                  <stop offset="1" stopColor="#8bf9ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g clipPath="url(#robot-tecnica-visor)">
                <path className="robot-tecnica__barrido" d="M233 145h100l-70 305H163Z" fill="url(#robot-tecnica-luz)" />
              </g>
            </g>
            <g className="robot-tecnica__cara-pensando">
              <g fill="#132936">
                <ellipse cx="406" cy="280" rx="43" ry="57" />
                <ellipse cx="614" cy="280" rx="43" ry="57" />
                <ellipse cx="508" cy="367" rx="65" ry="39" />
              </g>
              <path d="M374 272Q406 316 438 272M582 272Q614 316 646 272" fill="none" stroke="#fff08a" strokeWidth="22" strokeLinecap="round" />
            </g>
          </svg>
          <span ref={ojosRobot} className="robot-tecnica__ojos" />
        </button>
      )}

      {!esPanel && asistenteAbierto && (
        <AsistenteSitio alPensar={setAsistentePensando} alCerrar={(devolverFoco = true) => {
          setAsistentePensando(false);
          setAsistenteAbierto(false);
          if (devolverFoco !== false) botonAsistente.current?.focus();
        }} />
      )}

      {showTop && (
        <button
          className="volver-arriba"
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Icon icon="ph:arrow-up" width={20} height={20} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

export default App;
