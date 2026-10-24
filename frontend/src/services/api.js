const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(
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
    throw new Error(data.error || "No se pudo completar la solicitud");
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

/* Del panel: grillas de Espacios y horarios y plano del colegio. */
export function obtenerPanel(token) {
  return request("/panel", conToken(token));
}

export function guardarGrillasEnServidor(token, grillas) {
  return request("/grillas", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify({ grillas }),
  });
}

export function guardarPlanoEnServidor(token, plano) {
  return request("/plano", {
    method: "PUT",
    ...conToken(token),
    body: JSON.stringify(plano),
  });
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
