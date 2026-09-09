require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/database/db');

const app = express();

// Cabeceras de seguridad básicas en todas las respuestas.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS restringido a un único origen permitido (no a todo).
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

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
