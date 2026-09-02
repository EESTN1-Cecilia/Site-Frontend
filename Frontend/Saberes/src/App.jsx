import { useState, useMemo } from 'react';
import { Hero } from './components/Hero';
import { DocumentCard } from './components/DocumentCard';
import { DocumentModal } from './components/DocumentModal';
import { Footer } from './components/Footer';
import { saberesData } from './data/saberesData';
import './App.css';

function App() {
  const [activeYear, setActiveYear] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleSelectYearFromHero = (yearId) => {
    setActiveYear(yearId);
    const element = document.getElementById(yearId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Extract all documents with their section information
  const allDocs = useMemo(() => {
    return saberesData.flatMap((section) => 
      section.documents.map((doc) => ({
        ...doc,
        sectionId: section.id,
        sectionTitle: section.yearTitle
      }))
    );
  }, []);

  // Filter documents based on search term and/or selected year
  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const matchesSearch = !searchTerm.trim() || (
        doc.title.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        doc.previewTitle.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
      return matchesSearch;
    });
  }, [allDocs, searchTerm]);

  return (
    <div className="app-container">
      {/* Hero Header with Institutional Burgundy Style */}
      <Hero
        activeYear={activeYear}
        onSelectYear={handleSelectYearFromHero}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Section Header */}
        <div className="main-section-title-row">
          <div className="vertical-accent-bar" />
          <div>
            <h2 className="main-courses-title">CURSOS - CICLO LECTIVO 2026</h2>
            <p className="main-courses-subtitle">Seleccioná tu año para abrir el cuadernillo de evaluación de saberes oficial.</p>
          </div>
        </div>

        {searchTerm && (
          <div className="search-feedback-banner">
            <span>
              Resultados para "<strong>{searchTerm}</strong>": {filteredDocs.length} documento(s) encontrado(s)
            </span>
            <button 
              className="reset-search-link"
              onClick={() => setSearchTerm('')}
            >
              Ver todos
            </button>
          </div>
        )}

        {/* 3 Square Cards side-by-side in horizontal grid */}
        {filteredDocs.length > 0 ? (
          <div className="square-cards-grid">
            {filteredDocs.map((doc) => (
              <div key={doc.id} id={doc.sectionId} className="square-card-wrapper">
                <DocumentCard 
                  doc={doc} 
                  onOpen={setSelectedDoc} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results-box">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <h3>No se encontraron documentos</h3>
            <p>No hay evaluaciones que coincidan con "{searchTerm}".</p>
            <button 
              className="pill-btn primary" 
              onClick={() => setSearchTerm('')}
            >
              Borrar filtro de búsqueda
            </button>
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <Footer />

      {/* Full Document Reader Modal */}
      {selectedDoc && (
        <DocumentModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

export default App;
