# PROJECT_CONTEXT


Sitio de la escuela técnica + panel de gestión.

## Arquitectura
- `frontend/`: React + Vite (SPA, router propio en `src/router.js`), deploy en Vercel. Stores propios (`asignaciones.js`, `grillas.js`); `localStorage` sólo como respaldo (`almacen.js`).
- `backend/`: Express 5 + SQLite (`data/database.sqlite`, wrapper en `src/database/db.js`). JWT + roles (`middleware/`).
- Migraciones al arrancar: `db.asegurarMigraciones()` → `database/espacios.js` (`unaVez` anota en tabla `migraciones`).

## Espacios y horarios
- Tablas: `grillas`, `modulos`, `asignaciones` (+ `asignaciones_registro`), catálogos `docentes`, `materias`, `grupos`, `salones`.
- **Grilla principal**: columna `grillas.principal` (índice único). Se inicializa UNA vez desde `backend/src/datos/organizacion-octubre-2026.json` (PDF «ORGANIZACION OCTUBRE», id `org-octubre2026`). Si ya existe, no se sobrescribe. No se puede eliminar ni archivar, ni quitarle horarios con clases (`guardarGrillas`, `copiarGrilla`).
- Excepciones semanales (ausencia, cancelación, cambio de aula) usan `asignaciones.semana` y se revierten solas (`restablecerSemana`); la grilla base no cambia por semana.
- Frontend: `pages/panel/Grilla.jsx` abre la principal por defecto.

## Comandos
- Backend: `npm start`, `npm test` (node --test), `npm run importar-organizacion`.
- Frontend: `npm run dev`, `npm run build`.
- Tests: con `NODE_ENV=test` la grilla principal no se carga sola (`INICIALIZAR_GRILLA=1` la fuerza).
