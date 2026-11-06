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

// El archivo llega en memoria (nunca a disco con nombres del usuario), con
// tope de tamaño y de campos. El tope de acá es el de los videos (15 MB); el
// controller revisa que sea una imagen o un video de verdad y aplica el tope
// de 5 MB a las imágenes.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 6, parts: 7, fieldSize: 1024, fieldNameSize: 50 },
});
const recibirImagen = (req, res, next) =>
  subida.single('archivo')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'El archivo supera los 15 MB' });
    if (err) return res.status(400).json({ error: 'No se pudo leer el archivo enviado' });
    if (!req.file) return res.status(400).json({ error: 'Elegí una imagen o un video' });
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
router.put('/pantallas/tema', autenticar, administran, c.cambiarTema);
router.post('/pantallas/:id/renovar', autenticar, administran, c.renovarPantalla);
router.delete('/pantallas/:id', autenticar, administran, c.quitarPantalla);

module.exports = router;
