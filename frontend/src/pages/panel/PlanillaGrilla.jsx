import { Icon } from "@iconify/react";
import { colorDeGrupo, espacioDe, franjas, horario, nombreModulo, tituloFranja } from "../../exportarGrilla.js";

/* La grilla con la forma de la organización institucional («ORGANIZACION
   OCTUBRE.pdf»): una tabla por franja (turno + módulo), días en columnas y
   filas 1 a 17. Cada clase, como en el papel:

     ┌──────────────┬──────────────────────────┐
     │ 7:10 a 9:10  │   SISTEMAS TECNOLOGICOS  │
     │ 1.9          ├────────────┬─────────────┤
     │ (17 Alumnos) │    SUM     │  GUIRLAND   │
     └──────────────┴────────────┴─────────────┘

   El grupo lleva el color de su año (1° a 3° amarillo, 4° a 6° salmón, 7°
   celeste). Es la misma disposición que el PDF que se exporta.

   Un clic en una clase la abre para editarla; con permiso de edición, el
   primer casillero libre de cada día agrega una clase ahí. Lo que se cambió
   y todavía no se guardó se marca (`pendientes`: id → "cambio" | "nueva"). */

const ESTADO_TEXTO = { docente_ausente: "Docente ausente esta semana", suspendida: "Clase cancelada esta semana" };

export default function PlanillaGrilla({ grilla, clases, turnos, ciclos, editable, activa, pendientes, alAbrir, alAgregar }) {
  const lista = franjas(grilla, clases);
  const subtitulo = [ciclos[grilla.ciclo], grilla.periodo].filter(Boolean).join(" · ");

  return (
    <div className="planillas">
      {lista.map(({ modulo, dias, porDia, filas }) => {
        // Si algún día ya llenó todas las filas, una más para poder agregar.
        const total = filas + (editable && dias.some((d) => porDia[d].length >= filas) ? 1 : 0);
        return (
          <section className="planilla" key={modulo.id} aria-labelledby={`planilla-${modulo.id}`}>
            <header className="planilla__titulo">
              <h3 id={`planilla-${modulo.id}`}>{tituloFranja(grilla, modulo, turnos, clases)}</h3>
              {subtitulo && <p>{subtitulo}</p>}
            </header>
            <div className="tabla-scroll planilla__scroll">
              <table className="planilla__tabla">
                <thead>
                  <tr>
                    <th scope="col" className="planilla__num planilla__modulo">{nombreModulo(modulo)}</th>
                    {dias.map((d) => <th scope="col" key={d}>{d.toLocaleUpperCase("es-AR")}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: total }, (_, i) => (
                    <tr key={i}>
                      <th scope="row" className="planilla__num">{i + 1}</th>
                      {dias.map((d) => {
                        const a = porDia[d][i];
                        if (!a) {
                          const libre = editable && i === porDia[d].length;
                          const id = `nueva-${modulo.id}-${d}`;
                          return (
                            <td key={d} className="planilla__vacia">
                              {libre && (
                                <button
                                  type="button"
                                  className="planilla__nueva"
                                  id={id}
                                  onClick={() => alAgregar(d, modulo.id, id)}
                                  aria-label={`Agregar una clase el ${d} en ${nombreModulo(modulo)}`}
                                >
                                  <Icon icon="ph:plus" width={12} height={12} aria-hidden="true" /> Clase
                                </button>
                              )}
                            </td>
                          );
                        }
                        const marca = pendientes?.get(a.id);
                        return (
                          <td key={d} className={`planilla__td ${a.id === activa ? "planilla__celda--activa" : ""}`}>
                            <button
                              type="button"
                              id={`clase-${a.id}`}
                              className={[
                                "planilla__celda",
                                a.estado !== "activa" && `planilla__celda--inactiva planilla__celda--${a.estado}`,
                                a.salon_habitual && "planilla__celda--cambio",
                                marca && "planilla__celda--pendiente",
                              ].filter(Boolean).join(" ")}
                              onClick={() => alAbrir(a, `clase-${a.id}`)}
                              aria-label={`${a.materia ?? "Clase sin materia"}, grupo ${a.grupo ?? "sin grupo"}, ${d} ${horario(a)}${
                                ESTADO_TEXTO[a.estado] ? `, ${ESTADO_TEXTO[a.estado]}` : ""
                              }${marca ? ", con cambios sin guardar" : ""}`}
                            >
                              <span className="planilla__izq">
                                <span className="planilla__hora">{horario(a)}</span>
                                <span className={`planilla__grupo-caja planilla__grupo-caja--${colorDeGrupo(a.grupo)}`}>
                                  <span className="planilla__grupo">{a.grupo ?? "—"}</span>
                                  {a.alumnos ? <span className="planilla__alumnos">({a.alumnos} Alumnos)</span> : null}
                                </span>
                              </span>
                              <span className="planilla__materia">{(a.materia ?? "Sin materia").toLocaleUpperCase("es-AR")}</span>
                              <span
                                className="planilla__espacio"
                                title={
                                  a.salon_habitual
                                    ? `Cambio de aula esta semana: su aula habitual es ${a.salon_habitual_nombre}`
                                    : a.compartida
                                      ? "Aula compartida con otro grupo a la misma hora (así figura en la organización)"
                                      : !a.salon_id && espacioDe(a)
                                        ? "Espacio del PDF que no está en el plano"
                                        : undefined
                                }
                              >
                                {!!a.compartida && !a.salon_habitual && (
                                  <Icon className="planilla__compartida" icon="ph:users-three" width={9} height={9} aria-label="Aula compartida" />
                                )}
                                {a.salon_habitual && <Icon icon="ph:arrows-left-right" width={9} height={9} aria-hidden="true" />}
                                {(espacioDe(a) || "Sin espacio").toLocaleUpperCase("es-AR")}
                              </span>
                              <span className="planilla__docente">{(a.docente ?? "Sin docente").toLocaleUpperCase("es-AR")}</span>
                              {(ESTADO_TEXTO[a.estado] || a.salon_habitual) && (
                                <span className="planilla__estado">
                                  {[ESTADO_TEXTO[a.estado], a.salon_habitual && `Cambio de aula esta semana (habitual: ${a.salon_habitual_nombre})`]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                              {marca && <span className="planilla__marca">{marca === "nueva" ? "Nueva · sin guardar" : "Sin guardar"}</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
