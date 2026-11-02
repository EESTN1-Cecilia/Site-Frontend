import { useEffect, useState } from "react";
import { campos, conId, guardarLocal, leerLocal, texto } from "./almacen.js";
import { enviar } from "./conexion.js";
import {
  borrarPublicacionEnServidor,
  cambiarEstadoPublicacion,
  guardarPublicacionEnServidor,
} from "./services/api.js";
import { publicacionesPendientes } from "./panelData.js";
import imagenCicloBasico from "./assets/images/ciclo-basico-taller.jpg";
import imagenInformatica from "./assets/images/informatica-robotica.jpg";
import imagenProgramacion from "./assets/images/programacion-proyectos.jpg";
import portadaInstitucional from "./assets/images/portada-institucional.webp";

/* Imágenes ya cargadas en el sitio, para elegir sin subir nada. */
export const biblioteca = [
  ["Taller de ciclo básico", imagenCicloBasico],
  ["Laboratorio de informática", imagenInformatica],
  ["Proyectos de programación", imagenProgramacion],
];

export const nuevoBloque = (tipo) => ({
  id: `b-${Math.random().toString(36).slice(2, 9)}`,
  tipo,
  texto:
    tipo === "titulo"
      ? "Título de la sección"
      : tipo === "destacado"
        ? "Dato importante que conviene resaltar."
        : tipo === "link"
          ? "Ir al formulario"
          : "Escribí acá el texto.",
  url: tipo === "imagen" ? imagenCicloBasico : tipo === "link" ? "" : undefined,
  epigrafe: tipo === "imagen" ? "" : undefined,
});

/* Estados: "pendiente" (espera el visto de Dirección), "publicada" (se ve en
   el sitio) y "devuelta" (Dirección pidió cambios). */

/* Notas que ya estaban publicadas en Novedades. */
const publicadas = [
  [
    "n1",
    "Institucional",
    "2026-09-08",
    "Inscripción 2027: apertura de vacantes para 1° año",
    "Del 15 al 30 de septiembre se reciben las solicitudes de ingreso al ciclo básico. Cupos por orden de presentación de la documentación completa.",
    portadaInstitucional,
  ],
  [
    "n2",
    "Académico",
    "2026-09-05",
    "Cronograma de mesas de intensificación de diciembre",
    "Ya está publicado el cronograma con materia, día, hora y aula para el ciclo básico y el superior.",
    imagenInformatica,
  ],
  [
    "n3",
    "Proyectos",
    "2026-08-29",
    "Muestra anual de prácticas profesionalizantes",
    "Los 7° años de Informática y Programación presentan sus proyectos finales el 14 de noviembre en el SUM.",
    imagenProgramacion,
  ],
  [
    "n4",
    "Proyectos",
    "2026-08-18",
    "El taller de robótica sumó equipamiento nuevo",
    "Gracias a una donación de material, el laboratorio incorporó kits de sensores y placas para los proyectos de 5° y 6°.",
    imagenInformatica,
  ],
  [
    "n5",
    "Comunidad",
    "2026-08-04",
    "Jornada de puertas abiertas para familias",
    "Recorrido por talleres y laboratorios, charla sobre las dos orientaciones técnicas y espacio de consultas.",
    imagenCicloBasico,
  ],
  [
    "n6",
    "Académico",
    "2026-07-21",
    "Nuevo régimen de evaluación por saberes",
    "Explicamos cómo se leen las valoraciones TEA, TEP y TED en el boletín y qué implica cada una.",
    imagenProgramacion,
  ],
].map(([id, categoria, fecha, titulo, resumen, imagen]) => ({
  id,
  titulo,
  seccion: "Novedades",
  ruta: "/novedades",
  categoria,
  autor: "Secretaría",
  fecha,
  estado: "publicada",
  bloques: [
    { id: `${id}-i`, tipo: "imagen", url: imagen, epigrafe: "" },
    { id: `${id}-r`, tipo: "parrafo", texto: resumen },
  ],
}));

/* Notas adaptadas de la prensa local (El Diario Sur). Texto reescrito para el
   sitio; las fotos se muestran desde la nota original, con su crédito, y cada
   nota lleva el enlace a la fuente. */
const CDN =
  "https://cdn.jorgeochipinti.online/tenants/019dfe37-2133-7e6c-9876-cb3f018a1a75/sites/019dfe37-2270-71c3-958b-771bb2f45e1c/media/";
const FOTO = "Foto: El Diario Sur";
/* Un bloque con id terminado en "-soloNota" se ve dentro de la nota abierta y no en la tarjeta. */

