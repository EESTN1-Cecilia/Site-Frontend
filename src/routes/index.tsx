import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";

const title = "EEST N°1 Monte Grande — Escuela Técnica";
const description =
  "Información académica de la Escuela de Educación Secundaria Técnica N°1 de Monte Grande: novedades, intensificación y previas.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout
      title="Escuela Técnica N°1"
      intro="Monte Grande, Esteban Echeverría. Accedé de forma rápida a la información académica y a los documentos de la escuela."
    >
      <div className="home-grid">
        <Link className="card home-card" to="/novedades">
          <span className="rule" />
          <h2>Novedades</h2>
          <p>Actividades para nuevos ingresantes, cuadernillos, Conectar Igualdad y comunicados.</p>
          <span className="more">Ver sección →</span>
        </Link>
        <Link className="card home-card" to="/previas">
          <span className="rule" />
          <h2>Intensificación y Previas</h2>
          <p>Fechas de mesas, formularios de inscripción y trabajos por año y especialidad.</p>
          <span className="more">Ver sección →</span>
        </Link>
      </div>
    </SiteLayout>
  );
}
