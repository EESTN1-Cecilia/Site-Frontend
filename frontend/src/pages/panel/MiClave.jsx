import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { guardarToken, sesionRecordada, tokenActual } from "../../conexion.js";
import { cambiarMiClave, obtenerUsuario } from "../../services/api.js";

/* Mi contraseña: cada persona cambia la de su propia cuenta.

   Dirección la puede cambiar siempre. Las cuentas de sector (Jefatura,
   Server) la cambian una sola vez: después quedan bloqueadas hasta que
   Dirección les habilite otro cambio desde «Usuarios y contraseñas».
   Al cambiarla el servidor cierra las demás sesiones de la cuenta y entrega
   un token nuevo, que se guarda acá para no sacar a quien la cambió. */

const LARGO_MINIMO = 8;

/* Campo de contraseña con botón para mostrarla u ocultarla. */
function CampoClave({ visible, alternar, ...props }) {
  return (
    <span className="clave-campo">
      <input type={visible ? "text" : "password"} {...props} />
      <button
        type="button"
        className="clave-campo__ojo"
        onClick={alternar}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        <Icon icon={visible ? "ph:eye-slash" : "ph:eye"} width={20} height={20} aria-hidden="true" />
      </button>
    </span>
  );
}

const textoError = (error) =>
  error?.sinConexion
    ? "El servidor no responde. Probá de nuevo en un momento."
    : error?.message || "No se pudo cambiar la contraseña.";

export default function MiClave({ ruta }) {
  const [estado, setEstado] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [entiendo, setEntiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [ver, setVer] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerUsuario(tokenActual())
      .then(({ usuario }) => vigente && setEstado(usuario))
      .catch((e) => vigente && setErrorCarga(textoError(e)));
    return () => {
      vigente = false;
    };
  }, []);

  const esDireccion = estado?.rol === "direccion";
  const bloqueada = !!estado && !esDireccion && !estado.password_change_allowed;

  const errorNueva =
    nueva && nueva.length < LARGO_MINIMO
      ? `Tiene que tener al menos ${LARGO_MINIMO} caracteres.`
      : nueva && actual && nueva === actual
        ? "Tiene que ser distinta de la actual."
        : "";
  const errorRepetida = repetida && nueva !== repetida ? "Las dos contraseñas no coinciden." : "";

  const completo =
    actual && nueva.length >= LARGO_MINIMO && nueva === repetida && nueva !== actual && (esDireccion || entiendo);

  const cambiar = async (evento) => {
    evento.preventDefault();
    if (!completo || enviando) return;

    setEnviando(true);
    setAviso(null);
    try {
      const respuesta = await cambiarMiClave(tokenActual(), actual, nueva);
      /* El token anterior ya no sirve: se guarda el nuevo donde estaba el viejo. */
      guardarToken(respuesta.token, sesionRecordada());
      setEstado((previo) => ({
        ...previo,
        password_change_allowed: respuesta.password_change_allowed,
        password_change_count: respuesta.password_change_count,
      }));
      setActual("");
      setNueva("");
      setRepetida("");
      setEntiendo(false);
      setAviso({
        tipo: "ok",
        texto: esDireccion
          ? "Tu contraseña se cambió. Se cerraron las demás sesiones abiertas de tu cuenta."
          : "Tu contraseña se cambió. Usaste tu único cambio: si necesitás otro, pedíselo a Dirección.",
      });
    } catch (e) {
      setAviso({ tipo: "error", texto: textoError(e) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Layout
      ruta={ruta}
      chip="MI CUENTA"
      titulo="Mi contraseña"
      texto="Elegí una contraseña propia para tu cuenta."
    >
      {aviso && (
        <div
          className={`flash ${aviso.tipo === "error" ? "flash--error" : ""}`}
          role={aviso.tipo === "error" ? "alert" : "status"}
        >
          <Icon
            icon={aviso.tipo === "error" ? "ph:warning-circle" : "ph:check-circle"}
            width={18}
            height={18}
            aria-hidden="true"
          />
          {aviso.texto}
          <button className="flash__cerrar" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Cambiar contraseña</h2>

        {errorCarga && (
          <p className="flash flash--error" role="alert">
            <Icon icon="ph:warning-circle" width={18} height={18} aria-hidden="true" />
            {errorCarga}
          </p>
        )}

        {!errorCarga && !estado && <p className="nota-interna">Cargando…</p>}

        {bloqueada && (
          <p className="flash flash--info">
            <Icon icon="ph:lock-key" width={18} height={18} aria-hidden="true" />
            Esta cuenta ya usó su cambio de contraseña. Para cambiarla otra vez, pedile a Dirección que
            te lo habilite.
          </p>
        )}

        {estado && !bloqueada && (
          <form className="mi-clave" onSubmit={cambiar}>
            <p className="tarjeta__bajada">
              {esDireccion
                ? "Podés cambiarla cuando quieras. Se cierran las demás sesiones abiertas de tu cuenta."
                : "Podés cambiarla una sola vez. Se cierran las demás sesiones abiertas de esta cuenta."}
            </p>

            <label className="campo">
              <span>Contraseña actual</span>
              <CampoClave
                visible={ver}
                alternar={() => setVer((v) => !v)}
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <label className={`campo ${errorNueva ? "campo--error" : ""}`}>
              <span>Contraseña nueva</span>
              <CampoClave
                visible={ver}
                alternar={() => setVer((v) => !v)}
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                autoComplete="new-password"
                minLength={LARGO_MINIMO}
                aria-invalid={!!errorNueva}
                required
              />
              {errorNueva && <small className="campo__error">{errorNueva}</small>}
            </label>

            <label className={`campo ${errorRepetida ? "campo--error" : ""}`}>
              <span>Repetí la contraseña nueva</span>
              <CampoClave
                visible={ver}
                alternar={() => setVer((v) => !v)}
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
                autoComplete="new-password"
                aria-invalid={!!errorRepetida}
                required
              />
              {errorRepetida && <small className="campo__error">{errorRepetida}</small>}
            </label>

            {!esDireccion && (
              <label className="campo campo--casilla">
                <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
                Entiendo que este cambio se puede hacer una sola vez.
              </label>
            )}

            <div className="acciones-fila">
              <button className="boton boton--primario" disabled={!completo || enviando}>
                {enviando ? "Guardando…" : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        )}
      </section>
    </Layout>
  );
}
