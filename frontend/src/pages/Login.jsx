import { useState } from "react";
import { Icon } from "@iconify/react";
import { logo } from "../data.js";
import { ir } from "../router.js";
import { entrarConBackend, verPanel } from "../sesion.js";

export default function Login({ motivo }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState("");
  const [ayuda, setAyuda] = useState(false);
  const [cargando, setCargando] = useState(false);

  /* Login contra el backend; sin servidor no se entra. */
  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const sesion = await entrarConBackend(usuario, clave, recordar);
      /* Si se llegó desde una página del panel (motivo), se queda en esa: con
         la sesión iniciada, App ya la muestra. */
      if (!motivo) ir(verPanel(sesion) ? "/panel" : "/");
    } catch (fallo) {
      setError(fallo.message);
      setCargando(false);
    }
  };

  return (
    <main className="login">
      <section className="login__marca">
        <img className="login__logo" src={logo} alt="Logo Técnica 1" />
        <h1 className="login__marca-titulo">
          Técnica 1
          <span>Cecilia Berdichevsky</span>
        </h1>
        <p className="login__marca-texto">
          Un solo acceso para toda la escuela. Cada persona ve lo que le
          corresponde: las familias, su información; el personal, su área de
          gestión.
        </p>
        <ul className="login__lista">
          {[
            ["ph:student", "Alumnos y familias: previas y novedades."],
            ["ph:chalkboard-teacher", "Docentes: seguimiento curricular."],
            ["ph:shield-check", "Dirección: permisos y publicación."],
          ].map(([icono, texto]) => (
            <li key={texto}>
              <Icon icon={icono} width={18} height={18} aria-hidden="true" />
              {texto}
            </li>
          ))}
        </ul>
      </section>

      <section className="login__caja">
        <form className="login__form" onSubmit={enviar}>
          <p className="chip">ACCESO</p>
          <h2 className="login__titulo">Ingresá a tu cuenta</h2>
          <p className="login__bajada">
            Usá el DNI o el correo institucional que te dieron en la escuela.
          </p>

          {error && (
            <p className="flash">
              <Icon icon="ph:warning" width={18} height={18} aria-hidden="true" />
              {error}
            </p>
          )}

          {motivo && (
            <p className="flash">
              <Icon icon="ph:lock-key" width={18} height={18} aria-hidden="true" />
              {motivo}
            </p>
          )}

          <label className="campo campo--ancho">
            <span>DNI o correo institucional</span>
            <input
              required
              autoComplete="username"
              placeholder="12345678"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </label>

          <label className="campo campo--ancho">
            <span>Contraseña</span>
            <span className="login__clave">
              <input
                required
                type={verClave ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
              <button
                type="button"
                className="login__ojo"
                aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setVerClave((visible) => !visible)}
              >
                <Icon
                  icon={verClave ? "ph:eye-slash" : "ph:eye"}
                  width={18}
                  height={18}
                  aria-hidden="true"
                />
              </button>
            </span>
          </label>

          <div className="login__fila">
            {/* Destildada, la sesión se borra al cerrar el navegador: para
                computadoras compartidas. */}
            <label className="login__recordar">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
              />
              Mantener sesión iniciada
            </label>
            <button type="button" className="login__olvide" onClick={() => setAyuda(true)}>
              Olvidé mi contraseña
            </button>
          </div>

          {ayuda && (
            <p className="flash flash--info">
              <Icon icon="ph:info" width={18} height={18} aria-hidden="true" />
              Para recuperar el acceso acercate a secretaría con tu DNI. Si sos
              personal de la escuela, Dirección puede ponerte una contraseña nueva
              desde gestión.
            </p>
          )}

          <button
            className="boton boton--primario boton--ancho"
            type="submit"
            disabled={cargando}
          >
            {cargando ? "Ingresando…" : "Ingresar"}
            <Icon icon="ph:arrow-right" width={16} height={16} aria-hidden="true" />
          </button>

          <p className="login__ayuda">
            ¿Problemas para entrar? Acercate a secretaría con tu DNI.
          </p>
        </form>
      </section>
    </main>
  );
}
