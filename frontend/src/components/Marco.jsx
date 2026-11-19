import { Icon } from "@iconify/react";
import Texto, { Imagen, useEdicionTextos } from "./Texto.jsx";
import { logo, navItems, redesSociales } from "../data.js";
import { esLinkValido } from "../links.js";
import { nombrePerfil, verPanel } from "../sesion.js";
import { ir } from "../router.js";

/* ---------------------------------------------------------------------
   Menú de arriba y pie de página del sitio público.

   Sus textos se editan desde la página de Inicio del panel: son claves de
   Inicio ("inicio.menu.*", "inicio.pie.*"), así los publica quien publica
   Inicio y el backend los valida como cualquier texto de esa página.
--------------------------------------------------------------------- */

/* "/" -> "inicio", "/evaluacion" -> "evaluacion", "/panel" -> "panel". */
const nombreDe = (destino) => destino.replace(/^\//, "") || "inicio";

const enlacesPie = [
  ["/", "Inicio"],
  ["/evaluacion", "Evaluación de saberes"],
  ["/previas", "Intensificación/Previas"],
  ["/novedades", "Novedades"],
  ["/inscripcion", "Inscripción"],
  ["/panel", "Sistema de gestión"],
];

/* `vista`: dibujado dentro del editor del panel (no queda fijo arriba). */
export function Menu({ ruta, usuario, inscripcionAbierta, menuAbierto, setMenuAbierto, alSalir, vista }) {
  const edicion = useEdicionTextos();
  /* Al editar se muestra también lo que depende del caso (inscripción cerrada). */
  const editando = !!edicion?.puede();

  const enlaces = (
    <>
      {navItems
        .filter(([destino]) => destino !== "/panel" || verPanel(usuario) || editando)
        .map(([destino, label, icon]) => (
          <button
            key={destino}
            className={`nav__link ${ruta === destino ? "nav__link--activo" : ""}`}
            onClick={() => ir(destino)}
          >
            <Icon icon={icon} width={16} height={16} aria-hidden="true" />
            <Texto id={`inicio.menu.${nombreDe(destino)}`}>{label}</Texto>
          </button>
        ))}
      {(inscripcionAbierta || editando) && (
        <button className="nav__link" onClick={() => ir("/inscripcion")}>
          <Icon icon="ph:user-plus" width={16} height={16} aria-hidden="true" />
          <Texto id="inicio.menu.inscripcion">Inscripción</Texto>
        </button>
      )}
      {usuario ? (
        <div className="sesion">
          <span className="sesion__datos">
            <span className="sesion__nombre">{usuario.nombre}</span>
            <span className="sesion__rol">{nombrePerfil(usuario.rol)}</span>
          </span>
          <button className="sesion__salir" onClick={alSalir}>
            <Icon icon="ph:sign-out" width={16} height={16} aria-hidden="true" />
            Salir
          </button>
        </div>
      ) : (
        <>
          <button className="cta" onClick={() => ir("/login")}>
            <Texto id="inicio.menu.ingresar">Ingresar</Texto>
            <Icon icon="ph:sign-in" width={15} height={15} aria-hidden="true" />
          </button>
        </>
      )}
    </>
  );

  return (
    <header className={`header ${vista ? "header--vista" : ""}`}>
      <nav className="nav contenedor">
        <button className="marca" onClick={() => ir("/")}>
          <Imagen id="inicio.menu.logo" className="marca__logo" src={logo} alt="Logo Técnica 1" />
          <span>
            <span className="marca__titulo">
              <Texto id="inicio.menu.titulo">Técnica 1</Texto>
            </span>
            <span className="marca__bajada">
              <Texto id="inicio.menu.bajada">CECILIA BERDICHEVSKY</Texto>
            </span>
          </span>
        </button>
        <div className="nav__links">{enlaces}</div>
        <button
          className="menu-boton"
          aria-label="Abrir menú"
          aria-expanded={!!menuAbierto}
          onClick={() => setMenuAbierto?.((abierto) => !abierto)}
        >
          <Icon icon={menuAbierto ? "ph:x" : "ph:list"} width={22} height={22} aria-hidden="true" />
        </button>
      </nav>
      {menuAbierto && <div className="menu-panel">{enlaces}</div>}
    </header>
  );
}

/* Link a Google Maps con la dirección del colegio (no depende del texto editable). */
const MAPA = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Güemes 2051, Esteban Echeverría, Buenos Aires, Argentina",
)}`;

export function Pie({ usuario, inscripcionAbierta, redes }) {
  const edicion = useEdicionTextos();
  const editando = !!edicion?.puede();
  /* Object.hasOwn: una red guardada como "constructor" no es una red. */
  const redesConLink = redes.filter((r) => Object.hasOwn(redesSociales, r.red) && esLinkValido(r.url));

  return (
    <footer className="footer">
      <div className="contenedor">
        <div className="footer__grid">
          <div className="footer__marca">
            <p className="footer__titulo">
              <Texto id="inicio.pie.titulo">Técnica 1 Cecilia Berdichevsky</Texto>
            </p>
          </div>
          <nav aria-label="Navegación del pie de página">
            <p className="footer__heading">
              <Texto id="inicio.pie.navegacion">NAVEGACIÓN</Texto>
            </p>
            {enlacesPie
              .filter(
                ([destino]) =>
                  (destino !== "/panel" || verPanel(usuario) || editando) &&
                  (destino !== "/inscripcion" || inscripcionAbierta || editando),
              )
              .map(([destino, label]) => (
                <button className="footer__link" key={destino} onClick={() => ir(destino)}>
                  <Texto id={`inicio.pie.enlaces.${nombreDe(destino)}`}>{label}</Texto>
                </button>
              ))}
          </nav>
          <div className="footer__contacto">
            <p className="footer__heading">UBICACIÓN</p>
            <p className="footer__direccion">
              <Texto id="inicio.pie.direccion">
                Güemes 2051 · Esteban Echeverría · Provincia de Buenos Aires.
              </Texto>
            </p>
            <a className="footer__mapa" href={MAPA} target="_blank" rel="noopener noreferrer">
              <Icon icon="ph:map-pin" width={16} height={16} aria-hidden="true" />
              Cómo llegar
              <Icon icon="ph:arrow-up-right" width={14} height={14} aria-hidden="true" />
            </a>
            {redesConLink.length > 0 && (
              <>
                <p className="footer__heading footer__heading--redes">
                  <Texto id="inicio.pie.redes">REDES</Texto>
                </p>
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
              </>
            )}
          </div>
        </div>
        <p className="copyright">
          © {new Date().getFullYear()}{" "}
          <Texto id="inicio.pie.copyright">Técnica 1 Cecilia Berdichevsky. Todos los derechos reservados.</Texto>
        </p>
      </div>
    </footer>
  );
}
