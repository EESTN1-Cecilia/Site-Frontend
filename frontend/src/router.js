import { useEffect, useState } from "react";

/* Router mínimo por hash: no necesita dependencias ni servidor con rewrites. */
export const rutaActual = () => window.location.hash.replace(/^#/, "") || "/";

export function useRuta() {
  const [ruta, setRuta] = useState(rutaActual);

  useEffect(() => {
    const onHash = () => {
      setRuta(rutaActual());
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return ruta;
}

export const ir = (ruta) => {
  window.location.hash = ruta;
};

/* "/novedades?preview=pub1" -> ["/novedades", URLSearchParams] */
export const separar = (ruta) => {
  const [camino, busca] = ruta.split("?");
  return [camino, new URLSearchParams(busca)];
};
