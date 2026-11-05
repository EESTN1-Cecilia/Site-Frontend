import { Icon } from "@iconify/react";
import Texto, {
  Bloque,
  Enlace,
  Icono,
  Imagen,
  useEdicionTextos,
  useLista,
} from "./Texto.jsx";
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
const nombreDe = (destino) => destino.replace(/^\//, "").replace(/\//g, "-") || "inicio";

const enlacesPie = [
  ["/", "Inicio", "ph:house"],
  ["/evaluacion", "Evaluación de saberes", "ph:clipboard-text"],
  ["/previas", "Intensificación/Previas", "ph:arrows-clockwise"],
  ["/novedades", "Novedades", "ph:megaphone"],
  ["/inscripcion", "Inscripción", "ph:user-plus"],
  ["/panel", "Sistema de gestión", "ph:squares-four"],
];

const logosPieBase = [
  { id: "l1", icono: "ph:wrench", nombre: "Ciclo Básico", ruta: "/proyectos/ciclo-basico" },
  { id: "l2", icono: "ph:cpu", nombre: "Informática", ruta: "/proyectos/informatica" },
  { id: "l3", icono: "ph:code", nombre: "Programación", ruta: "/proyectos/programacion" },
];

const datosPieBase = [
  {
    id: "d1",
    icono: "ph:map-pin",
    claveTexto: "inicio.pie.direccion",
    texto: "Güemes 2051 · Esteban Echeverría · Provincia de Buenos Aires.",
  },
  {
    id: "d2",
    icono: "ph:envelope-simple",
    texto: "eest1ee@abc.gob.ar",
  },
  {
    id: "d3",
    icono: "ph:phone",
    texto: "(011) 4290-0000 · Secretaría y atención a familias",
  },
  {
    id: "d4",
    icono: "ph:clock",
    texto: "Lunes a viernes · Turnos mañana y tarde",
  },
];

const redesPieBase = [
  { id: "ig", red: "instagram", icono: "ph:instagram-logo", nombre: "Instagram", url: "https://www.instagram.com" },
  { id: "fb", red: "facebook", icono: "ph:facebook-logo", nombre: "Facebook", url: "https://www.facebook.com" },
  { id: "yt", red: "youtube", icono: "ph:youtube-logo", nombre: "YouTube", url: "https://www.youtube.com" },
  { id: "abc", red: "web", icono: "ph:globe", nombre: "Portal ABC", url: "https://abc.gob.ar" },
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
            <Icono id={`inicio.menu.${nombreDe(destino)}.icono`} icono={icon} width={16} height={16} />
            <Texto id={`inicio.menu.${nombreDe(destino)}`}>{label}</Texto>
          </button>
        ))}
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
          {(inscripcionAbierta || editando) && (
            <button className="nav__link" onClick={() => ir("/inscripcion")}>
              <Icono id="inicio.menu.inscripcion.icono" icono="ph:user-plus" width={16} height={16} />
              <Texto id="inicio.menu.inscripcion">Inscripción</Texto>
            </button>
          )}
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

