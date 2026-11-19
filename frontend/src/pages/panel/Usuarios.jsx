import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { tokenActual } from "../../conexion.js";
import { ir } from "../../router.js";
import {
  listarAreasUsuarios,
  listarUsuarios,
  permitirCambioClave,
  restablecerClaveUsuario,
} from "../../services/api.js";
import { nombrePerfil, normalizarRol, useSesion } from "../../sesion.js";

/* Usuarios y contraseñas (sólo Dirección).

   Lista las cuentas del sistema y deja hacer dos cosas con las de los demás:
   - Restablecer la clave: Dirección escribe (o genera) una nueva. El servidor
     cierra todas las sesiones abiertas de esa cuenta y le deja un cambio
     disponible para que la persona elija la suya.
   - Permitir un cambio: las cuentas de sector (Jefatura, Server) pueden
     cambiar su clave una sola vez; con esto vuelven a poder hacerlo.
   La clave de la propia cuenta se cambia desde «Mi contraseña». */

const LARGO_MINIMO = 8;
/* Sin letras que se confunden (l, I, O, 0, 1) para que se pueda dictar. */
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarClave(largo = 12) {
  const azar = new Uint32Array(largo);
  crypto.getRandomValues(azar);
  return Array.from(azar, (n) => ALFABETO[n % ALFABETO.length]).join("");
}

const ORDEN_ROLES = { direccion: 0, jefatura: 1, server: 2 };

const textoError = (error) =>
  error?.sinConexion
    ? "El servidor no responde. Probá de nuevo en un momento."
    : error?.message || "No se pudo completar la acción.";