const deLaPrensa = [
  {
    id: "n7",
    titulo: "Avanzan las obras de mejora en la Escuela Técnica N°1",
    categoria: "Institucional",
    fecha: "2025-11-20",
    bloques: [
      { tipo: "imagen", url: `${CDN}01a0fbad-928f-7005-983d-b6bb8e70f65c/hero.webp?v=mvycp6yc`, epigrafe: `Recorrida de las autoridades por la escuela. ${FOTO}` },
      { tipo: "parrafo", texto: "El intendente Fernando Gray visitó la Escuela Técnica N°1 de Monte Grande para ver cómo avanzan las obras de mejora del edificio, parte del plan del Municipio para ir renovando las escuelas del distrito." },
      { tipo: "parrafo", texto: "Lo acompañaron la vicedirectora del turno tarde, la presidenta del Consejo Escolar y el subsecretario de Obras Públicas." },
      { tipo: "titulo", texto: "Qué se está haciendo" },
      { tipo: "parrafo", texto: "El trabajo principal es la renovación de los baños: artefactos nuevos, instalación sanitaria y eléctrica, una nueva conexión a la red cloacal, revestimientos en paredes y pisos e iluminación LED." },
      { tipo: "imagen", url: `${CDN}01a0fbad-9191-755d-8f19-52904dcec1d0/hero.webp?v=mvycp831`, epigrafe: `Trabajos en marcha en la Escuela Técnica N°1. ${FOTO}` },
      { tipo: "parrafo", texto: "También se cambió el piso de las aulas y, en el salón de actos, se está pintando el interior y reparando las filtraciones." },
      { tipo: "imagen", url: `${CDN}01a0fbad-91c7-78d2-a340-6be6fb52e442/hero.webp?v=mvycp7ve`, epigrafe: FOTO },
      { id: "n7-soloNota", tipo: "link", texto: "Leer la nota original en El Diario Sur", url: "https://www.eldiariosur.com/esteban-echeverria/2025/11/20/esteban-echeverria-avanzan-las-obras-en-la-escuela-tecnica-n1-76072.html" },
    ],
  },
  {
    id: "n8",
    titulo: "La Expo Técnica volvió a abrir las puertas y mostró la innovación de los estudiantes",
    categoria: "Comunidad",
    fecha: "2025-11-14",
    bloques: [
      { tipo: "imagen", url: `${CDN}01a0fbad-0161-76e5-a8c3-889fe4d4b76b/hero.webp`, epigrafe: `Estudiantes en un taller de impresión 3D. ${FOTO}` },
      { tipo: "parrafo", texto: "La Escuela Técnica N°1 volvió a abrir sus puertas con la Expo Técnica, una muestra anual con trabajos de todos los cursos, de 1° a 7° año, realizados en los talleres de la escuela." },
      { tipo: "parrafo", texto: "Entre lo más visto estuvo VESCA, el proyecto de un equipo de 7° año: un vehículo autónomo, eléctrico y solar pensado para asistir a personas con movilidad limitada o con poca experiencia para manejar." },
      { tipo: "imagen", url: `${CDN}01a0fbad-014a-7062-a26b-b459f53ef36f/hero.webp`, epigrafe: `La Expo Técnica reunió a la comunidad educativa. ${FOTO}` },
      { tipo: "parrafo", texto: "También llamó la atención la muestra de impresión 3D en el laboratorio de electrónica, donde los estudiantes mostraron cómo trabajan con esta tecnología." },
      { tipo: "titulo", texto: "Un nombre para la escuela" },
      { tipo: "destacado", texto: "La comunidad educativa eligió que la escuela lleve el nombre de Cecilia Berdichevsky, pionera de la computación. La propuesta espera la aprobación oficial." },
      { tipo: "imagen", url: `${CDN}01a0fbad-015a-7204-8775-344856790647/hero.webp`, epigrafe: FOTO },
      { id: "n8-soloNota", tipo: "link", texto: "Leer la nota original en El Diario Sur", url: "https://www.eldiariosur.com/esteban-echeverria/2025/11/14/la-expo-de-la-tecnica-de-monte-grande-volvio-abrir-las-puertas-mostro-la-innovacion-de-los-estudiantes-75923.html" },
    ],
  },
  {
    id: "n9",
    titulo: "Expo Técnica 2024: robots, seguridad e inventos de los estudiantes",
    categoria: "Proyectos",
    fecha: "2024-11-15",
    bloques: [
      { tipo: "imagen", url: `${CDN}01a0fb94-13d4-759e-ae1f-b63740e39540/original.png?v=muqnswze`, epigrafe: `Expo Técnica 2024 en la Escuela Técnica N°1. ${FOTO}` },
      { tipo: "parrafo", texto: "La Escuela Técnica N°1 de Monte Grande presentó la Expo Técnica 2024, la muestra anual en la que los estudiantes mostraron a familias y vecinos los proyectos que desarrollaron durante el año: robots, dispositivos pensados para la industria e inventos para la vida cotidiana." },
      { tipo: "titulo", texto: "Proyectos destacados" },
      { tipo: "parrafo", texto: "Ailén Huanca y Gabriela Villalba armaron un autito controlado por Wi-Fi que sirve como sistema de seguridad para el hogar: tiene una cámara para mirar la casa a distancia y se maneja de forma remota. La idea nació pensando en el abuelo de una amiga, que vivía solo y no se sentía seguro." },
      { tipo: "parrafo", texto: "Joaquín Valenzuela, Iván Yucra y Agustín Moreira diseñaron el Sistema de Seguridad y Alerta Vehicular (SSAV), que se puede instalar en cualquier vehículo. Si detecta un choque, envía mensajes de texto a la policía, la ambulancia, los bomberos y a un número que elige el dueño, para ubicar más rápido a los ocupantes." },
      { tipo: "imagen", url: `${CDN}01a0fb94-12aa-7202-8532-8572bc414575/original.png?v=muqnsxlo`, epigrafe: `El Sistema de Seguridad y Alerta Vehicular (SSAV). ${FOTO}` },
      { tipo: "parrafo", texto: "Un equipo de 5° año, con Gustavo Estévez y Martín Clemente, construyó una pinza mecánica que se mueve en tres ejes y, con servomotores, ejerce unos 25 kilos de presión. Sus creadores la imaginan en líneas de montaje de fábricas." },
      { tipo: "imagen", url: `${CDN}01a0fb94-136c-76a1-bbb3-bc38020a5368/original.png?v=muqnsxpk`, epigrafe: `Otro de los proyectos de 5° año. ${FOTO}` },
      { tipo: "parrafo", texto: "Estudiantes de 4° año presentaron a Robi y Fobi, dos robots en los que trabajan desde el año anterior. Robi avanza y gira al azar cuando encuentra un obstáculo, y los dos se controlan desde una aplicación para celular que los mueve, reproduce música y dibuja en sus pantallas. El mismo grupo también explicó cómo funcionan distintos tipos de energía." },
      { tipo: "imagen", url: `${CDN}01a0fb94-139b-7468-ba2e-205f030b9e79/original.png?v=muqnsxs3`, epigrafe: `Los robots Robi y Fobi, creados por estudiantes de 4° año. ${FOTO}` },
      { id: "n9-soloNota", tipo: "link", texto: "Leer la nota original en El Diario Sur", url: "https://www.eldiariosur.com/esteban-echeverria/2024/11/15/alumnos-de-la-escuela-tecnica-n1-de-monte-grande-presentaron-novedosos-proyectos-en-su-muestra-anual-69318.html" },
    ],
  },
  {
    id: "n10",
    titulo: "Expotécnica 2023: los proyectos de los alumnos, a la vista de la comunidad",
    categoria: "Proyectos",
    fecha: "2023-11-15",
    bloques: [
      { tipo: "imagen", url: `${CDN}01a0fb80-7e09-7783-9ac6-528bd0e96fc4/original.jpg?v=muqn1egm`, epigrafe: `Expotécnica 2023 en la Escuela Técnica N°1. ${FOTO}` },
      { tipo: "parrafo", texto: "El miércoles 15 de noviembre de 2023, la Escuela Técnica N°1 de Monte Grande realizó su Expotécnica, una muestra abierta a la comunidad que fue de las 9:30 a las 15 horas en Güemes 2051, con los trabajos que los estudiantes hicieron durante el año." },
      { tipo: "parrafo", texto: "El director, Cristian De la Torre, contó que la escuela abrió sus puertas a familias y vecinos para mostrar tanto trabajos terminados como otros en proceso, y destacó el esfuerzo de los alumnos y el compromiso de los docentes." },
      { tipo: "titulo", texto: "Lo que se vio" },
      { tipo: "parrafo", texto: "La muestra incluyó sobre todo proyectos tecnológicos del ciclo superior, en hardware, software y programación, además de actividades artísticas. El ciclo básico presentó trabajos de herrería, carpintería y electricidad, con automatismos simples como portones automáticos." },
      { tipo: "parrafo", texto: "Alumnos de 6° año mostraron Re Trash, un proyecto para separar automáticamente residuos reciclables de los que no lo son, con motores e inteligencia artificial. Ignacio Tengman y José Antonio Torres desarrollaron una aplicación para pagar el transporte público con código QR: el colectivero carga la línea, la base y el saldo, y el pasajero escanea el código desde su celular." },
      { tipo: "imagen", url: `${CDN}01a0fb80-7c72-7cac-a0d4-9210e2ce82de/original.jpg?v=muqn1f9v`, epigrafe: `Re Trash, el proyecto para separar residuos. ${FOTO}` },
      { tipo: "parrafo", texto: "En la entrada se exhibió un vehículo adaptado por Ronald Rivas y Juan Brítez para funcionar con paneles solares: el panel recarga la batería mientras está al sol, la carga completa lleva unas siete horas y la autonomía es de entre 40 y 50 kilómetros." },
      { tipo: "imagen", url: `${CDN}01a0fb80-7cd4-7061-96d1-90469fd4bbe6/original.jpg?v=muqn1feh`, epigrafe: `Vehículo adaptado para funcionar con paneles solares. ${FOTO}` },
      { id: "n10-soloNota", tipo: "link", texto: "Leer la nota original en El Diario Sur", url: "https://www.eldiariosur.com/esteban-echeverria/2023/11/15/la-escuela-tecnica-n1-de-monte-grande-realiza-su-muestra-anual-los-proyectos-de-los-alumnos-63904.html" },
    ],
  },
  {
    id: "n11",
    titulo: "Se inauguraron cuatro aulas nuevas y baños ampliados en la Escuela Técnica N°1",
    categoria: "Institucional",
    fecha: "2023-07-13",
    bloques: [
      { tipo: "imagen", url: `${CDN}01a0fb79-90f6-7350-af68-387d741e8a0a/original.jpg?v=muqmro88`, epigrafe: `Inauguración de obras en la Escuela Técnica N°1. ${FOTO}` },
      { tipo: "parrafo", texto: "El intendente Fernando Gray inauguró cuatro aulas nuevas y baños ampliados en la Escuela Técnica N°1 de Monte Grande Sur, una escuela a la que asisten 750 estudiantes. Participaron de la jornada la comunidad educativa y el director, Cristian de la Torre." },
      { tipo: "titulo", texto: "Cómo son las aulas" },
      { tipo: "parrafo", texto: "Son dos aulas en planta baja y dos en el primer piso. Cada una mide 49 metros cuadrados, tiene lugar para 30 estudiantes y está completamente equipada: mobiliario, aire acondicionado frío-calor e iluminación LED." },
      { tipo: "imagen", url: `${CDN}01a0fb79-8fd2-7ccc-b607-603b6ab05dfc/original.jpg?v=muqmrogc`, epigrafe: FOTO },
      { tipo: "parrafo", texto: "Gray dijo estar contento de seguir entregando obras en las escuelas del distrito para que los estudiantes tengan mejores instalaciones, y recordó que el Municipio ya había construido un aula taller en la escuela, a la que ahora se suman estas cuatro." },
      { tipo: "imagen", url: `${CDN}01a0fb79-8fff-7bdb-89e9-24b3555cac1a/original.jpg?v=muqmro1g`, epigrafe: FOTO },
      { id: "n11-soloNota", tipo: "link", texto: "Leer la nota original en El Diario Sur", url: "https://www.eldiariosur.com/esteban-echeverria/2023/7/13/esteban-echeverria-inauguraron-obras-en-la-escuela-tecnica-n1-61884.html" },
    ],
  },
].map((nota) => ({
  ...nota,
  seccion: "Novedades",
  ruta: "/novedades",
  autor: "Secretaría",
  estado: "publicada",
  bloques: nota.bloques.map((b, i) => ({ id: `${nota.id}-b${i}`, ...b })),
}));