export function Pie({ usuario, inscripcionAbierta, redes = [] }) {
  const edicion = useEdicionTextos();
  const editando = !!edicion?.puede();

  const [logosPie, bloqueLogo, agregarLogo] = useLista("inicio.pie.logos", logosPieBase, { duplicable: true });
  const [datosPie, bloqueDato, agregarDato] = useLista("inicio.pie.datos", datosPieBase, { duplicable: true });
  const [redesLista, bloqueRed, agregarRed] = useLista("inicio.pie.redesLista", redesPieBase, { duplicable: true });

  /* Redes adicionales cargadas desde Ajustes (Dirección). */
  const redesAjustes = Array.isArray(redes)
    ? redes.filter((r) => Object.hasOwn(redesSociales, r.red) && esLinkValido(r.url))
    : [];
  const urlsPorRed = Object.fromEntries(redesAjustes.map((r) => [r.red, r.url]));
  const redesAjustesExtras = redesAjustes.filter(
    (r) => !redesPieBase.some((base) => base.red === r.red),
  );

  return (
    <footer className="footer">
      <div className="footer__borde-superior" aria-hidden="true" />
      <div className="contenedor">
        <div className="footer__grid">
          <div className="footer__marca">
            <div className="footer__identidad">
              <span className="footer__logo-Marco">
                <Imagen id="inicio.pie.logo" className="footer__logo" src={logo} alt="Logo Técnica 1" />
              </span>
              <div>
                <p className="footer__eyebrow">
                  <Texto id="inicio.pie.subtitulo">E.E.S.T. N° 1 · ESTEBAN ECHEVERRÍA</Texto>
                </p>
                <p className="footer__titulo">
                  <Texto id="inicio.pie.titulo">Técnica 1 Cecilia Berdichevsky</Texto>
                </p>
              </div>
            </div>

            <div className="footer__logos" aria-label="Orientaciones e insignias">
              {logosPie.map((item) => (
                <Bloque
                  key={item.id}
                  {...bloqueLogo(item)}
                  como="button"
                  type="button"
                  className="footer__insignia"
                  onClick={() => item.ruta && ir(item.ruta)}
                >
                  <span className="footer__insignia-icono">
                    <Icono
                      id={`inicio.pie.logos.${item.id}.icono`}
                      icono={item.icono}
                      width={16}
                      height={16}
                    />
                  </span>
                  <Texto id={`inicio.pie.logos.${item.id}.nombre`} clase="footer__insignia-texto">
                    {item.nombre}
                  </Texto>
                </Bloque>
              ))}
              {editando && (
                <button
                  type="button"
                  className="footer__agregar control-edicion"
                  onClick={() => agregarLogo()}
                >
                  <Icon icon="ph:plus-circle" width={15} height={15} aria-hidden="true" />
                  Agregar insignia
                </button>
              )}
            </div>

            <ul className="footer__datos">
              {datosPie.map((dato) => (
                <Bloque key={dato.id} {...bloqueDato(dato)} como="li" className="footer__dato">
                  <span className="footer__dato-icono">
                    <Icono
                      id={`inicio.pie.datos.${dato.id}.icono`}
                      icono={dato.icono}
                      width={16}
                      height={16}
                    />
                  </span>
                  <Texto
                    id={dato.claveTexto || `inicio.pie.datos.${dato.id}.texto`}
                    clase="footer__dato-texto"
                  >
                    {dato.texto}
                  </Texto>
                </Bloque>
              ))}
            </ul>
            {editando && (
              <button
                type="button"
                className="footer__agregar footer__agregar--dato control-edicion"
                onClick={() => agregarDato("d2")}
              >
                <Icon icon="ph:plus-circle" width={15} height={15} aria-hidden="true" />
                Agregar dato con ícono
              </button>
            )}
          </div>

          <div className="footer__col">
            <nav aria-label="Navegación del pie">
              <p className="footer__heading">
                <Icono id="inicio.pie.navegacion.icono" icono="ph:compass" width={15} height={15} />
                <Texto id="inicio.pie.navegacion">NAVEGACIÓN</Texto>
              </p>
              <div className="footer__links">
                {enlacesPie
                  .filter(
                    ([destino]) =>
                      (destino !== "/panel" || verPanel(usuario) || editando) &&
                      (destino !== "/inscripcion" || inscripcionAbierta || editando),
                  )
                  .map(([destino, label, icono]) => {
                    const clave = nombreDe(destino);
                    return (
                      <button className="footer__link" key={destino} onClick={() => ir(destino)}>
                        <span className="footer__link-icono">
                          <Icono
                            id={`inicio.pie.enlaces.${clave}.icono`}
                            icono={icono}
                            width={16}
                            height={16}
                          />
                        </span>
                        <Texto id={`inicio.pie.enlaces.${clave}`}>{label}</Texto>
                      </button>
                    );
                  })}
              </div>
            </nav>

            <div className="footer__redes-bloque">
              <p className="footer__heading footer__heading--redes">
                <Icono id="inicio.pie.redes.icono" icono="ph:share-network" width={15} height={15} />
                <Texto id="inicio.pie.redes">REDES Y COMUNIDAD</Texto>
              </p>
              <div className="redes">
                {redesLista.map((r) => {
                  const href = urlsPorRed[r.red] || r.url;
                  return (
                    <Bloque key={r.id} {...bloqueRed(r)} className="red-item">
                      <Enlace
                        id={`inicio.pie.redesLista.${r.id}.link`}
                        href={href}
                        className="red"
                        aria-label={r.nombre}
                        title={r.nombre}
                      >
                        <Icono
                          id={`inicio.pie.redesLista.${r.id}.icono`}
                          icono={r.icono}
                          width={19}
                          height={19}
                        />
                      </Enlace>
                    </Bloque>
                  );
                })}
                {redesAjustesExtras.map((r) => {
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
                      <Icon icon={icono} width={19} height={19} aria-hidden="true" />
                    </a>
                  );
                })}
                {editando && (
                  <button
                    type="button"
                    className="footer__agregar footer__agregar--red control-edicion"
                    title="Agregar otro ícono o red"
                    onClick={() => agregarRed()}
                  >
                    <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="footer__inferior">
          <p className="copyright">
            © {new Date().getFullYear()}{" "}
            <Texto id="inicio.pie.copyright">
              Técnica 1 Cecilia Berdichevsky. Todos los derechos reservados.
            </Texto>
          </p>
          <p className="footer__lema">
            <Icono id="inicio.pie.lema.icono" icono="ph:seal-check" width={15} height={15} />
            <Texto id="inicio.pie.lema">Educación Pública · Formación Técnica Profesional</Texto>
          </p>
        </div>
      </div>
    </footer>
  );
}
