const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/auth.Middleware');
const { requerirRol } = require('../middleware/role.Middleware');
const { EDITORES } = require('../utils/contenido');
const eventos = require('../utils/eventos');
const c = require('../controllers/asignaciones.Controller');

// Espacios y horarios + plano del colegio: una sola fuente de datos.
// Ver, con sesión (como el resto del panel); cambiar, Jefatura y Dirección.
// Los permisos se controlan acá: que el frontend oculte un botón no alcanza.
const editores = requerirRol(...EDITORES.asignaciones);
// Las grillas llevan las horas de cada módulo: entran en el límite de 10 kb
// salvo que haya muchísimas, así que se les da un poco más de margen.
const cuerpo = express.json({ limit: '100kb' });

router.get('/eventos', autenticar, eventos.suscribir);

router.get('/asignaciones', autenticar, c.listar);
router.get('/asignaciones/registro', autenticar, c.registro);
router.post('/asignaciones/verificar', autenticar, editores, c.verificar);
router.post('/asignaciones/intercambiar', autenticar, editores, c.intercambiar);
router.post('/asignaciones/:id/cambiar-aula', autenticar, editores, c.cambiarAula);
router.post('/asignaciones', autenticar, editores, c.crear);
router.put('/asignaciones', autenticar, editores, cuerpo, c.guardarLote);
router.put('/asignaciones/:id', autenticar, editores, c.modificar);
router.delete('/asignaciones/:id', autenticar, editores, c.quitar);
router.get('/disponibilidad', autenticar, c.disponibilidad);

router.get('/salones', autenticar, c.listarSalones);
router.get('/salones/:id', autenticar, c.detalleSalon);
router.put('/salones/:id', autenticar, editores, c.modificarSalon);

router.post('/docentes', autenticar, editores, c.agregarDocente);
router.post('/materias', autenticar, editores, c.agregarMateria);
router.post('/grupos', autenticar, editores, c.agregarGrupo);

router.get('/panel', autenticar, c.obtenerPanel);
router.put('/grillas', autenticar, requerirRol(...EDITORES.grillas), cuerpo, c.guardarGrillas);
router.post('/grillas/:id/copiar', autenticar, requerirRol(...EDITORES.grillas), c.copiarGrilla);
router.put('/plano', autenticar, requerirRol(...EDITORES.plano), c.guardarPlano);

module.exports = router;
