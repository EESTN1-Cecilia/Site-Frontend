import { useEffect, useState } from "react";
import { campos, conId, esObjeto, esTexto, guardarLocal, leerLocal } from "./almacen.js";
import { enviar } from "./conexion.js";
import { guardarProyectosEnServidor } from "./services/api.js";
import cicloBasicoImage from "./assets/images/ciclo-basico-taller.jpg";
import informaticaImage from "./assets/images/informatica-robotica.jpg";
import programacionImage from "./assets/images/programacion-proyectos.jpg";

/* Una entrada por área. La clave es la ruta: #/proyectos/<clave> */
export const areas = {
  "ciclo-basico": {
    titulo: "Ciclo Básico",
    chip: "1° A 3° AÑO",
    imagen: cicloBasicoImage,
    resumen:
      "Los primeros tres años son de taller: se aprende midiendo, cortando, soldando y armando. Acá se ve qué se hace en cada año y con qué herramientas, para que sepas a qué venís antes de elegir orientación.",
    herramientas: [
      [
        "1° año",
        "Taller y medición",
        [
          "Uso seguro de herramientas manuales",
          "Medición: calibre, escuadra, metro",
          "Dibujo técnico a mano alzada",
          "Introducción a la computadora y ofimática",
        ],
      ],
      [
        "2° año",
        "Materiales y circuitos",
        [
          "Electricidad básica: circuitos serie y paralelo",
          "Soldadura de estaño",
          "Trabajo en madera y metal",
          "Scratch y lógica de programación por bloques",
        ],
      ],
      [
        "3° año",
        "Primeros proyectos",
        [
          "Diseño asistido: plano y despiece",
          "Automatismos simples",
          "Introducción a Arduino",
          "Trabajo en equipo y registro del proceso",
        ],
      ],
    ],
    proyectos: [
      {
        id: "banco-taller",
        titulo: "Banqueta y estructura metálica",
        anio: "3° año",
        equipo: null,
        resumen:
          "Construcción completa de una banqueta con estructura de hierro y asiento tapizado, más una parrilla soldada. Se trabaja el plano, el corte, la soldadura y la terminación.",
        stack: ["Soldadura", "Corte de metal", "Dibujo técnico", "Tapizado"],
        aprendizajes: [
          "Leer un plano y pasarlo a una lista de materiales",
          "Medir y cortar con tolerancia",
          "Cuidados de seguridad en el taller",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "ajedrez",
        titulo: "Tablero de ajedrez en madera",
        anio: "2° año",
        equipo: null,
        resumen:
          "Tablero armado a partir de listones encolados y cortados en escuadra. Ejercicio clásico de precisión: si la medida falla un milímetro, no cierra.",
        stack: ["Carpintería", "Encolado", "Lijado y terminación"],
        aprendizajes: [
          "Precisión en el corte",
          "Preparación de superficies",
          "Paciencia con el proceso",
        ],
        repo: null,
        docs: [],
      },
    ],
  },

  informatica: {
    titulo: "Técnico en Informática",
    chip: "4° A 7° AÑO",
    imagen: informaticaImage,
    resumen:
      "La orientación mira el equipo por dentro: hardware, redes, sistemas digitales y automatización. Mucho laboratorio, mucho fierro y mucho Arduino.",
    herramientas: [
      [
        "4° año",
        "Fundamentos",
        [
          "Sistemas digitales: lógica y compuertas",
          "Armado y diagnóstico de PC",
          "Linux: consola y permisos",
          "Inglés técnico",
        ],
      ],
      [
        "5° año",
        "Redes y control",
        [
          "Cableado estructurado",
          "TCP/IP y direccionamiento",
          "Arduino y sensores",
          "Bases de datos: SQL",
        ],
      ],
      [
        "6° y 7° año",
        "Integración",
        [
          "Ruteo y configuración de equipos",
          "Automatización y robótica",
          "Servidores y servicios",
          "Prácticas profesionalizantes",
        ],
      ],
    ],
    proyectos: [
      {
        id: "brazo-robotico",
        titulo: "Brazo robótico con servos",
        anio: "6° año",
        equipo: null,
        resumen:
          "Brazo articulado impreso y montado sobre base giratoria, controlado por servomotores desde una placa Arduino. Se controla por potenciómetros y por secuencias grabadas.",
        stack: ["Arduino", "C/C++", "Servomotores", "Impresión 3D"],
        aprendizajes: [
          "Control de servos y consumo de corriente",
          "Prueba y error sobre el prototipo físico",
          "Documentar el esquema de conexión",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "sensor-distancia",
        titulo: "Estación de sensado con display LCD",
        anio: "5° año",
        equipo: null,
        resumen:
          "Sensor ultrasónico HC-SR04 midiendo distancia y mostrando el valor en un LCD 16x2, con alarma sonora por umbral.",
        stack: ["Arduino", "HC-SR04", "LCD 16x2", "Protoboard"],
        aprendizajes: [
          "Leer una hoja de datos",
          "Convertir señal en unidades reales",
          "Ordenar el cableado para poder depurarlo",
        ],
        repo: null,
        docs: [],
      },
    ],
  },

  programacion: {
    titulo: "Técnico en Programación",
    chip: "4° A 7° AÑO",
    imagen: programacionImage,
    resumen:
      "Se aprende a construir software de punta a punta: frontend, backend, base de datos y control de versiones. Los últimos años se trabaja en equipo sobre un sistema real, con documentación y entregas.",
    herramientas: [
      [
        "4° año",
        "Bases",
        [
          "Lógica y algoritmos",
          "Python",
          "HTML, CSS y JavaScript",
          "Git y GitHub",
        ],
      ],
      [
        "5° año",
        "Datos y estructura",
        [
          "Modelo entidad-relación y normalización",
          "SQL: MySQL / PostgreSQL",
          "Programación orientada a objetos",
          "APIs REST",
        ],
      ],
      [
        "6° y 7° año",
        "Sistemas completos",
        [
          "React + Vite",
          "Django y Django REST Framework",
          "Autenticación y roles",
          "Documentación técnica y prácticas profesionalizantes",
        ],
      ],
    ],
    proyectos: [
      {
        id: "urban-fade",
        titulo: "Urban Fade",
        anio: "Prácticas profesionalizantes",
        equipo: [
          "Maite Vázquez",
          "Santiago Alvarez",
          "Joaquín Villalva",
          "Nayla",
          "Alex Nahuel",
        ],
        resumen:
          "Sistema web de gestión integral para una barbería: usuarios y roles, catálogo de productos, servicios, turnos y pedidos. Suma autenticación tradicional y reconocimiento facial para el ingreso de los barberos.",
        stack: [
          "React 18",
          "Vite",
          "JavaScript",
          "CSS",
          "Python",
          "Django 4.2",
          "Django REST Framework",
          "MySQL",
          "OpenCV",
          "NumPy",
          "Pillow",
          "Gunicorn",
        ],
        aprendizajes: [
          "Separar frontend y backend, y comunicarlos por una API REST",
          "Modelar roles y permisos: administrador, barbero y cliente",
          "Trabajar con datos biométricos y por qué hay que cuidarlos",
          "Repartir el trabajo en equipo con Git y ramas",
          "Entregar el proyecto con informe técnico, no sólo con código",
        ],
        repo: "https://github.com/MaiteVazquez8/Urban-Fade",
        docs: [
          {
            nombre: "Informe Urban Fade",
            archivo: "/docs/informe-urban-fade.pdf",
            paginas: 68,
            peso: "1,8 MB",
          },
          {
            nombre: "Informe analítico sobre biometría y autenticación segura",
            archivo: "/docs/informe-biometria-autenticacion-segura.pdf",
            paginas: 20,
            peso: "1,0 MB",
          },
        ],
      },
    ],
  },
};

/* ---------------------------------------------------------------
   Store de proyectos: lo que carga jefatura de área se guarda acá y
   lo lee la página pública. Sólo guardamos los proyectos; el resto
   del área (imagen, herramientas) queda en el código.
   Cuando exista la API, estas cuatro funciones pasan a ser fetch.
---------------------------------------------------------------- */
const CLAVE = "tec1-proyectos";

const semilla = () =>
  Object.fromEntries(
    Object.entries(areas).map(([clave, area]) => [clave, area.proyectos]),
  );

const textos = (valor) => (Array.isArray(valor) ? valor.filter(esTexto) : []);

const sanearProyecto = (p) => ({
  ...p,
  ...campos(p, ["titulo", "anio", "resumen"]),
  equipo: Array.isArray(p.equipo) ? textos(p.equipo) : null,
  stack: textos(p.stack),
  aprendizajes: textos(p.aprendizajes),
  repo: esTexto(p.repo) ? p.repo : null,
  docs: Array.isArray(p.docs)
    ? p.docs.filter(esObjeto).map((doc) => ({ ...doc, ...campos(doc, ["nombre", "archivo", "peso"]) }))
    : [],
});

/* Sólo las orientaciones que existen, con listas de proyectos bien formados. */
const sanear = (datos) =>
  esObjeto(datos)
    ? Object.fromEntries(
        Object.entries(datos)
          .filter(([clave, lista]) => Object.hasOwn(areas, clave) && Array.isArray(lista))
          .map(([clave, lista]) => [clave, conId(lista).map(sanearProyecto)]),
      )
    : {};

let porArea = { ...semilla(), ...sanear(leerLocal(CLAVE)) };
const oyentes = new Set();

const persistir = () => {
  guardarLocal(CLAVE, porArea);
  oyentes.forEach((fn) => fn(porArea));
};

export const nuevoId = () => `p-${Date.now().toString(36)}`;

/* Lo que llega del servidor al abrir el sitio. Sólo pisa las orientaciones que
   gestión ya editó; las demás quedan con los proyectos que trae el sitio (no
   con la copia de este navegador, que pudo dejar otra persona). */
export const hidratarProyectos = (deServidor) => {
  porArea = { ...semilla(), ...sanear(deServidor) };
  persistir();
};

/* El backend guarda una orientación entera, así que se le manda la lista
   completa del área que se tocó. */
const sincronizarArea = (area) =>
  enviar((token) => guardarProyectosEnServidor(token, area, porArea[area] || []));

export const guardarProyecto = (area, proyecto) => {
  const lista = porArea[area] || [];
  const existe = lista.some((item) => item.id === proyecto.id);

  porArea = {
    ...porArea,
    [area]: existe
      ? lista.map((item) => (item.id === proyecto.id ? proyecto : item))
      : [...lista, proyecto],
  };
  persistir();

  return sincronizarArea(area);
};

export const borrarProyecto = (area, id) => {
  porArea = { ...porArea, [area]: (porArea[area] || []).filter((p) => p.id !== id) };
  persistir();

  return sincronizarArea(area);
};

/* Vuelve a los proyectos originales en el sitio: se guardan en el servidor
   las tres orientaciones (antes quedaba sólo en este navegador y el próximo
   cambio mandaba la lista original entera). */
export const restaurarProyectos = () => {
  porArea = semilla();
  persistir();

  return Promise.all(Object.keys(areas).map(sincronizarArea));
};

/* Devuelve las áreas con los proyectos cargados desde el panel. */
export function useAreas() {
  const [lista, setLista] = useState(porArea);

  useEffect(() => {
    oyentes.add(setLista);
    return () => oyentes.delete(setLista);
  }, []);

  return Object.fromEntries(
    Object.entries(areas).map(([clave, area]) => [
      clave,
      { ...area, proyectos: lista[clave] || [] },
    ]),
  );
}

/* Preguntas que repiten los que recién entran. */
export const preguntas = [
  [
    "¿Necesito saber programar antes de entrar?",
    "No. En el ciclo básico se arranca de cero y en 4° se empieza formal con lógica y programación.",
  ],
  [
    "¿Hace falta tener computadora propia?",
    "No es obligatorio: la escuela tiene notebooks y laboratorios. Se puede reservar equipo por hora.",
  ],
  [
    "¿En qué se diferencian Informática y Programación?",
    "Informática trabaja más hardware, redes y automatización. Programación va más a software, bases de datos y desarrollo web.",
  ],
  [
    "¿Cómo publico mi proyecto acá?",
    "Se presenta por la jefatura de área con el repositorio, el informe y el listado del equipo.",
  ],
];
