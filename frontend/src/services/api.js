const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(
  /\/$/,
  "",
);

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

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
