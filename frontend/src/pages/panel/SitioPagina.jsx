import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import { EdicionTextos } from "../../components/Texto.jsx";
import { guardarTextos, useTextos } from "../../textos.js";
import { guardarPublicacion, usePublicaciones } from "../../publicaciones.js";
import { guardarProyecto, useAreas } from "../../proyectos.js";
import { guardarProgramas, useProgramas } from "../../programas.js";
import { guardarMesas, useMesas } from "../../mesas.js";
import {
  nombrePerfil,
  puedeEditar,
  puedeEditarPagina,
  quienEditaPagina,
} from "../../sesion.js";
import { ir } from "../../router.js";
import Inicio from "../Inicio.jsx";
import Evaluacion from "../Evaluacion.jsx";
import Previas from "../Previas.jsx";
import Novedades from "../Novedades.jsx";
import Inscripcion from "../Inscripcion.jsx";
import Proyectos from "../Proyectos.jsx";

/* Páginas públicas que se editan en el lugar: [nombre, componente, secciones
   que mandan sobre partes de la página (notas, mesas, proyectos…)]. */
export const paginasEditables = {
  "/": ["Inicio", Inicio, ["/panel/programas"]],
  "/evaluacion": ["Evaluación de saberes", Evaluacion, []],
  "/previas": ["Intensificación/Previas", Previas, ["/panel/mesas", "/panel/publicaciones"]],
  "/novedades": ["Novedades", Novedades, ["/panel/publicaciones"]],
  "/inscripcion": ["Inscripción", Inscripcion, []],
  "/proyectos/ciclo-basico": ["Proyectos · Ciclo Básico", Proyectos, ["/panel/proyectos"]],
  "/proyectos/informatica": ["Proyectos · Técnico en Informática", Proyectos, ["/panel/proyectos"]],
  "/proyectos/programacion": ["Proyectos · Técnico en Programación", Proyectos, ["/panel/proyectos"]],
};

const nombresDuenos = {
  "/panel/programas": "los programas",
  "/panel/mesas": "el cronograma de mesas",
  "/panel/publicaciones": "las notas y avisos",
  "/panel/proyectos": "los proyectos de alumnos",
};

/* Claves que no son cambios de la página sino datos de otras secciones:
   al publicar se escriben en su lugar y no quedan como cambio aparte. */
const DINAMICOS = new Set(["pub", "proy", "prog", "mesa", "mesas"]);
const partir = (clave) => clave.replace(/^(img|link):/, "").split(":");

