const express = require('express');
const multer = require('multer');
const router = express.Router();
const autenticar = require('../middleware/auth.Middleware');
const { requerirRol } = require('../middleware/role.Middleware');
const { ROLES } = require('../utils/roles');
const c = require('../controllers/cartelera.Controller');

// Cartelera digital (televisores de los corredores). Cargan imágenes
// Dirección, Jefatura de Área y EMATP (rol server); las pantallas las
// administran Dirección y Jefatura. El televisor sólo usa /pantalla/:token y
// /imagen/:clave, sin sesión.
const cargan = requerirRol(ROLES.DIRECCION, ROLES.JEFATURA_AREA, ROLES.SERVIDOR);
const administran = requerirRol(ROLES.DIRECCION, ROLES.JEFATURA_AREA);

// La imagen llega en memoria (nunca a disco con nombres del usuario), con
// tope de tamaño y de campos; el controller revisa que sea una imagen real.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, parts: 7, fieldSize: 1024, fieldNameSize: 50 },
});
const recibirImagen = (req, res, next) =>
  subida.single('archivo')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'La imagen supera los 5 MB' });
    if (err) return res.status(400).json({ error: 'No se pudo leer la imagen enviada' });
    if (!req.file) return res.status(400).json({ error: 'Elegí una imagen' });
    return next();
  });

router.get('/pantalla/:token', c.pantalla);
router.get('/imagen/:clave', c.imagen);

router.get('/', autenticar, cargan, c.listar);
router.post('/', autenticar, cargan, recibirImagen, c.crear);
router.put('/:id', autenticar, cargan, c.modificar);
router.delete('/:id', autenticar, cargan, c.quitar);
router.post('/:id/mover', autenticar, cargan, c.mover);

router.post('/pantallas', autenticar, administran, c.crearPantalla);
router.post('/pantallas/:id/renovar', autenticar, administran, c.renovarPantalla);
router.delete('/pantallas/:id', autenticar, administran, c.quitarPantalla);

module.exports = router;
