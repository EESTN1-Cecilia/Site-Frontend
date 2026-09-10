import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { planillas as planillasIniciales } from "../../panelData.js";
import { puedeEditar } from "../../sesion.js";

const tono = {
  Entregada: "ok",
  "En revisión": "aviso",
  Pendiente: "alerta",
};

export default function Calificaciones({ ruta, usuario }) {
  const editable = puedeEditar(usuario, ruta);
  const [planillas, setPlanillas] = useState(planillasIniciales);
  const [aviso, setAviso] = useState("");

  const entregadas = planillas.filter((p) => p.estado === "Entregada").length;
  const avance = Math.round((entregadas / planillas.length) * 100);

  const subir = (id) => (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setPlanillas((previo) =>
      previo.map((planilla) =>
        planilla.id === id
          ? { ...planilla, estado: "Entregada", archivo: archivo.name }
          : planilla,
      ),
    );
    setAviso(`Planilla ${archivo.name} cargada.`);
  };

  return (
    <Layout
      ruta={ruta}
      chip="DOCENTES Y SECRETARÍA"
      titulo="Notas y boletines"
      texto="Cada docente sube su planilla; el boletín se cierra cuando están todas."
      acciones={
        editable && (
          <button
            className="boton boton--primario"
            disabled={avance < 100}
            onClick={() =>
              setAviso("Boletines generados para todos los cursos.")
            }
          >
            <Icon icon="ph:file-text" width={16} height={16} aria-hidden="true" />
            Generar boletines
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

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">Avance del cierre</h2>
        <p className="tarjeta__bajada">
          {entregadas} de {planillas.length} planillas entregadas.
        </p>
        <div className="progreso">
          <div className="progreso__valor" style={{ width: `${avance}%` }} />
        </div>
        <p className="progreso__numero">{avance}%</p>
      </section>

      <div className="tabla-scroll">
        <table className="tabla tabla--panel">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Curso</th>
              <th>Docente</th>
              <th>Período</th>
              <th>Estado</th>
              <th>Archivo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {planillas.map((planilla) => (
              <tr key={planilla.id}>
                <td data-label="Materia">
                  <strong>{planilla.materia}</strong>
                </td>
                <td data-label="Curso">{planilla.curso}</td>
                <td data-label="Docente">{planilla.profesor}</td>
                <td data-label="Período">{planilla.periodo}</td>
                <td data-label="Estado">
                  <span className={`etiqueta etiqueta--${tono[planilla.estado]}`}>
                    {planilla.estado}
                  </span>
                </td>
                <td data-label="Archivo">{planilla.archivo || "—"}</td>
                <td>
                  {editable && (
                    <label className="boton boton--fino boton--archivo">
                      <Icon
                        icon="ph:upload-simple"
                        width={15}
                        height={15}
                        aria-hidden="true"
                      />
                      Subir planilla
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf"
                        onChange={subir(planilla.id)}
                      />
                    </label>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
