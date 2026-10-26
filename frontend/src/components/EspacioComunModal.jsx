import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { ir } from "../router.js";
import { useAsignaciones, vigentes } from "../asignaciones.js";
import { DatosEspacio } from "./AsignacionModal.jsx";

/* Ventana de un espacio común (PAÑOL, E.O.E., administración…): se consulta
   pero no admite clases, así que no hay formulario de asignación. Lo mismo
   controla el backend (clasificación ESPACIO_COMUN). */
export default function EspacioComunModal({ espacio, editable, alCerrar }) {
  const { datos } = useAsignaciones();
  const [aviso, setAviso] = useState("");
  const caja = useRef(null);
  const pendientes = vigentes(datos.asignaciones).filter((a) => a.salon_id === espacio.id);
  const piso = datos.pisos[espacio.piso] ?? espacio.piso;

  useEffect(() => {
    const anterior = document.activeElement;
    caja.current?.querySelector("button")?.focus();
    return () => anterior?.focus?.();
  }, []);

  const alTeclear = (e) => {
    if (e.key === "Escape") alCerrar();
    if (e.key === "Tab") {
      const enfocables = [...caja.current.querySelectorAll("button:not([disabled]), input, select, summary")];
      const [primero, ultimo] = [enfocables[0], enfocables[enfocables.length - 1]];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  };

  return (
    <div className="modal modal--difuminado" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()} onKeyDown={alTeclear}>
      <div
        className="modal__caja asignacion espacio-comun"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comun-titulo"
        aria-describedby="comun-mensaje"
        ref={caja}
      >
        <header className="modal__barra">
          <div className="espacio-comun__cabeza">
            <span className="espacio-comun__icono">
              <Icon icon={espacio.icono} width={30} height={30} aria-hidden="true" />
            </span>
            <div>
              <p className="chip">{piso}</p>
              {espacio.institucional && <p className="espacio-comun__restriccion">No asignable</p>}
              <h2 className="modal__titulo" id="comun-titulo">{espacio.nombre}</h2>
            </div>
          </div>
          <button type="button" className="cajon__cerrar" aria-label="Cerrar" onClick={alCerrar}>
            <Icon icon="ph:x" width={18} height={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal__cuerpo">
          <p className="espacio-comun__mensaje" id="comun-mensaje">{espacio.mensaje}</p>
          <dl className="asignacion__datos">
            <div><dt>Tipo</dt><dd>{datos.tipos[espacio.tipo] ?? espacio.tipo}</dd></div>
            <div><dt>Planta</dt><dd>{piso}</dd></div>
            <div>
              <dt>Uso</dt>
              <dd>
                {espacio.institucional
                  ? "Espacio institucional reservado: no asignable a materias, cursos, grupos ni talleres"
                  : "Espacio común: no admite clases"}
              </dd>
            </div>
            <div><dt>Capacidad</dt><dd>{espacio.capacidad ? `${espacio.capacidad} personas` : "Sin cargar"}</dd></div>
          </dl>

          {pendientes.length > 0 && (
            <p className="flash flash--info">
              <Icon icon="ph:warning" width={18} height={18} aria-hidden="true" />
              <span>
                Quedaron {pendientes.length} clase{pendientes.length === 1 ? "" : "s"} cargada
                {pendientes.length === 1 ? "" : "s"} acá de antes de que fuera espacio común: hay que pasarlas a un aula.{" "}
                <button
                  className="enlace"
                  onClick={() => ir(`/panel/grilla?grilla=${encodeURIComponent(pendientes[0].grilla_id)}&clase=${pendientes[0].id}`)}
                >
                  Reubicarlas en Espacios y horarios
                </button>
              </span>
            </p>
          )}

          {aviso && <p className="selector__error" role="alert">{aviso}</p>}
          {editable && !espacio.institucional && (
            <DatosEspacio espacio={espacio} tipos={datos.tipos} clasificaciones={datos.clasificaciones} alAvisar={setAviso} />
          )}
        </div>

        <footer className="modal__pie">
          <button type="button" className="boton boton--primario" onClick={alCerrar}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
