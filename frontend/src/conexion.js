import { useEffect, useState } from "react";

/* Conexión con el backend.

   Lo que se edita en gestión se aplica en pantalla al instante y se manda al
   servidor. Si el servidor no responde, el cambio queda guardado en este
   navegador y acá se anota el error para avisarlo en el panel: así nadie cree
   que publicó algo que en realidad no salió. */

const TOKEN = "site_token";

export const tokenActual = () => {
  try {
    return localStorage.getItem(TOKEN);
  } catch {
    return null;
  }
};

let estado = { sincronizado: false, error: "" };
const oyentes = new Set();

const cambiar = (nuevo) => {
  estado = { ...estado, ...nuevo };
  oyentes.forEach((fn) => fn(estado));
};

export const marcarSincronizado = () => cambiar({ sincronizado: true, error: "" });
export const marcarError = (error) => cambiar({ error });
export const limpiarError = () => cambiar({ error: "" });

/* Manda un cambio al servidor. Sin sesión no hay nada que mandar: el sitio
   público sólo lee.

   Devuelve { ok, datos, motivo } para que quien llama pueda decir la verdad:
   avisar "publicado" cuando el servidor no lo recibió es peor que no avisar. */
export async function enviar(accion) {
  const token = tokenActual();
  if (!token) return { ok: false, motivo: "sin-sesion" };

  try {
    const datos = await accion(token);
    if (estado.error) limpiarError();
    return { ok: true, datos };
  } catch (error) {
    const motivo = error.message || "No se pudo guardar en el servidor";
    marcarError(motivo);
    return { ok: false, motivo };
  }
}

export function useConexion() {
  const [actual, setActual] = useState(estado);

  useEffect(() => {
    oyentes.add(setActual);
    return () => oyentes.delete(setActual);
  }, []);

  return actual;
}
