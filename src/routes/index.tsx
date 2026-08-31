import { createFileRoute, redirect } from "@tanstack/react-router";

// El sitio es HTML/CSS/JS puro y vive en /public.
// Esta ruta solo redirige la raíz al archivo estático.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/index.html" });
  },
  component: () => null,
});
