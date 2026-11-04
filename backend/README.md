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
| `npm run restablecer-admin` | Pone a `admin` la contraseña de `ADMIN_PASSWORD` y cierra sus sesiones |
| `npm run importar-organizacion` | Revisa o importa el PDF de organización (ver «Importar la organización institucional») |
| `npm run unificar-grillas` | Une una grilla a otra (`-- --origen X --destino Y`, con `--aplicar` para guardar): cada clase va al módulo de su turno que más se superpone y conserva su horario |
| `npm run depurar-catalogos` | Muestra (o con `-- --aplicar`, borra) los docentes, materias y grupos que no están en la grilla oficial (ver «Depurar catálogos») |
| `npm run restablecer-cuentas` | Solo en local: vuelve las 4 cuentas del seed a las contraseñas de `ADMIN_PASSWORD` y `SEED_PASSWORD` (para probar con una base que ya existía) |

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
tests). Define el esquema (tablas `areas`, `usuarios`, `upload_logs`, `contenido`,
`publicaciones` y las del plano: `salones`, `docentes`, `materias`, `asignaciones`) y expone helpers
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
- `asignaciones.Route.js` → Espacios y horarios + plano: asignaciones, espacios, grillas y
  módulos, catálogo de docentes, materias y grupos, y avisos en vivo (ver más abajo).

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

### Espacios y horarios + plano del colegio

La grilla semanal (**Espacios y horarios**) y el **plano** del Tablero usan **una sola
fuente de datos**: la tabla `asignaciones`. Cada fila es «tal docente da tal materia a tal
grupo, en tal espacio, tal día y módulo». Lo que se carga en una pantalla aparece en la otra.

| Método | Ruta | Quién | Qué hace |
|--------|------|-------|----------|
| GET | `/api/asignaciones?dia=&piso=&grilla=` | con sesión | Asignaciones + espacios, grillas con módulos, docentes, materias, grupos, tipos y estados (una sola llamada). |
| POST | `/api/asignaciones` | Jefatura, Dirección | Crea `{ grilla_id, hora, dia, salon_id, docente_id, materia_id, grupo_id?, inicio?, fin?, alumnos?, estado?, observaciones? }`. |
| PUT | `/api/asignaciones/:id` | Jefatura, Dirección | Modifica. Lleva `version` (la que vio quien edita). |
| DELETE | `/api/asignaciones/:id?version=N` | Jefatura, Dirección | Quita. |
| POST | `/api/asignaciones/intercambiar` | Jefatura, Dirección | `{ a: { id, version }, b: { id, version } }`: cambian de día y módulo (arrastrar en la grilla). |
| POST | `/api/asignaciones/verificar` | Jefatura, Dirección | Devuelve los conflictos y espacios libres sin guardar. |
| PUT | `/api/asignaciones` | Jefatura, Dirección | «Guardar cambios»: `{ altas: [...], cambios: [{ id, version, ... }], bajas: [{ id, version }] }` en una transacción; si una sola cosa falla (dato inválido, versión vieja, choque) no se guarda nada y el error dice cuál. |
| POST | `/api/asignaciones/:id/cambiar-aula` | Jefatura, Dirección | `{ salon_id, version }`: cambio de aula excepcional; guarda el aula habitual en `salon_habitual`. Pedir el aula habitual la restituye. |
| GET | `/api/asignaciones/registro?limite=` | con sesión | Historial de altas, cambios, bajas e intercambios. |
| GET | `/api/disponibilidad?dia=&grilla_id=&hora=[&inicio=&fin=]` | con sesión | Espacios libres y ocupados en ese momento. |
| GET | `/api/salones`, `/api/salones/:id` | con sesión | Espacios (y uno con sus asignaciones). |
| PUT | `/api/salones/:id` | Jefatura, Dirección | `{ nombre?, tipo?, capacidad?, habilitado? }`. |
| POST | `/api/docentes`, `/api/materias`, `/api/grupos` | Jefatura, Dirección | Agrega `{ nombre[, curso] }` al catálogo; si ya existe, devuelve el mismo. |
| PUT | `/api/grillas` | Jefatura, Dirección | Grillas y módulos `{ grillas: [{ id, nombre, vigente, horas: [{ id, nombre, inicio, fin }] }] }`. Lo que se saca se borra con sus clases. |
| POST | `/api/grillas/:id/copiar` | Jefatura, Dirección | `{ nombre, periodo, archivarOriginal }`: copia módulos y clases (activas, en su aula habitual). Con `archivarOriginal`, la copia queda vigente y la original archivada; si choca con otra grilla vigente, 409 y no se copia nada. |
| GET | `/api/panel` | con sesión | Grillas y plano en el formato anterior (compatibilidad). |
| PUT | `/api/plano` | Jefatura, Dirección | Nombres y cancelados en el formato anterior (compatibilidad). |
| GET | `/api/eventos` | con sesión | Avisos en vivo (Server-Sent Events), ver abajo. |

