import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import {
  biblioteca,
  guardarPublicacion,
  nuevaPublicacion,
  nuevoBloque,
  quitarPublicacion,
  usePublicaciones,
} from "../../publicaciones.js";
import { puedeEditar } from "../../sesion.js";
import { esLinkValido } from "../../links.js";

const TOPE_IMAGEN = 1.5 * 1024 * 1024;

const estados = {
  pendiente: ["aviso", "Esperando aprobación"],
  publicada: ["ok", "Publicada"],
  devuelta: ["alerta", "Devuelta con cambios"],
};

const tipos = [
  ["titulo", "ph:text-h", "Título"],
  ["parrafo", "ph:text-align-left", "Texto"],
  ["imagen", "ph:image", "Imagen"],
  ["destacado", "ph:quotes", "Destacado"],
];

/* Texto editable en el lugar: se escribe encima y se guarda al salir. */
function Editable({ etiqueta: Etiqueta = "p", clase, valor, alCambiar }) {
  return (
    <Etiqueta
      className={clase}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => alCambiar(e.currentTarget.textContent)}
    >
      {valor}
    </Etiqueta>
  );
}

function BloqueImagen({ bloque, alCambiar }) {
  const archivo = useRef(null);
  const [abierta, setAbierta] = useState(false);
  const [error, setError] = useState("");

  const subir = (e) => {
    const elegido = e.target.files?.[0];
    if (!elegido) return;

    if (elegido.size > TOPE_IMAGEN) {
      setError("La imagen pesa más de 1,5 MB. Elegí una más liviana.");
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      alCambiar({ ...bloque, url: lector.result });
      setError("");
      setAbierta(false);
    };
    lector.readAsDataURL(elegido);
  };

  return (
    <div className="bloque-imagen">
      <button
        className="bloque-imagen__marco"
        onClick={() => setAbierta((v) => !v)}
        aria-label="Cambiar imagen"
      >
        <img src={bloque.url} alt="" />
        <span className="bloque-imagen__velo">
          <Icon icon="ph:swap" width={18} height={18} aria-hidden="true" />
          Cambiar imagen
        </span>
      </button>

      {abierta && (
        <div className="selector">
          <p className="selector__titulo">Elegí una de la biblioteca</p>
          <div className="selector__grilla">
            {biblioteca.map(([nombre, url]) => (
              <button
                key={url}
                className={`selector__opcion ${bloque.url === url ? "selector__opcion--activa" : ""}`}
                onClick={() => {
                  alCambiar({ ...bloque, url });
                  setAbierta(false);
                }}
              >
                <img src={url} alt={nombre} />
                <span>{nombre}</span>
              </button>
            ))}
          </div>

          <div className="selector__pie">
            <button className="boton" onClick={() => archivo.current.click()}>
              <Icon icon="ph:upload-simple" width={16} height={16} aria-hidden="true" />
              Subir del equipo
            </button>
            <input
              ref={archivo}
              type="file"
              accept="image/*"
              hidden
              onChange={subir}
            />
            <label className="campo campo--ancho">
              <span>o pegá una dirección</span>
              <input
                placeholder="https://…"
                defaultValue={
                  bloque.url?.startsWith("data:") ? "" : bloque.url
                }
                onBlur={(e) => {
                  const url = e.target.value.trim();
                  if (!url) return;
                  /* Sólo direcciones http(s), como en el resto del sitio. */
                  if (!esLinkValido(url)) {
                    setError("La dirección tiene que empezar con https://");
                    return;
                  }
                  alCambiar({ ...bloque, url });
                  setError("");
                }}
              />
            </label>
          </div>
          {error && <p className="selector__error">{error}</p>}
        </div>
      )}

      <Editable
        etiqueta="figcaption"
        clase="bloque-imagen__epigrafe"
        valor={bloque.epigrafe || "Epígrafe (opcional)"}
        alCambiar={(texto) => alCambiar({ ...bloque, epigrafe: texto })}
      />
    </div>
  );
}

