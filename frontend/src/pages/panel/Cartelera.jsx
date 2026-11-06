import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import { tokenActual } from "../../conexion.js";
import { explicar } from "../../asignaciones.js";
import { urlPantalla } from "../../cartelera.js";
import {
  cambiarImagenCartelera,
  cambiarTemaPantallas,
  crearPantalla,
  moverImagenCartelera,
  obtenerCartelera,
  quitarImagenCartelera,
  quitarPantalla,
  renovarPantalla,
  subirImagenCartelera,
  urlImagenCartelera,
} from "../../services/api.js";

/* Cartelera digital: lo que se ve en los televisores de los corredores.
   Mitad de la pantalla: el plano en vivo (planta baja y primer piso, un
   minuto cada una) con las clases de ese momento; la otra mitad: las
   imágenes que se cargan acá.

   Prioridad: Dirección > Jefatura de Área > EMATP. Pasan primero las de
   Dirección; cada uno cambia lo suyo y lo de los niveles de abajo. Una
   imagen «fijada» deja sólo las fijadas de su nivel (los de arriba siguen). */

const DURACIONES = [8, 10, 15, 20, 30, 45, 60];
/* Cómo se lee cada nivel (el backend guarda Dirección = 3, Jefatura = 2, EMATP = 1). */
const PRIORIDAD = { 3: ["1°", "Prioridad principal"], 2: ["2°", "Segunda prioridad"], 1: ["3°", "Tercera prioridad"] };
const AMBIENTES = { expo: "Expo Técnica", patria: "Fechas Patrias" };
const hoy = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD local

const MB = 1024 * 1024;
const TOPE_IMAGEN = 5 * MB;
const TOPE_VIDEO = 15 * MB;
const ACEPTA = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
const esVideo = (archivo) => !!archivo?.type?.startsWith("video/");

const vacio = { archivo: null, titulo: "", duracion: 10, desde: "", hasta: "", fijada: false };

