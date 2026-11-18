import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import RobotScroll from "./RobotScroll.jsx";

/* Ventana con sólo el robot 3D, arriba del visor del PDF: el scroll de la
   ventana lo desarma y lo arma. Se cierra con la X, tocando afuera o con Esc,
   y el sitio queda difuminado detrás. */
export default function ModalRobot({ cerrar, Escena = RobotScroll, titulo = "Robot en 3D" }) {
  const [caja, setCaja] = useState(null);

  useEffect(() => {
    /* En captura y con stopImmediatePropagation: si el visor del PDF está
       abierto debajo, Esc cierra sólo esta ventana. */
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      cerrar();
    };
    const anterior = document.body.style.overflow;

    window.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = anterior;
    };
  }, [cerrar]);

  return (
    <div className="rs-modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={cerrar}>
      <div className="rs-modal__marco" onClick={(e) => e.stopPropagation()}>
        <button className="rs-modal__cerrar" aria-label="Cerrar" onClick={cerrar}>
          <Icon icon="ph:x" width={20} height={20} aria-hidden="true" />
        </button>
        <div className="rs-modal__caja" ref={setCaja}>
          {caja && <Escena scroller={caja} />}
        </div>
      </div>
    </div>
  );
}
