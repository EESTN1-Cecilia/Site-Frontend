/* Salones (espacios físicos) de cada piso, sacados de los PDF de la escuela:
   [id, nombre, x, y, chico], con x/y en % del ancho y alto del
   dibujo (el centro del cartel con el nombre). Lo usan plano.js y el script
   que calcula las zonas (scripts/zonas-plano.mjs). Los ids son los mismos que
   la tabla `salones` del backend (backend/src/utils/salones.js). La escuela
   renombró: Taller 1 → Aula 8, Bunker → E.O.E., Aula 6 → PAÑOL y, en el
   primer piso, Pañol → Aula 9, Sin nombre → SERVER y Jefe de área →
   Jefatura de Área. */
export const salonesPorPiso = {
  pb: [
    ["pb-1", "Aula 8", 11, 80.6],
    ["pb-2", "Kiosco", 22.7, 80.6],
    ["pb-3", "Cocina", 31.7, 82.6],
    ["pb-4", "Hall de acceso", 46.3, 78.4],
    ["pb-5", "Auditorio", 66.1, 90.9],
    ["pb-6", "E.O.E.", 71.6, 73.2],
    ["pb-7", "Preceptoría 1", 48.1, 67.6, true],
    ["pb-8", "Aula 1", 68.9, 66.2],
    ["pb-9", "Aula 2", 68.9, 56.6],
    ["pb-10", "Aula 3", 68.9, 47.7],
    ["pb-11", "Secretaría", 40.2, 45, true],
    ["pb-12", "Dirección", 47.4, 45, true],
    ["pb-13", "Aula 5", 43, 35.6],
    ["pb-14", "Aula 4", 42.9, 31.1],
    ["pb-15", "PAÑOL", 26.6, 33],
    ["pb-16", "Aula 7", 9.3, 33],
    ["pb-17", "Preceptoría 2", 5.9, 41.1, true],
    ["pb-18", "Taller grande", 24.6, 11.8],
    ["pb-19", "Patio interno", 25.7, 25.2],
    ["pb-20", "Aula 3", 68.9, 15.8],
    ["pb-21", "Aula 3", 68.9, 5.5],
    ["pb-22", "Patio", 23.7, 56.6],
  ],
  "1p": [
    ["1p-3", "Laboratorio", 8.1, 80.6],
    ["1p-4", "Aula 9", 20.9, 80.6],
    ["1p-16", "Sin nombre", 36.2, 80.7],
    ["1p-5", "Jefatura de Área", 36.6, 68.1, true],
    ["1p-17", "SERVER", 55.4, 73.4, true],
    ["1p-6", "Aula 11", 53.4, 66.2],
    ["1p-7", "Aula 12", 53.1, 56.6],
    ["1p-8", "Aula 13", 53.4, 47.8],
    ["1p-9", "Aula 15", 33.4, 33.1],
    ["1p-10", "Aula 16", 20.8, 33.1],
    ["1p-11", "Biblioteca", 7.9, 33.1],
    ["1p-12", "Aula 20", 54.1, 15.9],
    ["1p-13", "Aula 21", 54.1, 5.6],
    ["1p-14", "Aula 14", 33.9, 45.4],
    ["1p-15", "Aula 10", 53.4, 80.7],
    // Recinto chico pegado a la Biblioteca (abajo).
    ["1p-18", "Aula 17", 7.4, 40.6, true],
    // Preceptoría del primer piso: recinto chico sin nombre en los PDF (arriba de los baños, junto al Aula 15).
    ["1p-19", "Preceptoría", 42.3, 31.2, true],
  ],
};

/* Espacios comunes institucionales con identidad propia en el plano: se ven
   y se consultan, pero no admiten clases (lo controla el backend con la
   clasificación ESPACIO_COMUN). El resto de los espacios comunes usa el
   ícono y el mensaje generales. */
export const espaciosComunes = {
  "pb-15": {
    icono: "ph:wrench",
    mensaje: "Espacio común de uso institucional. No admite asignaciones de clases.",
  },
  "1p-17": {
    icono: "ph:desktop",
    mensaje: "Espacio común del colegio: sala del servidor informático. No admite asignaciones de clases.",
  },
  "1p-5": {
    icono: "ph:lock-key",
    mensaje:
      "La Jefatura de Área es un espacio institucional reservado y no puede asignarse a actividades académicas. Se usa para funciones administrativas y de coordinación docente.",
  },
  "pb-6": {
    icono: "ph:hand-heart",
    mensaje:
      "Espacio institucional destinado al Equipo de Orientación Escolar. No admite asignaciones de clases.",
  },
};

export const espacioComunGeneral = {
  icono: "ph:buildings",
  mensaje: "Espacio común de uso institucional. No admite asignaciones de clases.",
};
