import React from 'react';

export function DocumentCard({ doc, onOpen }) {
  return (
    <article 
      className="doc-card square-card" 
      onClick={() => onOpen(doc)}
      tabIndex={0}
      role="button"
      aria-label={`Abrir ${doc.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(doc);
        }
      }}
    >
      {/* Top institutional accent line */}
      <div className="doc-card-top-accent" />

      {/* Main Square Card Body */}
      <div className="square-card-body">
        {/* Course Badge and Tag */}
        <div className="square-card-header">
          <span className="square-year-badge">{doc.yearBadge || doc.category}</span>
          <span className="square-pdf-pill">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            PDF
          </span>
        </div>

        {/* Real Cover Image or fallback paper preview */}
        {doc.coverImage ? (
          <div className="square-cover-container">
            <img 
              src={doc.coverImage} 
              alt={`Portada de ${doc.title}`} 
              className={`square-cover-img fit-${doc.fitMode || 'contain'}`} 
            />
            {/* Hover overlay hint */}
            <div className="doc-hover-overlay">
              <span className="doc-hover-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Abrir PDF
              </span>
            </div>
          </div>
        ) : (
          <div className="square-paper-preview">
            <div className="paper-header-bars">
              <div className="bar bar-long" />
              <div className="bar bar-short" />
            </div>

            <h3 className="square-doc-title">{doc.previewTitle}</h3>

            <div className="paper-skeleton-lines">
              <div className="skeleton-line full" />
              <div className="skeleton-line medium" />
              <div className="skeleton-line short" />
            </div>

            <div className="paper-bottom-tag">
              {doc.institutionTag}
            </div>

            <div className="doc-hover-overlay">
              <span className="doc-hover-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Abrir PDF
              </span>
            </div>
          </div>
        )}

        {/* Square Card Footer */}
        <div className="square-card-footer">
          <div className="square-footer-info">
            <h4 className="square-full-title">{doc.title}</h4>
          </div>
          
          <div className="square-action-row">
            <span className="square-action-link">
              Leer
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
