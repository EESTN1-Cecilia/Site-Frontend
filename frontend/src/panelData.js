/* Datos de demostración del sistema de gestión.
   Reemplazar por la API cuando exista el backend. */
import imagenCicloBasico from "./assets/images/ciclo-basico-taller.jpg";
import imagenInformatica from "./assets/images/informatica-robotica.jpg";
import imagenProgramacion from "./assets/images/programacion-proyectos.jpg";

export const notificaciones = [
  {
    id: 2,
    tipo: "ausencia",
    icono: "ph:user-minus",
    titulo: "Prof. Ramírez ausente — 5° 3, 3° y 4° hora",
    detalle: "El aula 12 figura como libre en la grilla.",
    fecha: "Hoy · 08:10",
  },
  {
    id: 3,
    tipo: "reserva",
    icono: "ph:projector-screen",
    titulo: "Solicitud de proyector para 6° 1",
    detalle: "Reserva de 10:00 a 12:00. Pendiente de aceptación.",
    fecha: "Ayer · 16:20",
  },
  {
    id: 4,
    tipo: "publicacion",
    icono: "ph:eye",
    titulo: "Novedad “Inscripción 2027” esperando aprobación",
    detalle: "Cargada por Secretaría. Requiere visto de Dirección.",
    fecha: "Ayer · 11:05",
  },
];

/* ---------- Seguimiento curricular ---------- */
export const curricular = [
  {
    orientacion: "Informática",
    anios: [
      {
        anio: "4° año",
        materias: [
          {
            nombre: "Sistemas Digitales",
            profesor: "Prof. Marcos Vega",
            horario: "Martes 3°/4° · Jueves 1°/2°",
            aula: "Laboratorio 1",
            temario: [
              "Sistemas de numeración y códigos",
              "Álgebra de Boole y compuertas lógicas",
              "Circuitos combinacionales",
              "Circuitos secuenciales básicos",
            ],
            planificacion: "Planificacion-SistemasDigitales-4to.pdf",
          },
          {
            nombre: "Inglés Técnico",
            profesor: "Prof. Carla Nieves",
            horario: "Lunes 5°/6°",
            aula: "Aula 8",
            temario: [
              "Lectura de manuales técnicos",
              "Vocabulario de hardware y software",
              "Redacción de documentación breve",
            ],
            planificacion: null,
          },
        ],
      },
      {
        anio: "6° año",
        materias: [
          {
            nombre: "Redes",
            profesor: "Prof. Diana Suárez",
            horario: "Jueves 1°/2° · Viernes 3°/4°",
            aula: "Laboratorio 2",
            temario: [
              "Modelo OSI y TCP/IP",
              "Direccionamiento IPv4 e IPv6",
              "Ruteo estático y dinámico",
              "Seguridad perimetral básica",
            ],
            planificacion: "Planificacion-Redes-6to.pdf",
          },
        ],
      },
      {
        anio: "7° año",
        materias: [
          {
            nombre: "Organización y Métodos",
            profesor: "Prof. Hugo Barreto",
            horario: "Viernes 5°/6°",
            aula: "Aula 5",
            temario: [
              "Estructuras organizacionales",
              "Relevamiento y diagramación de procesos",
              "Manuales de procedimiento",
              "Indicadores de gestión",
            ],
            planificacion: "Planificacion-OyM-7mo.pdf",
          },
        ],
      },
    ],
  },
  {
    orientacion: "Programación",
    anios: [
      {
        anio: "5° año",
        materias: [
          {
            nombre: "Base de Datos",
            profesor: "Prof. Ramírez",
            horario: "Miércoles 3°/4°",
            aula: "Aula 12",
            temario: [
              "Modelo entidad-relación",
              "Normalización hasta 3FN",
              "SQL: consultas y subconsultas",
              "Transacciones e integridad",
            ],
            planificacion: "Planificacion-BaseDeDatos-5to.pdf",
          },
          {
            nombre: "Análisis Matemático",
            profesor: "Prof. Silvia Roldán",
            horario: "Lunes 1°/2° · Miércoles 5°/6°",
            aula: "Aula 12",
            temario: [
              "Funciones y límites",
              "Derivadas y aplicaciones",
              "Integrales definidas",
            ],
            planificacion: null,
          },
        ],
      },
      {
        anio: "7° año",
        materias: [
          {
            nombre: "Desarrollo de Software",
            profesor: "Prof. Nadia Quiroga",
            horario: "Martes 5°/6° · Jueves 3°/4°",
            aula: "Laboratorio 1",
            temario: [
              "Ciclo de vida del software",
              "Control de versiones",
              "Pruebas automatizadas",
              "Despliegue y mantenimiento",
            ],
            planificacion: "Planificacion-DesarrolloSW-7mo.pdf",
          },
        ],
      },
    ],
  },
];