export default function Cartelera({ ruta }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(null);
  const [form, setForm] = useState(vacio);
  const [vista, setVista] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [nombrePantalla, setNombrePantalla] = useState("");
  const [recargas, setRecargas] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerCartelera(tokenActual()));
      setError("");
    } catch (e) {
      setError(explicar(e));
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  /* Vista previa de la imagen elegida. */
  useEffect(() => {
    if (!form.archivo) return setVista("");
    const url = URL.createObjectURL(form.archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [form.archivo]);

  const avisar = (tipo, texto) => setAviso({ tipo, texto });
  const accion = async (tarea, exito) => {
    try {
      await tarea(tokenActual());
      if (exito) avisar("ok", exito);
      await cargar();
    } catch (e) {
      avisar("error", explicar(e));
    }
  };

  const agregar = async (e) => {
    e.preventDefault();
    if (!form.archivo) return avisar("error", "Elegí una imagen o un video.");
    if (esVideo(form.archivo) ? form.archivo.size > TOPE_VIDEO : form.archivo.size > TOPE_IMAGEN) {
      return avisar(
        "error",
        esVideo(form.archivo) ? "El video supera los 15 MB: comprimilo o acortalo y volvé a intentar." : "La imagen supera los 5 MB: achicala y volvé a intentar.",
      );
    }
    setSubiendo(true);
    await accion(
      (token) => subirImagenCartelera(token, form.archivo, { ...form, archivo: undefined, fijada: form.fijada ? "true" : "" }),
      `«${form.titulo || form.archivo.name}» se agregó a la cartelera.`,
    );
    setSubiendo(false);
    setForm(vacio);
  };

  /* Pantalla especial de los televisores (vale para todos): Expo Técnica, Fechas Patrias o ninguna. */
  const tema = datos?.pantallas?.[0]?.tema ?? "";
  const elegirTema = (nuevo) =>
    accion(
      (t) => cambiarTemaPantallas(t, nuevo),
      nuevo ? `${AMBIENTES[nuevo]} activada en los televisores.` : "Filtro quitado: los televisores vuelven al aspecto normal.",
    ).then(() => setRecargas((n) => n + 1)); // la vista previa se recarga ya (los televisores, en unos segundos)

  const videoElegido = esVideo(form.archivo);
  const niveles = datos?.niveles ?? {};
  const grupos = useMemo(
    () => [3, 2, 1].map((n) => [n, (datos?.imagenes ?? []).filter((i) => i.nivel === n)]),
    [datos],
  );
  const fijado = Math.max(0, ...(datos?.imagenes ?? []).filter((i) => i.enPantalla && i.fijada).map((i) => i.nivel));

  const estadoDe = (i) => {
    if (!i.activo) return ["pausada", "Pausada"];
    if (i.desde && i.desde > hoy()) return ["fuera", `Desde el ${new Date(`${i.desde}T00:00`).toLocaleDateString("es-AR")}`];
    if (i.hasta && i.hasta < hoy()) return ["fuera", "Venció"];
    if (i.enPantalla) return ["en-pantalla", "En pantalla"];
    return ["tapada", `No pasa: hay una fijada de ${niveles[fijado] ?? "otro nivel"}`];
  };

  return (
    <Layout
      ruta={ruta}
      chip="COMUNICACIÓN"
      titulo="Cartelera digital"
      texto="Lo que se ve en los televisores de los corredores: a un lado, el plano en vivo con las clases de ese momento (planta baja y primer piso, un minuto cada una); al otro, las imágenes que cargues acá. Prioridad principal: Dirección; segunda: Jefatura de Área; tercera: EMATP."
    >
      {aviso && (
        <p className={`flash ${aviso.tipo === "error" ? "flash--error" : ""}`} role={aviso.tipo === "error" ? "alert" : "status"}>
          <Icon icon={aviso.tipo === "error" ? "ph:warning" : "ph:check-circle"} width={18} height={18} aria-hidden="true" />
          <span>{aviso.texto}</span>
          <button className="flash__cerrar" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}
      {error && <p className="flash flash--error">{error}</p>}

      <section className="tarjeta">
        <div className="tarjeta__barra">
          <div>
            <h2 className="tarjeta__titulo">Agregar una imagen o un video</h2>
            <p className="tarjeta__bajada">
              Imagen JPG, PNG, WEBP o GIF de hasta 5 MB, o video MP4 (H.264) o WEBM de hasta 15 MB (se ve sin sonido y pasa completo). Se ve en la mitad derecha del televisor (mejor apaisado, 16:9).
              {datos && ` Cargás como ${niveles[datos.nivel]} (${PRIORIDAD[datos.nivel]?.[1].toLowerCase()}).`}
            </p>
          </div>
        </div>
        <form className="cartelera__form" onSubmit={agregar} noValidate>
          <label className={`cartelera__elegir ${vista ? "cartelera__elegir--con-imagen" : ""}`}>
            {vista ? (
              videoElegido ? <video src={vista} muted loop autoPlay playsInline aria-label="Vista previa del video elegido" /> : <img src={vista} alt="Vista previa de la imagen elegida" />
            ) : (
              <span>
                <Icon icon="ph:image-square" width={34} height={34} aria-hidden="true" />
                Elegir imagen o video
              </span>
            )}
            <input type="file" accept={ACEPTA} onChange={(e) => setForm({ ...form, archivo: e.target.files?.[0] ?? null })} />
          </label>
          <div className="formulario formulario--panel cartelera__campos">
            <label className="campo">
              <span>Título (opcional)</span>
              <input maxLength={120} value={form.titulo} placeholder="Acto del 20 de noviembre" onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </label>
            <label className="campo">
              <span>Tiempo en pantalla</span>
              <select value={videoElegido ? "video" : form.duracion} disabled={videoElegido} onChange={(e) => setForm({ ...form, duracion: Number(e.target.value) })}>
                {videoElegido ? <option value="video">Lo que dura el video</option> : DURACIONES.map((d) => <option key={d} value={d}>{d} segundos</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Desde (opcional)</span>
              <input type="date" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} />
            </label>
            <label className="campo">
              <span>Hasta (opcional)</span>
              <input type="date" value={form.hasta} min={form.desde || undefined} onChange={(e) => setForm({ ...form, hasta: e.target.value })} />
            </label>
            <label className="campo--casilla cartelera__fijar">
              <input type="checkbox" checked={form.fijada} onChange={(e) => setForm({ ...form, fijada: e.target.checked })} />
              <span>Fijar: mientras esté vigente, de tu nivel se ve sólo esta (los niveles de arriba siguen pasando).</span>
            </label>
            <div className="acciones-fila">
              <button className="boton boton--primario" type="submit" disabled={subiendo || !form.archivo}>
                <Icon icon="ph:upload-simple" width={16} height={16} aria-hidden="true" />
                {subiendo ? "Subiendo…" : "Agregar a la cartelera"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="tarjeta">
        <h2 className="tarjeta__titulo">En la cartelera</h2>
        <p className="tarjeta__bajada">En el orden en que pasan. Podés cambiar o quitar lo de tu nivel y lo de los niveles de abajo.</p>
        {!datos ? (
          <p className="nota-interna">Cargando…</p>
        ) : (
          grupos.map(([nivel, lista]) => (
            <div className="cartelera__nivel" key={nivel}>
              <h3 className="cartelera__nivel-titulo">
                <span className={`cartelera__prioridad cartelera__prioridad--${nivel}`} aria-hidden="true">{PRIORIDAD[nivel][0]}</span>
                <span className="cartelera__nivel-orden">{PRIORIDAD[nivel][1]}:</span>
                {niveles[nivel]}
                <span className="cartelera__nivel-cuenta">{lista.length ? `${lista.length} imagen${lista.length === 1 ? "" : "es"}` : "sin imágenes"}</span>
              </h3>
              {lista.length > 0 && (
                <ul className="cartelera__lista">
                  {lista.map((i, n) => {
                    const [clase, texto] = estadoDe(i);
                    return (
                      <li className={`cartelera__item cartelera__item--${clase}`} key={i.id}>
                        {i.tipo === "video" ? (
                          <video className="cartelera__miniatura" src={`${urlImagenCartelera(i.clave)}#t=0.1`} preload="metadata" muted playsInline aria-hidden="true" />
                        ) : (
                          <img className="cartelera__miniatura" src={urlImagenCartelera(i.clave)} alt="" loading="lazy" />
                        )}
                        <div className="cartelera__datos">
                          <p className="cartelera__titulo">{i.titulo || "Sin título"}</p>
                          <p className="cartelera__detalle">
                            {i.tipo === "video" ? "Video" : `${i.duracion} s`} · {i.autor ?? i.origen}
                            {(i.desde || i.hasta) && ` · ${i.desde ? `desde ${new Date(`${i.desde}T00:00`).toLocaleDateString("es-AR")}` : ""}${i.hasta ? ` hasta ${new Date(`${i.hasta}T00:00`).toLocaleDateString("es-AR")}` : ""}`}
                          </p>
                          <p className="cartelera__chips">
                            <span className={`cartelera__estado cartelera__estado--${clase}`}>{texto}</span>
                            {i.fijada && <span className="cartelera__estado cartelera__estado--fijada"><Icon icon="ph:push-pin" width={11} height={11} aria-hidden="true" /> Fijada</span>}
                          </p>
                        </div>
                        {i.puedeCambiar ? (
                          <div className="cartelera__acciones">
                            <button className="boton boton--fino" disabled={n === 0} aria-label="Subir" title="Subir" onClick={() => accion((t) => moverImagenCartelera(t, i.id, "arriba"))}>
                              <Icon icon="ph:arrow-up" width={14} height={14} aria-hidden="true" />
                            </button>
                            <button className="boton boton--fino" disabled={n === lista.length - 1} aria-label="Bajar" title="Bajar" onClick={() => accion((t) => moverImagenCartelera(t, i.id, "abajo"))}>
                              <Icon icon="ph:arrow-down" width={14} height={14} aria-hidden="true" />
                            </button>
                            <button className="boton boton--fino" onClick={() => accion((t) => cambiarImagenCartelera(t, i.id, { activo: !i.activo }), i.activo ? "Imagen pausada." : "La imagen vuelve a pasar.")}>
                              <Icon icon={i.activo ? "ph:pause" : "ph:play"} width={14} height={14} aria-hidden="true" />
                              {i.activo ? "Pausar" : "Reanudar"}
                            </button>
                            <button className="boton boton--fino" onClick={() => accion((t) => cambiarImagenCartelera(t, i.id, { fijada: !i.fijada }))}>
                              <Icon icon="ph:push-pin" width={14} height={14} aria-hidden="true" />
                              {i.fijada ? "Desfijar" : "Fijar"}
                            </button>
                            <button
                              className="boton boton--fino boton--peligro"
                              onClick={() => window.confirm(`¿Quitar «${i.titulo || "la imagen"}» de la cartelera?`) && accion((t) => quitarImagenCartelera(t, i.id), "Imagen quitada.")}
                            >
                              <Icon icon="ph:trash" width={14} height={14} aria-hidden="true" />
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <p className="cartelera__solo-ver">Es de {i.origen}: no la podés cambiar.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))
        )}
      </section>

      {datos?.pantallas && (
        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Televisores</h2>
          <p className="tarjeta__bajada">
            Cada televisor abre su enlace en el navegador (en pantalla completa). No necesita iniciar sesión: con el enlace sólo se ve la cartelera.
            Si un enlace se filtra, renovalo y el anterior deja de funcionar.
          </p>
          <ul className="cartelera__pantallas">
            {datos.pantallas.map((p) => {
              const url = urlPantalla(p.token);
              return (
                <li key={p.id} className="cartelera__pantalla">
                  <Icon icon="ph:television-simple" width={22} height={22} aria-hidden="true" />
                  <div className="cartelera__datos">
                    <p className="cartelera__titulo">{p.nombre}</p>
                    <input className="cartelera__enlace" readOnly value={url} onFocus={(e) => e.target.select()} aria-label={`Enlace de ${p.nombre}`} />
                  </div>
                  <div className="cartelera__acciones">
                    <a className="boton boton--fino boton--primario" href={url} target="_blank" rel="noopener noreferrer">
                      <Icon icon="ph:arrow-square-out" width={14} height={14} aria-hidden="true" /> Abrir
                    </a>
                    <button className="boton boton--fino" onClick={() => navigator.clipboard?.writeText(url).then(() => avisar("ok", "Enlace copiado."), () => avisar("error", "No se pudo copiar: seleccioná el enlace y copialo."))}>
                      <Icon icon="ph:copy" width={14} height={14} aria-hidden="true" /> Copiar
                    </button>
                    <button className="boton boton--fino" onClick={() => window.confirm(`¿Renovar el enlace de «${p.nombre}»? El televisor va a necesitar el enlace nuevo.`) && accion((t) => renovarPantalla(t, p.id), "Enlace renovado: abrí el nuevo en el televisor.")}>
                      <Icon icon="ph:arrows-clockwise" width={14} height={14} aria-hidden="true" /> Renovar enlace
                    </button>
                    <button className="boton boton--fino boton--peligro" onClick={() => window.confirm(`¿Quitar «${p.nombre}»? Su enlace deja de funcionar.`) && accion((t) => quitarPantalla(t, p.id), "Pantalla quitada.")}>
                      <Icon icon="ph:trash" width={14} height={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <form
            className="cartelera__nueva-pantalla"
            onSubmit={(e) => {
              e.preventDefault();
              accion((t) => crearPantalla(t, nombrePantalla.trim()), `Pantalla «${nombrePantalla.trim()}» creada.`).then(() => setNombrePantalla(""));
            }}
          >
            <label className="campo">
              <span>Nuevo televisor</span>
              <input value={nombrePantalla} maxLength={60} placeholder="Corredor planta baja" onChange={(e) => setNombrePantalla(e.target.value)} />
            </label>
            <button className="boton boton--fino" type="submit" disabled={!nombrePantalla.trim()}>
              <Icon icon="ph:plus" width={14} height={14} aria-hidden="true" /> Agregar televisor
            </button>
          </form>

          {datos.pantallas.length > 0 && (
            <div className="cartelera__ambiente">
              <p className="cartelera__vista-titulo">Pantalla especial</p>
              <div className="cartelera__ambiente-botones" role="group" aria-label="Pantalla especial de los televisores">
                <button type="button" className={`boton boton--fino ambiente ambiente--expo ${tema === "expo" ? "ambiente--activo" : ""}`} aria-pressed={tema === "expo"} onClick={() => elegirTema("expo")}>
                  <Icon icon="ph:gear-six" width={16} height={16} aria-hidden="true" /> Expo Técnica
                </button>
                <button type="button" className={`boton boton--fino ambiente ambiente--patria ${tema === "patria" ? "ambiente--activo" : ""}`} aria-pressed={tema === "patria"} onClick={() => elegirTema("patria")}>
                  <Icon icon="ph:flag-banner" width={16} height={16} aria-hidden="true" /> Fechas Patrias
                </button>
                <button type="button" className="boton boton--fino ambiente ambiente--quitar" disabled={!tema} onClick={() => elegirTema("")}>
                  <Icon icon="ph:x-circle" width={16} height={16} aria-hidden="true" /> Quitar Filtro
                </button>
              </div>
              <p className="cartelera__ambiente-nota">Cambia la pantalla de todos los televisores a la vez. «Quitar Filtro» vuelve al aspecto normal.</p>
            </div>
          )}

          {datos.pantallas[0] && (
            <div className="cartelera__vista">
              <p className="cartelera__vista-titulo">Vista previa ({datos.pantallas[0].nombre})</p>
              <div className="cartelera__marco">
                <iframe key={recargas} title="Vista previa del televisor" src={urlPantalla(datos.pantallas[0].token)} />
              </div>
            </div>
          )}
        </section>
      )}
    </Layout>
  );
}
