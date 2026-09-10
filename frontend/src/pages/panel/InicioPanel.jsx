import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import Inicio from "../Inicio.jsx";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import {
  guardarInicio,
  nuevoItem,
  restaurarInicio,
  useInicio,
} from "../../inicio.js";
import { puedeEditar } from "../../sesion.js";

export default function InicioPanel({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const publicado = useInicio();
  const [borrador, setBorrador] = useState(publicado);
  const [vista, setVista] = useState(false);
  const [aviso, setAviso] = useState("");
  const origen = useRef(null);
  const [tomado, setTomado] = useState(false);
  const [encima, setEncima] = useState(null);

  const sucio = JSON.stringify(borrador) !== JSON.stringify(publicado);

  const acciones = {
    editar: (seccion, clave, valor) =>
      setBorrador((previo) => ({
        ...previo,
        [seccion]: { ...previo[seccion], [clave]: valor },
      })),

    editarItem: (lista, indice, clave, valor) =>
      setBorrador((previo) => ({
        ...previo,
        [lista]: previo[lista].map((item, i) =>
          i === indice ? { ...item, [clave]: valor } : item,
        ),
      })),

    agregar: (lista) =>
      setBorrador((previo) => ({
        ...previo,
        [lista]: [...previo[lista], nuevoItem(lista)],
      })),

    quitar: (lista, indice) =>
      setBorrador((previo) => ({
        ...previo,
        [lista]: previo[lista].filter((_, i) => i !== indice),
      })),

    mover: (lista, destino) => {
      const desde = origen.current;
      if (!desde || desde.lista !== lista || desde.indice === destino)
        return acciones.arrastre.limpiar();

      setBorrador((previo) => {
        const copia = [...previo[lista]];
        const [movido] = copia.splice(desde.indice, 1);
        copia.splice(destino, 0, movido);
        return { ...previo, [lista]: copia };
      });
      acciones.arrastre.limpiar();
    },

    arrastre: {
      tomado,
      encima,
      tomar: setTomado,
      iniciar: (lista, indice) => {
        origen.current = { lista, indice };
      },
      sobre: (lista, indice) => setEncima(`${lista}-${indice}`),
      limpiar: () => {
        origen.current = null;
        setTomado(false);
        setEncima(null);
      },
    },
  };

  const guardar = () => {
    guardarInicio(borrador);
    setAviso("Portada publicada.");
  };

  return (
    <Layout
      ruta={ruta}
      chip="CONTENIDO DEL SITIO"
      titulo="Portada"
      texto="Escribí directamente sobre la página. Los destacados, los atajos y los puntos se reordenan arrastrándolos."
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
                onClick={() => setBorrador(publicado)}
              >
                Descartar cambios
              </button>
              <button
                className="boton boton--primario"
                disabled={!sucio}
                onClick={guardar}
              >
                <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
                Publicar portada
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

      {sucio && (
        <p className="flash flash--info">
          <Icon icon="ph:pencil-simple" width={18} height={18} aria-hidden="true" />
          Hay cambios sin publicar. El sitio sigue mostrando la versión anterior.
        </p>
      )}

      <div className="lienzo">
        <Inicio editable={editable} contenido={borrador} acciones={acciones} />
      </div>

      {editable && (
        <p className="bloqueado">
          <Icon icon="ph:info" width={16} height={16} aria-hidden="true" />
          Los cambios quedan en este navegador hasta que exista la API.
          <button
            className="enlace"
            onClick={() => {
              restaurarInicio();
              setBorrador(JSON.parse(localStorage.getItem("tec1-inicio")));
              setAviso("Portada restaurada a la versión original.");
            }}
          >
            Restaurar la portada original
          </button>
        </p>
      )}

      {vista && (
        <VistaPrevia
          chip="VISTA PREVIA · PORTADA"
          titulo="Inicio"
          url="/?preview=inicio"
          cerrar={() => setVista(false)}
        />
      )}
    </Layout>
  );
}
