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
      "La orientación mira el equipo por dentro: hardware, redes, sistemas digitales y automatización. Mucho laboratorio, mucho fierro, mucho Arduino y Raspberry Pi.",
    herramientas: [
      [
        "4° año",
        "Fundamentos",
        [
          "Programación en QBasic: algoritmos, if/else y bucles",
          "Electrónica: Ley de Ohm, diodos y transistores",
          "Hardware: arquitectura de PC y microcontroladores",
          "Sistemas operativos: comandos y diagnóstico",
          "Aplicaciones: planillas, bases de datos y ABM simple",
        ],
      ],
      [
        "5° año",
        "Redes y control",
        [
          "Sistemas digitales: lógica combinacional y códigos",
          "Teleinformática: transmisión, medios y codificación",
          "Redes y servidores: TCP/IP y Linux cliente-servidor",
          "Programación en QBasic: subrutinas, arreglos y ordenamiento",
          "Control de actuadores: edificios inteligentes y riego",
        ],
      ],
      [
        "6° y 7° año",
        "Integración",
        [
          "Circuitos secuenciales: flip-flops, contadores y memorias",
          "Estructuras de datos, archivos y scripting en shell",
          "Ruteo, TCP/UDP y administración de redes",
          "Web: HTML, CSS, JavaScript, PHP y MySQL",
          "Bases de datos, seguridad y proyecto de sistemas",
        ],
      ],
    ],
    proyectos: [
      {
        id: "semaforo-arduino",
        titulo: "Semáforo inteligente con Arduino",
        anio: "4° año",
        equipo: null,
        resumen:
          "Cruce con dos semáforos y pulsador peatonal armado en protoboard y controlado por una placa Arduino UNO. Primer proyecto que une programación estructurada y electrónica básica.",
        stack: ["Arduino UNO", "QBasic", "LED y resistencias", "Pulsador", "Protoboard"],
        aprendizajes: [
          "Laboratorio de Programación: estructuras if/else y bucles aplicados a un problema real",
          "Tecnologías Electrónicas: calcular la resistencia de cada LED con la Ley de Ohm",
          "Laboratorio de Hardware: qué es un microcontrolador y cómo se programa",
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
      {
        id: "riego-automatico",
        titulo: "Riego automático con sensor de humedad",
        anio: "5° año",
        equipo: null,
        resumen:
          "Sistema de riego para la huerta de la escuela: un sensor mide la humedad del suelo y una placa Arduino activa una bomba mediante un relé cuando hace falta. Muestra el estado en un display y registra los riegos.",
        stack: ["Arduino", "Sensor de humedad de suelo", "Módulo relé", "Bomba de agua", "Reloj RTC"],
        aprendizajes: [
          "Laboratorio de Aplicaciones: software de control para manejo de actuadores (sistemas de riego)",
          "Tecnologías Electrónicas: el transistor y el relé como llaves de conmutación",
          "Calibrar un sensor analógico y definir umbrales de funcionamiento",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "conversor-binario",
        titulo: "Conversor binario a display de 7 segmentos",
        anio: "5° año",
        equipo: null,
        resumen:
          "Circuito con compuertas lógicas y decodificador que convierte un número binario de 4 bits en un dígito visible. Se verifica el resultado con una placa Arduino que genera las entradas y compara las salidas.",
        stack: ["Compuertas lógicas", "Decodificador 7447", "Display de 7 segmentos", "Arduino", "Simulador de circuitos"],
        aprendizajes: [
          "Sistemas Digitales: sistemas de numeración, funciones lógicas y conversores de código",
          "Simplificar una función lógica y llevarla a un circuito real",
          "Probar un circuito con una tabla de verdad automática",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "servidor-raspberry",
        titulo: "Servidor de red con Raspberry Pi",
        anio: "5° año",
        equipo: null,
        resumen:
          "Una Raspberry Pi hace de servidor del laboratorio: entrega direcciones por DHCP, resuelve nombres con DNS, comparte archivos y guarda copias de seguridad automáticas. Se arma sobre una red local con cableado UTP.",
        stack: ["Raspberry Pi 4", "Linux", "DHCP y DNS", "Samba", "rsync", "Cable UTP"],
        aprendizajes: [
          "Laboratorio de Sistemas Operativos: modelo cliente-servidor y copias de seguridad",
          "Teleinformática: medios de transmisión y armado de cables UTP",
          "Laboratorio de Hardware: direccionamiento IP y análisis de tráfico",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "brazo-robotico",
        titulo: "Brazo robótico con servos",
        anio: "6° año",
        equipo: null,
        resumen:
          "Brazo articulado impreso y montado sobre base giratoria, controlado por servomotores desde una placa Arduino. Se controla por potenciómetros y por secuencias grabadas.",
        stack: ["Arduino", "QBasic", "Servomotores", "Impresión 3D"],
        aprendizajes: [
          "Control de servos y consumo de corriente",
          "Prueba y error sobre el prototipo físico",
          "Documentar el esquema de conexión",
          "Laboratorio de Programación: estructuras de datos para guardar las secuencias de movimiento",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "estacion-meteorologica",
        titulo: "Estación meteorológica con panel web",
        anio: "6° año",
        equipo: null,
        resumen:
          "Una placa ESP32 o Arduino mide temperatura, humedad y presión y envía los datos por WiFi a una Raspberry Pi, que los guarda en una base de datos y los muestra en una página web con gráficos.",
        stack: ["ESP32 / Arduino", "DHT22 y BMP280", "Raspberry Pi", "Apache", "PHP y MySQL", "HTML, CSS y JavaScript", "Scripts de shell"],
        aprendizajes: [
          "Laboratorio de Aplicaciones: HTML, CSS, JavaScript y PHP con MySQL",
          "Laboratorio de Hardware: protocolos TCP/UDP y envío de datos por la red",
          "Laboratorio de Sistemas Operativos: automatizar tareas con scripts de shell",
        ],
        repo: null,
        docs: [],
      },
      {
        id: "control-acceso-rfid",
        titulo: "Control de acceso con tarjetas RFID",
        anio: "7° año",
        equipo: null,
        resumen:
          "Cerradura que se abre con una tarjeta RFID: un lector conectado a Arduino o ESP32 consulta a un servidor Raspberry Pi, que valida el usuario en una base de datos y registra cada ingreso. Incluye un panel para altas, bajas y consulta de registros.",
        stack: ["Arduino / ESP32", "Lector RFID RC522", "Cerradura eléctrica con relé", "Raspberry Pi", "MySQL", "Python o PHP"],
        aprendizajes: [
          "Proyecto, Diseño e Implementación de Sistemas: del relevamiento a la puesta en marcha",
          "Bases de Datos: modelo entidad-relación, consultas SQL y permisos",
          "Seguridad Informática: autenticación, registro de accesos y copias de seguridad",
          "Modelos y Sistemas: diagrama de flujo de datos del sistema completo",
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

/* Los proyectos de Informática se renovaron según los contenidos del diseño
   curricular. Una sola vez se reemplazan los de ejemplo viejos que pudo dejar
   guardados este navegador, sin tocar los que cargó gestión. */
const CLAVE_INFORMATICA = "tec1-proyectos-informatica-3";
if (!leerLocal(CLAVE_INFORMATICA)) {
  guardarLocal(CLAVE_INFORMATICA, true);
  const nuevos = semilla().informatica;
  const propios = (porArea.informatica || []).filter(
    (p) => !["brazo-robotico", "sensor-distancia"].includes(p.id) && !nuevos.some((n) => n.id === p.id),
  );
  porArea = { ...porArea, informatica: [...nuevos, ...propios] };
  guardarLocal(CLAVE, porArea);
}
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
