require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/database/db');

// Sin una clave fuerte cualquiera podría firmar tokens: el servidor no arranca.
if (process.env.NODE_ENV !== 'test' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres aleatorios.');
  console.error("Por ejemplo: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
  process.exit(1);
}

const app = express();

// Detrás de un proxy (nginx, Render, Railway…) hay que indicarlo para que req.ip
// sea la IP real del cliente: el límite de intentos de login la usa.
// TRUST_PROXY=1 confía en un salto; también acepta los valores de Express.
if (process.env.TRUST_PROXY) {
  const valor = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(valor) ? Number(valor) : valor);
}

// Cabeceras de seguridad básicas en todas las respuestas.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // El filtro XSS de los navegadores viejos está obsoleto y puede ser explotable: se apaga.
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Las respuestas de la API (tokens, datos de usuarios) no se guardan en caché.
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// CORS restringido a un único origen permitido (no a todo).
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Contenido del sitio: va antes del JSON global porque lleva su propio límite
// (las páginas y notas tienen imágenes) y lee el cuerpo después de autenticar.
app.use('/api', require('./src/routes/contenido.Route'));

// Límite de cuerpo pequeño para JSON (los PDFs van por multipart, no por aquí).
app.use(express.json({ limit: '10kb' }));

const authRoutes = require('./src/routes/auth.Route');
const usuarioRoutes = require('./src/routes/usuario.Route');
const uploadRoutes = require('./src/routes/upload.Route');

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 para rutas inexistentes.
app.use((req, res) => {
  res.status(404).json({ error: 'No encontrado' });
});

// Manejador de errores centralizado: nunca filtra stack traces al cliente.
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Solicitud demasiado grande' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo del pedido no es JSON válido' });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

// En modo test no se abre el puerto (los tests usan supertest/importan app).
if (process.env.NODE_ENV !== 'test') {
  db.asegurarMigraciones().then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  });
}

module.exports = app;
