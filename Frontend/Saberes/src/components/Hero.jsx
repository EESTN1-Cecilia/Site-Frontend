import React from 'react';
import logoTec from '../assets/Logo_Tec.png';

export function Hero({ onSelectYear, activeYear, searchTerm, onSearchChange }) {
  const years = [
    { id: 'primer-ano', label: 'PRIMER AÑO 2026' },
    { id: 'segundo-ano', label: 'SEGUNDO AÑO 2026' },
    { id: 'tercer-ano', label: 'TERCER AÑO 2026' }
  ];

  const handleYearClick = (yearId) => {
    onSelectYear(yearId);
    const element = document.getElementById(yearId);
    if (element) {
      const yOffset = -24;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <header className="hero-section">
      <div className="hero-pattern-overlay" />
      
      <div className="hero-content">
        {/* School Badge and Subtitle */}
        <div className="school-badge-container">
          <img 
            src={logoTec} 
            alt="Logo Escuela Técnica Nº1 Cecilia Berdichevski" 
            className="school-badge-logo" 
          />
          <div className="school-badge-text">
            <span className="school-name">E.E.S. TÉCNICA Nº1 · CECILIA BERDICHEVSKI</span>
            <span className="school-cycle">Ciclo lectivo 2026</span>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="hero-title">EVALUACIÓN DE SABERES</h1>

        {/* Description */}
        <p className="hero-description">
          Todo el material de primero, segundo y tercer año en un solo lugar.
        </p>

      </div>
    </header>
  );
}
