import { createFileRoute } from "@tanstack/react-router";

import { SectionAccordion } from "@/components/SectionAccordion";
import { SiteLayout } from "@/components/SiteLayout";
import { previas } from "@/data/site";

const title = "Intensificación y Previas — EEST N°1 Monte Grande";
const description =
  "Fechas de mesas, formularios de inscripción, guías y trabajos de intensificación por año y especialidad de la Técnica N°1 de Monte Grande.";

export const Route = createFileRoute("/previas")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PreviasPage,
});

function PreviasPage() {
  return (
    <SiteLayout
      title="Intensificación y Previas"
      intro="Desplegá cada sección para ver fechas, formularios, guías y trabajos con sus documentos en Google Drive."
    >
      <SectionAccordion sections={previas} />
    </SiteLayout>
  );
}
