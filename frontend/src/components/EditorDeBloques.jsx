import { Fragment, useState } from "react";
import { Icon } from "@iconify/react";
import Texto, { Bloque, Enlace, Imagen, useEdicionTextos, useLista, usePlano } from "./Texto.jsx";
import { redesSociales } from "../data.js";
import { comoInsertar, dominio, esLinkValido } from "../links.js";

/* ---------------------------------------------------------------------
   Zona de bloques libres dentro de una página: quien la edita agrega
   textos, imágenes, botones, divisores, videos o documentos y redes.

   Convive con el contenido fijo de la página y se guarda igual que él,
   como cambios de esa página:
     "<zona>"                 -> [{ id, tipo }]   (los bloques que hay)
     "orden:<zona>"           -> orden, lo maneja useLista
     "<zona>.<id>.texto", "img:<zona>.<id>", "link:<zona>.<id>"…
                              -> el contenido de cada bloque
   Mover, ocultar y el fondo son los de Bloque, como en el resto del sitio.
--------------------------------------------------------------------- */

const TIPOS = [
  ["texto", "ph:text-align-left", "Texto"],
  ["imagen", "ph:image", "Imagen"],
  ["boton", "ph:cursor-click", "Botón"],
  ["divisor", "ph:minus", "Divisor"],
  ["insertar", "ph:play-circle", "YouTube, Drive o PDF"],
  ["redes", "ph:share-network", "Redes sociales"],
];

const nuevoId = () => `b${Date.now().toString(36)}`;

/* En el sitio, un bloque sin contenido no se dibuja. */
function tieneContenido(tipo, leer, base) {
  if (tipo === "texto") return !!leer(`${base}.texto`);
  if (tipo === "imagen") return !!leer(`img:${base}`);
  if (tipo === "boton" || tipo === "insertar") return esLinkValido(leer(`link:${base}`));
  if (tipo === "redes") return (leer(`${base}.redes`) || []).some((r) => esLinkValido(r.url));
  return true;
}

