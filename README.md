# Sitio de la Técnica 1 · Cecilia Berdichevsky

Sitio web de la E.E.S. Técnica N°1 "Cecilia Berdichevsky" (Esteban Echeverría). Tiene dos partes:

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

> **¿La base ya estaba creada?** El seed no cambia la contraseña de las cuentas que ya existen. Si la base se creó antes con otras contraseñas, ninguna de las de abajo va a funcionar hasta correr, en `backend/`:
>
> ```bash
> npm run restablecer-cuentas
> ```
>
> Esto pone la contraseña de `ADMIN_PASSWORD` a `admin` y la de `SEED_PASSWORD` a las cuentas de sector, les devuelve el cambio de contraseña y cierra sus sesiones. Solo corre en local: con `NODE_ENV=production` se niega. Si el login igual dice que hay demasiados intentos, reiniciá el backend.

Con esos valores, las cuentas quedan así:

| Usuario | Contraseña | Rol | Qué puede hacer |
|---------|------------|-----|-----------------|
| `admin` | `Admin-prueba-2026` | Dirección | Todo: editar todas las páginas, aprobar notas, cuentas y permisos (**Permisos y publicación**). |
| `daniela_monje` | `Sector-prueba-2026` | Jefatura de Área (Daniela Monje) | Evaluación, Previas y Proyectos; mesas, programas, proyectos de alumnos y notas; Espacios y horarios y el plano. |
| `mariano_cipres` | `Sector-prueba-2026` | Jefatura de Área (Mariano Cipres) | Lo mismo que la otra jefatura. |
| `ematp` | `Sector-prueba-2026` | Encargada de Server | Cronograma de mesas e **Inventario y reservas**. El resto del sitio lo ve en modo lectura. |

Para entrar: `http://localhost:5173/#/login`, o el botón **Ingresar** del menú.

> ⚠️ **Estas contraseñas son solo para probar en local.** En el servidor real hay que usar otras, largas y que nadie más conozca, y no escribirlas en ningún archivo del repositorio.

Las jefaturas de Área son Daniela Monje y Mariano Cipres (área «general»: Jefatura de Área sin un departamento en particular). Las cuentas anteriores `jefatura_matematica` y `jefatura_lengua` están dadas de baja: no pueden entrar, pero se conservan para no perder el historial de lo que cargaron.

Cosas para tener en cuenta:
- Las cuentas de sector pueden **cambiar su contraseña una sola vez**. Dirección puede habilitar otro cambio o ponerles una contraseña nueva.
- En el servidor real, para cambiar solo la contraseña de `admin` se usa `npm run restablecer-admin` (toma la de `ADMIN_PASSWORD`).
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
- En el **Tablero** de Jefatura, el encabezado bordó muestra la escuela, el área, la **fecha y hora de este dispositivo** (se actualiza sola) y la ocupación de las aulas en ese momento; debajo está el **plano del colegio**. Los accesos a cada sección están en el menú de la izquierda. Dirección ve y edita el mismo plano.

### Espacios y horarios + plano (una sola fuente de datos)

La grilla semanal de **Espacios y horarios** y el **plano** del Tablero muestran las mismas clases (tabla `asignaciones` del backend). Lo que se carga, mueve o quita en una aparece en la otra en el momento, también en las pantallas de otras personas (avisos en vivo, sin recargar).

- **Plano:** cada aula, taller o laboratorio es una zona del dibujo que se elige con el mouse o con Tab y Enter. Abre una ventana con los datos del espacio, su ocupación, la próxima clase, la agenda semanal y el formulario (docente, materia, grupo, espacio, grilla, día, módulo, hora de inicio y fin, alumnos, estado, observaciones). Los controles están en bloques: planta y momento, buscador de espacio, docente y grupo, y las referencias de colores aparte; la hora y el zoom quedan justo arriba del dibujo. Sólo cuentan las grillas **vigentes** (las semanas archivadas no ocupan).
- **Colores:** verde **Libre**, rojo **Ocupado**, amarillo **Por finalizar** (últimos 10 minutos de la clase), siempre con texto. No se guardan: se calculan con las clases y **la hora de la computadora o el celular que se está usando**, y se actualizan solos cada minuto. Si el dispositivo tiene mal la hora, los colores también. Puede no coincidir con la hora institucional.
- **Horas de los módulos:** se cargan en Espacios y horarios (al lado de cada módulo, por ejemplo 1°/2° de 08:00 a 09:20). Sin hora, el plano no puede saber si un espacio está ocupado *ahora* y lo muestra como «Sin horario cargado».
- **Conflictos:** no se puede guardar una clase que se superponga con otra del mismo espacio, docente o grupo (las consecutivas sí). El aviso dice qué choca y propone espacios libres.
- **Aulas compartidas:** cuando la organización oficial pone dos grupos en la misma aula a la misma hora (por ejemplo, Aulas 10 y 11), esas clases quedan marcadas como «compartidas» (ícono de personas junto al aula) y pueden convivir. Una tercera clase en esa aula sigue chocando, y un docente nunca puede estar en dos clases a la vez.
- **Aulas y espacios comunes:** sólo las aulas admiten clases. **PAÑOL** (ex Aula 6) y **E.O.E.** (ex Bunker) son espacios comunes: se ven en el plano rayados en gris, con su ícono, y al elegirlos muestran una ficha informativa en vez del formulario. **Aula 8** (ex Taller 1) es un aula como las demás. La regla la controla el backend.