Reglas (`src/controllers/asignaciones.Controller.js`). El frontend avisa antes, pero el
backend es el que decide; si no se cumplen, responde 409 con `conflictos` y `alternativas`:

- **Superposición:** un espacio, un docente o un grupo no pueden tener dos clases activas
  superpuestas. Dos intervalos se superponen si cada uno empieza antes de que termine el
  otro: 08:00–09:20 y 09:20–10:40 **no** chocan (las consecutivas se permiten). Si alguna de
  las dos no tiene hora (el módulo no la tiene cargada), se compara por módulo.
- Sólo las asignaciones `activa` ocupan; `docente_ausente` y `suspendida` (clase cancelada) dejan el espacio libre.
- **Excepciones de la semana:** marcar ausencia, cancelar o cambiar de aula guarda en `semana` el lunes
  de la semana en curso. Al empezar la semana siguiente (se revisa al pedir los datos y cada 15
  minutos) la clase vuelve a `activa` y a su aula habitual; si esa aula quedó ocupada, se queda
  donde está y se anota en el historial.
- Una clase puede no tener espacio (`salon_id` vacío): las del PDF en «SUM» o «TALLER» hasta que se les asigne un aula.
- **Aula compartida** (`asignaciones.compartida`): dos clases marcadas así pueden compartir aula y grupo
  (así figuran en la organización oficial); con cualquier otra clase siguen chocando, y el docente
  nunca se comparte. Las marca el importador con `--compartidas`.
- **Grillas vigentes:** cada grilla tiene `vigente`. Dos clases compiten sólo si son de la misma
  grilla o si las dos grillas están vigentes: una semana archivada no ocupa aulas ni choca con la actual.
- **Sólo aulas:** cada espacio tiene `clasificacion` `AULA` (admite clases) o `ESPACIO_COMUN`
  (PAÑOL, E.O.E., administración, patios…: se ve y se consulta, pero no admite clases). Crear,
  modificar o intercambiar una clase en un espacio común se rechaza con 400, también si se
  pide directo a la API. Los espacios comunes no aparecen como libres ni como alternativa.
- No se asigna un espacio deshabilitado ni más alumnos que su capacidad (si está cargada).
- **Dos personas a la vez:** cada asignación tiene `version`. Si alguien la cambió mientras
  otra persona la editaba, el segundo guardado recibe 409 con `cambio: true` en vez de pisarla.
- Todas las escrituras van en una transacción (`db.transaccion`) y de a una (cola), así el
  control de conflictos y el guardado son un solo paso.
- Cambiar la hora de un módulo que haría superponer clases existentes se rechaza (409) y no
  se guarda nada.

**Avisos en vivo** (`src/utils/eventos.js`): cada pantalla abierta mantiene `GET /api/eventos`.
Cuando alguien guarda, el servidor manda `event: cambio` con `{ tipo, version }` y las
pantallas vuelven a pedir los datos: lo que cambia una persona aparece en la de las demás sin
recargar. No lleva datos de docentes ni de grupos. Funciona con un único proceso de Node (como
corre hoy); con varias instancias detrás de un balanceador haría falta un canal compartido.

