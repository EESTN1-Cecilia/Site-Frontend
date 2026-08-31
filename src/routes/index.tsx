import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";

const TITLE = "EEST N°1 Monte Grande — Novedades y Previas";
const DESC =
  "Portal de la Escuela de Educación Secundaria Técnica N°1 de Monte Grande: novedades, cuadernillos e información de intensificación y materias previas.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Index,
});

const CARDS = [
  {
    to: "/novedades",
    label: "Novedades",
    text: "Actividades para nuevos ingresantes, cuadernillos, Conectar Igualdad y comunicados.",
  },
  {
    to: "/previas",
    label: "Intensificación y Previas",
    text: "Fechas de mesas, formularios de inscripción y trabajos por año y especialidad.",
  },
] as const;

function Index() {
  return (
    <SiteLayout
      title="Escuela Técnica N°1"
      intro="Monte Grande, Esteban Echeverría. Accedé de forma rápida a la información académica y a los documentos de la escuela."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link key={card.to} to={card.to} className="card-soft group block p-7 transition-shadow">
            <span className="inline-block h-1 w-10 rounded-full bg-secondary" />
            <h2 className="mt-4 text-2xl font-semibold uppercase tracking-wide text-primary group-hover:text-primary-dark">
              {card.label}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.text}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ver sección
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}
