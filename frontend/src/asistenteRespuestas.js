/* Respuestas del asistente de Técnica 1.
   Cada tema tiene palabras que lo activan (sin tildes, en minúscula; las
   frases de varias palabras también valen). Para agregar una respuesta nueva
   alcanza con sumar un tema a la lista `temas`.

   Campos de un tema:
   - id, titulo, respuesta (texto; "\n" = salto de línea)
   - palabras: lo que la persona puede escribir
   - ruta + accion: botón que lleva a otra página del sitio
   - enlaces: [{ href, etiqueta }] botones a links externos o mailto
   - texto: id de un texto editable del sitio (si Dirección lo cambia, se actualiza acá)
   - peso: 2 para temas muy específicos (ganan sobre los generales) */

import { pasosInscripcion, pasosPrevias, periodos, requisitos, valoraciones } from "./contenido.js";

export const CORREO = "eest1estebanecheverria@abc.gob.ar";
export const DIRECCION = "Güemes 2051, Esteban Echeverría, Provincia de Buenos Aires";
const MAPA = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Güemes 2051, Esteban Echeverría, Buenos Aires, Argentina",
)}`;

const enlaceCorreo = { href: `mailto:${CORREO}`, etiqueta: "Escribir un correo" };

export const temas = [
  /* ---------- Contacto y ubicación ---------- */
  {
    id: "contacto",
    titulo: "Contacto",
    respuesta: `Podés escribirle a la escuela por correo electrónico a ${CORREO}. Te van a responder lo antes posible.`,
    enlaces: [enlaceCorreo],
    palabras: [
      "mail", "email", "e mail", "correo", "casilla", "contacto", "contactar", "contactarme", "contactarse",
      "comunicarme", "comunicarse", "comunicacion", "escribir", "escribirle", "escribirles", "consultar",
      "consulta a la escuela", "secretaria", "direccion de correo", "mandar un mensaje",
    ],
    peso: 2,
  },
  {
    id: "telefono",
    titulo: "Teléfono",
    respuesta: `La escuela no tiene número de teléfono, pero igual podemos ayudarte: escribinos a ${CORREO} o acercate a visitarnos en Güemes 2051.`,
    enlaces: [enlaceCorreo],
    palabras: [
      "telefono", "tel", "celular", "whatsapp", "wsp", "llamar", "llamo", "llamada", "llamarlos",
      "numero de telefono", "numero de la escuela", "linea", "fijo", "interno", "mensaje de texto",
    ],
    peso: 3,
  },
  {
    id: "direccion",
    titulo: "Dónde queda la escuela",
    respuesta: `Nos encontrás en ${DIRECCION}. Con el botón de abajo te muestro cómo llegar.`,
    enlaces: [{ href: MAPA, etiqueta: "Cómo llegar" }],
    palabras: [
      "direccion", "donde queda", "donde esta", "donde estan", "ubicacion", "ubicada", "ubicado", "llegar",
      "como llego", "mapa", "calle", "domicilio", "localidad", "partido", "barrio", "gemes", "guemes",
      "esteban echeverria", "monte grande", "colectivo", "tren", "como ir",
    ],
    peso: 2,
  },
  {
    id: "turnos",
    titulo: "Turnos y contraturnos",
    respuesta:
      "Tenemos dos turnos: Turno Mañana y Turno Tarde. En ambos, los Talleres se cursan en contraturno, así que además de las clases del turno, los estudiantes vuelven a la escuela para las prácticas de taller. Si querés saber cuál te toca o los horarios exactos, escribinos a eest1estebanecheverria@abc.gob.ar y se lo informaremos.",
    palabras: [
      "turno", "turnos", "turno manana", "turno tarde", "que turnos", "cuantos turnos", "cuales turnos",
      "contraturno", "contra turno", "contraturnos", "contra turnos", "taller contraturno", "talleres contraturno",
      "manana o tarde", "turno de la manana", "turno de la tarde", "hay turno",
    ],
    peso: 3,
  },
  {
    id: "horario",
    titulo: "Horario del colegio",
    respuesta: "Estamos abiertos de lunes a viernes, de 07:10 a 18:40.",
    palabras: [
      "horario", "horarios", "hora abre", "hora cierra", "hora de entrada", "hora de salida", "a que hora",
      "hasta que hora", "desde que hora", "abre", "cierra", "abren", "cierran", "entrada", "salida",
      "dias de atencion", "atienden", "atencion", "doble turno", "jornada",
    ],
    peso: 2,
  },
  {
    id: "redes",
    titulo: "Redes sociales",
    respuesta:
      "Los links a las redes de la escuela (Instagram, Facebook y YouTube) aparecen al final de la página cuando están cargados. Y para enterarte de todo, también podés pasar por Novedades.",
    ruta: "/novedades",
    accion: "Ver novedades",
    palabras: ["redes", "red social", "redes sociales", "instagram", "insta", "facebook", "youtube", "tiktok", "twitter", "seguirlos", "seguir"],
  },

  /* ---------- La escuela y las carreras ---------- */
  {
    id: "escuela",
    titulo: "Sobre la escuela",
    respuesta:
      "Técnica 1 Cecilia Berdichevsky es una escuela de educación técnica pública de Esteban Echeverría. Acompañamos a cada estudiante para que desarrolle su curiosidad, su pensamiento crítico y las herramientas para construir su futuro, combinando conocimiento, práctica y trabajo en equipo. Nuestro nombre homenajea a Cecilia Berdichevsky, pionera de la computación en la Argentina.",
    ruta: "/",
    accion: "Ir al inicio",
    palabras: [
      "tecnica 1", "tecnica uno", "institucion", "quienes son", "quienes somos",
      "sobre ustedes", "presentacion", "historia", "berdichevsky", "cecilia", "nombre de la escuela", "de que se trata",
      "publica", "estatal", "gratis", "gratuita",
    ],
  },
  {
    id: "carreras",
    titulo: "Carreras y orientaciones",
    respuesta:
      "Primero se cursa el Ciclo Básico (1° a 3° año) y después hay dos orientaciones técnicas, de 4° a 7° año:\n• Técnico en Informática Personal y Profesional\n• Técnico en Programación\nAl terminar se obtiene el título de técnico. Si querés, te cuento qué hace cada uno.",
    ruta: "/",
    accion: "Ver propuestas",
    palabras: [
      "carrera", "carreras", "orientacion", "orientaciones", "especialidad", "especialidades", "que se estudia",
      "que estudian", "que puedo estudiar", "que ofrecen", "oferta", "oferta educativa", "propuesta", "propuestas",
      "modalidad", "plan de estudios", "plan de estudio", "materias", "que materias", "que enseñan", "que ensenan",
      "cursos", "curso", "tecnicaturas", "tecnicatura",
    ],
    peso: 2,
  },
  {
    id: "ciclo-basico",
    titulo: "Ciclo Básico (1° a 3° año)",
    respuesta:
      "El Ciclo Básico es el comienzo del camino: abarca de 1° a 3° año y desde 1° ya se hace taller (electricidad, madera, metal y dibujo técnico). En la portada, sección «Nuestras propuestas», encontrás el material de cada división.",
    ruta: "/",
    accion: "Ver cursos",
    palabras: [
      "ciclo basico", "basico", "primer ano", "segundo ano", "tercer ano", "primero", "segundo", "tercero",
      "1ro", "2do", "3ro", "1 ano", "2 ano", "3 ano", "1°", "2°", "3°", "primer ciclo", "ingreso a primero",
    ],
  },
  {
    id: "informatica",
    titulo: "Técnico en Informática Personal y Profesional",
    respuesta:
      "Informática se cursa de 4° a 7° año y otorga el título de técnico. Podés ver los cursos y sus materiales en la portada, sección «Nuestras propuestas». Si querés saber qué hace un Técnico en Informática Personal y Profesional o qué materias tiene, preguntame.",
    ruta: "/",
    accion: "Ver cursos",
    palabras: [
      "informatica", "tecnico en informatica", "hardware", "computadoras", "pc", "soporte", "base de datos",
      "bases de datos", "sistemas", "ciclo superior informatica",
    ],
    peso: 2,
  },
  {
    id: "programacion",
    titulo: "Técnico en Programación",
    respuesta:
      "Programación se cursa de 4° a 7° año y otorga el título de técnico. Incluye laboratorios de programación, diseño web y bases de datos, entre otras materias. Los cursos y sus materiales están en la portada, sección «Nuestras propuestas». Si querés saber qué hace un técnico en programación o qué materias tiene, preguntame.",
    ruta: "/",
    accion: "Ver cursos",
    palabras: [
      "programacion", "tecnico en programacion", "programar", "programador", "programadores", "desarrollo", "desarrollo de software",
      "software", "web", "diseno web", "paginas web", "aplicaciones", "apps", "codigo", "codear", "lenguajes",
    ],
    peso: 2,
  },
  {
    id: "titulo",
    titulo: "Título y salida laboral",
    respuesta:
      "Al terminar 7° año se recibe el título de técnico, una base muy sólida para seguir estudiando o empezar a trabajar. Además, en 7° se hacen prácticas profesionalizantes para dar el primer paso en el mundo laboral.",
    palabras: [
      "titulo", "titulos", "egreso", "egresar", "egresado", "egresados", "recibirse", "recibo", "salida laboral",
      "trabajo", "trabajar", "futuro", "despues de la escuela", "universidad", "terciario", "seguir estudiando",
      "que titulo", "tecnico", "valido",
    ],
  },
  {
    id: "duracion",
    titulo: "Duración de la carrera",
    respuesta:
      "La escuela técnica dura 7 años: 3 de Ciclo Básico (1° a 3°) y 4 de orientación técnica (4° a 7°).",
    palabras: [
      "cuantos anos", "duracion", "cuanto dura", "siete anos", "7 anos", "anos de cursada", "cuantos anos dura",
      "cuando termino", "cuando egreso",
    ],
    peso: 2,
  },
  {
    id: "taller",
    titulo: "Taller y práctica",
    respuesta:
      "Desde 1° año se aprende haciendo: electricidad, madera, metal y dibujo técnico. Los proyectos reales se muestran en la muestra anual y en 7° año se hacen prácticas profesionalizantes. En las materias técnicas se valora tanto el proceso como el producto de cada proyecto.",
    palabras: [
      "taller", "talleres", "electricidad", "madera", "metal", "dibujo tecnico", "carpinteria", "herreria",
      "practica", "practicas", "laboratorio", "laboratorios", "proyectos", "proyecto", "muestra", "muestra anual",
      "expo", "feria", "aprender haciendo",
    ],
  },
  {
    id: "practicas",
    titulo: "Prácticas profesionalizantes",
    respuesta:
      "En 7° año se realizan prácticas profesionalizantes, una experiencia que acerca a los estudiantes al mundo del trabajo y les permite poner en práctica todo lo aprendido.",
    palabras: ["practicas profesionalizantes", "profesionalizantes", "pasantia", "pasantias", "practicas laborales", "practicas en empresas"],
    peso: 3,
  },
  {
    id: "comunidad",
    titulo: "Equipo de orientación y preceptores",
    respuesta:
      "En Técnica 1 nadie camina solo/a: hay un equipo de orientación que acompaña cada trayectoria y preceptores que siguen a cada curso durante todo el año. También hay jornadas abiertas para conocer la escuela con las familias.",
    palabras: [
      "equipo de orientacion", "orientacion escolar", "gabinete", "preceptor", "preceptora", "preceptoria", "acompanamiento",
      "acompanar", "psicopedagoga", "psicologa", "inclusion", "inclusiva", "integracion", "dificultades",
      "apoyo", "directivos", "director", "directora", "vicedirector", "vicedirectora", "docentes", "profesores", "profes",
    ],
  },
  {
    id: "jornadas",
    titulo: "Conocer la escuela",
    respuesta:
      "La escuela organiza jornadas abiertas para que las familias la conozcan. Las fechas se publican en Novedades; si querés más información, escribinos a " +
      CORREO +
      ".",
    ruta: "/novedades",
    accion: "Ver novedades",
    enlaces: [enlaceCorreo],
    palabras: ["jornada abierta", "jornadas abiertas", "visitar", "visita", "conocer la escuela", "puertas abiertas", "recorrido", "conocerla", "abierta a la comunidad"],
    peso: 2,
  },

  /* ---------- Inscripción ---------- */
  {
    id: "reserva",
    titulo: "Reserva de vacante para hermanos",
    ruta: "/inscripcion",
    texto: "inscripcion.reserva.descripcion",
    palabras: [
      "inscripcion", "inscribir", "inscribirme", "inscribo", "inscripciones", "anotar", "anotarme", "anoto", "vacante", "vacantes",
      "reserva", "hermano", "hermana", "hermanos", "hermanas", "matricula", "matricular", "formulario", "2027",
      "ciclo lectivo 2027", "quiero anotar", "cupo", "cupos", "ingresar a la escuela", "entrar a la escuela",
      "nuevo ingreso", "ingreso 2027",
    ],
    peso: 2,
  },
  {
    id: "requisitos",
    titulo: "Documentación para inscribirse",
    respuesta: `Se pide:\n${requisitos.map(([, titulo, detalle]) => `• ${titulo}: ${detalle}`).join("\n")}\nCualquier duda, escribinos y te ayudamos.`,
    ruta: "/inscripcion",
    accion: "Ver inscripción",
    palabras: [
      "documentacion", "documentos", "requisitos", "papeles", "que necesito", "que hay que llevar", "que llevar", "que presentar",
      "certificado", "ficha de salud", "ficha medica", "fotos", "dni para inscribir", "constancia", "legajo",
    ],
    peso: 2,
  },
  {
    id: "pasos-inscripcion",
    titulo: "Cómo es el proceso de inscripción",
    respuesta: `El procedimiento es el siguiente:\n${pasosInscripcion.map(([titulo, detalle], i) => `${i + 1}. ${titulo}: ${detalle}`).join("\n")}`,
    ruta: "/inscripcion",
    accion: "Ver inscripción",
    palabras: ["como me inscribo", "como inscribir", "como es la inscripcion", "pasos de inscripcion", "proceso de inscripcion", "como anotar", "como anoto", "paso a paso inscripcion"],
    peso: 3,
  },

  /* ---------- Evaluación, boletín y previas ---------- */
  {
    id: "boletin",
    titulo: "Notas y boletín",
    respuesta: "Para ver tus notas o tu boletín, ingresá con tus credenciales en el sitio de Técnica 1.",
    ruta: "/login",
    accion: "Ingresar con mis credenciales",
    palabras: ["nota", "notas", "boletin", "boletines", "calificacion", "calificaciones", "libreta", "como voy", "mis notas", "ver mis notas"],
    peso: 2,
  },
  {
    id: "credenciales",
    titulo: "Usuario y contraseña",
    respuesta:
      "Para ingresar necesitás tus credenciales (usuario y contraseña). No te preocupes si no las tenés, las olvidaste o no podés entrar: escribinos a " +
      CORREO +
      " o acercate a la escuela y lo resolvemos juntos.",
    ruta: "/login",
    accion: "Ir a ingresar",
    enlaces: [enlaceCorreo],
    palabras: [
      "usuario", "contrasena", "clave", "password", "olvide", "olvidé", "credenciales", "login", "iniciar sesion", "cuenta",
      "no puedo ingresar", "no puedo entrar", "no me deja entrar", "recuperar", "blanquear", "sesion",
    ],
    peso: 2,
  },
  {
    id: "evaluacion",
    titulo: "Evaluación de saberes",
    ruta: "/evaluacion",
    texto: "evaluacion.hero.texto",
    palabras: ["evaluacion", "evaluaciones", "saberes", "material", "materiales", "regimen academico", "cuadernillo", "cuadernillos", "como evaluan", "como se evalua", "examen", "examenes", "pruebas"],
  },
  {
    id: "valoraciones",
    titulo: "TEA, TEP y TED",
    respuesta: valoraciones.map(([sigla, nombre, detalle]) => `• ${sigla} (${nombre}): ${detalle}`).join("\n"),
    ruta: "/evaluacion",
    accion: "Ver evaluación",
    palabras: ["tea", "tep", "ted", "valoracion", "valoraciones", "trayectoria", "trayectorias", "que significa tea", "que es tep", "que es ted", "informe pedagogico", "como se lee el boletin"],
    peso: 3,
  },
  {
    id: "periodos",
    titulo: "Períodos del ciclo lectivo",
    respuesta: periodos.map(([nombre, cuando, detalle]) => `• ${nombre} (${cuando}): ${detalle}`).join("\n"),
    ruta: "/evaluacion",
    accion: "Ver evaluación",
    palabras: ["periodo", "periodos", "trimestre", "trimestres", "cuatrimestre", "cuatrimestres", "cierre", "primer periodo", "segundo periodo", "cuando termina el ano", "cuando cierra el periodo"],
    peso: 2,
  },
  {
    id: "criterios",
    titulo: "Cómo se evalúa",
    respuesta:
      "Acá se evalúan saberes y no solo promedios: se mira todo el recorrido del año y cada instancia tiene una devolución que te indica cómo seguir. En las materias técnicas se valora el proceso y el producto del proyecto.",
    ruta: "/evaluacion",
    accion: "Ver evaluación",
    palabras: ["promedio", "promedios", "criterios", "devolucion", "devoluciones", "que se evalua", "como califican", "como puntuan", "aprobar", "aprobacion", "acreditar", "acreditacion de saberes"],
  },
  {
    id: "previas",
    titulo: "Intensificación y previas",
    ruta: "/previas",
    texto: "previas.hero.texto",
    palabras: [
      "previa", "previas", "intensificacion", "intensificar", "mesa", "mesas", "materias pendientes", "pendientes", "pendiente",
      "plan de trabajo", "planes de trabajo", "cronograma", "acreditacion", "mesas de examen", "diciembre", "febrero", "adeudo",
      "debo materias", "me llevo materias", "llevo materias", "ted",
    ],
  },
  {
    id: "pasos-previas",
    titulo: "Pasos para acreditar una previa",
    respuesta: `Los pasos son:\n${pasosPrevias.map(([titulo, detalle], i) => `${i + 1}. ${titulo}: ${detalle}`).join("\n")}`,
    ruta: "/previas",
    accion: "Ver cronograma de mesas",
    palabras: ["como acredito", "como rindo", "como rendir", "como se rinde", "pasos previas", "que hago con mis previas", "como saco las previas", "rendir previas", "rendir una previa"],
    peso: 3,
  },
  {
    id: "dni-mesa",
    titulo: "Qué llevar a la mesa",
    respuesta:
      "Llevá tu DNI y el plan de trabajo resuelto (sin documento no se puede rendir). Presentate 15 minutos antes del horario de la mesa; día, hora y aula están en el cronograma.",
    ruta: "/previas",
    accion: "Ver cronograma",
    palabras: ["que llevo a la mesa", "que llevar a la mesa", "llevar dni", "dni mesa", "dni para rendir", "con que voy a rendir", "15 minutos", "llegar a la mesa", "que llevo a rendir"],
    peso: 3,
  },
  {
    id: "aula-mesa",
    titulo: "Día, hora y aula de una mesa",
    respuesta:
      "En el cronograma de mesas podés buscar tu materia o filtrar por año y orientación para ver fecha, hora y aula. Cada materia tiene además un botón «Abrir Trabajo» que te lleva a su carpeta con el plan de trabajo.",
    ruta: "/previas",
    accion: "Ver cronograma",
    palabras: ["que dia rindo", "cuando rindo", "fecha de mesa", "aula", "hora de la mesa", "donde rindo", "abrir trabajo", "carpeta de la materia", "drive", "trabajo de la materia", "buscar mi materia"],
    peso: 2,
  },

  /* ---------- Novedades, materiales y programas ---------- */
  {
    id: "novedades",
    titulo: "Novedades",
    ruta: "/novedades",
    texto: "novedades.hero.texto",
    palabras: ["novedad", "novedades", "aviso", "avisos", "noticias", "noticia", "calendario", "eventos", "evento", "comunicados", "comunicado", "que pasa", "que hay de nuevo", "agenda", "actividades", "actos", "acto"],
  },
  {
    id: "materiales",
    titulo: "Planes de trabajo por curso",
    respuesta:
      "Es muy fácil: en la portada, sección «Nuestras propuestas», elegís Ciclo Básico, Informática o Programación y encontrás el material de cada división (1° 1, 1° 2, etc.).",
    ruta: "/",
    accion: "Ir a las propuestas",
    palabras: ["division", "divisiones", "mi curso", "material de mi curso", "carpeta de mi curso", "apuntes", "guias", "tarea", "tareas", "trabajos practicos", "tp", "descargar material", "carpetas"],
  },
  {
    id: "programas",
    titulo: "Programas hechos por alumnos",
    respuesta:
      "En la portada, sección «Hecho en la Tec», hay programas creados por estudiantes:\n• DiagramTec: plataforma para crear, editar y compartir diagramas de flujo de datos.\n• Volta: aplicación web para armar y probar circuitos de forma digital (en desarrollo).\n• ServerDesk: aplicación de la sala server para prestar y devolver netbooks y CPU (en desarrollo).",
    enlaces: [
      { href: "https://diagramtec.qd.je/", etiqueta: "Abrir DiagramTec" },
      { href: "https://tecnica1estebanecheverria2020-dev.github.io/Volta/", etiqueta: "Abrir Volta" },
    ],
    palabras: ["programa", "programas", "hecho en la tec", "diagramtec", "diagram tec", "serverdesk", "server desk", "volta", "aplicacion web", "proyectos de alumnos", "lo que hacen los alumnos", "diagramas", "circuitos", "simulador"],
    peso: 2,
  },
  {
    id: "identidad",
    titulo: "Identidad de la escuela",
    respuesta:
      "Creemos en la educación técnica como herramienta de transformación: aprender es experimentar, resolver problemas, trabajar con otros y animarse a crear. Nuestros ejes son Conocimiento, Práctica, Innovación y Comunidad.",
    palabras: ["identidad", "valores", "mision", "vision", "proyecto institucional", "filosofia", "que los caracteriza", "ejes", "innovacion", "comunidad"],
  },

  /* ---------- Preguntas frecuentes: Técnico en Programación e Informática ---------- */
  {
    id: "faq-que-hace-programador",
    titulo: "¿Qué hace un técnico en programación?",
    respuesta:
      "Un técnico en programación crea, prueba y mantiene programas y aplicaciones: páginas y sistemas web, apps, bases de datos y herramientas que resuelven problemas reales. Trabaja con lógica, creatividad y mucho trabajo en equipo, y puede desempeñarse en empresas de software, comercios, industrias, organismos públicos o de manera independiente (freelance). Es una profesión con mucha demanda.",
    palabras: [
      "que hace un tecnico en programacion", "que hace un programador", "de que trabaja un programador", "para que sirve programacion",
      "en que trabaja un tecnico en programacion", "perfil del tecnico en programacion", "perfil programacion", "alcances del titulo programacion",
      "que se aprende en programacion", "que aprendo en programacion", "campo laboral programacion", "donde trabaja un programador",
    ],
    peso: 4,
  },
  {
    id: "faq-que-hace-informatico",
    titulo: "¿Qué hace un Técnico en Informática Personal y Profesional?",
    respuesta:
      "Un Técnico en Informática Personal y Profesional asiste a las personas y a las organizaciones en el uso de productos y servicios informáticos: instala y configura equipos y programas, arma y mantiene redes, da soporte técnico, resuelve problemas de hardware y software, cuida la seguridad de la información y capacita a los usuarios. Puede trabajar en empresas, escuelas, organismos públicos, servicios técnicos o por cuenta propia.",
    palabras: [
      "que hace un tecnico en informatica", "que hace un informatico", "de que trabaja un tecnico en informatica", "en que trabaja un tecnico en informatica",
      "informatica personal y profesional", "informatica profesional y personal", "perfil del tecnico en informatica", "perfil informatica",
      "alcances del titulo informatica", "que se aprende en informatica", "que aprendo en informatica", "campo laboral informatica",
      "soporte tecnico", "arreglar computadoras", "reparar computadoras", "donde trabaja un tecnico en informatica",
    ],
    peso: 4,
  },
  {
    id: "faq-diferencia",
    titulo: "Informática o Programación: ¿en qué se diferencian?",
    respuesta:
      "Las dos son orientaciones técnicas de 4° a 7° año y comparten una base común:\n• Informática: se enfoca más en equipos, redes, sistemas operativos, hardware, soporte y seguridad.\n• Programación: se enfoca más en desarrollar software: programación, diseño web, bases de datos y aplicaciones.\nNinguna es mejor que la otra: depende de lo que más te guste. Si te entusiasma armar y arreglar equipos y redes, mirá Informática; si te gusta crear programas y páginas, mirá Programación.",
    palabras: [
      "diferencia entre informatica y programacion", "diferencia informatica programacion", "informatica o programacion", "programacion o informatica",
      "cual elegir", "cual me conviene", "cual es mejor", "cual es la diferencia", "que orientacion elijo", "no se cual elegir", "como elijo",
      "que es mejor", "elegir orientacion", "elegir carrera", "cual me recomiendan",
    ],
    peso: 5,
  },
  {
    id: "faq-cuando-se-elige",
    titulo: "¿Cuándo se elige la orientación?",
    respuesta:
      "Las orientaciones (Informática o Programación) comienzan en 4° año, después del Ciclo Básico. Hasta entonces, en 1° a 3° se aprenden las bases de la educación técnica. Para saber cómo es el paso a 4° en este ciclo, escribinos a " +
      CORREO +
      " y te asesoramos.",
    enlaces: [enlaceCorreo],
    palabras: ["cuando se elige", "cuando elijo la orientacion", "cuando se elige la orientacion", "en que ano se elige", "cuando empieza la orientacion", "cuando empieza informatica", "cuando empieza programacion", "paso a cuarto", "pasar a 4", "4 ano"],
    peso: 4,
  },
  {
    id: "faq-saber-antes",
    titulo: "¿Hace falta saber programar o de computadoras antes de empezar?",
    respuesta:
      "No, no hace falta saber nada de antes. Se empieza desde cero y se aprende paso a paso, con práctica y con el acompañamiento de los docentes. Lo único que se necesita es ganas de aprender y curiosidad.",
    palabras: [
      "hace falta saber programar", "tengo que saber programar", "necesito saber programar", "tengo que saber de computadoras", "sin conocimientos previos",
      "no se nada de computacion", "no se programar", "empezar de cero", "desde cero", "conocimientos previos", "nunca programe", "soy principiante",
      "principiante", "requisitos para estudiar programacion", "hace falta saber de computadoras",
    ],
    peso: 4,
  },
  {
    id: "faq-matematica",
    titulo: "¿Hay que ser bueno en matemática?",
    respuesta:
      "La matemática y la lógica ayudan mucho en las dos orientaciones (en el plan hay materias como Análisis Matemático, Matemática Aplicada y Matemática Discreta), pero no hace falta ser un genio: se aprende y se mejora practicando, y siempre hay docentes y compañeros para ayudar. Con constancia se logra.",
    palabras: ["matematica", "hay que ser bueno en matematica", "se necesita matematica", "mucha matematica", "me va mal en matematica", "soy malo en matematica", "calculo", "logica", "razonamiento"],
    peso: 3,
  },
  {
    id: "faq-ingles",
    titulo: "¿Se usa inglés?",
    respuesta:
      "Sí, el inglés es una gran herramienta en tecnología porque gran parte de la documentación y de los lenguajes de programación está en inglés. En el plan de estudios hay materia de Inglés. No te preocupes si recién empezás: se va aprendiendo de a poco.",
    palabras: ["ingles", "necesito ingles", "hace falta ingles", "se usa ingles", "hablar ingles", "documentacion en ingles"],
    peso: 3,
  },
  {
    id: "faq-materias-programacion",
    titulo: "Materias de Técnico en Programación",
    respuesta:
      "Según el cronograma de mesas, algunas materias de la orientación Programación son:\n• 5°: Análisis Matemático, Sistemas Digitales, Modelos y Sistemas, Laboratorio de Programación, Laboratorio de Diseño Web, Laboratorio de Redes Informáticas y Laboratorio de Diseño de Base de Datos.\n• 6°: Matemática Discreta, Sistemas Digitales, Sistemas de Gestión y Autogestión, Seguridad Informática, Laboratorio de Diseño Web Estático y Dinámico y Laboratorio de Programación III.\n• 7°: Evaluación de Proyectos, Organización y Métodos, Aplicaciones Móviles, Modelos y Sistemas II y Emprendimientos Productivos y Desarrollo Local, entre otras.\nA esto se suman las materias generales como Literatura, Inglés y Educación Física.",
    ruta: "/previas",
    accion: "Ver cronograma de mesas",
    palabras: [
      "materias de programacion", "materias de tecnico en programacion", "plan de estudios de programacion", "que materias tiene programacion",
      "que se estudia en programacion", "materias programacion", "laboratorio de programacion", "diseno web", "aplicaciones moviles",
    ],
    peso: 5,
  },
  {
    id: "faq-materias-informatica",
    titulo: "Materias de Técnico en Informática Personal y Profesional",
    respuesta:
      "Según el cronograma de mesas, algunas materias de la orientación Informática son:\n• 5°: Análisis Matemático, Sistemas Digitales, Laboratorio de Hardware II, Laboratorio de Sistemas Operativos, Laboratorio de Aplicaciones, Laboratorio de Programación y Teleinformática.\n• 6°: Matemática Aplicada, Redes, Seguridad Informática, Sistemas de Gestión, Investigación Operativa, Laboratorio de Hardware, Laboratorio de Sistemas Operativos y Laboratorio de Aplicaciones.\n• 7°: Evaluación de Proyectos, Base de Datos, Modelos y Sistemas y Emprendimientos Productivos y Desarrollo Local, entre otras.\nA esto se suman las materias generales como Literatura, Inglés y Educación Física.",
    ruta: "/previas",
    accion: "Ver cronograma de mesas",
    palabras: [
      "materias de informatica", "materias de tecnico en informatica", "plan de estudios de informatica", "que materias tiene informatica",
      "que se estudia en informatica", "materias informatica", "laboratorio de hardware", "teleinformatica", "sistemas operativos", "seguridad informatica",
    ],
    peso: 5,
  },
  {
    id: "faq-salida-laboral",
    titulo: "Salida laboral de las carreras técnicas",
    respuesta:
      "Los técnicos en informática y en programación tienen mucha salida laboral porque el sector tecnológico necesita profesionales todo el tiempo. Pueden trabajar en relación de dependencia, en servicios técnicos y desarrollo de software, en el sector público o por cuenta propia. Además, desde 7° año se hacen prácticas profesionalizantes para dar los primeros pasos en el mundo del trabajo.",
    palabras: [
      "salida laboral", "tiene salida laboral", "se consigue trabajo", "trabajo de programador", "cuanto se gana", "sueldo", "en que puedo trabajar",
      "puedo trabajar al recibirme", "oportunidades laborales", "campo ocupacional", "freelance", "trabajar de programador", "trabajar de informatico",
    ],
    peso: 4,
  },
  {
    id: "faq-seguir-estudiando",
    titulo: "¿Qué puedo estudiar después?",
    respuesta:
      "Con el título de técnico podés seguir estudiando una tecnicatura superior (por ejemplo, Desarrollo de Software, Análisis de Sistemas, Redes o Ciencia de Datos) o una carrera universitaria como Ingeniería en Sistemas, Licenciatura en Informática o Ciencias de la Computación. Muchas veces el título técnico te permite avanzar en menos tiempo.",
    palabras: [
      "que puedo estudiar despues", "que carrera sigo", "seguir estudiando", "carrera universitaria", "ingenieria en sistemas", "licenciatura en informatica",
      "tecnicatura superior", "universidad", "facultad", "terciario", "estudios superiores", "despues de egresar", "tecnicatura en desarrollo de software",
    ],
    peso: 4,
  },
  {
    id: "faq-titulo-valido",
    titulo: "Validez del título",
    respuesta:
      "Al terminar 7° año se obtiene un título de técnico de educación secundaria técnica, con validez oficial. Te habilita para trabajar y para continuar estudios superiores. Si necesitás más detalle sobre el título de tu orientación, escribinos a " +
      CORREO +
      " y te lo explicamos.",
    enlaces: [enlaceCorreo],
    palabras: ["titulo valido", "validez del titulo", "titulo oficial", "es oficial", "tiene validez", "habilita", "matricula profesional", "incumbencias", "titulo tecnico"],
    peso: 4,
  },
  {
    id: "faq-practicas-profesionales",
    titulo: "¿Cómo son las prácticas en 7° año?",
    respuesta:
      "Las prácticas profesionalizantes son experiencias reales de trabajo que se hacen en 7° año. Sirven para aplicar lo aprendido en situaciones concretas, trabajar en equipo y conocer cómo funciona un ámbito laboral. Para conocer los detalles de cada año, consultá en la escuela.",
    palabras: ["como son las practicas", "que son las practicas", "practicas en empresas", "donde hago las practicas", "practicas de 7", "practicas en septimo"],
    peso: 4,
  },
  {
    id: "faq-computadora",
    titulo: "¿Necesito tener computadora propia?",
    respuesta:
      "La escuela cuenta con laboratorios y sala server para trabajar, así que no es indispensable. Tener una compu o netbook en casa ayuda para practicar, pero lo importante son las ganas de aprender. Para saber qué recursos hay disponibles hoy, escribinos a " +
      CORREO +
      ".",
    enlaces: [enlaceCorreo],
    palabras: ["necesito computadora", "tengo que tener computadora", "computadora propia", "notebook", "netbook", "laptop", "pc en casa", "equipos de la escuela", "sala server", "sala de computacion"],
    peso: 3,
  },
  {
    id: "faq-proyectos",
    titulo: "Proyectos que hacen los estudiantes",
    respuesta:
      "Los estudiantes crean proyectos reales que se presentan en la muestra anual y algunos se publican en la portada, sección «Hecho en la Tec»: DiagramTec, Volta y ServerDesk, entre otros.",
    ruta: "/",
    accion: "Ver programas",
    palabras: ["que proyectos hacen", "proyectos de los estudiantes", "que hacen los alumnos", "ejemplos de proyectos", "proyecto final", "trabajo final", "tesis", "que construyen"],
    peso: 3,
  },
  {
    id: "faq-dificil",
    titulo: "¿Es difícil la escuela técnica?",
    respuesta:
      "Es una escuela con mucho por aprender, y también con mucho acompañamiento: equipo de orientación, preceptores y docentes que te ayudan en cada etapa. Se evalúa el recorrido completo y no solo una prueba, y siempre hay oportunidades de seguir avanzando con intensificación. Con esfuerzo y constancia se logra.",
    palabras: ["es dificil", "es muy dificil", "cuesta mucho", "es muy exigente", "exigente", "carga horaria", "doble turno", "mucho estudio", "me va a costar", "tengo miedo", "miedo", "nervios", "dificultad"],
    peso: 2,
  },
  {
    id: "faq-mujeres",
    titulo: "¿Pueden estudiar todas las personas?",
    respuesta:
      "Sí. La escuela es pública, abierta e inclusiva: la tecnología es para todas y todos. Chicas, chicos y estudiantes de cualquier identidad son bienvenidos y encuentran en la escuela un espacio para crecer.",
    palabras: ["mujeres", "chicas", "nenas", "es para varones", "hay mujeres", "pueden estudiar mujeres", "genero", "inclusivo", "discapacidad", "estudiantes con discapacidad", "diversidad"],
    peso: 3,
  },

  /* ---------- Temas sin dato en el sitio ---------- */
  {
    id: "sin-dato",
    titulo: "Otras consultas",
    respuesta:
      "Uy, ese dato todavía no lo tengo en el sitio. Para consultas sobre cuotas, cooperadora, uniforme, comedor, transporte, becas, vacaciones o fechas especiales, escribinos a " +
      CORREO +
      " o acercate a la escuela (Güemes 2051): te van a ayudar.",
    enlaces: [enlaceCorreo],
    palabras: ["cuota", "cuotas", "cooperadora", "costo", "precio", "arancel", "uniforme", "guardapolvo", "comedor", "desayuno", "almuerzo", "copa de leche", "transporte", "beca", "becas", "vacaciones", "receso", "feriado", "feriados", "lista de utiles", "utiles", "seguro", "campamento", "viaje", "viajes", "gira"],
  },
  {
    id: "ayuda",
    titulo: "Qué puedo consultarle al asistente",
    respuesta:
      "Puedo brindarte información sobre: contacto y correo, dirección y cómo llegar, horarios, carreras (Ciclo Básico, Informática y Programación) y sus preguntas frecuentes, taller y prácticas, inscripción y documentación, reserva para hermanos, boletín y notas, evaluación (TEA, TEP, TED), previas y mesas, novedades y programas hechos por alumnos.",
    palabras: ["ayuda", "ayudame", "que podes hacer", "que puedo preguntar", "temas", "opciones", "menu", "que sabes", "que sabes hacer", "para que sirve"],
    peso: 2,
  },
];

/* Pasa a minúsculas, sin tildes ni signos, y deja las palabras en singular
   para que "materias" y "materia" valgan lo mismo. */
const aSingular = (palabra) => (palabra.length > 3 && palabra.endsWith("s") ? palabra.slice(0, -1) : palabra);

export const normalizar = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9°]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(aSingular)
    .join(" ");

const MAXIMO_RESULTADOS = 3;

/* Los temas cuyas palabras aparecen en la consulta, del que más coincide al que menos. */
export function temasDeConsulta(consulta) {
  const texto = ` ${normalizar(consulta)} `;

  const ordenados = temas
    .map((tema) => {
      const coincidencias = tema.palabras.filter((palabra) => texto.includes(` ${normalizar(palabra)} `));
      /* Una frase larga que coincide pesa más que una palabra suelta. */
      const puntos = coincidencias.reduce((suma, palabra) => suma + normalizar(palabra).split(" ").length, 0);
      return { tema, puntos: puntos * (tema.peso ?? 1) };
    })
    .filter(({ puntos }) => puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);

  /* Si hay una respuesta claramente mejor, no se mezcla con temas que apenas coinciden. */
  const mejor = ordenados[0]?.puntos ?? 0;
  return ordenados
    .filter(({ puntos }) => puntos >= mejor * 0.4)
    .slice(0, MAXIMO_RESULTADOS)
    .map(({ tema }) => tema);
}

export const SUGERENCIA =
  "¿En qué te puedo ayudar? Podés preguntarme por «contacto», «horarios», «carreras», «inscripción», «boletín», «previas» o «novedades».";