**Estado libre / ocupado / por finalizar:** no se guarda. Lo calcula el frontend
(`frontend/src/horario.js`) con las asignaciones y la hora local del dispositivo.

### Depurar catálogos

`npm run depurar-catalogos` compara docentes, materias y grupos con la grilla oficial ya
extraída (`src/datos/organizacion-octubre-2026.json`) y lista lo que no figura, las clases que
lo usan y los grupos que toman el nombre oficial («Grupo 1.1» → «1.1», mismo id). No cambia
nada. Con `-- --aplicar` lo **borra definitivamente** en una transacción: primero las clases que
los usan (no quedan referencias huérfanas), después los catálogos, y limpia las listas de cada
grilla. Hacer un respaldo antes (`VACUUM INTO`, ver más abajo). Queda en el historial.

### Tablero de Dirección

`GET /api/direccion/resumen` (sólo Dirección, `src/controllers/direccion.Controller.js`): el equipo por nivel
(Dirección > Jefatura de Área > EMATP) con lo que hizo cada cuenta en los últimos 7 días, la actividad
reciente de todos (historial de clases, cartelera, publicaciones, archivos subidos; lo sin usuario figura
como «Sistema»), números de la grilla vigente y de la semana, y lo pendiente para Dirección. Sólo lectura.

### Cartelera digital

Imágenes para los televisores de los corredores y el enlace de cada televisor
(`src/controllers/cartelera.Controller.js`, tablas `cartelera` y `pantallas`).

| Método | Ruta | Quién | Qué hace |
|--------|------|-------|----------|
| GET | `/api/cartelera` | Dirección, Jefatura, EMATP | Imágenes (sin el archivo), cuáles pasan hoy, qué puede cambiar cada uno y, para Dirección y Jefatura, los televisores. |
| POST | `/api/cartelera` | Dirección, Jefatura, EMATP | Multipart: `archivo` (JPG/PNG/WEBP/GIF reales, hasta 5 MB) + `titulo`, `duracion` (5–120 s), `desde`, `hasta`, `fijada`. Queda con el nivel de quien la carga. |
| PUT / DELETE | `/api/cartelera/:id` | ídem | Cambia (título, duración, fechas, `activo`, `fijada`) o quita. Sólo lo del propio nivel o de niveles de abajo (403 si no). |
| POST | `/api/cartelera/:id/mover` | ídem | `{ hacia: "arriba" \| "abajo" }` dentro de su nivel. |
| POST / DELETE | `/api/cartelera/pantallas[/:id]`, `/api/cartelera/pantallas/:id/renovar` | Dirección, Jefatura | Televisores: crear, quitar y renovar el enlace (el anterior deja de valer). |
| GET | `/api/cartelera/pantalla/:token` | el televisor (sin sesión) | Salones, clases de las grillas vigentes, imágenes que pasan hoy en orden y la hora del servidor. |
| GET | `/api/cartelera/imagen/:clave` | sin sesión | La imagen, por su clave aleatoria. |

Prioridad principal: Dirección; segunda: Jefatura de Área; tercera: EMATP (en la base, `nivel` 3, 2 y 1). En pantalla pasan por nivel y
orden. Si hay una fijada vigente, de su nivel sólo pasan las fijadas y de los niveles de abajo
nada; los de arriba siguen.

### Importar la organización institucional (PDF de grillas)

El PDF de organización de talleres («ORGANIZACION OCTUBRE.pdf») se incorpora en dos pasos,
los dos repetibles sin duplicar nada:

1. **Extraer** (en `frontend/`, usa `pdfjs-dist`): lee todas las páginas y guarda cada celda
   tal cual figura (horario, materia, grupo, alumnos, espacio, docente) en
   `backend/src/datos/organizacion-octubre-2026.json`.
   ```bash
   node scripts/extraer-organizacion.mjs "C:/ruta/ORGANIZACION OCTUBRE.pdf" ../backend/src/datos/organizacion-octubre-2026.json
   ```
