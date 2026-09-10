/* Sólo links http(s): evita que algo como "javascript:" termine en un href. */
export const esLinkValido = (url) => /^https?:\/\//i.test((url || "").trim());

/* "https://diagramtec.com/app" -> "diagramtec.com", para mostrar adónde lleva. */
export const dominio = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};
