import React from 'react';
import logoTec from '../assets/Logo_Tec.png';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main-grid">
          {/* Institution Info */}
          <div className="footer-col brand-col">
            <div className="footer-logo-row">
              <img src={logoTec} alt="Logo Técnica 1" className="footer-logo" />
              <div>
                <h4 className="footer-school-title">E.E.S. TÉCNICA Nº1</h4>
                <p className="footer-school-subtitle">Esteban Echeverría</p>
              </div>
            </div>
            <p className="footer-desc">
              Portal institucional de Evaluación de Saberes y Acreditación de Trayectorias Educativas. Ciclo lectivo 2026.
            </p>
          </div>


          {/* Contact / Location */}
          <div className="footer-col">
            <h5 className="footer-heading">Institucional</h5>
            <ul className="footer-contact-list">
              <li>📍 Esteban Echeverría, Buenos Aires</li>
              <li>🏛️ Güemes 2051</li>
              <li>⚙️ E.E.S.T. Nº1 Cecilia Berdichevski</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© {currentYear} Escuela de Educación Secundaria Técnica Nº 1 Esteban Echeverría. Todos los derechos reservados.</p>
          <button onClick={scrollToTop} className="back-to-top-btn" title="Volver al inicio">
            Subir al inicio ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
