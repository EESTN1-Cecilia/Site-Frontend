import { useEffect, useState } from "react";
import { cerrarSesion, iniciarSesion, obtenerUsuario } from "./services/api.js";
import { ajustesActuales } from "./ajustes.js";
import { borrarCopias } from "./almacen.js";
import { borrarToken, guardarToken, sesionRecordada, tokenActual } from "./conexion.js";

/* El backend nombra algunos roles distinto. */
const equivalencias = { jefatura_area: "jefatura", jefe_area: "jefatura" };
export const normalizarRol = (rol) => equivalencias[rol] || rol;

/* Sesión sólo de front: el login real lo resuelve el backend.
   Acá guardamos qué perfil está viendo el sitio para mostrar u ocultar cosas. */

export const perfiles = [
  ["alumno", "Alumno / Familia", "ph:student"],
  ["docente", "Docente", "ph:chalkboard-teacher"],
  ["preceptor", "Preceptor/a", "ph:clipboard-text"],
  ["secretaria", "Secretaría", "ph:folders"],
  ["jefatura", "Jefatura de Área", "ph:grid-four"],
  ["server", "Encargada de Server", "ph:desktop-tower"],
  ["direccion", "Dirección", "ph:shield-check"],
];

export const nombrePerfil = (rol) =>
  perfiles.find(([clave]) => clave === rol)?.[1] || rol;

/* Qué rol entra a cada sección del panel. Los alumnos no figuran en ninguna. */
export const accesos = {
  "/panel": ["direccion", "secretaria", "preceptor", "jefatura", "server", "docente"],
  "/panel/grilla": ["direccion", "jefatura", "preceptor"],
  "/panel/proyectos": ["direccion", "jefatura"],
  "/panel/publicaciones": ["direccion", "secretaria", "jefatura"],
  "/panel/mesas": ["direccion", "jefatura", "server"],
  "/panel/programas": ["direccion", "jefatura", "secretaria"],
  "/panel/sitio": ["direccion", "secretaria", "jefatura", "server"],
  "/panel/sitio/pagina": ["direccion", "secretaria", "jefatura", "server"],
  "/panel/server": ["direccion", "server"],
  "/panel/direccion": ["direccion"],
  "/panel/usuarios": ["direccion"],
  /* Cada cuenta con acceso al panel cambia su propia contraseña. */
  "/panel/cuenta": ["direccion", "jefatura", "server"],
  "/panel/cartelera": ["direccion", "jefatura", "server"],
};

/* Quién es dueño de cada sección y puede modificarla.
   El resto de los roles que figuran en `accesos` entra en modo lectura.
   Dirección edita todo. */
export const edicion = {
  "/panel/grilla": ["jefatura"],
  "/panel/proyectos": ["jefatura"],
  "/panel/publicaciones": ["secretaria", "jefatura"],
  "/panel/mesas": ["jefatura", "server"],
  "/panel/programas": ["jefatura", "secretaria"],
  /* El sector y el editor de textos deciden página por página (edicionPaginas). */
  "/panel/sitio": ["secretaria", "jefatura", "server"],
  "/panel/sitio/pagina": ["secretaria", "jefatura", "server"],
  "/panel/server": ["server"],
  "/panel/direccion": [],
  "/panel/usuarios": [],
  /* Cada uno carga en su nivel (Dirección > Jefatura > EMATP): lo decide el backend. */
  "/panel/cartelera": ["jefatura", "server"],
};

export const puede = (usuario, ruta) =>
  !!usuario && (accesos[ruta] || []).includes(usuario.rol);

export const puedeEditar = (usuario, ruta) =>
  puede(usuario, ruta) &&
  (usuario.rol === "direccion" || (edicion[ruta] || []).includes(usuario.rol));

/* Texto para el cartel de modo lectura: "la edita Secretaría". */
export const quienEdita = (ruta) =>
  (edicion[ruta] || []).map(nombrePerfil).join(" y ") || "Dirección";

/* Quién edita los textos de cada página pública por defecto. Dirección edita
   todas y puede cambiar este reparto desde su página (queda en ajustes). */
export const edicionPaginas = {
  "/": ["secretaria"],
  "/evaluacion": ["jefatura"],
  "/previas": ["jefatura"],
  "/novedades": ["secretaria"],
  "/inscripcion": ["secretaria"],
  "/proyectos/ciclo-basico": ["jefatura"],
  "/proyectos/informatica": ["jefatura"],
  "/proyectos/programacion": ["jefatura"],
};