function Redes({ base, editando, dueno }) {
  const leer = usePlano();
  const edicion = useEdicionTextos();
  const clave = `${base}.redes`;
  const redes = leer(clave, []);
  const conLink = redes.filter((r) => redesSociales[r.red] && esLinkValido(r.url));

  const guardar = (lista) => edicion.fijar(clave, lista.length ? lista : undefined);
  const cambiar = (id, cambio) => guardar(redes.map((r) => (r.id === id ? { ...r, ...cambio } : r)));

  return (
    <>
      {conLink.length > 0 && (
        <div className="redes redes--claro">
          {conLink.map((r) => {
            const [nombre, icono] = redesSociales[r.red];
            return (
              <a
                className="red"
                key={r.id}
                href={r.url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={nombre}
                title={nombre}
              >
                <Icon icon={icono} width={18} height={18} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      )}

      {editando && (
        <div className="bloque-libre__redes">
          {redes.map((r) => (
            <div className="red-edit" key={r.id}>
              <Icon icon={redesSociales[r.red]?.[1] || "ph:link"} width={20} height={20} aria-hidden="true" />
              <select
                className="control-edicion"
                aria-label="Red"
                value={r.red}
                onChange={(e) => cambiar(r.id, { red: e.target.value })}
              >
                {Object.entries(redesSociales).map(([valor, [etiqueta]]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
              <input
                className="control-edicion"
                type="url"
                aria-label="Link"
                placeholder="https://…"
                value={r.url}
                aria-invalid={!!r.url && !esLinkValido(r.url)}
                onChange={(e) => cambiar(r.id, { url: e.target.value })}
              />
              <button
                type="button"
                className="control-edicion tabla-edit__quitar"
                title="Quitar"
                aria-label="Quitar"
                onClick={() => guardar(redes.filter((x) => x.id !== r.id))}
              >
                <Icon icon="ph:trash" width={16} height={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="control-edicion enlace"
            onClick={() => guardar([...redes, { id: `r${Date.now().toString(36)}`, red: "instagram", url: "" }])}
          >
            + Agregar red
          </button>
        </div>
      )}
    </>
  );
}

function Contenido({ tipo, base, editando, dueno }) {
  const leer = usePlano();
  /* Lo que se ve en el editor mientras el bloque está vacío. */
  const marcador = (texto) => (editando ? texto : "");

  if (tipo === "texto")
    return (
      <p className="bloque-libre__texto">
        <Texto id={`${base}.texto`} dueno={dueno}>
          {marcador("Escribí el texto acá.")}
        </Texto>
      </p>
    );

  if (tipo === "imagen") {
    const epigrafe = leer(`${base}.epigrafe`, "");
    return (
      <figure className="bloque-libre__figura">
        <Imagen
          id={base}
          src=""
          alt={epigrafe}
          dueno={dueno}
          vacio={
            editando ? (
              <span className="bloque-libre__vacio">
                <Icon icon="ph:image" width={22} height={22} aria-hidden="true" />
                Hacé clic para elegir una imagen
              </span>
            ) : undefined
          }
        />
        {(editando || epigrafe) && (
          <figcaption>
            <Texto id={`${base}.epigrafe`} dueno={dueno}>
              {marcador("Epígrafe (opcional)")}
            </Texto>
          </figcaption>
        )}
      </figure>
    );
  }

  if (tipo === "boton")
    return (
      <Enlace id={base} dueno={dueno} className="pill bloque-libre__boton" claseVacia="bloque-libre__sin-link" ocultarVacio>
        <Texto id={`${base}.texto`} dueno={dueno}>
          Más información
        </Texto>
        <Icon icon="ph:arrow-up-right" width={16} height={16} aria-hidden="true" />
      </Enlace>
    );

  if (tipo === "divisor") return <hr className="bloque-libre__divisor" />;

  if (tipo === "insertar") {
    const url = leer(`link:${base}`, "");
    const destino = esLinkValido(url) ? comoInsertar(url.trim()) : null;

    return (
      <>
        {destino?.src && (
          <div className={`bloque-libre__marco bloque-libre__marco--${destino.forma}`}>
            <iframe
              src={destino.src}
              title={destino.nombre}
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
        <Enlace
          id={base}
          dueno={dueno}
          className={destino?.src ? "bloque-libre__abrir" : "bloque-libre__archivo"}
          ocultarVacio
          vacio={
            <span className="bloque-libre__vacio">
              <Icon icon="ph:link" width={22} height={22} aria-hidden="true" />
              Pegá un link de YouTube, Google Drive o un PDF con el botón de la cadena
            </span>
          }
        >
          <Icon icon={destino?.src ? "ph:arrow-square-out" : destino?.icono} width={20} height={20} aria-hidden="true" />
          <span>{destino?.src ? "Abrir en otra pestaña" : destino?.nombre}</span>
          {!destino?.src && <small>{dominio(url)}</small>}
        </Enlace>
        {editando && destino?.drive && (
          <p className="bloque-libre__nota">
            Para que se vea, el archivo tiene que estar compartido como “Cualquier persona con el enlace”.
          </p>
        )}
      </>
    );
  }

  if (tipo === "redes") return <Redes base={base} editando={editando} dueno={dueno} />;

  return null;
}

/* Botón "Agregar bloque": abre un menú chico con los tipos. */
function Agregar({ alElegir, compacto }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className={`agregar-bloque ${compacto && !abierto ? "agregar-bloque--compacto" : ""}`}>
      <button
        type="button"
        className="control-edicion agregar-bloque__boton"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
      >
        <Icon icon={abierto ? "ph:x" : "ph:plus"} width={15} height={15} aria-hidden="true" />
        {abierto ? "Cancelar" : "Agregar bloque"}
      </button>
      {abierto && (
        <div className="agregar-bloque__menu">
          {TIPOS.map(([tipo, icono, nombre]) => (
            <button
              key={tipo}
              type="button"
              className="control-edicion"
              onClick={() => {
                setAbierto(false);
                alElegir(tipo);
              }}
            >
              <Icon icon={icono} width={18} height={18} aria-hidden="true" />
              {nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* `zona` es el id de la zona ("novedades.bloques"): tiene que empezar con el
   nombre de la página, que es lo que el backend usa para el permiso. */
export default function EditorDeBloques({ zona, dueno }) {
  const leer = usePlano();
  const edicion = useEdicionTextos();
  const editando = !!edicion?.puede(dueno);
  const guardados = leer(zona, []);
  const [bloques, propsDe] = useLista(zona, guardados);
  const base = (b) => `${zona}.${b.id}`;

  if (!editando) {
    const visibles = bloques.filter(
      (b) => !leer(`oculto:${base(b)}`) && tieneContenido(b.tipo, leer, base(b)),
    );
    if (!visibles.length) return null;

    return (
      <div className="bloques-libres">
        {visibles.map((b) => (
          <Bloque key={b.id} {...propsDe(b)} dueno={dueno} className={`bloque-libre bloque-libre--${b.tipo}`}>
            <Contenido tipo={b.tipo} base={base(b)} dueno={dueno} />
          </Bloque>
        ))}
      </div>
    );
  }

  const ids = bloques.map((b) => b.id);

  /* Todas las claves de un bloque: su contenido, su fondo, si está oculto. */
  const clavesDe = (b) =>
    Object.keys(edicion.borrador).filter((clave) => {
      const sinTipo = clave.replace(/^\w+:/, "");
      return sinTipo === base(b) || sinTipo.startsWith(`${base(b)}.`);
    });

  const insertar = (nuevo, posicion) => {
    const orden = [...ids];
    orden.splice(posicion, 0, nuevo.id);
    edicion.fijar(zona, [...guardados, nuevo]);
    edicion.fijar(`orden:${zona}`, orden);
  };

  const duplicar = (b, posicion) => {
    const copia = { ...b, id: nuevoId() };
    for (const clave of clavesDe(b))
      edicion.fijar(clave.replace(base(b), base(copia)), edicion.borrador[clave]);
    insertar(copia, posicion + 1);
  };

  const borrar = (b) => {
    const quedan = guardados.filter((x) => x.id !== b.id);
    edicion.fijar(zona, quedan.length ? quedan : undefined);
    edicion.fijar(`orden:${zona}`, quedan.length ? ids.filter((id) => id !== b.id) : undefined);
    for (const clave of clavesDe(b)) edicion.fijar(clave, undefined);
  };

  return (
    <div className="bloques-libres bloques-libres--editando">
      {bloques.map((b, i) => (
        <Fragment key={b.id}>
          <Agregar compacto alElegir={(tipo) => insertar({ id: nuevoId(), tipo }, i)} />
          <Bloque
            {...propsDe(b)}
            dueno={dueno}
            className={`bloque-libre bloque-libre--${b.tipo}`}
            acciones={
              <>
                <button type="button" title="Duplicar" onClick={() => duplicar(b, i)}>
                  <Icon icon="ph:copy" width={15} height={15} aria-hidden="true" />
                </button>
                <button type="button" title="Borrar bloque" onClick={() => borrar(b)}>
                  <Icon icon="ph:trash" width={15} height={15} aria-hidden="true" />
                </button>
              </>
            }
          >
            <Contenido tipo={b.tipo} base={base(b)} editando dueno={dueno} />
          </Bloque>
        </Fragment>
      ))}
      <Agregar alElegir={(tipo) => insertar({ id: nuevoId(), tipo }, bloques.length)} />
    </div>
  );
}
