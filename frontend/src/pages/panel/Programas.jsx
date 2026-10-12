import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import SelectorImagen from "../../components/SelectorImagen.jsx";
import { dominio, esLinkValido } from "../../links.js";
import {
  guardarProgramas,
  nuevoPrograma,
  restaurarProgramas,
  useProgramas,
} from "../../programas.js";
import { puedeEditar } from "../../sesion.js";

/* Cada programa necesita nombre y, si no está en desarrollo, un link https. */
const incompleto = (p) => !p.nombre.trim() || (!p.enDesarrollo && !esLinkValido(p.url));

export default function Programas({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const publicado = useProgramas();
  const [borrador, setBorrador] = useState(publicado);
  const [vista, setVista] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [eligiendo, setEligiendo] = useState(null);

  const sucio = JSON.stringify(borrador) !== JSON.stringify(publicado);

  const cambiar = (id, campo, valor) =>
    setBorrador((previo) =>
      previo.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    );

  const publicar = async () => {
    if (borrador.some(incompleto)) {
      setError(
        "Cada programa necesita nombre, y un link que empiece con https:// salvo que esté marcado como \"en desarrollo\". Revisá los marcados en rojo.",
      );
      return;
    }
    const resultado = await guardarProgramas(borrador);
    /* "Publicado" sólo si el servidor lo recibió. */
    if (!resultado.ok) {
      setAviso("");
      setError(`No se pudo publicar: ${resultado.motivo}.`);
      return;
    }
    setError("");
    setAviso("Programas publicados en la portada.");
  };

  return (
    <Layout
      ruta={ruta}
      chip="CONTENIDO DEL SITIO"
      titulo="Programas de la Tec"
      texto="Herramientas hechas por alumnos que aparecen al final de la portada. Cada una lleva a su propia página."
      acciones={
        <>
          <button className="boton" onClick={() => setVista(true)}>
            <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
            Ver en el sitio
          </button>
          {editable && (
            <>
              <button
                className="boton"
                disabled={!sucio}
                onClick={() => {
                  setBorrador(publicado);
                  setError("");
                }}
              >
                Descartar cambios
              </button>
              <button
                className="boton boton--primario"
                disabled={!sucio}
                onClick={publicar}
              >
                <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
                Publicar
              </button>
            </>
          )}
        </>
      }
    >
      {aviso && (
        <p className="flash">
          <Icon icon="ph:check-circle" width={18} height={18} aria-hidden="true" />
          {aviso}
          <button className="flash__cerrar" onClick={() => setAviso("")}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}

      {error && (
        <p className="flash">
          <Icon icon="ph:warning" width={18} height={18} aria-hidden="true" />
          {error}
        </p>
      )}

      {sucio && editable && (
        <p className="flash flash--info">
          <Icon icon="ph:pencil-simple" width={18} height={18} aria-hidden="true" />
          Hay cambios sin publicar. La portada sigue mostrando la versión anterior.
        </p>
      )}

      <div className="programas-edit">
        {borrador.map((programa) => (
          <article
            key={programa.id}
            className={`tarjeta programa-edit ${
              error && incompleto(programa) ? "programa-edit--error" : ""
            }`}
          >
            <div className="programa-edit__cabecera">
              <button
                type="button"
                className="programa__logo programa__logo--boton"
                disabled={!editable}
                title="Cambiar el logo"
                onClick={() => setEligiendo(programa.id)}
              >
                {programa.logo ? (
                  <img className="programa__logo-img" src={programa.logo} alt="" />
                ) : (
                  programa.nombre.trim()[0]?.toUpperCase() || "?"
                )}
              </button>
              <span className="programa__dominio">
                {dominio(programa.url) || "sin link"}
              </span>
              {editable && (
                <button
                  className="tabla-edit__quitar"
                  aria-label={`Quitar ${programa.nombre || "programa"}`}
                  onClick={() =>
                    setBorrador((previo) =>
                      previo.filter((p) => p.id !== programa.id),
                    )
                  }
                >
                  <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {eligiendo === programa.id && (
              <SelectorImagen
                actual={programa.logo}
                quitar
                cerrar={() => setEligiendo(null)}
                elegir={(url) => {
                  cambiar(programa.id, "logo", url || "");
                  setEligiendo(null);
                }}
              />
            )}

            <label className="campo">
              <span>Nombre</span>
              <input
                disabled={!editable}
                value={programa.nombre}
                onChange={(e) => cambiar(programa.id, "nombre", e.target.value)}
              />
            </label>
            <label className="campo">
              <span>Link de la página{programa.enDesarrollo ? " (opcional)" : ""}</span>
              <input
                type="url"
                disabled={!editable}
                placeholder="https://…"
                value={programa.url}
                onChange={(e) => cambiar(programa.id, "url", e.target.value)}
              />
            </label>
            <label className="campo campo--casilla">
              <input
                type="checkbox"
                disabled={!editable}
                checked={programa.enDesarrollo}
                onChange={(e) => cambiar(programa.id, "enDesarrollo", e.target.checked)}
              />
              <span>Todavía en desarrollo</span>
            </label>
            <label className="campo">
              <span>Qué es y para qué sirve</span>
              <textarea
                rows={3}
                disabled={!editable}
                value={programa.descripcion}
                onChange={(e) =>
                  cambiar(programa.id, "descripcion", e.target.value)
                }
              />
            </label>
            <label className="campo">
              <span>Hecho por (opcional)</span>
              <input
                disabled={!editable}
                placeholder="Nombres de los alumnos o curso"
                value={programa.autores}
                onChange={(e) => cambiar(programa.id, "autores", e.target.value)}
              />
            </label>
          </article>
        ))}
      </div>

      {borrador.length === 0 && (
        <p className="vacio">
          No hay programas cargados. La sección no se muestra en la portada.
        </p>
      )}

      {editable && (
        <>
          <button
            className="boton agregar-mesa"
            onClick={() => setBorrador((previo) => [...previo, nuevoPrograma()])}
          >
            <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
            Agregar programa
          </button>

          <p className="bloqueado">
            <Icon icon="ph:info" width={16} height={16} aria-hidden="true" />
            Los cambios se guardan en el servidor de la escuela.
            <button
              className="enlace"
              onClick={() => {
                if (!window.confirm("Se reemplazan los programas de la portada por los originales, en el sitio. ¿Seguir?")) return;
                setBorrador(restaurarProgramas());
                setError("");
                setAviso("Programas restaurados.");
              }}
            >
              Restaurar los programas originales
            </button>
          </p>
        </>
      )}

      {vista && (
        <VistaPrevia
          chip="VISTA PREVIA · PORTADA"
          titulo="Programas de la Tec"
          url="/?preview=programas"
          cerrar={() => setVista(false)}
        />
      )}
    </Layout>
  );
}
