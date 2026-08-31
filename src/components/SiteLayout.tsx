import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ThemeToggle } from "./ThemeToggle";


const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/novedades", label: "Novedades" },
  { to: "/previas", label: "Intensificación / Previas" },
] as const;

export function SiteLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="surface-brand">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15 text-base font-bold ring-1 ring-primary-foreground/25">
              T1
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold uppercase tracking-wider">
                EEST N°1
              </span>
              <span className="block text-xs opacity-80">Monte Grande · Esteban Echeverría</span>
            </span>
          </Link>

          <nav className="flex flex-wrap gap-1.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15"
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-primary-foreground/20 text-primary-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <span className="inline-block h-1 w-14 rounded-full bg-secondary" />
          <h1 className="mt-4 text-3xl font-semibold uppercase tracking-wide text-primary-dark sm:text-4xl">
            {title}
          </h1>
          {intro ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {intro}
            </p>
          ) : null}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>

      <footer className="border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          Escuela de Educación Secundaria Técnica N°1 · Monte Grande, Esteban Echeverría. Todos los
          documentos se abren en Google Drive.
        </div>
      </footer>
    </div>
  );
}