export default function SitioPagina({ ruta, params, usuario }) {
  const pagina = params?.get("p");
  const publicados = useTextos();
  const publicaciones = usePublicaciones();
  const areas = useAreas();
  const programas = useProgramas();
  const mesas = useMesas();
  const [borrador, setBorrador] = useState(publicados);
  const [base, setBase] = useState(publicados);
  const [vista, setVista] = useState(false);

  /* Lo publicado puede llegar del servidor con el editor ya abierto (este
     navegador tenía una versión vieja guardada). Si todavía no se tocó nada,
     el borrador pasa a la versión del servidor: si no, publicar la pisaría
     con la vieja. */
  if (base !== publicados) {
    setBase(publicados);
    if (JSON.stringify(borrador) === JSON.stringify(base)) setBorrador(publicados);
  }
  const [aviso, setAviso] = useState("");
  const [fallo, setFallo] = useState("");

  const encontrada = paginasEditables[pagina];
  const sucio = JSON.stringify(borrador) !== JSON.stringify(publicados);

  const volver = (
    <button className="boton" onClick={() => ir("/panel/sitio")}>
      <Icon icon="ph:arrow-left" width={16} height={16} aria-hidden="true" />
      Sitio público
    </button>
  );

  if (!encontrada) {
    return (
      <Layout ruta={ruta} chip="SITIO PÚBLICO" titulo="Página no encontrada" acciones={volver}>
        <p className="vacio">Esa página no se puede editar desde acá.</p>
      </Layout>
    );
  }

  const [nombre, Pagina, duenos] = encontrada;
  const puedePagina = puedeEditarPagina(usuario, pagina);
  const duenosPropios = duenos.filter((dueno) => puedeEditar(usuario, dueno));
  const puedeAlgo = puedePagina || duenosPropios.length > 0;
  const tocaNotas = Object.keys(borrador).some((clave) => partir(clave)[0] === "pub");

  const fijar = (clave, valor) =>
    setBorrador((previo) => {
      const nuevo = { ...previo };
      if (valor === undefined) delete nuevo[clave];
      else nuevo[clave] = valor;
      return nuevo;
    });

  /* Si el texto vuelve a ser el original, o queda vacío, se borra el cambio. */
  const cambiar = (clave, valor, original) =>
    fijar(clave, !String(valor).trim() || valor === original ? undefined : valor);

  const edicion = {
    borrador,
    fijar,
    cambiar,
    puede: (dueno) => (dueno ? duenosPropios.includes(dueno) : puedePagina),
  };

  const publicar = async () => {
    const estaticos = {};
    const pubs = new Map();
    const proyectos = new Map();
    let listaProgramas = null;
    let datosMesas = null;

    for (const [clave, valor] of Object.entries(borrador)) {
      const [tipo, ...resto] = partir(clave);

      if (!DINAMICOS.has(tipo)) {
        estaticos[clave] = valor;
        continue;
      }

      if (tipo === "pub") {
        const [id, campo, bloqueId] = resto;
        const pub = pubs.get(id) ?? structuredClone(publicaciones.find((x) => x.id === id));
        if (!pub) continue;
        if (campo === "bloque")
          pub.bloques = pub.bloques.map((b) =>
            b.id !== bloqueId ? b : b.tipo === "imagen" ? { ...b, url: valor } : { ...b, texto: valor },
          );
        else pub[campo] = valor;
        pubs.set(id, pub);
      }

      if (tipo === "proy") {
        const [area, id, campo, j, sub] = resto;
        const clave2 = `${area}:${id}`;
        const proyecto =
          proyectos.get(clave2)?.[1] ??
          structuredClone(areas[area]?.proyectos.find((x) => x.id === id));
        if (!proyecto) continue;
        if (j === undefined) proyecto[campo] = valor;
        else if (campo === "docs") proyecto.docs[j] = { ...proyecto.docs[j], [sub]: valor };
        else {
          const lista = [...(proyecto[campo] || [])];
          lista[j] = valor;
          proyecto[campo] = lista;
        }
        proyectos.set(clave2, [area, proyecto]);
      }

      if (tipo === "prog") {
        const [id, campo] = resto;
        listaProgramas = (listaProgramas ?? programas).map((x) =>
          x.id === id ? { ...x, [campo]: valor } : x,
        );
      }

      if (tipo === "mesa" || tipo === "mesas") {
        datosMesas = datosMesas ?? structuredClone(mesas);
        if (tipo === "mesas") datosMesas[resto[0]] = valor;
        else {
          const [id, campo] = resto;
          datosMesas.mesas = datosMesas.mesas.map((m) => (m.id === id ? { ...m, [campo]: valor } : m));
        }
      }
    }

    /* Lo que no toca Dirección vuelve a esperar su aprobación. */
    pubs.forEach((pub) =>
      guardarPublicacion({ ...pub, estado: usuario?.rol === "direccion" ? pub.estado : "pendiente" }),
    );
    proyectos.forEach(([area, proyecto]) => guardarProyecto(area, proyecto));
    if (listaProgramas) guardarProgramas(listaProgramas);
    if (datosMesas) guardarMesas(datosMesas);
    /* La página se manda al servidor: es la que decide el permiso, y así no se
       tocan los textos de las demás. */
    const resultado = await guardarTextos(estaticos, pagina);
    setBorrador(estaticos);

    /* Sólo se avisa "publicado" si el servidor lo recibió: creer que algo salió
       cuando no salió es peor que no avisar nada. */
    if (resultado && !resultado.ok) {
      setAviso("");
      setFallo(
        resultado.motivo === "sin-sesion"
          ? "Los cambios quedaron sólo en esta computadora: no hay sesión iniciada en el servidor."
          : `No se pudo guardar: ${resultado.motivo}. El cambio quedó sólo en esta computadora.`,
      );
      return;
    }

    setFallo("");
    setAviso(
      pubs.size && usuario?.rol !== "direccion"
        ? "Cambios publicados. Las notas que tocaste vuelven a esperar la aprobación de Dirección."
        : "Cambios publicados.",
    );
  };

  const puedeTexto = [
    puedePagina && "toda la página",
    ...duenosPropios.map((dueno) => nombresDuenos[dueno]),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Layout
      ruta={ruta}
      chip="SITIO PÚBLICO · EDICIÓN"
      titulo={nombre}
      texto={
        puedeAlgo
          ? "Hacé clic en cualquier texto o imagen para cambiarlo. Pasá el mouse por una sección o tarjeta para moverla, duplicarla, ocultarla o cambiarle el fondo. Nada se ve en el sitio hasta que publiques."
          : "Así se ve la página en el sitio."
      }
      acciones={
        <>
          {volver}
          <button className="boton" onClick={() => setVista(true)}>
            <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
            Ver en el sitio
          </button>
          {puedeAlgo && (
            <>
              <button className="boton" disabled={!sucio} onClick={() => setBorrador(publicados)}>
                Descartar cambios
              </button>
              <button className="boton boton--primario" disabled={!sucio} onClick={publicar}>
                <Icon icon="ph:floppy-disk" width={16} height={16} aria-hidden="true" />
                Publicar
              </button>
            </>
          )}
        </>
      }
    >
      {!puedeAlgo && (
        <p className="flash flash--info">
          <Icon icon="ph:eye" width={18} height={18} aria-hidden="true" />
          Modo lectura: esta página la edita {quienEditaPagina(pagina)}.
        </p>
      )}

      {puedeAlgo && !puedePagina && (
        <p className="flash flash--info">
          <Icon icon="ph:info" width={18} height={18} aria-hidden="true" />
          Como {nombrePerfil(usuario.rol)} podés editar {puedeTexto}. El resto de
          la página lo edita {quienEditaPagina(pagina)}.
        </p>
      )}

      {aviso && (
        <p className="flash">
          <Icon icon="ph:check-circle" width={18} height={18} aria-hidden="true" />
          {aviso}
          <button className="flash__cerrar" onClick={() => setAviso("")}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}

      {fallo && (
        <p className="flash flash--error">
          <Icon icon="ph:warning" width={18} height={18} aria-hidden="true" />
          {fallo}
          <button className="flash__cerrar" onClick={() => setFallo("")}>
            <Icon icon="ph:x" width={14} height={14} aria-hidden="true" />
          </button>
        </p>
      )}

      {sucio && puedeAlgo && (
        <p className="flash flash--info">
          <Icon icon="ph:pencil-simple" width={18} height={18} aria-hidden="true" />
          Hay cambios sin publicar. El sitio sigue mostrando la versión anterior.
          {tocaNotas &&
            usuario?.rol !== "direccion" &&
            " Las notas que cambies vuelven a esperar la aprobación de Dirección."}
        </p>
      )}

      <div className="lienzo lienzo--textos">
        <EdicionTextos.Provider value={puedeAlgo ? edicion : null}>
          <Pagina ruta={pagina} />
        </EdicionTextos.Provider>
      </div>

      {vista && (
        <VistaPrevia chip="VISTA PREVIA" titulo={nombre} url={pagina} cerrar={() => setVista(false)} />
      )}
    </Layout>
  );
}
