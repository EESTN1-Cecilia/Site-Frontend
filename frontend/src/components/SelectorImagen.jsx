import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { biblioteca } from "../publicaciones.js";
import { facade, logo } from "../data.js";
import { cuadernillos } from "../saberes.js";
import { esLinkValido } from "../links.js";

const TOPE = 1.5 * 1024 * 1024;

/* Todas las imágenes que ya tiene el sitio, para elegir sin subir nada. */
const imagenes = [
  ["Fachada de la escuela", facade],
  ["Logo", logo],
  ...biblioteca,
  ...cuadernillos.map((c) => [c.titulo, c.portada]),
];

/* Ventana que se abre sobre toda la pantalla. Va en un portal para que el
   lienzo de edición (que bloquea los botones de la página) no la afecte. */
export function Ventana({ chip, titulo, cerrar, pie, children }) {
  return createPortal(
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        cerrar();
      }}
    >
      <div
        className="modal__caja modal__caja--angosta"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__barra">
          <div>
            <p className="chip">{chip}</p>
            <h2 className="modal__titulo">{titulo}</h2>
          </div>
          <button className="cajon__cerrar" aria-label="Cerrar" onClick={cerrar}>
            <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__cuerpo">{children}</div>
        {pie && <div className="modal__pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* `elegir(url)` con la imagen nueva, `elegir(null)` para volver a la original
   y, si `quitar`, `elegir("")` para dejar el lugar sin imagen. */
export default function SelectorImagen({ actual, elegir, cerrar, quitar = false }) {
  const archivo = useRef(null);
  const [url, setUrl] = useState(actual?.startsWith("data:") ? "" : actual || "");
  const [error, setError] = useState("");

  const subir = (e) => {
    const elegido = e.target.files?.[0];
    if (!elegido) return;

    if (elegido.size > TOPE) {
      setError("La imagen pesa más de 1,5 MB. Elegí una más liviana.");
      return;
    }

    const lector = new FileReader();
    lector.onload = () => elegir(lector.result);
    lector.readAsDataURL(elegido);
  };

  return (
    <Ventana
      chip="IMAGEN"
      titulo="Cambiar imagen"
      cerrar={cerrar}
      pie={
        <>
          <button className="boton" onClick={() => elegir(null)}>
            <Icon icon="ph:arrow-counter-clockwise" width={16} height={16} aria-hidden="true" />
            Volver a la original
          </button>
          {quitar && (
            <button className="boton boton--peligro" onClick={() => elegir("")}>
              <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
              Quitar imagen
            </button>
          )}
        </>
      }
    >
      <p className="selector__titulo">Elegí una del sitio</p>
      <div className="selector__grilla">
        {imagenes.map(([nombre, src]) => (
          <button
            key={src}
            className={`selector__opcion ${actual === src ? "selector__opcion--activa" : ""}`}
            onClick={() => elegir(src)}
          >
            <img src={src} alt="" />
            <span>{nombre}</span>
          </button>
        ))}
      </div>

      <div className="selector__pie">
        <button className="boton" onClick={() => archivo.current.click()}>
          <Icon icon="ph:upload-simple" width={16} height={16} aria-hidden="true" />
          Subir del equipo
        </button>
        <input ref={archivo} type="file" accept="image/*" hidden onChange={subir} />
        <label className="campo campo--ancho">
          <span>o pegá una dirección</span>
          <input
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button
          className="boton boton--primario"
          onClick={() =>
            esLinkValido(url)
              ? elegir(url.trim())
              : setError("La dirección tiene que empezar con https://")
          }
        >
          Usar esta dirección
        </button>
      </div>
      {error && <p className="selector__error">{error}</p>}
    </Ventana>
  );
}