/* Borradores del relevamiento esperando el visto de Dirección. */
const pendientes = () =>
  publicacionesPendientes.map((pub) => ({
    id: pub.id,
    titulo: pub.titulo,
    seccion: pub.seccion,
    ruta: pub.ruta,
    categoria: pub.categoria,
    autor: pub.autor,
    fecha: pub.fecha,
    estado: "pendiente",
    bloques: [
      { id: `${pub.id}-i`, tipo: "imagen", url: pub.imagen, epigrafe: "" },
      { id: `${pub.id}-r`, tipo: "parrafo", texto: pub.resumen },
      ...pub.cuerpo.map((texto, i) => ({
        id: `${pub.id}-p${i}`,
        tipo: "parrafo",
        texto,
      })),
    ],
  }));

const semilla = () => [...pendientes(), ...publicadas, ...deLaPrensa];

const CLAVE = "tec1-publicaciones";

/* Una lista guardada antes de que existiera el estado sólo tenía borradores:
   se marcan como pendientes y se suman las notas ya publicadas. */
const completar = (guardada) => {
  if (guardada.some((pub) => "estado" in pub)) return guardada;

  const ids = new Set(guardada.map((pub) => pub.id));
  return [
    ...guardada.map((pub) => ({ ...pub, estado: "pendiente" })),
    ...[...publicadas, ...deLaPrensa].filter((pub) => !ids.has(pub.id)),
  ];
};