/* ---------- Server / pañol de materiales ---------- */
export const inventarioInicial = [
  {
    id: "i1",
    item: "Notebooks Intel",
    categoria: "Equipos",
    cantidad: 24,
    disponibles: 18,
    ubicacion: "Server · Estante A",
  },
  {
    id: "i2",
    item: "Proyectores",
    categoria: "Equipos",
    cantidad: 6,
    disponibles: 4,
    ubicacion: "Server · Estante B",
  },
  {
    id: "i3",
    item: "Televisores",
    categoria: "Equipos",
    cantidad: 4,
    disponibles: 3,
    ubicacion: "Server · Pared",
  },
  {
    id: "i4",
    item: "Cargadores de notebook",
    categoria: "Accesorios",
    cantidad: 31,
    disponibles: 27,
    ubicacion: "Server · Caja 1",
  },
  {
    id: "i5",
    item: "Cables HDMI",
    categoria: "Accesorios",
    cantidad: 15,
    disponibles: 12,
    ubicacion: "Server · Caja 2",
  },
  {
    id: "i6",
    item: "Zapatillas eléctricas",
    categoria: "Accesorios",
    cantidad: 9,
    disponibles: 9,
    ubicacion: "Server · Caja 3",
  },
];

export const reservasIniciales = [
  {
    id: "r1",
    item: "Proyectores",
    cantidad: 1,
    curso: "6° 1",
    solicitante: "Prof. Diana Suárez",
    desde: "10:00",
    hasta: "12:00",
    estado: "Pendiente",
  },
  {
    id: "r2",
    item: "Notebooks Intel",
    cantidad: 12,
    curso: "4° 1",
    solicitante: "Prof. Marcos Vega",
    desde: "08:00",
    hasta: "09:40",
    estado: "Aceptada",
  },
  {
    id: "r3",
    item: "Televisores",
    cantidad: 1,
    curso: "3° 2",
    solicitante: "Prof. Elena Paz",
    desde: "13:00",
    hasta: "14:30",
    estado: "Pendiente",
  },
];

export const mensajesServer = [
  {
    id: "m1",
    autor: "Encargada de Server",
    rol: "server",
    texto:
      "Llegó una donación de 8 cargadores. Ya los sumé al inventario, quedan 31.",
    hora: "09:12",
  },
  {
    id: "m2",
    autor: "Vicedirección",
    rol: "directivo",
    texto: "Perfecto. ¿Alcanzan para el taller de 4° del jueves?",
    hora: "09:20",
  },
  {
    id: "m3",
    autor: "Encargada de Server",
    rol: "server",
    texto: "Sí, reservo 12 notebooks con sus cargadores para ese día.",
    hora: "09:24",
  },
];

/* ---------- Dirección: permisos y previsualización ---------- */
export const rolesPermisos = [
  {
    rol: "Secretaría",
    permisos: {
      server: false,
      publicar: false,
    },
  },
  {
    rol: "Preceptores",
    permisos: {
      server: false,
      publicar: false,
    },
  },
  {
    rol: "Docentes",
    permisos: {
      server: false,
      publicar: false,
    },
  },
  {
    rol: "Jefatura de Área",
    permisos: {
      server: false,
      publicar: false,
    },
  },
  {
    rol: "Encargada de Server",
    permisos: {
      server: true,
      publicar: false,
    },
  },
];

export const etiquetasPermisos = [
  ["server", "Server"],
  ["publicar", "Publicar"],
];

/* Borradores esperando el visto de dirección. `ruta` es la página donde
   se van a ver, para poder previsualizarlos tal cual quedan publicados. */
export const publicacionesPendientes = [
  {
    id: "pub1",
    titulo: "Inscripción 2027 — apertura de vacantes",
    seccion: "Novedades",
    ruta: "/novedades",
    categoria: "Institucional",
    autor: "Secretaría",
    fecha: "2026-09-08",
    imagen: imagenCicloBasico,
    resumen:
      "Se abre la inscripción a 1° año del ciclo lectivo 2027 del 15 al 30 de septiembre.",
    cuerpo: [
      "La inscripción se realiza en secretaría, de lunes a viernes de 8 a 12 y de 14 a 17. Se toman las solicitudes por orden de presentación de la documentación completa.",
      "Las familias que ya tengan hermanos en la escuela deben avisarlo al momento de inscribir para que se registre en el legajo.",
    ],
  },
  {
    id: "pub2",
    titulo: "Nuevo cronograma de intensificación",
    seccion: "Intensificación/Previas",
    ruta: "/previas",
    categoria: "Académico",
    autor: "Jefatura de Área",
    fecha: "2026-09-07",
    imagen: imagenInformatica,
    resumen:
      "Actualización de las mesas de diciembre para las materias de Ciclo Superior.",
    cuerpo: [
      "Las mesas de Base de Datos y Análisis Matemático cambian de aula: pasan al Laboratorio 1. El resto del cronograma se mantiene igual.",
      "Recordá presentarte 15 minutos antes con el DNI y el plan de trabajo resuelto.",
    ],
  },
  {
    id: "pub3",
    titulo: "Muestra anual de proyectos",
    seccion: "Novedades",
    ruta: "/novedades",
    categoria: "Proyectos",
    autor: "Vicedirección",
    fecha: "2026-09-05",
    imagen: imagenProgramacion,
    resumen:
      "Los 7° años presentan sus prácticas profesionalizantes el 14 de noviembre.",
    cuerpo: [
      "La muestra se hace en el SUM de 18 a 21. Cada equipo expone su proyecto con la documentación técnica y una demostración en vivo.",
      "Están invitadas las familias, los alumnos de ciclo básico y las escuelas primarias de la zona.",
    ],
  },
];
