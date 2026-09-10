import imagenCicloBasico from "./assets/images/ciclo-basico-taller.jpg";
import imagenInformatica from "./assets/images/informatica-robotica.jpg";
import imagenProgramacion from "./assets/images/programacion-proyectos.jpg";

/* Contenido de las páginas públicas. */

export const valoraciones = [
  [
    "TEA",
    "Trayectoria Educativa Avanzada",
    "El estudiante sostuvo la continuidad pedagógica y alcanzó los saberes del período.",
  ],
  [
    "TEP",
    "Trayectoria Educativa en Proceso",
    "Alcanzó parte de los saberes. Continúa con actividades de acompañamiento.",
  ],
  [
    "TED",
    "Trayectoria Educativa Discontinua",
    "No sostuvo la continuidad. Pasa a intensificación con plan de trabajo.",
  ],
];

export const periodos = [
  ["1° período", "Marzo a julio", "Cierre con valoración e informe pedagógico."],
  [
    "2° período",
    "Agosto a diciembre",
    "Cierre de cursada y definición de acreditación.",
  ],
  [
    "Intensificación",
    "Diciembre, febrero y períodos intermedios",
    "Trabajo sobre los saberes pendientes de acreditación.",
  ],
];

export const criterios = [
  [
    "ph:target",
    "Saberes, no promedios",
    "Se evalúa qué saberes del diseño curricular alcanzó cada estudiante.",
  ],
  [
    "ph:path",
    "Trayectoria completa",
    "Se mira todo el recorrido del año, no una prueba aislada.",
  ],
  [
    "ph:chats-circle",
    "Devolución permanente",
    "Cada instancia vuelve con una devolución que indica cómo seguir.",
  ],
  [
    "ph:wrench",
    "Evaluación en el taller",
    "En las materias técnicas se evalúa el proceso y el producto del proyecto.",
  ],
];

/* Carpeta con los planes de trabajo de cada mesa. Reemplazar por la real. */
export const driveMesas =
  "https://drive.google.com/drive/folders/1ekod6AXga5ImRl3ZIbo16AT7GAJTbwfN?usp=sharing";

export const mesas = [
  ["Matemática", "1° y 2°", "2026-12-01", "09:00", "Aula 8", "Prof. S. Roldán"],
  [
    "Prácticas del Lenguaje",
    "1° a 3°",
    "2026-12-01",
    "11:00",
    "Aula 5",
    "Prof. C. Nieves",
  ],
  [
    "Fisicoquímica",
    "2° y 3°",
    "2026-12-02",
    "09:00",
    "Laboratorio 2",
    "Prof. E. Paz",
  ],
  ["Inglés", "1° a 3°", "2026-12-02", "11:00", "Aula 8", "Prof. C. Nieves"],
  [
    "Sistemas Digitales",
    "4°",
    "2026-12-03",
    "09:00",
    "Laboratorio 1",
    "Prof. M. Vega",
  ],
  ["Base de Datos", "5°", "2026-12-03", "11:00", "Aula 12", "Prof. Ramírez"],
  [
    "Análisis Matemático",
    "5°",
    "2026-12-04",
    "09:00",
    "Aula 12",
    "Prof. S. Roldán",
  ],
  ["Redes", "6°", "2026-12-04", "11:00", "Laboratorio 2", "Prof. D. Suárez"],
  [
    "Organización y Métodos",
    "7°",
    "2026-12-05",
    "09:00",
    "Aula 5",
    "Prof. H. Barreto",
  ],
  [
    "Desarrollo de Software",
    "7°",
    "2026-12-05",
    "11:00",
    "Laboratorio 1",
    "Prof. N. Quiroga",
  ],
];

export const pasosPrevias = [
  [
    "Consultá tus materias pendientes",
    "Están en tu boletín y en la vista de tu perfil. Ante dudas, preceptoría confirma el listado.",
  ],
  [
    "Retirá el plan de trabajo",
    "Cada materia entrega el plan con los saberes a intensificar y el material de estudio.",
  ],
  [
    "Presentate en la mesa",
    "Con DNI y el plan resuelto. Revisá día, hora y aula en el cronograma.",
  ],
  [
    "Acreditación",
    "Si acreditás, la materia queda cerrada. Si no, continuás en el siguiente período.",
  ],
];

export const novedades = [
  {
    id: "n1",
    imagen: imagenCicloBasico,
    categoria: "Institucional",
    fecha: "2026-09-08",
    titulo: "Inscripción 2027: apertura de vacantes para 1° año",
    resumen:
      "Del 15 al 30 de septiembre se reciben las solicitudes de ingreso al ciclo básico. Cupos por orden de presentación de la documentación completa.",
  },
  {
    id: "n2",
    imagen: imagenInformatica,
    categoria: "Académico",
    fecha: "2026-09-05",
    titulo: "Cronograma de mesas de intensificación de diciembre",
    resumen:
      "Ya está publicado el cronograma con materia, día, hora y aula para el ciclo básico y el superior.",
  },
  {
    id: "n3",
    imagen: imagenProgramacion,
    categoria: "Proyectos",
    fecha: "2026-08-29",
    titulo: "Muestra anual de prácticas profesionalizantes",
    resumen:
      "Los 7° años de Informática y Programación presentan sus proyectos finales el 14 de noviembre en el SUM.",
  },
  {
    id: "n4",
    imagen: imagenInformatica,
    categoria: "Proyectos",
    fecha: "2026-08-18",
    titulo: "El taller de robótica sumó equipamiento nuevo",
    resumen:
      "Gracias a una donación de material, el laboratorio incorporó kits de sensores y placas para los proyectos de 5° y 6°.",
  },
  {
    id: "n5",
    imagen: imagenCicloBasico,
    categoria: "Comunidad",
    fecha: "2026-08-04",
    titulo: "Jornada de puertas abiertas para familias",
    resumen:
      "Recorrido por talleres y laboratorios, charla sobre las dos orientaciones técnicas y espacio de consultas.",
  },
  {
    id: "n6",
    imagen: imagenProgramacion,
    categoria: "Académico",
    fecha: "2026-07-21",
    titulo: "Nuevo régimen de evaluación por saberes",
    resumen:
      "Explicamos cómo se leen las valoraciones TEA, TEP y TED en el boletín y qué implica cada una.",
  },
];

export const requisitos = [
  ["ph:identification-card", "DNI del estudiante", "Original y fotocopia."],
  [
    "ph:certificate",
    "Certificado de 6° grado",
    "Constancia de finalización de la primaria o certificado de alumno regular.",
  ],
  [
    "ph:first-aid-kit",
    "Ficha de salud",
    "Completa y firmada por profesional matriculado.",
  ],
  [
    "ph:users",
    "DNI de madre, padre o tutor",
    "Fotocopia y datos de contacto actualizados.",
  ],
  [
    "ph:house-line",
    "Constancia de domicilio",
    "Servicio a nombre del adulto responsable.",
  ],
  ["ph:camera", "2 fotos 4x4", "Fondo blanco, para el legajo."],
];

export const pasosInscripcion = [
  [
    "Completá el formulario",
    "Cargás los datos del estudiante y del adulto responsable.",
  ],
  [
    "Recibís un turno",
    "Secretaría te contacta por mail o teléfono con día y hora.",
  ],
  [
    "Presentás la documentación",
    "En la escuela, con los originales y las fotocopias.",
  ],
  ["Confirmación de vacante", "Queda registrada la matrícula en el legajo."],
];