const CAMPOS = ["titulo", "seccion", "ruta", "categoria", "autor", "fecha", "estado"];

/* Cada nota con sus campos de texto y bloques bien formados; sin la forma
   esperada valen las notas originales. */
const sanear = (datos) =>
  Array.isArray(datos)
    ? conId(datos).map((pub) => ({
        ...pub,
        ...campos(pub, CAMPOS),
        bloques: conId(pub.bloques).map((b) => ({
          id: b.id,
          tipo: texto(b.tipo, "parrafo"),
          ...campos(b, ["texto", "url", "epigrafe"]),
        })),
      }))
    : semilla();

/* Las notas de la prensa se ponen una sola vez (y de nuevo si se corrige su
   texto: sube el número de versión) en la lista que ya guardó este navegador;
   si después se borran, no vuelven. */
const CLAVE_PRENSA = "tec1-publicaciones-prensa-3";

const conNotasDeLaPrensa = (guardada) => {
  if (leerLocal(CLAVE_PRENSA)) return guardada;
  guardarLocal(CLAVE_PRENSA, true);
  const nuevas = new Set(deLaPrensa.map((pub) => pub.id));
  /* La nota de inscripción pasa a llevar la portada bordó con el logo. */
  const conPortada = guardada.map((pub) =>
    pub.id === "n1"
      ? {
          ...pub,
          bloques: (pub.bloques || []).map((b) =>
            b.tipo === "imagen" && b.url === imagenCicloBasico ? { ...b, url: portadaInstitucional } : b,
          ),
        }
      : pub,
  );
  return [...conPortada.filter((pub) => !nuevas.has(pub.id)), ...deLaPrensa];
};

