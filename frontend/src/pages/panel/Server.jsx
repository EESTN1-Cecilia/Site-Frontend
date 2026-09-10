import { useState } from "react";
import { Icon } from "@iconify/react";
import Layout from "./Layout.jsx";
import {
  inventarioInicial,
  mensajesServer,
  reservasIniciales,
} from "../../panelData.js";
import { nombrePerfil, puedeEditar } from "../../sesion.js";

export default function Server({ ruta, usuario }) {
  const [inventario, setInventario] = useState(inventarioInicial);
  const [reservas, setReservas] = useState(reservasIniciales);
  const [mensajes, setMensajes] = useState(mensajesServer);
  const [texto, setTexto] = useState("");

  /* Sólo la encargada modifica el inventario; dirección mira. */
  const editable = puedeEditar(usuario, ruta);
  const rol = nombrePerfil(usuario?.rol);

  const ajustar = (id, delta) =>
    setInventario((previo) =>
      previo.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad: Math.max(0, item.cantidad + delta),
              disponibles: Math.max(0, item.disponibles + delta),
            }
          : item,
      ),
    );

  const responder = (id, estado) =>
    setReservas((previo) =>
      previo.map((reserva) =>
        reserva.id === id ? { ...reserva, estado } : reserva,
      ),
    );

  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setMensajes((previo) => [
      ...previo,
      {
        id: `m${previo.length + 1}`,
        autor: rol,
        rol: editable ? "server" : "directivo",
        texto: texto.trim(),
        hora: new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setTexto("");
  };

  return (
    <Layout
      ruta={ruta}
      chip="SERVER"
      titulo="Inventario y reservas"
      texto="Control del material de server: qué hay, quién lo pide y para cuándo."
      acciones={
        <span className="etiqueta">Ingresaste como {rol}</span>
      }
    >
      <div className="tabla-scroll">
        <table className="tabla tabla--panel">
          <thead>
            <tr>
              <th>Material</th>
              <th>Categoría</th>
              <th>Total</th>
              <th>Disponibles</th>
              <th>Ubicación</th>
              {editable && <th>Ajustar</th>}
            </tr>
          </thead>
          <tbody>
            {inventario.map((item) => (
              <tr key={item.id}>
                <td data-label="Material">
                  <strong>{item.item}</strong>
                </td>
                <td data-label="Categoría">{item.categoria}</td>
                <td data-label="Total">{item.cantidad}</td>
                <td data-label="Disponibles">
                  <span
                    className={`etiqueta etiqueta--${
                      item.disponibles === 0 ? "alerta" : "ok"
                    }`}
                  >
                    {item.disponibles}
                  </span>
                </td>
                <td data-label="Ubicación">{item.ubicacion}</td>
                {editable && (
                  <td data-label="Ajustar">
                    <div className="contador">
                      <button
                        aria-label={`Restar ${item.item}`}
                        onClick={() => ajustar(item.id, -1)}
                      >
                        <Icon icon="ph:minus" width={14} height={14} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Sumar ${item.item}`}
                        onClick={() => ajustar(item.id, 1)}
                      >
                        <Icon icon="ph:plus" width={14} height={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel__cols">
        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Reservas de material</h2>
          <p className="tarjeta__bajada">
            Proyectores, televisores y notebooks, con horario de retiro y
            devolución.
          </p>
          <ul className="reservas">
            {reservas.map((reserva) => (
              <li className="reserva" key={reserva.id}>
                <div>
                  <p className="reserva__titulo">
                    {reserva.cantidad} × {reserva.item}
                  </p>
                  <p className="reserva__detalle">
                    {reserva.solicitante} · {reserva.curso} · {reserva.desde} a{" "}
                    {reserva.hasta}
                  </p>
                </div>
                {reserva.estado === "Pendiente" && editable ? (
                  <div className="acciones-fila">
                    <button
                      className="boton boton--fino boton--primario"
                      onClick={() => responder(reserva.id, "Aceptada")}
                    >
                      Aceptar
                    </button>
                    <button
                      className="boton boton--fino"
                      onClick={() => responder(reserva.id, "Rechazada")}
                    >
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <span
                    className={`etiqueta etiqueta--${
                      reserva.estado === "Aceptada"
                        ? "ok"
                        : reserva.estado === "Rechazada"
                          ? "alerta"
                          : "aviso"
                    }`}
                  >
                    {reserva.estado}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta">
          <h2 className="tarjeta__titulo">Mensajes con dirección</h2>
          <p className="tarjeta__bajada">
            Pedidos de permiso y avisos de material, sin cadenas de WhatsApp.
          </p>
          <ul className="chat">
            {mensajes.map((mensaje) => (
              <li className={`chat__mensaje chat__mensaje--${mensaje.rol}`} key={mensaje.id}>
                <p className="chat__autor">
                  {mensaje.autor} · {mensaje.hora}
                </p>
                <p className="chat__texto">{mensaje.texto}</p>
              </li>
            ))}
          </ul>
          <form className="chat__form" onSubmit={enviar}>
            <input
              placeholder="Escribí un mensaje o una solicitud"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button className="boton boton--primario" type="submit">
              <Icon icon="ph:paper-plane-tilt" width={16} height={16} aria-hidden="true" />
              Enviar
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