export default function Publicaciones({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const lista = usePublicaciones();
  const [abiertaId, setAbiertaId] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [aviso, setAviso] = useState("");
  const origen = useRef(null);
  const [arrastrando, setArrastrando] = useState(null);
  const [encima, setEncima] = useState(null);
  const [sueltoLibre, setSueltoLibre] = useState(false);

  const abrir = (pub) => {
    setAbiertaId(pub.id);
    setBorrador(structuredClone(pub));
  };

  const cambiarBloque = (indice, nuevo) =>
    setBorrador((previo) => ({
      ...previo,
      bloques: previo.bloques.map((b, i) => (i === indice ? nuevo : b)),
    }));

  const agregar = (tipo) =>
    setBorrador((previo) => ({
      ...previo,
      bloques: [...previo.bloques, nuevoBloque(tipo)],
    }));

  const borrar = (indice) =>
    setBorrador((previo) => ({
      ...previo,
      bloques: previo.bloques.filter((_, i) => i !== indice),
    }));

  /* Arrastre nativo: el bloque sólo se puede tomar del manijero. */
  const soltar = (destino) => {
    const desde = origen.current;
    if (desde === null || desde === destino) return limpiar();

    setBorrador((previo) => {
      const copia = [...previo.bloques];
      const [movido] = copia.splice(desde, 1);
      copia.splice(destino, 0, movido);
      return { ...previo, bloques: copia };
    });
    limpiar();
  };

  const limpiar = () => {
    origen.current = null;
    setArrastrando(null);
    setEncima(null);
    setSueltoLibre(false);
  };

  /* Lo que no guarda Dirección vuelve a esperar su aprobación. */
  const guardar = () => {
    const estado = usuario?.rol === "direccion" ? borrador.estado : "pendiente";
    guardarPublicacion({ ...borrador, estado });
    setAviso(
      estado === "pendiente"
        ? `“${borrador.titulo}” guardada y enviada a Dirección para aprobar.`
        : `“${borrador.titulo}” guardada.`,
    );
    setAbiertaId(null);
    setBorrador(null);
  };

  /* ---------- Listado ---------- */
  if (!abiertaId) {
    return (
      <Layout
        ruta={ruta}
        chip="CONTENIDO DEL SITIO"
        titulo="Publicaciones"
        texto="Editá el texto y las imágenes directamente sobre la nota, y ordená los bloques arrastrándolos."
        acciones={
          editable && (
            <button
              className="boton boton--primario"
              onClick={() => abrir(nuevaPublicacion())}
            >
              <Icon icon="ph:plus" width={16} height={16} aria-hidden="true" />
              Nueva publicación
            </button>
          )
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

        <ul className="reservas">
          {lista.map((pub) => (
            <li className="reserva" key={pub.id}>
              <div>
                <p className="reserva__titulo">{pub.titulo}</p>
                <p className="reserva__detalle">
                  {pub.seccion} · {pub.autor} · {pub.fecha} ·{" "}
                  {pub.bloques.length} bloques
                </p>
                <span
                  className={`etiqueta etiqueta--${(estados[pub.estado] || estados.pendiente)[0]}`}
                >
                  {(estados[pub.estado] || estados.pendiente)[1]}
                </span>
              </div>
              <div className="acciones-fila">
                <a
                  className="boton boton--fino"
                  href={`${location.pathname}#${pub.ruta}?preview=${pub.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon="ph:eye" width={15} height={15} aria-hidden="true" />
                  Ver
                </a>
                {editable && (
                  <>
                    <button
                      className="boton boton--fino boton--primario"
                      onClick={() => abrir(pub)}
                    >
                      <Icon icon="ph:pencil-simple" width={15} height={15} aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      className="boton boton--fino boton--peligro"
                      onClick={() => {
                        quitarPublicacion(pub.id);
                        setAviso(`“${pub.titulo}” eliminada.`);
                      }}
                    >
                      Borrar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {lista.length === 0 && (
          <p className="vacio">No hay publicaciones cargadas.</p>
        )}

        {editable && (
          <p className="bloqueado">
            <Icon icon="ph:info" width={16} height={16} aria-hidden="true" />
            Los cambios se guardan en el servidor de la escuela.
          </p>
        )}
      </Layout>
    );
  }

  /* ---------- Editor ---------- */
  return (
    <Layout
      ruta={ruta}
      chip="EDITANDO"
      titulo={borrador.titulo}
      texto="Hacé clic sobre cualquier texto para escribir encima. Tomá un bloque del manijero para moverlo."
      acciones={
        <>
          <button
            className="boton"
            onClick={() => {
              setAbiertaId(null);
              setBorrador(null);
            }}
          >
            Cancelar
          </button>
          <button className="boton boton--primario" onClick={guardar}>
            <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
            Guardar
          </button>
        </>
      }
    >
      <div className="editor">
        <div className="editor__datos">
          <label className="campo">
            <span>Título</span>
            <input
              value={borrador.titulo}
              onChange={(e) =>
                setBorrador({ ...borrador, titulo: e.target.value })
              }
            />
          </label>
          <label className="campo">
            <span>Sección</span>
            <select
              value={borrador.ruta}
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  ruta: e.target.value,
                  seccion:
                    e.target.value === "/novedades"
                      ? "Novedades"
                      : "Intensificación/Previas",
                })
              }
            >
              <option value="/novedades">Novedades</option>
              <option value="/previas">Intensificación/Previas</option>
            </select>
          </label>
          <label className="campo">
            <span>Categoría</span>
            <input
              value={borrador.categoria}
              onChange={(e) =>
                setBorrador({ ...borrador, categoria: e.target.value })
              }
            />
          </label>
          <label className="campo">
            <span>Fecha</span>
            <input
              type="date"
              value={borrador.fecha}
              onChange={(e) =>
                setBorrador({ ...borrador, fecha: e.target.value })
              }
            />
          </label>
        </div>

        <div className="editor__lienzo">
          {borrador.bloques.map((bloque, indice) => (
            <div
              key={bloque.id}
              className={`bloque-edit ${encima === indice ? "bloque-edit--encima" : ""} ${
                arrastrando === indice ? "bloque-edit--moviendo" : ""
              }`}
              draggable={sueltoLibre}
              onDragStart={() => {
                origen.current = indice;
                setArrastrando(indice);
              }}
              onDragEnd={limpiar}
              onDragOver={(e) => {
                e.preventDefault();
                setEncima(indice);
              }}
              onDrop={() => soltar(indice)}
            >
              <span
                className="bloque-edit__manijero"
                title="Arrastrar para reordenar"
                onMouseDown={() => setSueltoLibre(true)}
                onMouseUp={() => setSueltoLibre(false)}
              >
                <Icon icon="ph:dots-six-vertical" width={18} height={18} aria-hidden="true" />
              </span>

              <div className="bloque-edit__cuerpo">
                {bloque.tipo === "imagen" ? (
                  <BloqueImagen
                    bloque={bloque}
                    alCambiar={(nuevo) => cambiarBloque(indice, nuevo)}
                  />
                ) : (
                  <Editable
                    etiqueta={bloque.tipo === "titulo" ? "h3" : "p"}
                    clase={`bloque-edit__texto bloque-edit__texto--${bloque.tipo}`}
                    valor={bloque.texto}
                    alCambiar={(texto) =>
                      cambiarBloque(indice, { ...bloque, texto })
                    }
                  />
                )}
              </div>

              <button
                className="bloque-edit__borrar"
                aria-label="Borrar bloque"
                onClick={() => borrar(indice)}
              >
                <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
              </button>
            </div>
          ))}

          <div className="editor__agregar">
            {tipos.map(([tipo, icono, etiqueta]) => (
              <button
                key={tipo}
                className="boton boton--fino"
                onClick={() => agregar(tipo)}
              >
                <Icon icon={icono} width={15} height={15} aria-hidden="true" />
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
