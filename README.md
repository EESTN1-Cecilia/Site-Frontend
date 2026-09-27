# Sitio de la Técnica 1 · Cecilia Berdichevski

Sitio web de la E.E.S. Técnica N°1 "Cecilia Berdichevski" (Esteban Echeverría). Tiene dos partes:

- **Sitio público**: lo que ven alumnos y familias (portada, evaluación de saberes, intensificación y previas, novedades, inscripción y proyectos de cada orientación).
- **Sistema de gestión** (`/panel`): lo usa el personal para cargar contenido, editar las páginas del sitio y administrar cuentas. Cada rol ve y edita solo lo que le corresponde.

```
frontend/   React 19 + Vite. Sitio público y sistema de gestión.
backend/    Node.js + Express + SQLite. Login (JWT), permisos por rol, contenido del sitio y subida de PDF a Google Drive.
```

El detalle del backend (endpoints, tablas, permisos de Drive) está en [backend/README.md](backend/README.md).

---

## Cómo levantarlo en tu computadora

### Requisitos
- **Node.js 20.19 o más nuevo** (se recomienda la versión 22 LTS).
- npm (viene con Node).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Completar en `backend/.env`:

| Variable | Qué poner |
|----------|-----------|
| `JWT_SECRET` | 32 caracteres aleatorios o más. Sin esto el servidor no arranca. Se genera con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_PASSWORD` | Contraseña de la cuenta `admin` (8 caracteres o más). |
| `SEED_PASSWORD` | Contraseña inicial de las cuentas de sector (8 caracteres o más). |
| `CORS_ORIGIN` | Dirección del frontend. En local: `http://localhost:5173`. |
| `GOOGLE_*`, `DRIVE_*` | Solo hacen falta para subir PDF a Drive. Para probar el sitio se pueden dejar vacías. |

Crear la base de datos y las cuentas de prueba, y levantar el servidor:

```bash
node src/scripts/seed.js
npm start
```

El backend queda en `http://localhost:3000` (`GET /api/health` responde `{"status":"ok"}`).

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

El sitio queda en `http://localhost:5173`. Busca el backend en `http://localhost:3000/api`. Si el backend está en otra dirección, copiar `frontend/.env.example` como `frontend/.env.local` y cambiar `VITE_API_URL`.

---

## Cuentas de ejemplo para probar

El seed (`backend/src/scripts/seed.js`) crea estas cuatro cuentas. **No tienen contraseñas fijas**: usan las que pongas en `ADMIN_PASSWORD` y `SEED_PASSWORD` del `.env`.

Para probar en tu computadora podés usar, por ejemplo:

```env
ADMIN_PASSWORD=Admin-prueba-2026
SEED_PASSWORD=Sector-prueba-2026
```

Con esos valores, las cuentas quedan así:

| Usuario | Contraseña | Rol | Qué puede hacer |
|---------|------------|-----|-----------------|
| `admin` | `Admin-prueba-2026` | Dirección | Todo: editar todas las páginas, aprobar notas, cuentas y permisos (**Permisos y publicación**). |
| `jefatura_matematica` | `Sector-prueba-2026` | Jefatura de Área (Matemática) | Evaluación, Previas y Proyectos; mesas, programas, proyectos de alumnos y notas. |
| `jefatura_lengua` | `Sector-prueba-2026` | Jefatura de Área (Lengua) | Lo mismo que la otra jefatura. |
| `ematp` | `Sector-prueba-2026` | Encargada de Server | Cronograma de mesas e **Inventario y reservas**. El resto del sitio lo ve en modo lectura. |

Para entrar: `http://localhost:5173/#/login`, o el botón **Ingresar** del menú.

> ⚠️ **Estas contraseñas son solo para probar en local.** En el servidor real hay que usar otras, largas y que nadie más conozca, y no escribirlas en ningún archivo del repositorio.

