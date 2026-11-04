import { respuestasSitio } from "../contenido.js";
import CirculosEncabezado from "../components/CirculosEncabezado.jsx";
import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import Texto, { Bloque, Caso, Dato, Imagen } from "../components/Texto.jsx";
import Bloques from "../components/Bloques.jsx";
import NotaModal from "../components/NotaModal.jsx";
import ZonaLibre from "../components/ZonaLibre.jsx";
import { Dinamico, PaginaEditable, usePaginaGuardada } from "../components/PaginaEditable.jsx";
import { usePublicaciones } from "../publicaciones.js";

const PUBLICACIONES = "/panel/publicaciones";

/* Notas que no se muestran por ahora (siguen guardadas: para volver a verlas,
   sacarlas de esta lista). */
const OCULTAS = new Set(["n2", "n3", "n4", "n5"]);

const fecha = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function Nota({ novedad, destacada, onAbrir }) {
  /* La primera imagen hace de portada y el resto va en el cuerpo. */
  const bloques = novedad.bloques || [];
  const portadaIndice = bloques.findIndex((b) => b.tipo === "imagen");
  const portada = portadaIndice >= 0 ? bloques[portadaIndice] : null;
  /* Los bloques "-soloNota" (como el enlace a la fuente) van sólo en la nota abierta. */
  const cuerpo = bloques.filter((b, i) => i !== portadaIndice && !String(b.id).endsWith("-soloNota"));
  const resumen = cuerpo.find((b) => b.tipo === "parrafo");
  const links = cuerpo.filter((b) => b.tipo === "link");
  const clave = (resto) => `pub:${novedad.id}:${resto}`;

  return (
    <article
      className={`nota ${destacada ? "nota--destacada" : ""} ${
        novedad.borrador ? "nota--borrador" : ""
      }`}
    >
      {portada && (
        <div className="nota__foto nota__foto--abre" onClick={() => onAbrir(novedad.id)}>
          <Imagen id={clave(`bloque:${portada.id}`)} dueno={PUBLICACIONES} src={portada.url} />
          {novedad.borrador && <span className="nota__sello">SIN PUBLICAR</span>}
        </div>
      )}
      <p className="nota__meta">
        <span className="nota__categoria">
          <Texto id={clave("categoria")} dueno={PUBLICACIONES}>
            {novedad.categoria}
          </Texto>
        </span>
        <span>·</span>
        <span>
          <Dato id={clave("fecha")} dueno={PUBLICACIONES} tipo="date" valor={novedad.fecha} formato={fecha} />
        </span>
      </p>
      <h3 className={`nota__titulo ${destacada ? "nota__titulo--grande" : ""}`}>
        <Texto id={clave("titulo")} dueno={PUBLICACIONES}>
          {novedad.titulo}
        </Texto>
      </h3>
      {destacada ? (
        <Bloques pub={novedad} bloques={cuerpo} />
      ) : (
        <>
          {resumen && (
            <p className="nota__texto">
              <Texto id={clave(`bloque:${resumen.id}`)} dueno={PUBLICACIONES}>
                {resumen.texto}
              </Texto>
            </p>
          )}
          <Bloques pub={novedad} bloques={links} />
        </>
      )}
      <button
        type="button"
        className="nota__link"
        aria-haspopup="dialog"
        onClick={() => onAbrir(novedad.id)}
      >
        <Texto id="novedades.leer">Leer más</Texto>
        <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
      </button>
    </article>
  );
}

export default function Novedades({ params }) {
  const [categoria, setCategoria] = useState("Todas");
  const [abierta, setAbierta] = useState(null);
  const publicaciones = usePublicaciones();
  const guardada = usePaginaGuardada("novedades.pagina");

  /* Sólo lo aprobado por Dirección, de la más nueva a la más vieja. */
  const publicadas = publicaciones
    .filter((pub) => pub.estado === "publicada" && pub.ruta === "/novedades" && !OCULTAS.has(pub.id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  /* Si Dirección está previsualizando, el borrador entra como si ya estuviera. */
  const borrador = publicaciones.find(
    (pub) =>
      pub.id === params?.get("preview") && pub.ruta === "/novedades" && pub.estado !== "publicada",
  );

  const todas = borrador ? [{ ...borrador, borrador: true }, ...publicadas] : publicadas;
  const categorias = ["Todas", ...new Set(todas.map((n) => n.categoria))];
  const lista = todas.filter((n) => categoria === "Todas" || n.categoria === categoria);
  const [destacada, ...resto] = lista;
  const activa = lista.find((n) => n.id === abierta);

  /* Partes automáticas: los filtros por categoría y las notas publicadas. */
  const filtrosDeCategoria = (
    <Bloque id="novedades.filtros" className="filtros__chips filtros__chips--top">
      {categorias.map((valor) => (
        <button
          key={valor}
          className={`filtro ${categoria === valor ? "filtro--activo" : ""}`}
          onClick={() => setCategoria(valor)}
        >
          {valor === "Todas" ? <Texto id="novedades.filtros.todas">Todas</Texto> : valor}
        </button>
      ))}
    </Bloque>
  );

  const notas = (
    <>
      {destacada && <Nota novedad={destacada} destacada onAbrir={setAbierta} />}

      <div className="notas">
        {resto.map((novedad) => (
          <Nota novedad={novedad} key={novedad.id} onAbrir={setAbierta} />
        ))}
      </div>

      {activa && (
        <NotaModal
          novedad={activa}
          lista={lista}
          fecha={fecha}
          onCambiar={setAbierta}
          onCerrar={() => setAbierta(null)}
        />
      )}

      <Caso visible={lista.length === 0} cuando="cuando no hay novedades en la categoría elegida">
        <p className="vacio">
          <Texto id="novedades.vacio">Todavía no hay novedades en esta categoría.</Texto>
        </p>
      </Caso>
    </>
  );

  if (guardada)
    return (
      <main>
        <PaginaEditable clave="novedades.pagina" pagina={guardada} dinamicos={{ categorias: filtrosDeCategoria, notas }} />
      </main>
    );

  return (
    <main>
      <Encabezado id="novedades.hero"
        chip={<Texto id="novedades.hero.chip">COMUNIDAD</Texto>}
        titulo={<Texto id="novedades.hero.titulo">Novedades de la</Texto>}
        destacado={<Texto id="novedades.hero.destacado">escuela</Texto>}
        texto={
          <Texto id="novedades.hero.texto">{respuestasSitio.novedades}</Texto>
        }
      >
        <CirculosEncabezado variante="comunidad" />
      </Encabezado>

      <Bloque id="novedades.lista" como="section" className="seccion contenedor">
        <Dinamico id="categorias">{filtrosDeCategoria}</Dinamico>
        <Dinamico id="notas">{notas}</Dinamico>

        <ZonaLibre zona="novedades.libre" anterior="novedades.bloques" titulo="Novedades" />
      </Bloque>
    </main>
  );
}