2. **Importar** (en `backend/`):
   ```bash
   npm run importar-organizacion                              # sólo revisa: informe, sin cambios
   npm run importar-organizacion -- --aplicar                 # carga materias, docentes y grupos
   npm run importar-organizacion -- --aplicar --con-clases    # además, grillas y clases del PDF
   npm run importar-organizacion -- --aplicar --con-clases --compartidas  # también las que comparten aula con otra del PDF
   ```

El informe queda en `data/informe-importacion-organizacion.md` (nuevos, coincidentes y dudosos).
Reglas (`src/utils/importacion.js`, `src/utils/normalizar.js`):

- Se compara sin tildes, mayúsculas ni palabras de enlace: «LABORATORIO SISTEMAS OPERATIVOS» y
  «Laboratorio de Sistemas Operativos» son la misma materia; «1.1» y «Grupo 1.1», el mismo
  grupo. Lo que ya existe conserva su id y su nombre (a un grupo sólo se le completan datos vacíos).
- Una sigla («P.D.I.S.C.», «PDISC») se une con un nombre completo del mismo PDF sólo si sus
  iniciales coinciden exactamente; si no, queda como sigla y para revisar.
- Lo dudoso se guarda igual con `revisar` = motivo: siglas sin nombre completo, materias que
  aparecen una o dos veces y se parecen a otra, grupos con distinta cantidad de alumnos según
  la página, docentes con sólo el apellido que pueden ser otro («Grasso» → ¿Grasso C. o E.?).
- Los espacios no se crean (son los del plano): se vinculan por nombre y los que no están
  (SUM, AULA 9, TALLER) se informan. Una clase con espacio fuera del plano se importa sin
  espacio y guarda en `observaciones` el que figura en el PDF.
- `--asignar-espacio TALLER=pb-18` pasa al espacio del plano indicado las clases importadas
  que quedaron sin espacio y figuran con ese nombre en el PDF, de a una y sólo si no se
  superponen con otra en ese espacio; las que chocan siguen sin espacio y se listan en el informe.
- Las clases del PDF sólo se importan con `--con-clases` (el PDF es la organización de un
  período, no necesariamente lo vigente): una grilla por turno con sus módulos, cada celda una
  vez (`asignaciones.origen`), y las que se superponen con otra no se guardan y se listan.

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
salones      (id PK "pb-8", piso CHECK, nombre, tipo, clasificacion CHECK('AULA','ESPACIO_COMUN'),
              capacidad NULL, habilitado)
docentes     (id, nombre UNIQUE NOCASE, revisar, activo, created_at)
materias     (id, nombre UNIQUE NOCASE, revisar, activo, created_at)
grupos       (id, nombre UNIQUE NOCASE, curso, alumnos, turno, revisar, activo, created_at)
grillas      (id PK "Básico", nombre, orden, organizacion, periodo, turno, ciclo,
              dias JSON, grupos JSON, materias JSON)   -- vacío = todos
modulos      (id, grilla_id FK→grillas ON DELETE CASCADE, clave "1°/2°", nombre,
              inicio "HH:MM" NULL, fin NULL, orden, UNIQUE(grilla_id, clave))
asignaciones (id, modulo_id FK→modulos ON DELETE CASCADE, dia CHECK, salon_id FK NULL,
              docente_id FK NULL, materia_id FK NULL, grupo_id FK NULL,
              inicio NULL, fin NULL  -- sólo si difiere del módulo
              alumnos, estado CHECK, observaciones, version, actualizado_por FK,
              created_at, updated_at)
