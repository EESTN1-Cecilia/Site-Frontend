import { useState } from "react";
import { Icon } from "@iconify/react";

const dispositivos = [
  ["escritorio", "ph:monitor", "Escritorio"],
  ["celular", "ph:device-mobile", "Celular"],
];

/* Muestra la página pública real dentro del panel, tal como va a quedar. */
export default function VistaPrevia({ chip, titulo, url, cerrar, acciones }) {
  const [dispositivo, setDispositivo] = useState("escritorio");
  const completa = `${location.pathname}#${url}`;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__caja previa">
        <div className="modal__barra">
          <div>
            <p className="chip">{chip}</p>
            <h2 className="modal__titulo">{titulo}</h2>
          </div>
          <div className="previa__herramientas">
            <div className="filtros__chips">
              {dispositivos.map(([valor, icono, etiqueta]) => (
                <button
                  key={valor}
                  className={`filtro ${dispositivo === valor ? "filtro--activo" : ""}`}
                  onClick={() => setDispositivo(valor)}
                >
                  <Icon icon={icono} width={15} height={15} aria-hidden="true" />
                  {etiqueta}
                </button>
              ))}
            </div>
            <a
              className="boton"
              href={completa}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon
                icon="ph:arrow-square-out"
                width={16}
                height={16}
                aria-hidden="true"
              />
              <span className="visor__texto">Abrir aparte</span>
            </a>
            <button className="cajon__cerrar" aria-label="Cerrar" onClick={cerrar}>
              <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={`previa__lienzo previa__lienzo--${dispositivo}`}>
          <iframe
            className="previa__marco"
            title={`Vista previa de ${titulo}`}
            src={completa}
          />
        </div>

        {acciones && <div className="modal__pie">{acciones}</div>}
      </div>
    </div>
  );
}
