import { marcarError, marcarSincronizado, marcarSincronizando, tokenActual } from "./conexion.js";
import { listarPublicaciones, obtenerContenido } from "./services/api.js";
import { cargarAsignaciones } from "./asignaciones.js";
import { hidratarTextos } from "./textos.js";
import { hidratarAjustes } from "./ajustes.js";
import { hidratarPublicaciones } from "./publicaciones.js";
import { hidratarMesas } from "./mesas.js";
import { hidratarProgramas } from "./programas.js";
import { hidratarProyectos } from "./proyectos.js";

/* Trae del backend todo el contenido del sitio y lo deja en su lugar.

   Si el servidor no responde, el sitio igual se dibuja: con lo último que vio
   este navegador, o con el contenido original que trae escrito. Al que está
   trabajando en gestión sí se le avisa, para que no crea que lo que ve es lo
   que hay publicado; y hasta que se traiga bien no se guarda nada (conexion.js).

   Cada store revisa la forma de lo que recibe, así que un dato mal guardado
   no corta la hidratación de los demás. */
export async function sincronizarContenido() {
  const token = tokenActual();
  marcarSincronizando();

  try {
    const datos = await obtenerContenido();

    hidratarTextos(datos.textos);
    hidratarAjustes(datos.ajustes);
    hidratarMesas(datos.mesas);
    hidratarProgramas(datos.programas);
    hidratarProyectos(datos.proyectos);

    /* El sitio sólo ve las notas aprobadas. Quien entró a gestión necesita
       además las que esperan revisión. */
    if (token) {
      const { publicaciones } = await listarPublicaciones(token);
      hidratarPublicaciones(publicaciones);

      /* Lo que es sólo del panel: espacios, grillas y asignaciones (el
         plano y Espacios y horarios). Ese store avisa sus propios errores. */
      cargarAsignaciones();
    } else {
      hidratarPublicaciones(datos.publicaciones);
    }

    marcarSincronizado();
  } catch (error) {
    if (token) {
      marcarError(
        `No se pudo traer el contenido: ${error.message}. Hasta que se pueda, no se guardan cambios: recargá la página en un rato.`,
      );
    }
  }
}
