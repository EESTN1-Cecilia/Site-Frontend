const path = require('path');
const db = require('../database/db');
const googleDriveService = require('../services/googleDriveService');
const { ROLES } = require('../utils/roles');

const LONGITUD_MAXIMA_NOMBRE = 200;

// Limpia el nombre del archivo: elimina rutas (.., /, \), caracteres especiales
// y fuerza la extensión .pdf. Evita path traversal e inyección de caracteres raros.
function sanitizarNombreArchivo(nombre) {
  let seguro = path.basename(nombre);
  seguro = seguro.replace(/[^a-zA-Z0-9._-]/g, '_');
  seguro = seguro.replace(/^\.+/, '');

  if (!seguro.toLowerCase().endsWith('.pdf')) {
    seguro += '.pdf';
  }

  const MAX_BASE = LONGITUD_MAXIMA_NOMBRE - 4;
  if (seguro.length > LONGITUD_MAXIMA_NOMBRE) {
    const base = seguro.slice(0, seguro.length - 4).substring(0, MAX_BASE);
    seguro = base + '.pdf';
  }

  if (!seguro || seguro === '.pdf') {
    seguro = `archivo_${Date.now()}.pdf`;
  }

  return seguro;
}

// Validación estricta de PDF: MIME + extensión + magic bytes (%PDF) + no vacío.
// Se chequean las tres porque el MIME y la extensión son fácilmente falsificables.
function validarPDF(archivo) {
  if (!archivo) {
    throw new Error('No se proporcionó ningún archivo');
  }

  if (!archivo.buffer || archivo.buffer.length === 0) {
    throw new Error('El archivo está vacío');
  }

  if (archivo.mimetype !== 'application/pdf') {
    throw new Error('Tipo de archivo inválido');
  }

  const extension = path.extname(archivo.originalname).toLowerCase();
  if (extension !== '.pdf') {
    throw new Error('Extensión de archivo inválida');
  }

  const encabezado = archivo.buffer.slice(0, 5).toString('ascii');
  if (!encabezado.startsWith('%PDF')) {
    throw new Error('El archivo no es un PDF válido');
  }
}

async function subirArchivo(req, res) {
  try {
    const usuario = req.usuario;
    let carpetaId;
    let etiquetaDestino;

    // Resolución de la carpeta destino SEGÚN EL ROL, siempre en el backend.
    // Nunca se acepta un folderId del cliente: jefatura usa su area_id, server usa
    // DRIVE_EMATP_ID, y direccion elige un destino LÓGICO validado contra la BD.
    switch (usuario.rol) {
      case ROLES.JEFATURA_AREA: {
        if (!usuario.area_id) {
          return res.status(400).json({ error: 'El usuario no tiene un área asignada' });
        }
        const area = await db.obtenerFila(
          'SELECT id, nombre, drive_folder_id FROM areas WHERE id = ? AND activo = 1',
          usuario.area_id
        );

        if (!area) {
          return res.status(400).json({ error: 'Área inválida o inactiva' });
        }

        carpetaId = area.drive_folder_id;
        etiquetaDestino = area.nombre;
        break;
      }

      case ROLES.SERVIDOR: {
        carpetaId = process.env.DRIVE_EMATP_ID;
        if (!carpetaId) {
          return res.status(500).json({ error: 'Carpeta del servidor no configurada' });
        }
        etiquetaDestino = 'server';
        break;
      }

      case ROLES.DIRECCION: {
        const destino = req.body.destination;
        if (!destino) {
          return res.status(400).json({ error: 'El destino es requerido para el rol dirección' });
        }

        if (typeof destino !== 'string') {
          return res.status(400).json({ error: 'El destino debe ser una cadena de texto' });
        }

        if (destino === 'server') {
          carpetaId = process.env.DRIVE_EMATP_ID;
          if (!carpetaId) {
            return res.status(500).json({ error: 'Carpeta del servidor no configurada' });
          }
          etiquetaDestino = 'server';
        } else {
          const area = await db.obtenerFila(
            'SELECT id, nombre, drive_folder_id FROM areas WHERE nombre = ? AND activo = 1',
            destino
          );

          if (!area) {
            return res.status(400).json({ error: 'Destino inválido' });
          }

          carpetaId = area.drive_folder_id;
          etiquetaDestino = area.nombre;
        }
        break;
      }

      default:
        return res.status(403).json({ error: 'Rol inválido' });
    }

    validarPDF(req.file);

    const nombreSeguro = sanitizarNombreArchivo(req.file.originalname);

    // Se sube a Drive con la service account (scope drive.file).
    const resultado = await googleDriveService.subirArchivo(
      req.file.buffer,
      nombreSeguro,
      carpetaId,
      'application/pdf'
    );

    // Auditoría: se registra quién subió qué, a dónde y el id en Drive.
    await db.ejecutar(
      'INSERT INTO upload_logs (user_id, filename, original_name, destination, drive_file_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      usuario.id, nombreSeguro, req.file.originalname, etiquetaDestino, resultado.id, 'exitoso'
    );

    return res.json({
      exito: true,
      archivoId: resultado.id,
      nombreArchivo: nombreSeguro,
      destino: etiquetaDestino,
    });
  } catch (error) {
    console.error('[Upload] Error:', error.message);

    try {
      await db.ejecutar(
        'INSERT INTO upload_logs (user_id, filename, original_name, destination, drive_file_id, status) VALUES (?, ?, ?, ?, ?, ?)',
        req.usuario?.id || 0,
        req.file?.originalname || 'desconocido',
        req.file?.originalname || 'desconocido',
        'desconocido',
        null,
        'fallido'
      );
    } catch (errorRegistro) {
      // Fallo silencioso en el registro
    }

    if (error.message === 'No se proporcionó ningún archivo') {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    if (error.message === 'El archivo está vacío') {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }
    if (error.message === 'Tipo de archivo inválido') {
      return res.status(415).json({ error: 'Solo se aceptan archivos PDF' });
    }
    if (error.message === 'Extensión de archivo inválida') {
      return res.status(415).json({ error: 'Solo se aceptan archivos PDF' });
    }
    if (error.message === 'El archivo no es un PDF válido') {
      return res.status(415).json({ error: 'El contenido del archivo no es un PDF válido' });
    }

    return res.status(500).json({ error: 'Error al subir el archivo' });
  }
}

module.exports = { subirArchivo, validarPDF, sanitizarNombreArchivo };
