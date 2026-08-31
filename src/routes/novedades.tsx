import { createFileRoute } from "@tanstack/react-router";

import { SectionList } from "@/components/SectionList";
import { SiteLayout } from "@/components/SiteLayout";
import { novedadesSections } from "@/data/novedades";

const TITLE = "Novedades — EEST N°1 Monte Grande";
const DESC =
  "Cuadernillos de ingreso, actividades para nuevos ingresantes, Conectar Igualdad y comunicados de la Técnica N°1 de Monte Grande.";

export const Route = createFileRoute("/novedades")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: NovedadesPage,
});

function NovedadesPage() {
  return (
    <SiteLayout
      title="Novedades"
      intro="Comunicados, cuadernillos y actividades de la escuela. Cada documento se abre directamente en Google Drive."
    >
      <SectionList sections={novedadesSections} />
    </SiteLayout>
  );
}
