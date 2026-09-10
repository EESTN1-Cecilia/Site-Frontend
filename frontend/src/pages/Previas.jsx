import { useState } from "react";
import { Icon } from "@iconify/react";
import Encabezado from "../components/Encabezado.jsx";
import { driveMesas, mesas, pasosPrevias } from "../contenido.js";
import { usePublicaciones } from "../publicaciones.js";
import Bloques from "../components/Bloques.jsx";

const anios = ["Todos", "1° a 3°", "1° y 2°", "2° y 3°", "4°", "5°", "6°", "7°"];

const fecha = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export default function Previas({ params }) {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState("Todos");
  const publicaciones = usePublicaciones();

  /* Borrador que dirección está previsualizando para esta página. */
  const borrador = publicaciones.find(
    (pub) => pub.id === params?.get("preview") && pub.ruta === "/previas",
  );
  const bloques = borrador?.bloques || [];
  const portadaIndice = bloques.findIndex((b) => b.tipo === "imagen");
  const portada = portadaIndice >= 0 ? bloques[portadaIndice].url : null;
  const cuerpo = bloques.filter((_, i) => i !== portadaIndice);

  const filtradas = mesas.filter(
    ([materia, curso]) =>
      materia.toLowerCase().includes(busqueda.trim().toLowerCase()) &&
      (anio === "Todos" || curso === anio),
  );

  return (
    <main>
      <Encabezado
        chip="TRAYECTORIAS"
        titulo="Intensificación y"
        destacado="previas"
        texto="Los espacios pendientes de acreditación se intensifican con un plan de trabajo por materia. Buscá tu mesa y presentate con el plan resuelto."
      />

      {borrador && (
        <section className="seccion contenedor">
          <article className="nota nota--destacada nota--borrador">
            {portada && (
              <div className="nota__foto">
                <img src={portada} alt="" />
                <span className="nota__sello">SIN PUBLICAR</span>
              </div>
            )}
            <p className="nota__meta">
              <span className="nota__categoria">{borrador.categoria}</span>
              <span>·</span>
              <span>{borrador.fecha}</span>
            </p>
            <h2 className="nota__titulo nota__titulo--grande">
              {borrador.titulo}
            </h2>
            <Bloques bloques={cuerpo} />
          </article>
        </section>
      )}

      <section className="seccion contenedor">
        <div className="encabezado">
          <div>
            <p className="chip">CÓMO SIGUE</p>
            <h2 className="titulo">
              Cuatro pasos para <span>acreditar</span>
            </h2>
          </div>
        </div>
        <ol className="linea">
          {pasosPrevias.map(([titulo, texto], i) => (
            <li className="linea__item" key={titulo}>
              <span className="linea__numero">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="linea__titulo">{titulo}</h3>
                <p className="linea__texto">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="seccion-alt">
        <div className="contenedor">
          <div className="encabezado">
            <div>
              <p className="chip">DICIEMBRE 2026</p>
              <h2 className="titulo">
                Cronograma de <span>mesas</span>
              </h2>
            </div>
            <p className="descripcion">
              Filtrá por materia o por año para encontrar la tuya.
            </p>
          </div>

          <div className="filtros">
            <label className="campo campo--busca">
              <Icon
                icon="ph:magnifying-glass"
                width={18}
                height={18}
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Buscar materia"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>
            <div className="filtros__chips">
              {anios.map((valor) => (
                <button
                  key={valor}
                  className={`filtro ${anio === valor ? "filtro--activo" : ""}`}
                  onClick={() => setAnio(valor)}
                >
                  {valor}
                </button>
              ))}
            </div>

            <a
              className="boton boton--primario"
              href={driveMesas}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon
                icon="ph:google-drive-logo"
                width={16}
                height={16}
                aria-hidden="true"
              />
              Planes de trabajo en Drive
            </a>
          </div>

          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Año</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Aula</th>
                  <th>Docente</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((mesa) => (
                  <tr key={`${mesa[0]}-${mesa[1]}`}>
                    <td data-label="Materia">
                      <strong>{mesa[0]}</strong>
                    </td>
                    <td data-label="Año">{mesa[1]}</td>
                    <td data-label="Fecha" className="capitalizar">
                      {fecha(mesa[2])}
                    </td>
                    <td data-label="Hora">{mesa[3]}</td>
                    <td data-label="Aula">{mesa[4]}</td>
                    <td data-label="Docente">{mesa[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtradas.length === 0 && (
            <p className="vacio">No hay mesas con esos filtros.</p>
          )}
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="aviso">
          <div>
            <h3 className="aviso__titulo">Llevá tu DNI</h3>
            <p className="aviso__texto">
              Sin documento no se puede rendir. Presentate 15 minutos antes del
              horario de la mesa.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
