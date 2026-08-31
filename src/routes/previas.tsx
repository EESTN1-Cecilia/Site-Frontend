import { createFileRoute } from "@tanstack/react-router";

import { SectionList } from "@/components/SectionList";
import { SiteLayout } from "@/components/SiteLayout";
import { previasSections } from "@/data/previas";

const TITLE = "Intensificación y Previas — EEST N°1 Monte Grande";
const DESC =
  "Fechas de mesas, formularios de inscripción y trabajos de intensificación por año y especialidad de la Técnica N°1 de Monte Grande.";

export const Route = createFileRoute("/previas")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: PreviasPage,
});

function PreviasPage() {
  return (
    <SiteLayout
      title="Intensificación y Previas"
      intro="Fechas, formularios y trabajos de intensificación por año y especialidad. Todos los archivos se abren en Google Drive."
    >
      <SectionList sections={previasSections} />
    </SiteLayout>
  );
}
