const express = require('express');
const router = express.Router();
const multer = require('multer');
const autenticar = require('../middleware/auth.Middleware');
const { requerirRol } = require('../middleware/role.Middleware');
const { subirArchivo } = require('../controllers/upload.Controller');

const TAMANIO_MAXIMO = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// El archivo se recibe EN MEMORIA (nunca se escribe a disco con rutas del usuario).
const almacenamiento = multer.memoryStorage();

// Primer filtro en multer: solo PDFs por MIME (luego el controller valida de nuevo).
const filtroArchivos = (req, archivo, cb) => {
  if (archivo.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({
  storage: almacenamiento,
  fileFilter: filtroArchivos,
  limits: {
    fileSize: TAMANIO_MAXIMO,
  },
});

// POST /api/upload: autenticado + rol válido. Multer se ejecuta manualmente para
// poder traducir los errores de tamaño/tipo a respuestas HTTP apropiadas (413/415).
router.post('/',
  autenticar,
  requerirRol('jefatura_area', 'server', 'direccion'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'El archivo excede el tamaño máximo permitido' });
          }
          return res.status(400).json({ error: err.message });
        }
        return res.status(415).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }
      next();
    });
  },
  subirArchivo
);

module.exports = router;