export default function Usuarios({ ruta }) {
  const sesion = useSesion();
  const [usuarios, setUsuarios] = useState(null);
  const [areas, setAreas] = useState([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiada, setCopiada] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const token = tokenActual();
      const [listado, catalogo] = await Promise.all([
        listarUsuarios(token),
        listarAreasUsuarios(token),
      ]);
      setUsuarios(listado.usuarios || []);
      setAreas(catalogo.areas || []);
      setError("");
    } catch (e) {
      setError(textoError(e));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreArea = (usuario) => areas.find((a) => a.id === usuario.area_id)?.nombre;
  const nombreDe = (usuario) => usuario.nombre || usuario.username;

  const ordenados = [...(usuarios || [])].sort(
    (a, b) =>
      (ORDEN_ROLES[normalizarRol(a.rol)] ?? 9) - (ORDEN_ROLES[normalizarRol(b.rol)] ?? 9) ||
      a.username.localeCompare(b.username),
  );

  const abrirFormulario = (usuario) => {
    setAbierto(usuario.id);
    setClave("");
    setAviso(null);
  };

  const cerrarFormulario = () => {
    setAbierto(null);
    setClave("");
  };

  const restablecer = async (usuario, evento) => {
    evento.preventDefault();
    if (clave.length < LARGO_MINIMO || enviando) return;

    setEnviando(true);
    try {
      await restablecerClaveUsuario(tokenActual(), usuario.id, clave);
      setCopiada(false);
      setAviso({
        tipo: "ok",
        texto: `Se restableció la clave de ${nombreDe(usuario)}. Se cerraron sus sesiones abiertas.`,
        clave,
      });
      cerrarFormulario();
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: textoError(e) });
    } finally {
      setEnviando(false);
    }
  };

  const permitirCambio = async (usuario) => {
    setAviso(null);
    try {
      await permitirCambioClave(tokenActual(), usuario.id);
      setAviso({ tipo: "ok", texto: `${nombreDe(usuario)} puede cambiar su clave una vez más.` });
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: textoError(e) });
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(aviso.clave);
      setCopiada(true);
    } catch {
      /* sin permiso para el portapapeles: la clave queda a la vista */
    }
  };

  return (
    <Layout
      ruta={ruta}
      chip="DIRECCIÓN"
      titulo="Usuarios y contraseñas"
      texto="Restablecé la clave de una cuenta o habilitá a un sector para que pueda volver a cambiarla."
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
          <div className="usuarios__aviso">
            <span>{aviso.texto}</span>
            {aviso.clave && (
              <>
                <span className="usuarios__clave">
                  <code>{aviso.clave}</code>
                  <button type="button" className="boton boton--fino" onClick={copiar}>
                    <Icon icon={copiada ? "ph:check" : "ph:copy"} width={15} height={15} aria-hidden="true" />
                    {copiada ? "Copiada" : "Copiar"}
                  </button>
                </span>
                <small>Anotala y pasásela a la persona: no se vuelve a mostrar.</small>
              </>
            )}
          </div>
          <button className="flash__cerrar" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Cuentas del sistema</h2>
        <p className="tarjeta__bajada">
          Cada cuenta de sector puede cambiar su clave una sola vez. Cuando ya la usó, queda
          bloqueada hasta que Dirección le habilite otro cambio.
        </p>

        {error && (
          <p className="flash flash--error" role="alert">
            <Icon icon="ph:warning-circle" width={18} height={18} aria-hidden="true" />
            {error}
            <button className="boton boton--fino" onClick={cargar}>
              Reintentar
            </button>
          </p>
        )}

        {!error && usuarios === null && <p className="nota-interna">Cargando cuentas…</p>}
        {usuarios && usuarios.length === 0 && <p className="nota-interna">No hay cuentas cargadas.</p>}

        {usuarios && usuarios.length > 0 && (
          <ul className="usuarios">
            {ordenados.map((usuario) => {
              const rol = normalizarRol(usuario.rol);
              const propia = sesion?.usuario === usuario.username;
              const esDireccion = rol === "direccion";
              const puedeCambiar = !!usuario.password_change_allowed;
              const area = nombreArea(usuario);

              return (
                <li className="usuario" key={usuario.id}>
                  <div className="usuario__fila">
                    <div className="usuario__datos">
                      <p className="usuario__nombre">
                        {nombreDe(usuario)}
                        {propia && <span className="etiqueta">Tu cuenta</span>}
                      </p>
                      <p className="usuario__detalle">
                        Usuario: {usuario.username} · {nombrePerfil(rol)}
                        {area ? ` · ${area}` : ""}
                      </p>
                      <div className="etiquetas usuario__etiquetas">
                        <span className={`etiqueta ${usuario.activo ? "etiqueta--ok" : "etiqueta--alerta"}`}>
                          {usuario.activo ? "Activa" : "Desactivada"}
                        </span>
                        {esDireccion ? (
                          <span className="etiqueta">Puede cambiar su clave siempre</span>
                        ) : puedeCambiar ? (
                          <span className="etiqueta etiqueta--aviso">Tiene un cambio disponible</span>
                        ) : (
                          <span className="etiqueta etiqueta--alerta">Cambio usado · bloqueada</span>
                        )}
                        <span className="etiqueta">
                          Cambios de clave: {usuario.password_change_count || 0}
                        </span>
                      </div>
                    </div>

                    <div className="acciones-fila">
                      {propia ? (
                        <button className="boton boton--fino" onClick={() => ir("/panel/cuenta")}>
                          <Icon icon="ph:key" width={15} height={15} aria-hidden="true" />
                          Cambiar mi contraseña
                        </button>
                      ) : (
                        <>
                          <button
                            className="boton boton--fino"
                            aria-expanded={abierto === usuario.id}
                            onClick={() => (abierto === usuario.id ? cerrarFormulario() : abrirFormulario(usuario))}
                          >
                            <Icon icon="ph:lock-key" width={15} height={15} aria-hidden="true" />
                            Restablecer clave
                          </button>
                          {!esDireccion && !puedeCambiar && (
                            <button className="boton boton--fino" onClick={() => permitirCambio(usuario)}>
                              <Icon icon="ph:lock-key-open" width={15} height={15} aria-hidden="true" />
                              Permitir un cambio
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {abierto === usuario.id && (
                    <form className="usuario__form" onSubmit={(evento) => restablecer(usuario, evento)}>
                      <label className="campo">
                        <span>Clave nueva para {usuario.username}</span>
                        <input
                          type="text"
                          value={clave}
                          onChange={(e) => setClave(e.target.value)}
                          minLength={LARGO_MINIMO}
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          required
                          autoFocus
                        />
                      </label>
                      <button type="button" className="boton boton--fino" onClick={() => setClave(generarClave())}>
                        <Icon icon="ph:dice-five" width={15} height={15} aria-hidden="true" />
                        Generar
                      </button>
                      <button
                        className="boton boton--primario"
                        disabled={enviando || clave.length < LARGO_MINIMO}
                      >
                        {enviando ? "Guardando…" : "Guardar clave"}
                      </button>
                      <button type="button" className="boton boton--fino" onClick={cerrarFormulario}>
                        Cancelar
                      </button>
                      <p className="usuario__nota">
                        Mínimo {LARGO_MINIMO} caracteres. Al guardarla se cierran las sesiones abiertas de
                        esta cuenta y la persona puede elegir su propia clave.
                      </p>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Layout>
  );
}