const leer = () => {
  const guardada = leerLocal(CLAVE);
  return Array.isArray(guardada) ? sanear(conNotasDeLaPrensa(completar(guardada))) : semilla();
};

let lista = leer();
const oyentes = new Set();

const persistir = () => {
  guardarLocal(CLAVE, lista);
  oyentes.forEach((fn) => fn(lista));
};

/* Lo que llega del servidor al abrir el sitio. null = todavía no se cargó
   ninguna nota, así que valen las que trae el sitio (no la copia de este
   navegador, que pudo dejar otra persona). */
export const hidratarPublicaciones = (deServidor) => {
  lista = sanear(deServidor);
  persistir();
};

export const guardarPublicacion = async (pub) => {
  lista = lista.map((item) => (item.id === pub.id ? pub : item));
  persistir();

  const respuesta = await enviar((token) => guardarPublicacionEnServidor(token, pub));

  /* El servidor decide el estado: lo que carga secretaría o jefatura queda
     esperando el visto de dirección, aunque acá se viera como publicada. */
  if (respuesta.ok && respuesta.datos?.publicacion) {
    lista = lista.map((item) => (item.id === pub.id ? respuesta.datos.publicacion : item));
    persistir();
  }

  return respuesta;
};

export const quitarPublicacion = (id) => {
  lista = lista.filter((item) => item.id !== id);
  persistir();

  return enviar((token) => borrarPublicacionEnServidor(token, id));
};

const cambiarEstado = (id, estado, accion) => {
  lista = lista.map((pub) => (pub.id === id ? { ...pub, estado } : pub));
  persistir();

  return enviar((token) => cambiarEstadoPublicacion(token, id, accion));
};

export const aprobarPublicacion = (id) => cambiarEstado(id, "publicada", "aprobar");
export const devolverPublicacion = (id) => cambiarEstado(id, "devuelta", "devolver");

export const nuevaPublicacion = () => {
  const pub = {
    id: `pub-${Date.now().toString(36)}`,
    titulo: "Nueva publicación",
    seccion: "Novedades",
    ruta: "/novedades",
    categoria: "Institucional",
    autor: "Sin asignar",
    fecha: new Date().toISOString().slice(0, 10),
    estado: "pendiente",
    bloques: [nuevoBloque("imagen"), nuevoBloque("parrafo")],
  };

  lista = [pub, ...lista];
  persistir();
  return pub;
};

export function usePublicaciones() {
  const [actual, setActual] = useState(lista);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
