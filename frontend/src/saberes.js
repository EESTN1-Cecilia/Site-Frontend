import portadaPrimero from "./assets/saberes/primero.png";
import portadaSegundo from "./assets/saberes/segundo.png";
import portadaTercero from "./assets/saberes/tercero.png";

/* Cuadernillos oficiales de evaluación de saberes del ciclo básico. */
export const cuadernillos = [
  {
    id: "primer-ano",
    anio: "1° AÑO · 2026",
    ciclo: "CICLO BÁSICO",
    titulo: "Cuadernillo de Evaluación de Saberes 1° Año",
    descripcion:
      "Material oficial con los proyectos, pautas de evaluación y contenidos de acreditación de saberes de primer año.",
    portada: portadaPrimero,
    ajuste: "contain",
    pdf: "/pdfs/primer-ano.pdf",
    archivo: "primer-ano.pdf",
    paginas: 10,
    peso: "641 KB",
  },
  {
    id: "segundo-ano",
    anio: "2° AÑO · 2026",
    ciclo: "CICLO BÁSICO",
    titulo: "Cuadernillo de Evaluación de Saberes 2° Año",
    descripcion:
      "Material oficial con los proyectos integradores y contenidos de acreditación de saberes de segundo año.",
    portada: portadaSegundo,
    ajuste: "contain",
    pdf: "/pdfs/segundo-ano.pdf",
    archivo: "segundo-ano.pdf",
    paginas: 11,
    peso: "1,2 MB",
  },
  {
    id: "tercer-ano",
    anio: "3° AÑO · 2026",
    ciclo: "CICLO BÁSICO",
    titulo: "Cuadernillo de Evaluación de Saberes 3° Año",
    descripcion:
      "Material oficial con los proyectos técnicos y contenidos de acreditación de saberes de tercer año.",
    portada: portadaTercero,
    ajuste: "cover",
    pdf: "/pdfs/tercer-ano.pdf",
    archivo: "tercer-ano.pdf",
    paginas: 18,
    peso: "2,3 MB",
  },
];