Cosas para tener en cuenta:
- Las cuentas de sector pueden **cambiar su contraseña una sola vez**. Dirección puede habilitar otro cambio o ponerles una contraseña nueva.
- El seed **no pisa cuentas que ya existen**. Si ya sembraste con otra contraseña y querés cambiar la de `admin`, cambiá `ADMIN_PASSWORD` en `.env` y corré `npm run restablecer-admin` en `backend/`.
- Inicio, Novedades e Inscripción las edita **Secretaría** por defecto. Como el seed no crea una cuenta de Secretaría, para probarlas entrá con `admin` (Dirección edita todo) o repartí las páginas desde **Permisos y publicación**.
- Después de 5 intentos fallidos con el mismo usuario (o 20 desde la misma conexión) el login se bloquea hasta 15 minutos.

---

## Qué hay en el sitio

### Páginas públicas

| Página | Dirección |
|--------|-----------|
| Inicio | `/#/` |
| Evaluación de saberes | `/#/evaluacion` |
| Intensificación/Previas | `/#/previas` |
| Novedades | `/#/novedades` |
| Inscripción | `/#/inscripcion` |
| Proyectos · Ciclo Básico | `/#/proyectos/ciclo-basico` |
| Proyectos · Técnico en Informática | `/#/proyectos/informatica` |
| Proyectos · Técnico en Programación | `/#/proyectos/programacion` |

El sitio usa rutas con `#`, así que funciona en cualquier hosting estático sin configurar redirecciones.

### Sistema de gestión

Se entra desde **Ingresar**. Las secciones que aparecen dependen del rol:

- **Tablero**, **Alumnos**, **Notas y boletines**, **Asistencia**, **Espacios y horarios**, **Seguimiento curricular**.
- **Sitio público**: todas las páginas del sitio y quién edita cada una. Desde ahí también se cargan mesas, programas, proyectos de alumnos, notas y avisos.
- **Inventario y reservas** (Server).
- **Permisos y publicación** (solo Dirección): cuentas, qué rol edita cada página y aprobación de notas.

### Editar el sitio público

En **Sitio público → Editar** se abre la página tal como la ven los alumnos:

- **En el lugar**: clic en cualquier texto o imagen para cambiarlo. Las secciones y tarjetas se pueden mover, duplicar, ocultar o cambiar de fondo.
- **Editor completo** (GrapesJS): arma la página entera en pantalla completa, con bloques del sitio, estilos con la paleta de la escuela y vista de computadora, tablet y celular.
  - Las **partes automáticas** (cronograma de mesas, notas, cuadernillos, proyectos, formulario…) se arman con sus datos. En el editor se mueven, se borran o se vuelven a agregar, y todo lo de adentro se puede cambiar: textos (doble clic), links, imágenes, fechas, mostrar u ocultar.
  - **Volver a la página de siempre** deja de usar lo armado con el editor completo.
- **Zona libre**: al final de cada página hay un espacio para sumar textos, imágenes, videos, tablas y más.
- El **menú de arriba** y el **pie de página** se editan desde la página de Inicio.

Nada se ve en el sitio hasta tocar **Publicar**. **Descartar cambios** vuelve a lo publicado.

---

## Tests y build

En `frontend/`:

```bash
npm test          # tests del frontend
npm run build     # build de producción en frontend/dist
```

En `backend/`:

```bash
npm test          # tests del backend (usan una base de datos aparte)
```

## Para publicarlo

- **Frontend**: `npm run build` genera `frontend/dist`, que se sube a cualquier hosting estático. `frontend/vercel.json` agrega las cabeceras de seguridad si se usa Vercel. Definir `VITE_API_URL` con la dirección del backend.
- **Backend**: necesita `JWT_SECRET`, `CORS_ORIGIN` con la dirección real del frontend y, detrás de un proxy (Render, Railway, nginx…), `TRUST_PROXY=1` para que el límite de intentos use la IP real. La base de datos es un archivo SQLite en `backend/data/`: tiene que quedar en un disco que no se borre entre reinicios.
