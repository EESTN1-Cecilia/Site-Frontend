import imgPrimero from '../assets/primero.png';
import imgSegundo from '../assets/segundo.png';
import imgTercero from '../assets/tercero.png';

export const saberesData = [
  {
    id: "primer-ano",
    yearTitle: "PRIMER AÑO 2026",
    documents: [
      {
        id: "1-saberes-primer-ano",
        yearBadge: "1° AÑO · 2026",
        previewTitle: "EVALUACIÓN DE SABERES: PRIMER AÑO",
        title: "Cuadernillo de Evaluación de Saberes 1° Año",
        category: "CICLO BÁSICO",
        institutionTag: "E.E.S.T. Nº1 · 1° AÑO",
        pages: 12,
        coverImage: imgPrimero,
        fitMode: "contain",
        pdfUrl: "/pdfs/Primer_ano.pdf",
        fileName: "Primer_ano.pdf",
        description: "Material oficial con los proyectos, pautas de evaluación y contenidos de acreditación de saberes de primer año."
      }
    ]
  },
  {
    id: "segundo-ano",
    yearTitle: "SEGUNDO AÑO 2026",
    documents: [
      {
        id: "2-saberes-segundo-ano",
        yearBadge: "2° AÑO · 2026",
        previewTitle: "EVALUACIÓN DE SABERES: SEGUNDO AÑO",
        title: "Cuadernillo de Evaluación de Saberes 2° Año",
        category: "CICLO BÁSICO",
        institutionTag: "E.E.S.T. Nº1 · 2° AÑO",
        pages: 16,
        coverImage: imgSegundo,
        fitMode: "contain",
        pdfUrl: "/pdfs/Segundo_ano.pdf",
        fileName: "Segundo_ano.pdf",
        description: "Material oficial con los proyectos integradores y contenidos de acreditación de saberes de segundo año."
      }
    ]
  },
  {
    id: "tercer-ano",
    yearTitle: "TERCER AÑO 2026",
    documents: [
      {
        id: "3-saberes-tercer-ano",
        yearBadge: "3° AÑO · 2026",
        previewTitle: "EVALUACIÓN DE SABERES: TERCER AÑO",
        title: "Cuadernillo de Evaluación de Saberes 3° Año",
        category: "CICLO BÁSICO",
        institutionTag: "E.E.S.T. Nº1 · 3° AÑO",
        pages: 20,
        coverImage: imgTercero,
        fitMode: "cover",
        pdfUrl: "/pdfs/Tercer_ano.pdf",
        fileName: "Tercer_ano.pdf",
        description: "Material oficial con los proyectos técnicos y contenidos de acreditación de saberes de tercer año."
      }
    ]
  }
];
