const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:3000/api").replace(
  /\/$/,
  "",
);

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch {
    /* No llegamos al servidor (está apagado, no hay red). Se marca aparte
       porque no es lo mismo que el servidor conteste que algo está mal: con
       esto, una caída no cierra la sesión de quien está trabajando. */
    const fallo = new Error("el servidor no responde");
    fallo.sinConexion = true;
    throw fallo;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    /* El código y el cuerpo viajan con el error: un 409 trae con qué choca
       la asignación y qué espacios quedan libres. */
    const error = new Error(data.error || "No se pudo completar la solicitud");
    error.status = response.status;
    error.datos = data;
    throw error;
  }

  return data;
}

export function iniciarSesion(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function obtenerUsuario(token) {
  return request("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function cerrarSesion(token) {
  return request("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/* ---------- Contenido del sitio ----------
   Lo que se edita desde gestión vive en el backend: textos, notas, mesas,
   programas, proyectos y ajustes. */

const conToken = (token, extra = {}) => ({
  ...extra,
  headers: { Authorization: `Bearer ${token}` },
});

/* Todo lo que el sitio necesita para dibujarse, en una sola llamada. */
export function obtenerContenido() {
  return request("/contenido");
}

export function guardarTextosEnServidor(token, pagina, textos) {
  return request("/contenido/textos", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify({ pagina, textos }),
  });
}

export function guardarAjustesEnServidor(token, cambios) {
  return request("/ajustes", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify(cambios),
  });
}

export function listarPublicaciones(token) {
  return request("/publicaciones", conToken(token));
}

export function guardarPublicacionEnServidor(token, publicacion) {
  return request("/publicaciones", {
    method: "POST",
    ...conToken(token),
    body: JSON.stringify(publicacion),
  });
}

export function cambiarEstadoPublicacion(token, id, accion) {
  return request(`/publicaciones/${encodeURIComponent(id)}/${accion}`, {
    method: "POST",
    ...conToken(token),
  });
}

export function borrarPublicacionEnServidor(token, id) {
  return request(`/publicaciones/${encodeURIComponent(id)}`, {
    method: "DELETE",
    ...conToken(token),
  });
}

export function guardarMesasEnServidor(token, datos) {
  return request("/mesas", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify(datos),
  });
}

export function guardarProgramasEnServidor(token, programas) {
  return request("/programas", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify({ programas }),
  });
}

/* Grillas de Espacios y horarios (con la hora de cada módulo). */
export function guardarGrillasEnServidor(token, grillas) {
  return request("/grillas", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify({ grillas }),
  });
}

/* ---------- Espacios y horarios + plano ----------
   Una sola fuente de datos (tabla asignaciones del backend) para la grilla y
   el plano. Lo usa asignaciones.js; las pantallas no llaman a esto directo. */
export function obtenerAsignaciones(token) {
  return request("/asignaciones", conToken(token));
}

export function guardarAsignacion(token, id, asignacion) {
  return request(id ? `/asignaciones/${encodeURIComponent(id)}` : "/asignaciones", {
    method: id ? "PUT" : "POST",
    ...conToken(token),
    body: JSON.stringify(asignacion),
  });
}

export function quitarAsignacion(token, id, version) {
  return request(`/asignaciones/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}`, {
    method: "DELETE",
    ...conToken(token),
  });
}

export function intercambiarAsignaciones(token, a, b) {
  return request("/asignaciones/intercambiar", {
    method: "POST",
    ...conToken(token),
    body: JSON.stringify({ a, b }),
  });
}

/* «Guardar cambios» de la planilla: { altas, cambios, bajas }, todo o nada. */
export function guardarLoteEnServidor(token, lote) {
  return request("/asignaciones", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify(lote),
  });
}

/* Cambio de aula excepcional (o vuelta al aula habitual). */
export function cambiarAulaEnServidor(token, id, salonId, version) {
  return request(`/asignaciones/${encodeURIComponent(id)}/cambiar-aula`, {
    method: "POST",
    ...conToken(token),
    body: JSON.stringify({ salon_id: salonId, version }),
  });
}

/* Copia una grilla (la semana siguiente): { nombre, periodo, archivarOriginal }. */
export function copiarGrillaEnServidor(token, id, datos) {
  return request(`/grillas/${encodeURIComponent(id)}/copiar`, {
    method: "POST",
    ...conToken(token),
    body: JSON.stringify(datos),
  });
}

export function verificarAsignacion(token, asignacion) {
  return request("/asignaciones/verificar", {
    method: "POST",
    ...conToken(token),
    body: JSON.stringify(asignacion),
  });
}

export function obtenerRegistro(token, limite = 30) {
  return request(`/asignaciones/registro?limite=${limite}`, conToken(token));
}

/* tipo: "docentes" | "materias" | "grupos". Si ya existe, devuelve el mismo. */
export function agregarAlCatalogo(token, tipo, datos) {
  return request(`/${tipo}`, {
    method: "POST",
    ...conToken(token),
    body: JSON.stringify(datos),
  });
}

