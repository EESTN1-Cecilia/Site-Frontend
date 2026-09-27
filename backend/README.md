# Backend — Sitio Técnica

Backend Node.js/Express que se encarga de la **autenticación**, la **autorización por roles** y la **subida de archivos PDF a Google Drive**.

---

## 1. Cómo correr el código

### Requisitos
- Node.js (versión 18 o superior).
- Credenciales de una cuenta de servicio de Google Cloud (ver sección de permisos de Drive).

### Pasos

1. **Instalar dependencias**
   ```
   npm install
   ```

2. **Configurar variables de entorno**
   Copiar el archivo de ejemplo y completarlo:
   ```
   cp .env.example .env
   ```
   Editar `.env` y rellenar al menos `JWT_SECRET` (32 caracteres aleatorios o más; sin eso
   el servidor no arranca) y las variables de Google (`GOOGLE_PROJECT_ID`,
   `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `DRIVE_EMATP_ID`).
   Consultar la tabla de variables abajo.

3. **Crear la base de datos y los usuarios iniciales (seed)**
   ```
   ADMIN_PASSWORD=... SEED_PASSWORD=... node src/scripts/seed.js
   ```
   Esto crea el archivo `data/database.sqlite`, las tablas, las áreas y 4 usuarios
   (superadmin + cuentas de sector). Las dos contraseñas son obligatorias (8 caracteres
   o más) y también se pueden poner en `.env`: `ADMIN_PASSWORD` es la del superadmin y
   `SEED_PASSWORD` la inicial de las cuentas de sector. No hay contraseñas por defecto.

   El seed no toca cuentas que ya existen: cambiar `ADMIN_PASSWORD` en `.env` después de
   sembrar **no** cambia la contraseña de `admin`. Para aplicarla:
   ```
   npm run restablecer-admin
   ```

4. **Levantar el servidor**
   ```
   npm start
   ```
   (equivale a `node app.js`). Deberías ver `Servidor ejecutándose en el puerto 3000`.

5. **Probar**
   - Health check: `GET http://localhost:3000/api/health` → `{"status":"ok"}`.
   - Login: `POST /api/auth/login` con `{ "username": "admin", "password": "..." }`.

6. **Ejecutar los tests**
   ```
   npm test
   ```

### Scripts disponibles (`package.json`)
| Comando | Qué hace |
|---------|----------|
| `npm start` | Inicia el servidor (`node app.js`) |
| `npm test` | Corre la suite de tests (`node --test src/test/*.test.js`) |

---

## 2. Cómo funciona cada archivo

```
app.js
src/
├── controllers/   → lógica de negocio de cada recurso
├── database/      → conexión y helpers de SQLite
├── middleware/    → autenticación (JWT) y autorización (roles)
├── routes/        → definición de rutas HTTP
├── scripts/       → seed inicial
├── services/      → integración con Google Drive
├── test/          → tests
└── utils/         → constantes
```

### `app.js` (raíz)
Configura la aplicación Express: cabeceras de seguridad, CORS, parser JSON, monta las
rutas (`/api/auth`, `/api/usuarios`, `/api/upload`), el health check, y los manejadores
de error (404 y 500). En el arranque (salvo en modo test) ejecuta las migraciones y
levanta el servidor. Exporta `app` para que los tests puedan importarlo.

### `src/database/db.js`
Crea la conexión a SQLite (`data/database.sqlite` o el archivo de `TEST_DB_NAME` en
tests). Define el esquema (tablas `areas`, `usuarios`, `upload_logs`) y expone helpers
**asíncronos** por todos lados:
- `db.obtenerFila(sql, params)` → una fila.
- `db.obtenerFilas(sql, params)` → varias filas.
- `db.ejecutar(sql, params)` → ejecuta un cambio (INSERT/UPDATE/DELETE).
- `db.agregarColumnaSiNoExiste(...)` → migración segura para añadir columnas nuevas.
- `db.asegurarMigraciones()` → aplica migraciones al arrancar.

>Truco importante: se usan estos helpers porque `sqlite3` en modo sin callback devuelve
>el `Statement` en lugar de ejecutar la consulta; centralizando en helpers asíncronos se
>evitan errores de este tipo.

### `src/middleware/auth.Middleware.js`
Autenticación: lee el token `Authorization: Bearer`, lo verifica con `jsonwebtoken` y
busca al usuario en la BD por su `id`. Adjunta `req.usuario` (con rol y `area_id`
tomados de la **base de datos**, nunca del token/frontend). Rechaza con 401 si falta,
es inválido o el usuario no existe/está inactivo.

### `src/middleware/role.Middleware.js`
Autorización: `requerirRol(...)` recibe los roles permitidos y devuelve 403 si el rol de
`req.usuario` no está entre ellos. Se usa para restringir endpoints solo a `direccion`.

### `src/controllers/auth.Controller.js`
Lógica de autenticación:
- `iniciarSesion` — valida credenciales con `bcrypt`, emite el JWT y devuelve los datos
  del usuario. Evita enumeración de usuarios (respuestas idénticas para usuario
  inexistente o deshabilitado).
- `cerrarSesion` — cierre de sesión (el cliente descarta el token).
- `obtenerUsuario` — devuelve datos del usuario actual y sus destinos de subida permitidos.
- `cambiarMiContrasena` — cambio de contraseña propia con la regla de "una sola vez" para
  sectores (ver `password_change_allowed`).

### `src/controllers/usuario.Controller.js`
CRUD de usuarios **solo para `direccion`**: listar, ver, crear, actualizar, desactivar y
`permitirCambioContrasena` (habilita un nuevo cambio de contraseña a una cuenta).

### `src/controllers/upload.Controller.js`
Maneja la subida: recibe el archivo en memoria, valida que sea un PDF válido, resuelve la
carpeta de destino autorizada según el rol, sanitiza el nombre, sube a Drive y guarda la
auditoría en `upload_logs`.

### `src/services/googleDriveService.js`
Clase singleton que envuelve la Google Drive API v3 con una **service account** y el
scope `drive.file`. Expone `subirArchivo(buffer, nombre, carpetaId, mime)` y
`eliminarArchivo(id)`.

### `src/routes/*.Route.js`
3 archivos que definen las rutas y enganchan middleware + controllers:
- `auth.Route.js` → `/login`, `/logout`, `/me`, `/password`.
- `usuario.Route.js` → CRUD de usuarios + `permitir-cambio/:id`. **Importante:** la ruta
  `permitir-cambio/:id` debe declararse antes de `/:id` para que Express no la capture
  como un id.
- `upload.Route.js` → `POST /` con multer.

### `src/utils/roles.js`
Constantes `ROLES.JEFATURA_AREA`, `ROLES.SERVIDOR`, `ROLES.DIRECCION` y las listas fijas
de roles válidos.

### `src/scripts/seed.js`
Crea (si no existen) las áreas y los 4 usuarios iniciales con las contraseñas de
`ADMIN_PASSWORD` y `SEED_PASSWORD` (obligatorias). Idempotente: se puede correr varias
veces sin duplicar datos.

### `src/test/*.test.js`
Tests con el runner nativo `node:test` (sin dependencias extra). Cubren autenticación,
roles, subida, y seguridad (IDOR/BOLA, privilege escalation, SQL injection, path
traversal) además del flujo de cambio de contraseña.

---

## 3. Endpoints y qué hacen

Todas las rutas están bajo `/api`. Las que requieren autenticación usan la cabecera
`Authorization: Bearer <token>` obtenido en el login.

| Método | Ruta | Acceso | Qué hace |
|--------|------|--------|----------|
| POST | `/api/auth/login` | público | Inicia sesión y devuelve el JWT + datos del usuario (con límite de intentos) |
| POST | `/api/auth/logout` | autenticado | Cierra sesión y revoca ese token en el servidor |
| GET | `/api/auth/me` | autenticado | Devuelve datos del usuario actual y sus destinos de subida |
| PUT | `/api/auth/password` | autenticado | Cambia la contraseña propia (regla de una sola vez para sectores) |
| GET | `/api/usuarios` | dirección | Lista usuarios |
| GET | `/api/usuarios/:id` | dirección | Ver un usuario |
| GET | `/api/usuarios/areas` | dirección | Lista áreas disponibles |
| POST | `/api/usuarios` | dirección | Crea un usuario |
| PUT | `/api/usuarios/:id` | dirección | Actualiza un usuario |
| PUT | `/api/usuarios/permitir-cambio/:id` | dirección | Habilita un nuevo cambio de contraseña de una cuenta |
| PUT | `/api/usuarios/:id/password` | dirección | Restablece la contraseña de una cuenta y cierra sus sesiones |
| DELETE | `/api/usuarios/:id` | dirección | Desactiva un usuario |
| POST | `/api/upload` | autenticado + rol válido | Sube un PDF a Google Drive |
| GET | `/api/health` | público | Health check |
| GET | `/api/contenido` | público | Todo el contenido editable del sitio (textos, ajustes, mesas, programas, proyectos y notas publicadas). `null` en lo que nunca se guardó |
| PUT | `/api/contenido/textos` | quien edita esa página | Reemplaza los textos de una página (`{ pagina, textos }`) |
| PUT | `/api/ajustes` | dirección | Cambia ajustes del sitio (inscripción, redes, quién edita cada página) |
| GET | `/api/publicaciones` | autenticado | Gestión ve todas las notas; los demás roles, sólo las publicadas |
| POST | `/api/publicaciones` | dirección, jefatura | Crea o actualiza una nota; si no la guarda Dirección queda pendiente |
| POST | `/api/publicaciones/:id/aprobar` · `/devolver` | dirección | Publica la nota o la devuelve con cambios |
| DELETE | `/api/publicaciones/:id` | dirección, jefatura | Borra una nota |
| PUT | `/api/mesas` | dirección, jefatura, server | Cronograma completo de mesas |
| PUT | `/api/programas` | dirección, jefatura | Lista completa de programas de la portada |
| PUT | `/api/proyectos/:area` | dirección, jefatura | Proyectos de una orientación |

### Contenido del sitio

El frontend (`frontend/`) muestra el contenido original que trae escrito hasta que
gestión guarda algo: desde ahí vale lo que está en las tablas `contenido` (una fila por
sección, en JSON) y `publicaciones`. Los permisos se controlan acá, no en el frontend:

- **Textos de una página:** Dirección, o los roles que Dirección eligió para esa página
  (`ajustes.edicionPaginas`; si no eligió, el reparto por defecto de `src/utils/contenido.js`).
  Cada clave tiene que ser de la página que se guarda.
- **Notas:** lo que guarda alguien que no es Dirección vuelve a quedar pendiente; sólo
  Dirección aprueba o devuelve.
- **Links e imágenes:** sólo `https://`, rutas del propio sitio o imágenes subidas
  (`data:image/…`); nada de `javascript:`.
- Estas rutas aceptan cuerpos de hasta 8 MB (las páginas y notas llevan imágenes); el
  resto de la API sigue en 10 KB.

### Detalle de los cuerpos de ejemplo

**POST `/api/auth/login`**
```json
{ "username": "admin", "password": "MiContraseñaSegura123" }
```
Respuesta: `{ "token": "<JWT>", "usuario": { "id": 1, "username": "admin", "rol": "direccion", ... } }`

**PUT `/api/auth/password`** (autenticado)
```json
{ "password_actual": "...", "nueva_password": "NuevaPass123" }
```
Cambiar la contraseña cierra **todas** las sesiones abiertas de la cuenta (los tokens
anteriores dejan de valer). La respuesta trae un `token` nuevo para seguir trabajando.

**POST `/api/upload`**
Multipart con el campo `file` (el PDF). Si el rol es `direccion`, puede incluir el campo
`destination` lógico (`"server"` o el `nombre` de un área). Para el resto de roles la
carpeta se resuelve sola y no se acepta `destination`. No se aceptan otros campos: un
pedido con más de un archivo o más de dos campos se rechaza con 400.

**PUT `/api/usuarios/permitir-cambio/:id`** (solo dirección)
Habilita un nuevo cambio de contraseña de la cuenta cuyo `id` se pasa en la URL.

**PUT `/api/usuarios/:id/password`** (solo dirección)
```json
{ "nueva_password": "ContraseñaTemporal123" }
```
Pone una contraseña nueva (por ejemplo si un sector perdió el acceso), cierra todas las
sesiones de esa cuenta y le deja un cambio habilitado para que el sector elija la suya.

**PUT `/api/usuarios/:id`** y **DELETE `/api/usuarios/:id`**
Dirección no puede desactivar su propia cuenta ni quitarse el rol `direccion`. Al cambiar
el rol se aplican las mismas reglas de área que al crear.

---

## 4. Permisos de Google Drive

### Modelo de roles
Roles definidos en `src/utils/roles.js`:

| Rol | Carpeta de jefatura propia | Carpeta server/EMATP | Otras carpetas |
|-----|---------------------------|----------------------|----------------|
| `jefatura_area` | SÍ (su `area_id`) | NO | NO |
| `server` | NO | SÍ | NO |
| `direccion` | SÍ (cualquier área) | SÍ | NO |

### Cómo se resuelve la carpeta de destino
El backend **nunca** confía en un `folderId` que envíe el frontend. Resuelve la carpeta así:
- **jefatura_area**: usa su `area_id` (de la BD) → `areas.drive_folder_id`.
- **server**: usa `DRIVE_EMATP_ID` de `.env`.
- **direccion**: puede mandar un `destination` **lógico** (`"server"` o un `nombre` de área);
  el backend lo traduce al `drive_folder_id` real validando contra la BD.

### Principio de menor privilegio
- La service account usa el scope `https://www.googleapis.com/auth/drive.file`, que solo
  permite acceder a los archivos que la cuenta creó o a los que se le compartió. No tiene
  acceso a todo el Drive.
- Solo se necesita **compartir** con la service account las carpetas destino y darle rol
  de **editor**.

### Configuración paso a paso

1. **Crear la service account** en Google Cloud Console → activar la **Google Drive API** →
   crear una service account → generar clave JSON/privada.
2. Copiar `client_email` y `private_key` del JSON a `GOOGLE_CLIENT_EMAIL` y
   `GOOGLE_PRIVATE_KEY` en `.env` (la clave privada suele ir con `\n`, el código lo convierte).
3. **Crear las carpetas en Google Drive** (una por área y una para server/EMATP).
4. **Compartir** cada carpeta con el correo de la service account (`GOOGLE_CLIENT_EMAIL`)
   con permiso de **editor**.
5. **Obtener el ID** de cada carpeta: el ID aparece en la URL
   `https://drive.google.com/drive/folders/ID_DE_LA_CARPETA`.
6. Guardar el ID de cada área en la tabla `areas` (`drive_folder_id`) y el del server en
   `DRIVE_EMATP_ID`.
   ```sql
   INSERT INTO areas (nombre, drive_folder_id) VALUES ('matematica', 'ID_CARPETA_MATEMATICA');
   INSERT INTO areas (nombre, drive_folder_id) VALUES ('lengua', 'ID_CARPETA_LENGUA');
   ```
7. Asignar `area_id` al usuario `jefatura_area` correspondiente en la tabla `usuarios`.

### Flujo de una subida
1. Cliente autenticado envía el PDF (`POST /api/upload`).
2. El backend valida el PDF (MIME + extensión + magic bytes `%PDF` + tamaño ≤ `MAX_FILE_SIZE`).
3. Resuelve la carpeta destino según el rol (nunca con `folderId` del cliente).
4. Sanitiza el nombre del archivo.
5. Sube a Drive con la service account mediante `drive.file`.
6. Registra la operación en `upload_logs` (auditoría).

---

## Variables de entorno (`.env`)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `JWT_SECRET` | Clave secreta para firmar tokens: 32 caracteres aleatorios o más (obligatoria) |
| `TRUST_PROXY` | Si el backend corre detrás de un proxy, cuántos saltos confiar (p. ej. `1`), para que el límite de intentos de login vea la IP real |
| `GOOGLE_PROJECT_ID` | ID del proyecto Google Cloud |
| `GOOGLE_CLIENT_EMAIL` | Correo de la service account |
| `GOOGLE_PRIVATE_KEY` | Clave privada de la service account |
| `DRIVE_JEFE_AREA_ID` | Carpeta por defecto de áreas jefatura (usada por el seed) |
| `DRIVE_EMATP_ID` | Carpeta del rol `server` / EMATP |
| `MAX_FILE_SIZE` | Límite de subida en bytes (por defecto 5 MB) |
| `CORS_ORIGIN` | Origen permitido para CORS (por defecto `http://localhost:5173`) |
| `ADMIN_PASSWORD` | (solo seed, obligatoria) contraseña inicial del superadmin |
| `SEED_PASSWORD` | (solo seed, obligatoria) contraseña inicial de las cuentas de sector |

> `.env` está en `.gitignore` y nunca debe subirse al repositorio. `.env.example` tiene
> todas las variables sin valores.

---

## Base de datos (SQLite)

Consultas 100 % parametrizadas. No se guardan PDFs como BLOB.

```
areas        (id, nombre UNIQUE, drive_folder_id, activo, created_at)
usuarios     (id, username UNIQUE, password_hash, rol CHECK, area_id FK, activo,
              password_change_allowed, password_change_count, token_version,
              created_at, updated_at)
upload_logs  (id, user_id FK, filename, original_name, destination, drive_file_id, status, created_at)
tokens_revocados (jti PK, expira)
contenido    (seccion PK, datos JSON, actualizado_por FK, updated_at)
publicaciones (id PK, datos JSON, estado CHECK, autor_id FK, created_at, updated_at)
```

- `token_version`: sube cada vez que cambia la contraseña; los tokens con una versión
  anterior dejan de valer.
- `tokens_revocados`: tokens cerrados con logout antes de vencer (se borran al vencer).

- `upload_logs` es la **auditoría**: quién subió qué archivo, a dónde, cuándo y el resultado.
- `password_change_allowed` (0/1): si la cuenta puede cambiar su contraseña actualmente.
- `password_change_count` (entero): cuántos cambios de contraseña ha hecho (auditoría).

---

## Modelo de cuentas de sector

Las cuentas de sector (`jefatura_area` y `server`) son **compartidas y no personales**: las
usan varias personas y la cuenta sigue existiendo aunque se vaya alguien.

Para que nadie cambie la contraseña de una cuenta compartida sin que la escuela se entere,
cada cuenta de sector solo puede **cambiar su contraseña una vez** por ciclo:

1. El seed asigna `SEED_PASSWORD` y deja `password_change_allowed = 1`.
2. El sector inicia sesión y cambia la contraseña (fin del primer uso).
3. Queda `password_change_allowed = 0` y `password_change_count = 1`: ya no puede cambiarla.
4. Si se olvidó, el **superadmin** (`direccion`) usa `PUT /api/usuarios/permitir-cambio/:id`
   para habilitar un nuevo cambio, o `PUT /api/usuarios/:id/password` para ponerle una
   contraseña nueva si nadie la recuerda.

Cuando alguien deja de usar una cuenta compartida conviene cambiarle la contraseña: eso
cierra todas las sesiones abiertas de la cuenta, incluida la de esa persona.

Reglas:
- El **superadmin (`direccion`)** puede cambiar su contraseña **siempre**, no se auto-bloquea.
- Los **sectores** cambian **una vez** y quedan bloqueados hasta que `direccion` los habilite.

---

## Seguridad aplicada

- JWT firmado con HS256, con issuer/audience propios, validado y con expiración; secretos
  desde `.env`. El servidor no arranca sin un `JWT_SECRET` de 32 caracteres o más.
- Revocación: logout revoca ese token; cambiar o restablecer la contraseña invalida todos
  los tokens de la cuenta.
- Login con límite de intentos fallidos (20 por IP y 5 por usuario cada 15 minutos) y con
  a lo sumo 2 comparaciones bcrypt a la vez. Siempre se corre bcrypt, aunque el usuario no
  exista, para que el tiempo de respuesta no revele qué cuentas existen.
- Sin contraseñas por defecto: el seed exige `ADMIN_PASSWORD` y `SEED_PASSWORD`.
- Cambio de contraseña atómico: dos pedidos simultáneos no pueden gastar dos veces el cambio.
- Upload con límite de campos (1 archivo, 2 campos de texto de 1 KB).
- Cabeceras de seguridad: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Cache-Control: no-store` y `X-XSS-Protection: 0` (el filtro viejo de los navegadores
  está obsoleto).
- CORS restringido a `CORS_ORIGIN`.
- Roles validados en backend contra una lista fija.
- SQL parametrizado (anti-inyección).
- Errores genéricos en producción (sin stack traces, rutas ni credenciales).
- `area_id`/`folderId` nunca vienen de confianza del cliente: se resuelven en la BD.
- Logging sin contraseñas, tokens ni secretos.
- Solo PDFs válidos (MIME + extensión + magic bytes `%PDF`) y con límite de tamaño.

## Notas para revisión manual

- La configuración real de Google Drive (IDs de carpetas y service account) debe completarse
  en `.env` y en la tabla `areas`.
- En producción conviene activar `Secure` en las cookies si se usan; aquí se usa
  `Authorization: Bearer` (JWT en memoria/localStorage del frontend).
- El límite de intentos vive en memoria: con varias instancias del backend cada una lleva
  su cuenta, y se reinicia al reiniciar el proceso. Detrás de un proxy hay que definir
  `TRUST_PROXY`; si no, todos los pedidos parecen venir de la misma IP.
- El seed usa `DRIVE_JEFE_AREA_ID` como placeholder de las áreas; ajustar cada
  `drive_folder_id` en la BD a la carpeta real correspondiente.
