import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { alumnos } from "../../panelData.js";

const asientos = alumnos
  .map((alumno) => ({
    libro: alumno.libro,
    folio: alumno.folio,
    nombre: `${alumno.apellido}, ${alumno.nombre}`,
    dni: alumno.dni,
    curso: alumno.curso,
    condicion: alumno.condicion,
    estado: alumno.curso === "Egresado" ? "Egresado" : "Activo",
  }))
  .sort((a, b) => `${a.libro}${a.folio}`.localeCompare(`${b.libro}${b.folio}`));

const libros = ["Todos", ...new Set(asientos.map((a) => a.libro))];

const exportar = (filas) => {
  const csv = [
    "Libro,Folio,Alumno,DNI,Curso,Condicion,Estado",
    ...filas.map((f) =>
      [f.libro, f.folio, `"${f.nombre}"`, f.dni, f.curso, f.condicion, f.estado].join(
        ",",
      ),
    ),
  ].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const enlace = Object.assign(document.createElement("a"), {
    href: url,
    download: "libro-matriz.csv",
  });
  enlace.click();
  URL.revokeObjectURL(url);
};

export default function LibroMatriz({ ruta }) {
  const [busqueda, setBusqueda] = useState("");
  const [libro, setLibro] = useState("Todos");

  const texto = busqueda.trim().toLowerCase();
  const filas = asientos.filter(
    (asiento) =>
      (asiento.nombre.toLowerCase().includes(texto) ||
        asiento.dni.includes(texto) ||
        asiento.folio.includes(texto)) &&
      (libro === "Todos" || asiento.libro === libro),
  );

  return (
    <Layout
      ruta={ruta}
      chip="SECRETARÍA"
      titulo="Libro Matriz digital"
      texto="Cada alumno con su libro y folio. Reemplaza la búsqueda manual en los tomos de papel."
      acciones={
        <button className="boton boton--primario" onClick={() => exportar(filas)}>
          <Icon icon="ph:download-simple" width={16} height={16} aria-hidden="true" />
          Exportar CSV
        </button>
      }
    >
      <div className="filtros">
        <label className="campo campo--busca">
          <Icon icon="ph:magnifying-glass" width={18} height={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Alumno, DNI o folio"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label className="campo campo--select">
          <span>Libro</span>
          <select value={libro} onChange={(e) => setLibro(e.target.value)}>
            {libros.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tabla-scroll">
        <table className="tabla tabla--panel">
          <thead>
            <tr>
              <th>Libro</th>
              <th>Folio</th>
              <th>Apellido y nombre</th>
              <th>DNI</th>
              <th>Curso</th>
              <th>Condición</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((asiento) => (
              <tr key={`${asiento.libro}-${asiento.folio}`}>
                <td data-label="Libro">{asiento.libro}</td>
                <td data-label="Folio">
                  <strong>{asiento.folio}</strong>
                </td>
                <td data-label="Alumno">{asiento.nombre}</td>
                <td data-label="DNI">{asiento.dni}</td>
                <td data-label="Curso">{asiento.curso}</td>
                <td data-label="Condición">{asiento.condicion}</td>
                <td data-label="Estado">
                  <span className="etiqueta etiqueta--ok">{asiento.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length === 0 && <p className="vacio">Sin asientos para ese filtro.</p>}
    </Layout>
  );
}
