/* Texto editable en el lugar. Si `activo` es false queda como texto común,
   así la misma vista sirve para el rol dueño y para los que sólo miran. */
export default function Editable({
  etiqueta: Etiqueta = "span",
  clase = "",
  valor,
  alCambiar,
  activo = true,
  vacio = "—",
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
      onBlur={(e) => alCambiar(e.currentTarget.textContent.trim())}
    >
      {valor}
    </Etiqueta>
  );
}
