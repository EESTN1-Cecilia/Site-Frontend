import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import logo from "@/assets/logo.png";
import escuelaBanner from "@/assets/escuela.PNG";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  title: string;
  intro: string;
  children: ReactNode;
};

export function SiteLayout({ title, intro, children }: Props) {
  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link className="brand" to="/">
            <span className="brand-badge">
              <img className="brand-logo" src={logo} alt="Logo EEST N°1" />
            </span>
            <span>
              <span className="brand-title">EEST N°1</span>
              <span className="brand-sub">Monte Grande · Esteban Echeverría</span>
            </span>
          </Link>
          <nav className="nav">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }}>
              Inicio
            </Link>
            <Link to="/novedades" activeProps={{ className: "active" }}>
              Novedades
            </Link>
            <Link to="/previas" activeProps={{ className: "active" }}>
              Intensificación / Previas
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div
        className="site-banner"
        style={{ backgroundImage: `url(${escuelaBanner})` }}
        aria-hidden="true"
      />

      <div className="hero">
        <div className="wrap">
          <span className="rule" />
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </div>

      <main className="wrap">{children}</main>

      <footer className="site-footer">
        <div className="wrap">
          Escuela de Educación Secundaria Técnica N°1 · Monte Grande, Esteban Echeverría. Todos los
          documentos se abren en Google Drive.
        </div>
      </footer>
    </>
  );
}
