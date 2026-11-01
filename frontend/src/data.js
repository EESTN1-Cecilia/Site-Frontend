import cicloBasicoImage from "./assets/images/propuesta-ciclo-basico.webp";
import informaticaImage from "./assets/images/propuesta-informatica.webp";
import programacionImage from "./assets/images/propuesta-programacion.webp";

export const imageBase = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/";
export const logo = `${imageBase}logoTec-joLAT0Y1wGN9vfVIUw2ZyQQuMMXJ85.png`;
export const facade = `${imageBase}WhatsApp%20Image%202026-08-27%20at%2009.31.16-Ec5wqdiOimAhhvgtR3QyTtI9VHyKbc.jpeg`;
export const proposalImages = [cicloBasicoImage, informaticaImage, programacionImage];
export const courses = [
  {
    title: "Ciclo Básico",
    eyebrow: "1° a 3° año",
    /* De 1° a 3° el plan de trabajo es el mismo para todas las divisiones:
       una sola entrada por año en vez de una por división. */
    items: [
      ["1° año", null],
      ["2° año", null],
      ["3° año", null],
    ],
  },
  {
    title: "Técnico en Informática",
    eyebrow: "4° a 7° año",
    items: [
      /* 4° año es común a Informática y Programación: una sola entrada. */
      ["4° año", null],
      [
        "5° 1",
        "https://drive.google.com/open?id=19xM0WlPkiSBTMm0-aAtTwKArlbdz9Yyt",
      ],
      [
        "5° 2",
        "https://drive.google.com/open?id=1sgE2rix3CCsaNoMpokvwfPtFNnk_SXvU",
      ],
      [
        "6° 1",
        "https://drive.google.com/open?id=1dPe691AoCD2rTFQZjfEli3R9BNF2R2Gn",
      ],
      [
        "7° 1",
        "https://drive.google.com/open?id=1fwjh5gBpanj5XYKu_XEnrUVaBNwq-mrW",
      ],
    ],
  },
  {
    title: "Técnico en Programación",
    eyebrow: "4° a 7° año",
    items: [
      /* 4° año es común a Informática y Programación: una sola entrada. */
      ["4° año", null],
      [
        "5° 3",
        "https://drive.google.com/open?id=1q7G4lYawhuHzVK8xBpy0LKTT7aR_B17Y",
      ],
      [
        "5° 4",
        "https://drive.google.com/drive/u/0/folders/1o2H_yQysfTQ_GN6cohCtdBsVUz6PykPk",
      ],
      ["6° 2", null],
      [
        "6° 3",
        "https://drive.google.com/open?id=1cz_ElIXBju2IUpCLYaIqUO_JAj7q3Meo",
      ],
      ["6° 4", null],
      [
        "7° 2",
        "https://drive.google.com/open?id=1sKJ_3ubg7zur3zL7BDSLJqc4E251q5pH",
      ],
    ],
  },
];

export const navItems = [
  ["/", "Inicio", "ph:house"],
  ["/evaluacion", "Evaluación de saberes", "ph:clipboard-text"],
  ["/previas", "Intensificación/Previas", "ph:arrows-clockwise"],
  ["/novedades", "Novedades", "ph:megaphone"],
  ["/panel", "Gestión", "ph:squares-four"],
];
export const facts = [
  [
    "ph:wrench",
    "Aprendizaje práctico",
    "Proyectos que conectan teoría y realidad.",
    "rose",
  ],
  [
    "ph:users-three",
    "Comunidad educativa",
    "Una escuela abierta, inclusiva y participativa.",
    "gray",
  ],
  [
    "ph:rocket-launch",
    "Mirada hacia el futuro",
    "Tecnología, creatividad y compromiso.",
    "white",
  ],
];
export const points = [
  ["Conocimiento", "Aprender para comprender."],
  ["Práctica", "Aprender haciendo."],
  ["Innovación", "Imaginar nuevas soluciones."],
  ["Comunidad", "Construir juntos."],
];
/* Redes que se pueden poner en el pie de página: clave -> [nombre, ícono].
   Cuáles se muestran y con qué link lo decide Dirección (ajustes.redes). */
export const redesSociales = {
  instagram: ["Instagram", "ph:instagram-logo"],
  facebook: ["Facebook", "ph:facebook-logo"],
  youtube: ["YouTube", "ph:youtube-logo"],
  tiktok: ["TikTok", "ph:tiktok-logo"],
  x: ["X (Twitter)", "ph:x-logo"],
  linkedin: ["LinkedIn", "ph:linkedin-logo"],
  whatsapp: ["WhatsApp", "ph:whatsapp-logo"],
  web: ["Otro sitio", "ph:globe"],
};
export const proposals = [
  [
    "Ciclo Básico",
    "Primeros pasos para aprender haciendo, experimentar y descubrir nuevas herramientas.",
    proposalImages[0],
  ],
  [
    "Informática",
    "Ideas, dispositivos y soluciones digitales para comprender y transformar el mundo.",
    proposalImages[1],
  ],
  [
    "Programación",
    "Diseñar, programar y desarrollar soluciones para crear el futuro.",
    proposalImages[2],
  ],
];
