import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import Texto, { Dato, Imagen } from "../components/Texto.jsx";
import Bloques from "../components/Bloques.jsx";
import { usePublicaciones } from "../publicaciones.js";

const PUBLICACIONES = "/panel/publicaciones";

const fecha = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function Nota({ novedad, destacada }) {
  /* La primera imagen hace de portada y el resto va en el cuerpo. */
  const bloques = novedad.bloques || [];
  const portadaIndice = bloques.findIndex((b) => b.tipo === "imagen");
  const portada = portadaIndice >= 0 ? bloques[portadaIndice] : null;
  const cuerpo = bloques.filter((_, i) => i !== portadaIndice);
  const resumen = cuerpo.find((b) => b.tipo === "parrafo");
  const clave = (resto) => `pub:${novedad.id}:${resto}`;

  return (
    <article
      className={`nota ${destacada ? "nota--destacada" : ""} ${
        novedad.borrador ? "nota--borrador" : ""
      }`}
    >
      {portada && (
        <div className="nota__foto">
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
        resumen && (
          <p className="nota__texto">
            <Texto id={clave(`bloque:${resumen.id}`)} dueno={PUBLICACIONES}>
              {resumen.texto}
            </Texto>
          </p>
        )
      )}
      <span className="nota__link">
        <Texto id="novedades.leer">Leer más</Texto>
        <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
      </span>
    </article>
  );
}

export default function Novedades({ params }) {
  const [categoria, setCategoria] = useState("Todas");
  const publicaciones = usePublicaciones();

  /* Sólo lo aprobado por Dirección, de la más nueva a la más vieja. */
  const publicadas = publicaciones
    .filter((pub) => pub.estado === "publicada" && pub.ruta === "/novedades")
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

  return (
    <main>
      <Encabezado
        chip={<Texto id="novedades.hero.chip">COMUNIDAD</Texto>}
        titulo={<Texto id="novedades.hero.titulo">Novedades de la</Texto>}
        destacado={<Texto id="novedades.hero.destacado">escuela</Texto>}
        texto={
          <Texto id="novedades.hero.texto">
            Avisos institucionales, calendario académico y lo que están haciendo
            los cursos.
          </Texto>
        }
      />

      <section className="seccion contenedor">
        <div className="filtros__chips filtros__chips--top">
          {categorias.map((valor) => (
            <button
              key={valor}
              className={`filtro ${categoria === valor ? "filtro--activo" : ""}`}
              onClick={() => setCategoria(valor)}
            >
              {valor}
            </button>
          ))}
        </div>

        {destacada && <Nota novedad={destacada} destacada />}

        <div className="notas">
          {resto.map((novedad) => (
            <Nota novedad={novedad} key={novedad.id} />
          ))}
        </div>

        {lista.length === 0 && <p className="vacio">Todavía no hay novedades en esta categoría.</p>}
      </section>
    </main>
  );
}
