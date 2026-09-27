import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import VistaPrevia from "../../components/VistaPrevia.jsx";
import { limpiarZona } from "../../libre.js";
import { EdicionTextos } from "../../components/Texto.jsx";
import { Menu, Pie } from "../../components/Marco.jsx";
import { useAjustes } from "../../ajustes.js";
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

/* El editor completo (GrapesJS) pesa: se baja sólo al abrirlo. */
const EditorLibre = lazy(() => import("../../components/EditorLibre.jsx"));

/* Páginas que se pueden armar enteras con el editor completo: dónde se
   guardan, su zona libre (que pasa a ser parte de la página) y sus bloques
   automáticos (PaginaEditable.jsx). */
const paginaCompleta = (prefijo, dinamicos) => ({ clave: `${prefijo}.pagina`, zona: `${prefijo}.libre`, dinamicos });
const deProyectos = (area) =>
  paginaCompleta(`proyectos.${area}`, [
    { id: "proyectos", nombre: "Proyectos del área" },
    { id: "otras", nombre: "Accesos a las otras orientaciones" },
  ]);

const COMPLETAS = {
  "/": paginaCompleta("inicio", [
    { id: "botones", nombre: "Botones de la portada" },
    { id: "bajar", nombre: "Flecha para bajar" },
    { id: "tarjetas-giran", nombre: "Tarjetas que giran" },
    { id: "cursos", nombre: "Tarjetas de cursos" },
    { id: "accesos", nombre: "Accesos a las secciones" },
    { id: "programas", nombre: "Programas de la Tec" },
  ]),
  "/evaluacion": paginaCompleta("evaluacion", [
    { id: "buscador", nombre: "Buscador de cuadernillos" },
    { id: "cuadernillos", nombre: "Cuadernillos (se abren en el visor)" },
  ]),
  "/previas": paginaCompleta("previas", [
    { id: "avisos", nombre: "Avisos publicados" },
    { id: "buscador", nombre: "Buscador de materias" },
    { id: "anios", nombre: "Filtro por año" },
    { id: "carpeta", nombre: "Botón a la carpeta de Drive" },
    { id: "tabla", nombre: "Tabla de mesas" },
  ]),
  "/novedades": paginaCompleta("novedades", [
    { id: "categorias", nombre: "Filtros por categoría" },
    { id: "notas", nombre: "Notas publicadas" },
  ]),
  "/inscripcion": paginaCompleta("inscripcion", [
    { id: "encabezado", nombre: "Encabezado (abierta o cerrada)" },
    { id: "formulario", nombre: "Formulario o aviso de cierre" },
  ]),
  "/proyectos/ciclo-basico": deProyectos("ciclo-basico"),
  "/proyectos/informatica": deProyectos("informatica"),
  "/proyectos/programacion": deProyectos("programacion"),
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
  const { inscripcionAbierta, redes } = useAjustes();
  const [borrador, setBorrador] = useState(publicados);
  const [base, setBase] = useState(publicados);
  const [vista, setVista] = useState(false);
  /* Editor completo abierto: { html, css, previas }. */
  const [completo, setCompleto] = useState(null);

  /* Un dato cambiado desde el editor completo (un texto del cronograma, un
     link…): la vista previa de los bloques automáticos se vuelve a armar con
     el borrador nuevo. `rehacerPrevias` se define más abajo, con la página. */
  const pedirPrevias = useRef(false);
  const rehacerPrevias = useRef(null);
  useEffect(() => {
    if (!pedirPrevias.current) return;
    pedirPrevias.current = false;
    rehacerPrevias.current?.(borrador);
  }, [borrador]);
  const vueltaPrevias = useRef(0);

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

  /* Object.hasOwn: "?p=constructor" no es una página. */
  const encontrada = Object.hasOwn(paginasEditables, pagina ?? "") ? paginasEditables[pagina] : null;
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
  const completa = Object.hasOwn(COMPLETAS, pagina) ? COMPLETAS[pagina] : null;
  const armada = !!completa && typeof borrador[completa.clave] === "string";
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

  /* Abre la página entera en el editor completo: lo que ya se armó, o si no
     una "foto" de la página de siempre. La vista previa de los bloques
     automáticos sale siempre de la foto (los datos de hoy). */
  const abrirCompleto = async () => {
    const { instantanea } = await import("../../instantanea.jsx");
    const foto = await instantanea(Pagina, pagina, borrador, completa.zona, edicion.puede);
    const inicio = armada
      ? limpiarZona(borrador[completa.clave], borrador[`${completa.clave}.css`], "", "pagina")
      : foto;
    setCompleto({ html: inicio.html, css: inicio.css, previas: foto.previas });
  };

  rehacerPrevias.current = async (actual) => {
    const vuelta = ++vueltaPrevias.current;
    const { instantanea } = await import("../../instantanea.jsx");
    const foto = await instantanea(Pagina, pagina, actual, completa.zona, edicion.puede);
    if (vuelta === vueltaPrevias.current) setCompleto((abierto) => abierto && { ...abierto, previas: foto.previas });
  };

  /* Lo que el editor completo cambia adentro de los bloques automáticos va al
     borrador, con las mismas claves que se editan acá. */
  const datosDelEditor = {
    cambiar,
    fijar,
    leer: (clave) => borrador[clave],
    refrescar: () => {
      pedirPrevias.current = true;
    },
  };

  /* Desde el primer cambio, la página se muestra desde lo armado. */
  const guardarCompleto = (html, css) => {
    fijar(completa.clave, html);
    fijar(`${completa.clave}.css`, css || undefined);
  };

  const volverAlOriginal = () => {
    if (
      !window.confirm(
        "¿Volver a la página de siempre? Se deja de usar lo armado con el editor completo. Hasta que publiques, podés deshacerlo con «Descartar cambios».",
      )
    )
      return;
    fijar(completa.clave, undefined);
    fijar(`${completa.clave}.css`, undefined);
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

    /* Los textos de la página se mandan sólo si quien publica puede editar la
       página y si cambiaron: quien sólo es dueño de una sección (las notas, las
       mesas) no reescribe los textos de todos con su foto de cuando abrió. */
    const cambiaronTextos = JSON.stringify(estaticos) !== JSON.stringify(publicados);

    /* Se espera cada envío: "publicado" sólo si el servidor recibió todo. */
    const resultados = await Promise.all([
      /* Lo que no toca Dirección vuelve a esperar su aprobación. */
      ...[...pubs.values()].map((pub) =>
        guardarPublicacion({ ...pub, estado: usuario?.rol === "direccion" ? pub.estado : "pendiente" }),
      ),
      ...[...proyectos.values()].map(([area, proyecto]) => guardarProyecto(area, proyecto)),
      listaProgramas && guardarProgramas(listaProgramas),
      datosMesas && guardarMesas(datosMesas),
      /* La página se manda al servidor: es la que decide el permiso, y así no se
         tocan los textos de las demás. */
      puedePagina && cambiaronTextos && guardarTextos(estaticos, pagina),
    ]);
    setBorrador(estaticos);

    /* Sólo se avisa "publicado" si el servidor lo recibió: creer que algo salió
       cuando no salió es peor que no avisar nada. */
    const fallido = resultados.find((resultado) => resultado && !resultado.ok);
    if (fallido) {
      setAviso("");
      setFallo(
        fallido.motivo === "sin-sesion"
          ? "Los cambios quedaron sólo en esta computadora: no hay sesión iniciada en el servidor."
          : `No se pudo guardar: ${fallido.motivo}. El cambio quedó sólo en esta computadora.`,
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
        !puedeAlgo
          ? "Así se ve la página en el sitio."
          : armada
            ? "Esta página está armada con el editor completo: abrilo para cambiar textos, imágenes, secciones y estilos. Nada se ve en el sitio hasta que publiques."
            : "Hacé clic en cualquier texto o imagen para cambiarlo. Pasá el mouse por una sección o tarjeta para moverla, duplicarla, ocultarla o cambiarle el fondo. Nada se ve en el sitio hasta que publiques."
      }
      acciones={
        <>
          {volver}
          <button className="boton" onClick={() => setVista(true)}>
            <Icon icon="ph:eye" width={16} height={16} aria-hidden="true" />
            Ver en el sitio
          </button>
          {completa && puedePagina && (
            <button className="boton boton--primario" onClick={abrirCompleto}>
              <Icon icon="ph:layout" width={16} height={16} aria-hidden="true" />
              Editor completo
            </button>
          )}
          {armada && puedePagina && (
            <button className="boton" onClick={volverAlOriginal}>
              <Icon icon="ph:arrow-counter-clockwise" width={16} height={16} aria-hidden="true" />
              Volver a la página de siempre
            </button>
          )}
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

      {armada && (
        <p className="flash flash--info">
          <Icon icon="ph:layout" width={18} height={18} aria-hidden="true" />
          Armada con el editor completo. Los bloques automáticos (
          {completa.dinamicos.map((d) => d.nombre.toLowerCase()).join(", ")}) se arman solos con sus datos: se
          editan desde su sección del panel.
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
          {/* El menú y el pie son de todas las páginas: se editan acá, con Inicio. */}
          {pagina === "/" && (
            <div className="lienzo__marco" data-nombre="Menú de arriba · se ve en todas las páginas">
              <Menu ruta="/" inscripcionAbierta={inscripcionAbierta} vista />
            </div>
          )}
          <Pagina ruta={pagina} />
          {pagina === "/" && (
            <div className="lienzo__marco" data-nombre="Pie de página · se ve en todas las páginas">
              <Pie inscripcionAbierta={inscripcionAbierta} redes={redes} />
            </div>
          )}
        </EdicionTextos.Provider>
      </div>

      {vista && (
        <VistaPrevia chip="VISTA PREVIA" titulo={nombre} url={pagina} cerrar={() => setVista(false)} />
      )}

      {completo && (
        <Suspense fallback={null}>
          <EditorLibre
            modo="pagina"
            titulo={nombre}
            html={completo.html}
            css={completo.css}
            previas={completo.previas}
            dinamicos={completa.dinamicos}
            datos={datosDelEditor}
            alCambiar={guardarCompleto}
            cerrar={() => setCompleto(null)}
          />
        </Suspense>
      )}
    </Layout>
  );
}
