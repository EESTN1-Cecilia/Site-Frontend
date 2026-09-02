import { createFileRoute } from "@tanstack/react-router";

import { SectionAccordion } from "@/components/SectionAccordion";
import { SiteLayout } from "@/components/SiteLayout";
import { novedades } from "@/data/site";

const title = "Novedades — EEST N°1 Monte Grande";
const description =
  "Cuadernillos de ingreso, actividades para nuevos ingresantes, Conectar Igualdad y comunicados de la Técnica N°1 de Monte Grande.";

export const Route = createFileRoute("/novedades")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: NovedadesPage,
});

function NovedadesPage() {
  return (
    <SiteLayout
      title="Novedades"
      intro="Comunicados, cuadernillos y actividades de la escuela. Abrí cada sección para ver sus documentos: se abren directamente en Google Drive."
    >
      <SectionAccordion sections={novedades} />
    </SiteLayout>
  );
}
