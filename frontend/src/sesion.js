import { useEffect, useState } from "react";
import { cerrarSesion, iniciarSesion, obtenerUsuario } from "./services/api.js";
import { ajustesActuales } from "./ajustes.js";

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
  "/panel/alumnos": ["direccion", "secretaria", "preceptor", "jefatura"],
  "/panel/asistencia": ["direccion", "preceptor", "jefatura"],
  "/panel/calificaciones": ["direccion", "secretaria", "docente"],
  "/panel/grilla": ["direccion", "jefatura", "preceptor"],
  "/panel/curricular": ["direccion", "jefatura", "docente"],
  "/panel/proyectos": ["direccion", "jefatura"],
  "/panel/publicaciones": ["direccion", "secretaria", "jefatura"],
  "/panel/mesas": ["direccion", "jefatura", "server"],
  "/panel/programas": ["direccion", "jefatura", "secretaria"],
  "/panel/sitio": ["direccion", "secretaria", "jefatura", "server"],
  "/panel/sitio/pagina": ["direccion", "secretaria", "jefatura", "server"],
  "/panel/server": ["direccion", "server"],
  "/panel/direccion": ["direccion"],
};

/* Quién es dueño de cada sección y puede modificarla.
   El resto de los roles que figuran en `accesos` entra en modo lectura.
   Dirección edita todo. */
export const edicion = {
  "/panel/alumnos": ["secretaria"],
  "/panel/asistencia": ["preceptor"],
  "/panel/calificaciones": ["secretaria", "docente"],
  "/panel/grilla": ["jefatura"],
  "/panel/curricular": ["jefatura", "docente"],
  "/panel/proyectos": ["jefatura"],
  "/panel/publicaciones": ["secretaria", "jefatura"],
  "/panel/mesas": ["jefatura", "server"],
  "/panel/programas": ["jefatura", "secretaria"],
  /* El sector y el editor de textos deciden página por página (edicionPaginas). */
  "/panel/sitio": ["secretaria", "jefatura", "server"],
  "/panel/sitio/pagina": ["secretaria", "jefatura", "server"],
  "/panel/server": ["server"],
  "/panel/direccion": [],
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

const CLAVE = "tec1-sesion";
const TOKEN = "site_token";

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || null;
  } catch {
    return null;
  }
};

let usuario = leer();
const oyentes = new Set();

const avisar = () => oyentes.forEach((fn) => fn(usuario));

export const entrar = (datos) => {
  usuario = datos;
  localStorage.setItem(CLAVE, JSON.stringify(datos));
  avisar();
};

export const salir = async () => {
  const token = localStorage.getItem(TOKEN);

  /* Si el backend no responde igual cerramos la sesión local. */
  if (token) {
    await cerrarSesion(token).catch(() => {});
    localStorage.removeItem(TOKEN);
  }

  usuario = null;
  localStorage.removeItem(CLAVE);
  avisar();
};

/* Login contra el backend. Si no está levantado, tira y el
   formulario cae al modo demostración. */
export const entrarConBackend = async (username, password) => {
  const respuesta = await iniciarSesion(username, password);

  localStorage.setItem(TOKEN, respuesta.token);
  entrar({
    rol: normalizarRol(respuesta.usuario.rol),
    usuario: respuesta.usuario.username,
    nombre: respuesta.usuario.nombre || respuesta.usuario.username,
  });

  return usuario;
};

/* Al abrir el sitio revalida el token guardado. */
export const restaurarSesion = async () => {
  const token = localStorage.getItem(TOKEN);
  if (!token) return;

  try {
    const { usuario: actual } = await obtenerUsuario(token);
    entrar({
      rol: normalizarRol(actual.rol),
      usuario: actual.username,
      nombre: actual.nombre || actual.username,
    });
  } catch (error) {
    /* Si el servidor no respondió, la sesión se mantiene: vuelve a valer
       cuando el servidor vuelva. Sólo se descarta el token cuando el servidor
       contestó que ya no sirve. */
    if (!error.sinConexion) localStorage.removeItem(TOKEN);
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
