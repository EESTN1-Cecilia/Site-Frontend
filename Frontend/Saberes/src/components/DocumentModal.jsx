import React, { useEffect } from 'react';

export function DocumentModal({ doc, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  if (!doc) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Visor de ${doc.title}`}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="modal-badge">{doc.category}</span>
            <h3 className="modal-doc-title">{doc.title}</h3>
          </div>

          <div className="modal-actions">
            {/* Open in new tab */}
            <a 
              href={doc.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-tool-btn"
              title="Abrir en pestaña nueva"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span className="btn-label-desktop">Abrir pestaña</span>
            </a>

            {/* Direct Download button */}
            <a 
              href={doc.pdfUrl}
              download={doc.fileName || 'evaluacion_saberes.pdf'}
              className="modal-btn-download"
              title="Descargar archivo PDF"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Descargar PDF</span>
            </a>

            {/* Close button */}
            <button 
              className="modal-btn-close" 
              onClick={onClose}
              title="Cerrar visor (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body with Real Embedded PDF Viewer */}
        <div className="modal-pdf-viewport">
          <iframe
            src={`${doc.pdfUrl}#toolbar=1&navpanes=1`}
            title={doc.title}
            className="modal-pdf-iframe"
          />
        </div>
      </div>
    </div>
  );
}
