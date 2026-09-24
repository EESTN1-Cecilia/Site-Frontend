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

/* Cómo se muestra un link pegado en "Insertar". El iframe se arma siempre
   con el id que se saca del link, nunca con el link tal cual. */
export function comoInsertar(url) {
  const youtube = url.match(
    /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube)
    return {
      src: `https://www.youtube-nocookie.com/embed/${youtube[1]}`,
      forma: "video",
      icono: "ph:youtube-logo",
      nombre: "Video de YouTube",
    };

  const google = url.match(/^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (google) {
    const [, tipo, id] = google;
    return {
      src: `https://docs.google.com/${tipo}/d/${id}/${tipo === "presentation" ? "embed" : "preview"}`,
      forma: tipo === "presentation" ? "video" : "documento",
      icono: { document: "ph:file-doc", spreadsheets: "ph:file-xls", presentation: "ph:presentation" }[tipo],
      nombre: { document: "Documento", spreadsheets: "Hoja de cálculo", presentation: "Presentación" }[tipo],
      drive: true,
    };
  }

  const archivo = url.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (archivo)
    return {
      src: `https://drive.google.com/file/d/${archivo[1]}/preview`,
      forma: "documento",
      icono: "ph:google-drive-logo",
      nombre: "Archivo de Drive",
      drive: true,
    };

  /* Un PDF suelto va como tarjeta: los celulares no muestran PDFs en un iframe. */
  if (/\.pdf($|[?#])/i.test(url)) return { icono: "ph:file-pdf", nombre: "Documento PDF" };

  return { icono: "ph:link", nombre: "Abrir link" };
}