- **Aula 17:** el recinto chico pegado a la Biblioteca (primer piso) es el Aula 17 (`1p-18`), un aula más.
- **Primer piso:** el cuadrado junto al Laboratorio es el **Aula 9** (aula, asignable); el cubículo entre el Aula 10 y el Aula 11 es el **SERVER** (espacio común, con ícono de computadora); el cuadrado frente al Aula 11 es la **Jefatura de Área**: espacio institucional reservado. En el dibujo queda sólo su contorno con un rayado diagonal fino, sin cartel; al pasar el mouse, enfocarla o hacer clic aparece «Jefatura de Área». Nunca se asigna a materias, cursos, grupos ni talleres (lo controla el backend, también en la importación).
- **Planilla como el PDF institucional:** Espacios y horarios muestra cada franja (turno y módulo, por ejemplo «1°/2°») con la forma de «ORGANIZACION OCTUBRE.pdf»: días de lunes a viernes en columnas, filas numeradas y en cada celda horario, materia, grupo, alumnos, aula y docente. Es la única vista (las horas de los módulos se cambian en «Configurar grilla»). Cada clase se ve como en el papel: horario arriba, grupo y alumnos resaltados en amarillo a la izquierda, la materia en su recuadro y debajo aula | docente.
- **Una sola grilla:** ciclo básico y superior, mañana y tarde, en la misma grilla («Talleres · Octubre 2026»). Cada módulo lleva su turno, y la planilla muestra una tabla por franja (Mañana 1°, Mañana 2°, Tarde 1°, Tarde 2°), en el orden del PDF.
- **Como el PDF:** filas 1 a 17 en cada franja, encabezado con los dos horarios («1° 7:10 a 9:10 - 7:30 a 9:30»), módulo en verde, días en celeste y el grupo con el color de su año: 1° a 3° amarillo, 4° a 6° salmón, 7° celeste.
- **Editar:** un clic en la clase la abre con la misma forma de la celda (horario, grupo y alumnos; materia; aula | docente). «Aplicar» deja el cambio marcado en la planilla («Sin guardar»); **Guardar cambios** guarda todo junto en el servidor (si algo choca, no se guarda nada y dice qué) y **Descartar** vuelve atrás. «+ Clase», en el primer casillero libre de cada día, agrega una.
- **Registro de cambios:** lista desplegable, cerrada al entrar, con los últimos cambios de todas las personas.
- **Esta semana:** desde la misma ventana, **Docente ausente**, **Cancelar** y **Cambio de aula** (lista las aulas libres) se guardan al momento y valen sólo para la semana en curso: al empezar la semana siguiente la clase vuelve sola a lo de siempre. La grilla se mantiene de una semana a la otra; no hace falta copiarla.
- **Crear una grilla:** «Nueva grilla» pide nombre, organización, período, ciclo, turno, módulos con su horario (hay un botón con los del turno según el PDF), días y qué grupos y materias admite. «Configurar grilla» cambia eso después. El backend respeta lo que admite cada grilla.
- **Exportar PDF:** genera un PDF real (A4 apaisado, una hoja por franja, encabezado repetido si sigue en otra hoja, páginas numeradas) con los datos guardados de la grilla elegida.
- **Importar la organización del PDF:** ver [backend/README.md](backend/README.md) («Importar la organización institucional»).

### Tablero de Dirección

Al entrar con la cuenta de Dirección (que ve y edita todas las secciones), el Tablero muestra un panel propio, en bordó profundo con filete dorado:

