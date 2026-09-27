import React from "react";
import { createRoot } from "react-dom/client";
import App from "../App.jsx";
import LimiteDeError from "./components/LimiteDeError.jsx";

/* Límite de afuera: si falla algo del marco (encabezado, pie), igual se ve un aviso. */
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LimiteDeError>
      <App />
    </LimiteDeError>
  </React.StrictMode>,
);
