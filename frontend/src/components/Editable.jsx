/* Texto editable en el lugar. Si `activo` es false queda como texto común,
   así la misma vista sirve para el rol dueño y para los que sólo miran.
   `detener` evita que el clic dispare lo que haya debajo (un link, un botón,
   un desplegable) y hace que Enter confirme en vez de agregar un renglón. */
export default function Editable({
  etiqueta: Etiqueta = "span",
  clase = "",
  valor,
  alCambiar,
  activo = true,
  vacio = "—",
  detener = false,
}) {
  if (!activo) {
    return <Etiqueta className={clase}>{valor || vacio}</Etiqueta>;
  }

  return (
    <Etiqueta
      className={`${clase} editable`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      title="Hacé clic para editar"
      onClick={
        detener
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
      onKeyDown={
        detener
          ? (e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }
          : undefined
      }
      onBlur={(e) => alCambiar(e.currentTarget.textContent.trim())}
    >
      {valor}
    </Etiqueta>
  );
}
