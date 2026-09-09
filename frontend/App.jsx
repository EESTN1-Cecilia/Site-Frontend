import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import ProposalCard from "./src/components/ProposalCard.jsx";
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuario,
  subirPdf,
} from "./src/services/api.js";
import {
  courses,
  facade,
  facts,
  logo,
  navItems,
  points,
  proposals,
  socials,
} from "./src/data.js";
import "./src/styles/app.css";

function App() {
  const sections = useRef({});
  const [showTop, setShowTop] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("site_token"));
  const [modal, setModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [destino, setDestino] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    obtenerUsuario(token)
      .then(({ usuario: usuarioActual }) => setUsuario(usuarioActual))
      .catch(() => {
        localStorage.removeItem("site_token");
        setToken(null);
        setUsuario(null);
      });
  }, [token]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (name) => {
    setMenuAbierto(false);
    sections.current[name]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const abrirLogin = () => {
    setAuthError("");
    setModal("login");
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setCargando(true);
    setAuthError("");

    const formData = new FormData(event.currentTarget);
    try {
      const respuesta = await iniciarSesion(
        formData.get("username"),
        formData.get("password"),
      );
      localStorage.setItem("site_token", respuesta.token);
      setToken(respuesta.token);
      setUsuario(respuesta.usuario);
      setModal(null);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await cerrarSesion(token);
      } catch (error) {
        console.warn("No se pudo notificar el cierre de sesión:", error.message);
      }
    }
    localStorage.removeItem("site_token");
    setToken(null);
    setUsuario(null);
    setModal(null);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!archivo) return;

    const form = event.currentTarget;
    setCargando(true);
    setUploadMessage("");
    try {
      const respuesta = await subirPdf(token, archivo, destino);
      setUploadMessage(`Archivo subido correctamente: ${respuesta.nombreArchivo}`);
      setArchivo(null);
      form.reset();
    } catch (error) {
      setUploadMessage(error.message);
    } finally {
      setCargando(false);
    }
  };

  const enlaces = (
    <>
      {navItems.map(([name, label, icon]) => (
        <button key={name} className="nav__link" onClick={() => goTo(name)}>
          <Icon icon={icon} width={16} height={16} aria-hidden="true" />
          {label}
        </button>
      ))}
      <button className="cta" onClick={() => goTo("inscripcion")}>
        Inscripción
        <Icon
          icon="ph:arrow-up-right"
          width={15}
          height={15}
          aria-hidden="true"
        />
      </button>
      {usuario ? (
        <>
          <button className="nav__link" onClick={() => setModal("upload")}>
            <Icon icon="ph:upload-simple" width={16} height={16} aria-hidden="true" />
            Subir PDF
          </button>
          <button className="nav__link nav__user" onClick={handleLogout}>
            {usuario.username} · Salir
          </button>
        </>
      ) : (
        <button className="nav__link" onClick={abrirLogin}>
          <Icon icon="ph:sign-in" width={16} height={16} aria-hidden="true" />
          Ingresar
        </button>
      )}
    </>
  );

  return (
    <>
      <header className="header">
        <nav className="nav contenedor">
          <button className="marca" onClick={() => goTo("inicio")}>
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

      <main>
        <section
          className="hero"
          ref={(node) => {
            sections.current.inicio = node;
          }}
        >
          <div className="hero__card">
            <img
              className="hero__img"
              src={facade}
              alt="Fachada de la escuela"
            />
            <div className="hero__velo" />
            <div className="hero__contenido">
              <p className="hero__chip">
                <img src={logo} alt="" />
                EDUCACIÓN TÉCNICA PÚBLICA · ESTEBAN ECHEVERRÍA
              </p>
              <h1 className="hero__titulo">
                Técnica 1
                <br />
                <span>Cecilia Berdichevski</span>
              </h1>
              <p className="hero__bajada">
                Un espacio para aprender, crear y transformar ideas en proyectos.
                Formación técnica, comunidad y futuro.
              </p>
              <div className="hero__acciones">
                <button className="pill" onClick={() => goTo("cursos")}>
                  Ver cursos
                  <Icon
                    icon="ph:arrow-up-right"
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                </button>
                <button
                  className="pill pill--ghost"
                  onClick={() => goTo("identidad")}
                >
                  Conocé la escuela
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="seccion contenedor">
          <div className="centrado">
            <p className="chip">NUESTRA ESCUELA</p>
            <h2 className="titulo">
              Una escuela para quienes <span>quieren hacer</span>.
            </h2>
            <p className="texto">
              Formamos estudiantes con curiosidad, pensamiento crítico y
              herramientas para construir su futuro. Nuestra comunidad combina
              conocimiento, práctica y trabajo colaborativo.
            </p>
          </div>
          <div className="facts">
            {facts.map(([icon, title, text, tono]) => (
              <article className={`fact fact--${tono}`} key={title}>
                <span className="fact__marca">
                  <Icon
                    icon={icon}
                    width={110}
                    height={110}
                    aria-hidden="true"
                  />
                </span>
                <span className="fact__icono">
                  <Icon icon={icon} width={30} height={30} aria-hidden="true" />
                </span>
                <h3 className="fact__titulo">{title}</h3>
                <p className="fact__texto">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="propuestas"
          ref={(node) => {
            sections.current.cursos = node;
          }}
        >
          <div className="propuestas__inner">
            <div className="encabezado">
              <div>
                <p className="chip">FORMACIÓN</p>
                <h2 className="titulo">
                  Nuestras <span>propuestas</span>
                </h2>
              </div>
              <p className="descripcion">
                Buscá tu curso y accedé a los materiales de cada división.
              </p>
            </div>
            <div className="cards">
              {proposals.map(([title, text, image], index) => (
                <ProposalCard
                  key={title}
                  title={title}
                  text={text}
                  image={image}
                  course={courses[index]}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        <section
          className="seccion contenedor"
          ref={(node) => {
            sections.current.identidad = node;
          }}
        >
          <div className="identidad">
            <div>
              <p className="chip">IDENTIDAD INSTITUCIONAL</p>
              <h2 className="titulo">
                Técnica, creatividad y <span>comunidad</span>.
              </h2>
              <p className="texto">
                Nuestra identidad se construye a partir de la educación técnica
                como herramienta de transformación. Aprender es experimentar,
                resolver problemas, trabajar con otros y animarse a crear.
              </p>
              <img
                className="identidad__logo"
                src={logo}
                alt="Logo Técnica 1"
              />
            </div>
            <div className="puntos">
              {points.map(([title, text], index) => (
                <article className="punto" key={title}>
                  <span className="punto__numero">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="punto__titulo">{title}</h3>
                    <p className="punto__texto">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

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
              {["La escuela", "Propuestas", "Institucional", "Contacto"].map(
                (item) => (
                  <button className="footer__link" key={item}>
                    {item}
                  </button>
                ),
              )}
            </nav>
            <div>
              <p className="footer__heading">REDES</p>
              <div className="redes">
                {socials.map(([name, icon]) => (
                  <button className="red" key={name} aria-label={name}>
                    <Icon
                      icon={icon}
                      width={18}
                      height={18}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="copyright">
            © 2026 Técnica 1 Cecilia Berdichevski. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {showTop && (
        <button
          className="volver-arriba"
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Icon icon="ph:arrow-up" width={20} height={20} aria-hidden="true" />
        </button>
      )}

      {modal && (
        <div className="modal__fondo" role="presentation" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal__cerrar" onClick={() => setModal(null)} aria-label="Cerrar">
              <Icon icon="ph:x" width={22} height={22} aria-hidden="true" />
            </button>
            {modal === "login" ? (
              <>
                <p className="chip">ACCESO INSTITUCIONAL</p>
                <h2 className="modal__titulo">Ingresar</h2>
                <p className="modal__texto">Usá tu cuenta institucional para subir materiales.</p>
                <form className="modal__form" onSubmit={handleLogin}>
                  <label>
                    Usuario
                    <input name="username" required autoComplete="username" />
                  </label>
                  <label>
                    Contraseña
                    <input name="password" type="password" required autoComplete="current-password" />
                  </label>
                  {authError && <p className="form__error">{authError}</p>}
                  <button className="cta" type="submit" disabled={cargando}>
                    {cargando ? "Ingresando..." : "Ingresar"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="chip">MATERIALES</p>
                <h2 className="modal__titulo">Subir un PDF</h2>
                <p className="modal__texto">El backend validará el destino según tu rol.</p>
                <form className="modal__form" onSubmit={handleUpload}>
                  {usuario?.rol === "direccion" && (
                    <label>
                      Destino
                      <select value={destino} onChange={(event) => setDestino(event.target.value)} required>
                        <option value="">Seleccioná un destino</option>
                        {usuario.destinos?.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                  )}
                  <label>
                    Archivo PDF
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      onChange={(event) => setArchivo(event.target.files?.[0] || null)}
                    />
                  </label>
                  {uploadMessage && <p className="form__message">{uploadMessage}</p>}
                  <button className="cta" type="submit" disabled={cargando || !archivo}>
                    {cargando ? "Subiendo..." : "Subir archivo"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default App;