export function guardarSalon(token, id, cambios) {
  return request(`/salones/${encodeURIComponent(id)}`, {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify(cambios),
  });
}

/* Avisos en vivo (Server-Sent Events). Se usa fetch y no EventSource porque
   EventSource no deja mandar el token en la cabecera (y en la URL quedaría
   en los registros). `alAviso(evento, datos)` se llama por cada aviso; la
   promesa termina cuando se corta la conexión. */
export async function escucharEventos(token, alAviso, senal) {
  const response = await fetch(`${API_URL}/eventos`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    signal: senal,
  });
  if (!response.ok || !response.body) {
    const error = new Error("No se pudo abrir el canal de avisos");
    error.status = response.status;
    throw error;
  }
  const lector = response.body.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  for (;;) {
    const { value, done } = await lector.read();
    if (done) return;
    resto += decodificador.decode(value, { stream: true });
    const bloques = resto.split("\n\n");
    resto = bloques.pop();
    for (const bloque of bloques) {
      const evento = /^event: (.+)$/m.exec(bloque)?.[1];
      const datos = /^data: (.+)$/m.exec(bloque)?.[1];
      if (evento) alAviso(evento, datos ? JSON.parse(datos) : null);
    }
  }
}

export function guardarProyectosEnServidor(token, area, proyectos) {
  return request(`/proyectos/${encodeURIComponent(area)}`, {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify({ proyectos }),
  });
}

export function subirPdf(token, archivo, destination) {
  const body = new FormData();
  body.append("file", archivo);
  if (destination) {
    body.append("destination", destination);
  }

  return request("/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
}

/* ---------- Cartelera digital (televisores de los corredores) ---------- */
export function obtenerCartelera(token) {
  return request("/cartelera", conToken(token));
}

/* datos: { titulo, duracion, desde, hasta, fijada } */
export function subirImagenCartelera(token, archivo, datos) {
  const body = new FormData();
  body.append("archivo", archivo);
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== undefined && valor !== null && valor !== "") body.append(clave, String(valor));
  }
  return request("/cartelera", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
}

export function cambiarImagenCartelera(token, id, cambios) {
  return request(`/cartelera/${encodeURIComponent(id)}`, { method: "PUT", ...conToken(token), body: JSON.stringify(cambios) });
}

export function quitarImagenCartelera(token, id) {
  return request(`/cartelera/${encodeURIComponent(id)}`, { method: "DELETE", ...conToken(token) });
}

export function moverImagenCartelera(token, id, hacia) {
  return request(`/cartelera/${encodeURIComponent(id)}/mover`, { method: "POST", ...conToken(token), body: JSON.stringify({ hacia }) });
}

export function crearPantalla(token, nombre) {
  return request("/cartelera/pantallas", { method: "POST", ...conToken(token), body: JSON.stringify({ nombre }) });
}

/* Ambiente de los televisores: "" (normal), "expo" (Expo Técnica) o "patria" (Fechas Patrias). */
export function cambiarTemaPantallas(token, tema) {
  return request("/cartelera/pantallas/tema", { method: "PUT", ...conToken(token), body: JSON.stringify({ tema }) });
}

export function renovarPantalla(token, id) {
  return request(`/cartelera/pantallas/${encodeURIComponent(id)}/renovar`, { method: "POST", ...conToken(token) });
}

export function quitarPantalla(token, id) {
  return request(`/cartelera/pantallas/${encodeURIComponent(id)}`, { method: "DELETE", ...conToken(token) });
}

/* Lo que pide el televisor con el enlace de su pantalla (sin sesión). */
export function obtenerPantalla(enlace) {
  return request(`/cartelera/pantalla/${encodeURIComponent(enlace)}`);
}

export const urlImagenCartelera = (clave) => `${API_URL}/cartelera/imagen/${encodeURIComponent(clave)}`;

/* Tablero de Dirección: resumen de lo que hicieron los demás perfiles. */
export function obtenerResumenDireccion(token) {
  return request("/direccion/resumen", conToken(token));
}

/* ---------- Usuarios y contraseñas ----------
   Lo de Dirección (lista, restablecer, permitir cambio) y el cambio de la
   propia contraseña, que puede hacer cualquier cuenta con sesión. */
export function listarUsuarios(token) {
  return request("/usuarios", conToken(token));
}

export function listarAreasUsuarios(token) {
  return request("/usuarios/areas", conToken(token));
}

export function restablecerClaveUsuario(token, id, nuevaPassword) {
  return request(
    `/usuarios/${encodeURIComponent(id)}/password`,
    conToken(token, { method: "PUT", body: JSON.stringify({ nueva_password: nuevaPassword }) }),
  );
}

export function permitirCambioClave(token, id) {
  return request(`/usuarios/permitir-cambio/${encodeURIComponent(id)}`, conToken(token, { method: "PUT" }));
}

/* Devuelve un token nuevo: el anterior deja de valer al cambiar la clave. */
export function cambiarMiClave(token, actual, nueva) {
  return request(
    "/auth/password",
    conToken(token, {
      method: "PUT",
      body: JSON.stringify({ password_actual: actual, nueva_password: nueva }),
    }),
  );
}
