import { Icon } from "@iconify/react";
import { ir } from "../../router.js";
import { edicion, puede, puedeEditar, quienEdita, useSesion } from "../../sesion.js";

export const menu = [
  [
    "Secretaría",
    [
      ["/panel", "ph:chart-donut", "Tablero"],
      ["/panel/alumnos", "ph:student", "Alumnos"],
      ["/panel/calificaciones", "ph:exam", "Notas y boletines"],
    ],
  ],
  ["Contenido del sitio", [["/panel/sitio", "ph:browsers", "Sitio público"]]],
  ["Preceptoría", [["/panel/asistencia", "ph:calendar-check", "Asistencia"]]],
  [
    "Jefatura de Área",
    [
      ["/panel/grilla", "ph:grid-four", "Espacios y horarios"],
      ["/panel/curricular", "ph:tree-structure", "Seguimiento curricular"],
    ],
  ],
  ["Server", [["/panel/server", "ph:desktop-tower", "Inventario y reservas"]]],
  [
    "Dirección",
    [["/panel/direccion", "ph:shield-check", "Permisos y publicación"]],
  ],
];

/* Editores que se abren desde Sitio público: el menú sigue marcando ese
   sector y arriba aparece el camino de vuelta. */
const rutasSitio = [
  "/panel/publicaciones",
  "/panel/mesas",
  "/panel/programas",
  "/panel/proyectos",
];

const activo = (destino, ruta) =>
  destino === ruta ||
  (destino === "/panel/sitio" &&
    (ruta.startsWith("/panel/sitio") || rutasSitio.includes(ruta)));

export default function Layout({ ruta, chip, titulo, texto, acciones, children }) {
  const usuario = useSesion();

  /* Cada rol ve sólo las secciones que tiene habilitadas. */
  const visible = menu
    .map(([grupo, items]) => [
      grupo,
      items.filter(([destino]) => puede(usuario, destino)),
    ])
    .filter(([, items]) => items.length > 0);

  return (
    <div className="panel">
      <aside className="panel__lateral">
        {visible.map(([grupo, items]) => (
          <div className="panel__grupo" key={grupo}>
            <p className="panel__grupo-titulo">{grupo}</p>
            {items.map(([destino, icono, etiqueta]) => (
              <button
                key={destino}
                className={`panel__link ${activo(destino, ruta) ? "panel__link--activo" : ""}`}
                onClick={() => ir(destino)}
              >
                <Icon icon={icono} width={18} height={18} aria-hidden="true" />
                {etiqueta}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="panel__main">
        {rutasSitio.includes(ruta) && (
          <button className="miga" onClick={() => ir("/panel/sitio")}>
            <Icon icon="ph:arrow-left" width={15} height={15} aria-hidden="true" />
            Sitio público
          </button>
        )}
        <div className="panel__encabezado">
          <div>
            <p className="chip">{chip}</p>
            <h1 className="panel__titulo">{titulo}</h1>
            {texto && <p className="panel__bajada">{texto}</p>}
          </div>
          {acciones && <div className="panel__acciones">{acciones}</div>}
        </div>
        {/* El tablero no tiene dueño: es sólo consulta y no lleva cartel. */}
        {edicion[ruta] && !puedeEditar(usuario, ruta) && (
          <p className="flash flash--info">
            <Icon icon="ph:eye" width={18} height={18} aria-hidden="true" />
            Modo lectura: esta sección la edita {quienEdita(ruta)}.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
