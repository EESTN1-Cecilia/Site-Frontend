import { useEffect, useState } from "react";

/* Conexión con el backend.

   Lo que se edita en gestión se aplica en pantalla al instante y se manda al
   servidor. Si el servidor no responde, el cambio queda guardado en este
   navegador y acá se anota el error para avisarlo en el panel: así nadie cree
   que publicó algo que en realidad no salió. */

const TOKEN = "site_token";

/* Dónde vive el token. Si al entrar se destildó "Mantener sesión iniciada"
   va a sessionStorage, que el navegador borra al cerrarse; si no, a
   localStorage. Se lee de los dos. */
const almacenes = () => {
  try {
    return [sessionStorage, localStorage];
  } catch {
    return [];
  }
};

export const tokenActual = () => {
  for (const almacen of almacenes()) {
    try {
      const token = almacen.getItem(TOKEN);
      if (token) return token;
    } catch {
      /* almacenamiento bloqueado */
    }
  }
  return null;
};

/* true si la sesión se guardó para que sobreviva al cierre del navegador. */
export const sesionRecordada = () => {
  try {
    return !!localStorage.getItem(TOKEN);
  } catch {
    return false;
  }
};

export const guardarToken = (token, recordar) => {
  borrarToken();
  try {
    (recordar ? localStorage : sessionStorage).setItem(TOKEN, token);
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
};

export const borrarToken = () =>
  almacenes().forEach((almacen) => {
    try {
      almacen.removeItem(TOKEN);
    } catch {
      /* nada que borrar */
    }
  });

let estado = { sincronizado: false, error: "" };
const oyentes = new Set();

const cambiar = (nuevo) => {
  estado = { ...estado, ...nuevo };
  oyentes.forEach((fn) => fn(estado));
};

export const marcarSincronizando = () => cambiar({ sincronizado: false });
export const marcarSincronizado = () => cambiar({ sincronizado: true, error: "" });
export const marcarError = (error) => cambiar({ error });
export const limpiarError = () => cambiar({ error: "" });

/* Manda un cambio al servidor. Sin sesión no hay nada que mandar: el sitio
   público sólo lee.

   Tampoco se manda nada si todavía no se pudo traer lo publicado: lo que se
   editó partiría de la copia de este navegador (que pudo dejar otra persona,
   o estar vieja) y pisaría lo que hay en el servidor.

   Devuelve { ok, datos, motivo } para que quien llama pueda decir la verdad:
   avisar "publicado" cuando el servidor no lo recibió es peor que no avisar. */
export async function enviar(accion) {
  const token = tokenActual();
  if (!token) return { ok: false, motivo: "sin-sesion" };

  if (!estado.sincronizado) {
    const motivo =
      "todavía no se pudo traer lo publicado del servidor. Recargá la página y volvé a intentar";
    marcarError(`No se guardó: ${motivo}.`);
    return { ok: false, motivo };
  }

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
