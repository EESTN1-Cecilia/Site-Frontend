import React from 'react';
import { DocumentCard } from './DocumentCard';

export function YearSection({ 
  section, 
  onOpenDocument, 
  isExpanded = true, 
  onToggle 
}) {
  if (!section.documents || section.documents.length === 0) {
    return null;
  }

  const docCount = section.documents.length;

  return (
    <section id={section.id} className={`year-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Clickable Header for Collapsing / Expanding */}
      <div 
        className="year-section-header-clickable"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
       

        
      </div>

      {/* Collapsible Content Area */}
      <div className={`collapsible-wrapper ${isExpanded ? 'is-open' : 'is-closed'}`}>
        <div className="collapsible-inner">
          <div className="documents-grid">
            {section.documents.map((doc) => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                onOpen={onOpenDocument} 
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