asignaciones_registro (id, asignacion_id, accion CHECK, detalle, usuario_id FK, created_at)
migraciones  (nombre PK, aplicada_at)   -- pasos de migración ya aplicados
```

- Las claves foráneas están activadas (`PRAGMA foreign_keys = ON`).
- `salon_id`, `docente_id` y `materia_id` pueden quedar vacíos sólo en clases que vinieron
  de la versión anterior con datos incompletos; para guardar una clase hay que completarlos.
- Los ids de `salones` son los mismos de `frontend/src/planoSalones.js` (`src/utils/salones.js`).

#### Migración (automática al arrancar)

`src/database/espacios.js` la aplica en `db.asegurarMigraciones()` (al arrancar el servidor).
Es idempotente: cada paso queda anotado en `migraciones` y no se repite.

1. `salones` suma `tipo`, `capacidad` y `habilitado`; el tipo inicial sale del nombre del
   plano (Aula, Taller, Laboratorio…). La capacidad queda vacía: no figura en los planos.
2. El JSON `contenido.plano` (nombres cambiados y salones cancelados) pasa a `salones`.
3. El JSON `contenido.grillas` pasa a `grillas`, `modulos` y `asignaciones`: cada clase con
   su docente, materia y grupo (se agregan al catálogo). Los textos de relleno de una clase
   nueva ("Sin asignar", "Materia", "Grupo", "Curso") **no** se toman como datos, y si el aula
   tiene un nombre repetido en el plano ("Aula 3" hay tres) queda sin espacio, para elegirlo.
4. La tabla `asignaciones` de la versión anterior (salón + hora de texto) se pasa al módulo.
5. `clasificacion` sale del tipo de cada espacio (aula, taller, laboratorio y compartido son
   `AULA`; el resto, `ESPACIO_COMUN`). Dirección o Jefatura la pueden cambiar
   (`PUT /api/salones/:id`).
6. La escuela renombró tres espacios, con el mismo id (no se pierde ninguna relación):
   Aula 6 → **PAÑOL** y Bunker → **E.O.E.** (espacios comunes) y Taller 1 → **Aula 8** (aula).
   Las clases que ya estaban en PAÑOL no se borran: quedan marcadas para reubicar y se anota en
   el historial. Los datos viejos que nombran "Aula 6", "Bunker" o "Taller 1" se reconocen.
7. En el primer piso, con el mismo id: «Pañol» (`1p-4`) pasa a **Aula 9** (aula), «Sin nombre»
   (`1p-17`) a **SERVER** (espacio común) y «Jefe de área» (`1p-5`) a **Jefatura de Área**, de
   tipo `institucional`: nunca admite clases (mensaje propio) ni se puede reclasificar como aula.
8. Los JSON originales quedan como respaldo en `contenido` con los nombres
   `grillas_respaldo` y `plano_respaldo`.
9. Una sola grilla para la organización: las grillas de mañana y tarde que había creado el
   importador (`org-…-manana`, `org-…-tarde`) se unen en `org-…`, con `modulos.turno` en cada
   módulo (mismas clases; las claves pasan a `manana-1°`, `tarde-1°`…). El importador ya crea
   una sola grilla.
10. `modulos.rangos` (los otros horarios del encabezado del PDF) y `asignaciones.semana`
    (lunes de una excepción de la semana).
11. `grillas.vigente` (1 por defecto: las grillas existentes siguen vigentes) y
   `asignaciones.salon_habitual` (aula de siempre durante un cambio de aula excepcional).

Respaldo antes de una operación que borra datos (con el backend detenido):
`node -e "new (require('sqlite3').Database)('data/database.sqlite').run(\"VACUUM INTO 'data/respaldo.sqlite'\")"`.

No hay variables de entorno nuevas.

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
- Límite general de pedidos por IP en toda la API (`RATE_LIMIT_MAX` por `RATE_LIMIT_VENTANA_S`;
  600 por minuto por defecto), además del límite propio del login. Responde 429 con `Retry-After`.
- Más cabeceras: `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (la API sólo
  devuelve JSON), `Permissions-Policy`, `Cross-Origin-Opener-Policy` y `Strict-Transport-Security`
  cuando la conexión llega por HTTPS.
- Sobre RLS: no aplica a este proyecto. «Row Level Security» es una función de PostgreSQL y
  este backend usa SQLite, que no la tiene. El equivalente está en el backend: cada pedido se
  autentica, el usuario y su rol se leen de la BD (no del cliente) y el acceso a cada fila se
  decide en los controladores (rol, área y propiedad). Si algún día se migra a PostgreSQL,
  ahí sí convendría sumar RLS como segunda barrera.
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
