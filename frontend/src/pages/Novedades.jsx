import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import { novedades } from "../contenido.js";
import { usePublicaciones } from "../publicaciones.js";
import Bloques from "../components/Bloques.jsx";

const fecha = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function Nota({ novedad, destacada }) {
  /* Las publicaciones armadas en el editor vienen como bloques.
     La primera imagen hace de portada y el resto va en el cuerpo. */
  const bloques = novedad.bloques || [];
  const portadaIndice = bloques.findIndex((b) => b.tipo === "imagen");
  const portada =
    portadaIndice >= 0 ? bloques[portadaIndice].url : novedad.imagen;
  const cuerpo = bloques.filter((_, i) => i !== portadaIndice);

  return (
    <article
      className={`nota ${destacada ? "nota--destacada" : ""} ${
        novedad.borrador ? "nota--borrador" : ""
      }`}
    >
      {portada && (
        <div className="nota__foto">
          <img src={portada} alt="" />
          {novedad.borrador && <span className="nota__sello">SIN PUBLICAR</span>}
        </div>
      )}
      <p className="nota__meta">
        <span className="nota__categoria">{novedad.categoria}</span>
        <span>·</span>
        <span>{fecha(novedad.fecha)}</span>
      </p>
      <h3
        className={`nota__titulo ${destacada ? "nota__titulo--grande" : ""}`}
      >
        {novedad.titulo}
      </h3>
      {novedad.resumen && <p className="nota__texto">{novedad.resumen}</p>}
      {destacada && <Bloques bloques={cuerpo} />}
      <span className="nota__link">
        Leer más
        <Icon icon="ph:arrow-right" width={15} height={15} aria-hidden="true" />
      </span>
    </article>
  );
}

export default function Novedades({ params }) {
  const [categoria, setCategoria] = useState("Todas");
  const publicaciones = usePublicaciones();

  /* Si dirección está previsualizando, el borrador entra como si ya estuviera. */
  const borrador = publicaciones.find(
    (pub) => pub.id === params?.get("preview") && pub.ruta === "/novedades",
  );

  const todas = borrador
    ? [{ ...borrador, borrador: true }, ...novedades]
    : novedades;

  const categorias = ["Todas", ...new Set(todas.map((n) => n.categoria))];
  const lista = todas.filter(
    (novedad) => categoria === "Todas" || novedad.categoria === categoria,
  );
  const [destacada, ...resto] = lista;

  return (
    <main>
      <Encabezado
        chip="COMUNIDAD"
        titulo="Novedades de la"
        destacado="escuela"
        texto="Avisos institucionales, calendario académico y lo que están haciendo los cursos."
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

        {lista.length === 0 && (
          <p className="vacio">Todavía no hay novedades en esta categoría.</p>
        )}
      </section>
    </main>
  );
}
