import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ir, separar, useRuta } from "./src/router.js";
import { logo, navItems, redesSociales } from "./src/data.js";
import { esLinkValido } from "./src/links.js";
import {
  nombrePerfil,
  puede,
  restaurarSesion,
  salir,
  useSesion,
  verPanel,
} from "./src/sesion.js";
import Login from "./src/pages/Login.jsx";
import Inicio from "./src/pages/Inicio.jsx";
import Proyectos from "./src/pages/Proyectos.jsx";
import Evaluacion from "./src/pages/Evaluacion.jsx";
import Previas from "./src/pages/Previas.jsx";
import Novedades from "./src/pages/Novedades.jsx";
import Inscripcion from "./src/pages/Inscripcion.jsx";
import Tablero from "./src/pages/panel/Tablero.jsx";
import Alumnos from "./src/pages/panel/Alumnos.jsx";
import Asistencia from "./src/pages/panel/Asistencia.jsx";
import Calificaciones from "./src/pages/panel/Calificaciones.jsx";
import Grilla from "./src/pages/panel/Grilla.jsx";
import Curricular from "./src/pages/panel/Curricular.jsx";
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
import "./src/styles/app.css";
import "./src/styles/paginas.css";
import "./src/styles/panel.css";

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
  "/panel/alumnos": Alumnos,
  "/panel/asistencia": Asistencia,
  "/panel/calificaciones": Calificaciones,
  "/panel/grilla": Grilla,
  "/panel/curricular": Curricular,
  "/panel/proyectos": ProyectosPanel,
  "/panel/publicaciones": Publicaciones,
  "/panel/mesas": Mesas,
  "/panel/programas": Programas,
  "/panel/sitio": Sitio,
  "/panel/sitio/pagina": SitioPagina,
  "/panel/server": Server,
  "/panel/direccion": Direccion,
};

const enlacesPie = [
  ["/", "Inicio"],
  ["/evaluacion", "Evaluación de saberes"],
  ["/previas", "Intensificación/Previas"],
  ["/novedades", "Novedades"],
  ["/inscripcion", "Inscripción"],
  ["/panel", "Sistema de gestión"],
];

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
  const redesConLink = redes.filter((r) => redesSociales[r.red] && esLinkValido(r.url));
  const [showTop, setShowTop] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  /* Si hay token guardado, el backend confirma quién es. */
  useEffect(() => {
    restaurarSesion();
  }, []);

  /* El contenido del sitio se trae del backend. Se vuelve a pedir al entrar o
     salir, porque gestión ve además las notas que esperan revisión. */
  useEffect(() => {
    sincronizarContenido();
  }, [usuario?.usuario]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuAbierto(false), [ruta]);

  const [camino, params] = separar(ruta);
  const esPanel = camino.startsWith("/panel");
  const Pagina = paginas[camino] || Inicio;
  const esLogin = camino === "/login";
  const enVistaPrevia = params.has("preview");

  const enlaces = (
    <>
      {navItems
        .filter(([destino]) => destino !== "/panel" || verPanel(usuario))
        .map(([destino, label, icon]) => (
          <button
            key={destino}
            className={`nav__link ${ruta === destino ? "nav__link--activo" : ""}`}
            onClick={() => ir(destino)}
          >
            <Icon icon={icon} width={16} height={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      {usuario ? (
        <div className="sesion">
          <span className="sesion__datos">
            <span className="sesion__nombre">{usuario.nombre}</span>
            <span className="sesion__rol">{nombrePerfil(usuario.rol)}</span>
          </span>
          <button
            className="sesion__salir"
            onClick={() => {
              salir();
              ir("/");
            }}
          >
            <Icon icon="ph:sign-out" width={16} height={16} aria-hidden="true" />
            Salir
          </button>
        </div>
      ) : (
        <>
          {inscripcionAbierta && (
            <button className="nav__link" onClick={() => ir("/inscripcion")}>
              <Icon icon="ph:user-plus" width={16} height={16} aria-hidden="true" />
              Inscripción
            </button>
          )}
          <button className="cta" onClick={() => ir("/login")}>
            Ingresar
            <Icon icon="ph:sign-in" width={15} height={15} aria-hidden="true" />
          </button>
        </>
      )}
    </>
  );

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

  if (esLogin) return <Login />;

  return (
    <>
      <header className="header">
        <nav className="nav contenedor">
          <button className="marca" onClick={() => ir("/")}>
            <img className="marca__logo" src={logo} alt="Logo Técnica 1" />
            <span>
              <span className="marca__titulo">Técnica 1</span>
              <span className="marca__bajada">CECILIA BERDICHEVSKI</span>
            </span>
          </button>
          <div className="nav__links">{enlaces}</div>
          <button
            className="menu-boton"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <Icon
              icon={menuAbierto ? "ph:x" : "ph:list"}
              width={22}
              height={22}
              aria-hidden="true"
            />
          </button>
        </nav>
        {menuAbierto && <div className="menu-panel">{enlaces}</div>}
      </header>

      {contenido}

      <footer className="footer">
        <div className="contenedor">
          <div className="footer__grid">
            <div className="footer__marca">
              <p className="footer__titulo">Técnica 1 Cecilia Berdichevski</p>
              <p className="footer__bajada">
                Güemes 2051 · Esteban Echeverría · Provincia de Buenos Aires.
              </p>
            </div>
            <nav>
              <p className="footer__heading">NAVEGACIÓN</p>
              {enlacesPie
                .filter(
                  ([destino]) =>
                    (destino !== "/panel" || verPanel(usuario)) &&
                    (destino !== "/inscripcion" || inscripcionAbierta),
                )
                .map(([destino, label]) => (
                <button
                  className="footer__link"
                  key={destino}
                  onClick={() => ir(destino)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {redesConLink.length > 0 && (
              <div>
                <p className="footer__heading">REDES</p>
                <div className="redes">
                  {redesConLink.map((r) => {
                    const [nombre, icono] = redesSociales[r.red];
                    return (
                      <a
                        className="red"
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={nombre}
                        title={nombre}
                      >
                        <Icon icon={icono} width={18} height={18} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <p className="copyright">
            © {new Date().getFullYear()} Técnica 1 Cecilia Berdichevski. Todos los derechos reservados.
          </p>
        </div>
      </footer>

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
