// Salones (espacios físicos) del plano del colegio. Los ids son los mismos que
// usa el frontend (frontend/src/planoSalones.js), que además sabe dónde va cada
// uno en el dibujo. Nombre y tipo son los de los PDF de la escuela, salvo los
// que la escuela cambió (NOMBRES_ANTERIORES); desde el panel se pueden cambiar
// (tabla `salones`). La capacidad no figura en los planos: queda vacía hasta
// que alguien la cargue.
const SALONES = [
  ['pb-1', 'pb', 'Aula 8', 'aula'],
  ['pb-2', 'pb', 'Kiosco', 'servicio'],
  ['pb-3', 'pb', 'Cocina', 'servicio'],
  ['pb-4', 'pb', 'Hall de acceso', 'circulacion'],
  ['pb-5', 'pb', 'Auditorio', 'compartido'],
  ['pb-6', 'pb', 'E.O.E.', 'comun'],
  ['pb-7', 'pb', 'Preceptoría 1', 'administrativo'],
  ['pb-8', 'pb', 'Aula 1', 'aula'],
  ['pb-9', 'pb', 'Aula 2', 'aula'],
  ['pb-10', 'pb', 'Aula 3', 'aula'],
  ['pb-11', 'pb', 'Secretaría', 'administrativo'],
  ['pb-12', 'pb', 'Dirección', 'administrativo'],
  ['pb-13', 'pb', 'Aula 5', 'aula'],
  ['pb-14', 'pb', 'Aula 4', 'aula'],
  ['pb-15', 'pb', 'PAÑOL', 'comun'],
  ['pb-16', 'pb', 'Aula 7', 'aula'],
  ['pb-17', 'pb', 'Preceptoría 2', 'administrativo'],
  ['pb-18', 'pb', 'Taller grande', 'taller'],
  ['pb-19', 'pb', 'Patio interno', 'patio'],
  ['pb-20', 'pb', 'Aula 3', 'aula'],
  ['pb-21', 'pb', 'Aula 3', 'aula'],
  ['pb-22', 'pb', 'Patio', 'patio'],
  ['1p-3', '1p', 'Laboratorio', 'laboratorio'],
  ['1p-4', '1p', 'Aula 9', 'aula'],
  ['1p-16', '1p', 'Sin nombre', 'otro'],
  ['1p-5', '1p', 'Jefatura de Área', 'institucional'],
  ['1p-17', '1p', 'SERVER', 'comun'],
  ['1p-6', '1p', 'Aula 11', 'aula'],
  ['1p-7', '1p', 'Aula 12', 'aula'],
  ['1p-8', '1p', 'Aula 13', 'aula'],
  ['1p-9', '1p', 'Aula 15', 'aula'],
  ['1p-10', '1p', 'Aula 16', 'aula'],
  ['1p-11', '1p', 'Biblioteca', 'compartido'],
  ['1p-12', '1p', 'Aula 20', 'aula'],
  ['1p-13', '1p', 'Aula 21', 'aula'],
  ['1p-14', '1p', 'Aula 14', 'aula'],
  ['1p-15', '1p', 'Aula 10', 'aula'],
  // Recinto chico pegado a la Biblioteca (abajo), sin nombre en los PDF.
  ['1p-18', '1p', 'Aula 17', 'aula'],
];

// Cómo se llamaban en los PDF (para reconocer datos viejos que los nombran así).
const NOMBRES_ANTERIORES = {
  'pb-1': 'Taller 1',
  'pb-6': 'Bunker',
  'pb-15': 'Aula 6',
  '1p-4': 'Pañol',
  '1p-5': 'Jefe de área',
  '1p-17': 'Sin nombre',
};

// Tipos de espacio (el frontend muestra la etiqueta).
const TIPOS = {
  aula: 'Aula',
  taller: 'Taller',
  laboratorio: 'Laboratorio',
  compartido: 'Espacio compartido',
  comun: 'Espacio común institucional',
  // Reservado a funciones institucionales (Jefatura de Área): nunca asignable.
  institucional: 'Espacio institucional reservado',
  patio: 'Patio',
  administrativo: 'Administrativo',
  servicio: 'Servicio',
  circulacion: 'Circulación',
  otro: 'Otro',
};

const PISOS = { pb: 'Planta baja', '1p': 'Primer piso' };

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Módulos de una grilla nueva (los mismos que usaba frontend/src/panelData.js).
// No traen hora: la escuela la carga en Espacios y horarios.
const HORAS_BASE = ['1°/2°', '3°/4°', '5°/6°', '7°/8°'];

// Grillas que había antes de guardarse ninguna (frontend/src/grillas.js).
const GRILLAS_BASE = ['Básico', 'Superior'];

// Datos de una grilla (Espacios y horarios).
const TURNOS = { manana: 'Mañana', tarde: 'Tarde', vespertino: 'Vespertino' };
const CICLOS = { basico: 'Ciclo Básico', superior: 'Ciclo Superior', ambos: 'Ciclo Básico y Superior' };

// Clasificación de cada espacio (columna salones.clasificacion):
//   AULA          → admite asignaciones de clases (docente, materia, grupo, horario)
//   ESPACIO_COMUN → se ve y se consulta en el plano, pero no admite clases
const CLASIFICACIONES = {
  AULA: 'Aula: admite clases',
  ESPACIO_COMUN: 'Espacio común: no admite clases',
};
const TIPOS_DE_AULA = ['aula', 'taller', 'laboratorio', 'compartido'];
const clasificacionDe = (tipo) => (TIPOS_DE_AULA.includes(tipo) ? 'AULA' : 'ESPACIO_COMUN');

// Estados de una asignación: sólo "activa" ocupa el espacio.
const ESTADOS = {
  activa: 'Activa',
  docente_ausente: 'Docente ausente (espacio libre)',
  suspendida: 'Clase cancelada',
};

module.exports = {
  SALONES, NOMBRES_ANTERIORES, TIPOS, CLASIFICACIONES, clasificacionDe, PISOS, DIAS, HORAS_BASE, GRILLAS_BASE, ESTADOS,
  TURNOS, CICLOS,
};
