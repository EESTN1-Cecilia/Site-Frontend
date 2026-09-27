import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
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
import LimiteDeError from "./src/components/LimiteDeError.jsx";
import { Menu, Pie } from "./src/components/Marco.jsx";
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
    const onScroll = () => setShowTop(window.scrollY > 420);

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