- **Cadena de conducción:** 1° Dirección → 2° Jefatura de Área → 3° EMATP, con cuántas cuentas activas tiene cada nivel.
- **La escuela ahora y esta semana:** aulas en uso, clases de hoy, ausencias, clases canceladas, cambios de aula e imágenes en la cartelera.
- **Para decidir:** novedades esperando aprobación, clases sin aula del plano, catálogo importado para revisar, ausencias de la semana y si falta configurar un televisor; cada uno lleva a su sección.
- **Equipos:** cada nivel con sus personas y lo que hizo cada una en los últimos 7 días (cambios en clases, novedades, imágenes, archivos, cambios en el sitio); las cuentas desactivadas aparecen atenuadas.
- **Actividad reciente:** lo último de todos los perfiles (y del sistema, como las importaciones), con quién y cuándo.

Abajo sigue el plano del colegio. Los datos salen de `GET /api/direccion/resumen` (sólo Dirección).

### Cartelera digital (televisores de los corredores)

En el panel, **Comunicación → Cartelera digital** (Dirección, Jefatura de Área y EMATP).

- **El televisor** abre en su navegador el enlace de su pantalla (`#/tv?p=…`), en pantalla completa y sin iniciar sesión. Arriba, el escudo y la hora con segundos sobre una franja bordó rayada. Pantalla dividida y apaisada: a la izquierda, el **plano en vivo** girado, recortado a la parte con aulas (sin el contorno punteado del terreno) y lo más grande que entra en su lado, sin deformar y con los nombres derechos (planta baja y primer piso, **un minuto cada una**), y debajo la planta, las referencias y el tablero de esa planta: aula, docente, grupo, taller y horario de las clases de ese momento (o las próximas). A la derecha, las **imágenes** de la cartelera, una tras otra. Se actualiza solo cada 30 segundos, usa la hora del servidor y, si se corta la red, sigue mostrando lo último.
- **Turnos (como en una clínica):** cada 5 minutos (cada 2 cuando faltan 15 minutos o menos para que empiecen clases), durante un minuto, en lugar del plano aparece la grilla de turnos: grupo → aula, docente y horario de las clases que empiezan en los próximos 40 minutos. Arriba, grande, la novedad más importante; las filas marcan **cambio de aula**, **docente ausente**, **clase cancelada** y **asignación nueva o actualizada hoy**.
- **Prioridad:** principal, Dirección; segunda, Jefatura de Área; tercera, EMATP. Pasan primero las imágenes de Dirección; cada uno cambia, pausa o quita lo de su nivel y lo de los de abajo, nunca lo de arriba. Una imagen **fijada** deja sólo las fijadas de su nivel (los niveles de arriba siguen pasando).
- **Imágenes:** JPG, PNG, WEBP o GIF de hasta 5 MB, con título, tiempo en pantalla y fechas opcionales.
- **Televisores:** Dirección y Jefatura crean uno por TV («Corredor planta baja»), copian su enlace y lo pueden renovar si se filtra. Hay una vista previa en el panel.

#### Cómo se relacionan las zonas del plano con los espacios

- `frontend/src/planoSalones.js`: cada espacio con su id (`pb-8`), su nombre original y dónde va su cartel en el dibujo. El id es el mismo de la tabla `salones` del backend.
- `frontend/src/zonasPlano.js`: el polígono de cada espacio, en % del ancho y alto del dibujo. **Lo genera** `node scripts/zonas-plano.mjs` (en `frontend/`) a partir de las imágenes del plano: pinta desde el cartel hasta las paredes. No se edita a mano.
- `frontend/src/zonasOverrides.js`: correcciones a mano de una zona (o `null` para dejar sólo el cartel). Después de editarlo, volver a correr el script. `node scripts/zonas-plano.mjs --revisar` muestra el resultado sin escribir nada.
- Para sumar un espacio nuevo: agregarlo en `planoSalones.js` y en `backend/src/utils/salones.js` con el mismo id, y correr el script.
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

La primera vez que arranca el backend con esta versión, migra solo las grillas y el plano que estaban guardados como JSON a las tablas nuevas, y deja el JSON original como respaldo (`grillas_respaldo`, `plano_respaldo`). El detalle está en [backend/README.md](backend/README.md).

## Para publicarlo

- **Frontend**: `npm run build` genera `frontend/dist`, que se sube a cualquier hosting estático. `frontend/vercel.json` agrega las cabeceras de seguridad si se usa Vercel. Definir `VITE_API_URL` con la dirección del backend.
- **Backend**: necesita `JWT_SECRET`, `CORS_ORIGIN` con la dirección real del frontend y, detrás de un proxy (Render, Railway, nginx…), `TRUST_PROXY=1` para que el límite de intentos use la IP real. La base de datos es un archivo SQLite en `backend/data/`: tiene que quedar en un disco que no se borre entre reinicios.