export const edicionPaginasActual = () =>
  ajustesActuales().edicionPaginas || edicionPaginas;

export const puedeEditarPagina = (usuario, pagina) =>
  !!usuario &&
  (usuario.rol === "direccion" ||
    (edicionPaginasActual()[pagina] || []).includes(usuario.rol));

export const quienEditaPagina = (pagina) =>
  (edicionPaginasActual()[pagina] || []).map(nombrePerfil).join(" y ") || "Dirección";

/* Un rol ve el panel si entra a alguna de sus secciones. */
export const verPanel = (usuario) =>
  Object.keys(accesos).some((ruta) => puede(usuario, ruta));

/* Quién está conectado. Se guarda junto al token: en sessionStorage si se
   pidió no mantener la sesión (se borra al cerrar el navegador), si no en
   localStorage. */
const CLAVE = "tec1-sesion";

const leer = () => {
  for (const almacen of ["sessionStorage", "localStorage"]) {
    try {
      const guardada = JSON.parse(window[almacen].getItem(CLAVE));
      if (guardada) return guardada;
    } catch {
      /* nada guardado o almacenamiento bloqueado */
    }
  }
  return null;
};

const olvidarSesion = () => {
  for (const almacen of ["sessionStorage", "localStorage"]) {
    try {
      window[almacen].removeItem(CLAVE);
    } catch {
      /* nada que borrar */
    }
  }
};

/* Sin token no hay sesión: lo que haya quedado guardado sin él no vale. */
let usuario = tokenActual() ? leer() : null;
const oyentes = new Set();

const avisar = () => oyentes.forEach((fn) => fn(usuario));

/* Se escribe primero donde va y después se borra del otro almacenamiento:
   reescribir el mismo valor no avisa a las otras pestañas (App las recarga
   cuando cambia la sesión), así que restaurar la sesión al abrir no las
   hace recargar una y otra vez. */
export const entrar = (datos, recordar = true) => {
  usuario = datos;
  const [destino, otro] = recordar
    ? ["localStorage", "sessionStorage"]
    : ["sessionStorage", "localStorage"];
  try {
    window[destino].setItem(CLAVE, JSON.stringify(datos));
    window[otro].removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
  avisar();
};

/* Sale al instante: se borra todo lo local antes de avisarle al servidor, así
   la sesión no queda abierta si la red tarda o se cierra la pestaña. También
   se borran las copias de contenido para la próxima persona. */
export const salir = async () => {
  const token = tokenActual();

  borrarToken();
  olvidarSesion();
  borrarCopias();
  usuario = null;
  avisar();

  /* El servidor revoca el token. Si no responde, igual la sesión local ya se cerró. */
  if (token) await cerrarSesion(token).catch(() => {});
};

/* Login contra el backend. `recordar` es la casilla "Mantener sesión
   iniciada": sin ella, la sesión se borra al cerrar el navegador. */
export const entrarConBackend = async (username, password, recordar = true) => {
  const respuesta = await iniciarSesion(username, password);

  /* Lo que dejó en este navegador la persona anterior no se usa. */
  borrarCopias();
  guardarToken(respuesta.token, recordar);
  entrar(
    {
      rol: normalizarRol(respuesta.usuario.rol),
      usuario: respuesta.usuario.username,
      nombre: respuesta.usuario.nombre || respuesta.usuario.username,
      area: respuesta.usuario.area || null,
    },
    recordar,
  );

  return usuario;
};

/* Al abrir el sitio revalida el token guardado. */
export const restaurarSesion = async () => {
  const token = tokenActual();
  if (!token) {
    if (usuario) {
      olvidarSesion();
      usuario = null;
      avisar();
    }
    return;
  }

  try {
    const { usuario: actual } = await obtenerUsuario(token);
    entrar(
      {
        rol: normalizarRol(actual.rol),
        usuario: actual.username,
        nombre: actual.nombre || actual.username,
        area: actual.area || null,
      },
      sesionRecordada(),
    );
  } catch (error) {
    /* Si el servidor no respondió, la sesión se mantiene: vuelve a valer
       cuando el servidor vuelva. Cuando el servidor contestó que el token ya
       no sirve, se cierra la sesión entera (no sólo el token): si no, la
       pantalla seguiría mostrando el panel con el rol anterior. */
    if (!error.sinConexion) {
      borrarToken();
      olvidarSesion();
      usuario = null;
      avisar();
    }
  }
};

export function useSesion() {
  const [actual, setActual] = useState(usuario);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
