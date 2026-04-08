import { useState, useEffect } from 'react';
import { orgData } from '../../data/orgData';
import './OrgFile.css';

export default function OrgFile() {
  const [visibleSections, setVisibleSections] = useState([]);

  useEffect(() => {
    orgData.sections.forEach((_, i) => {
      setTimeout(() => {
        setVisibleSections(prev => [...prev, i]);
      }, 100 + i * 150);
    });
  }, []);

  return (
    <div className="dossier fade-in-up">
      {/* Classification strip */}
      <div className="dossier-classification">
        <span className="classification-marker">RESTRICTED</span>
        <span className="classification-id">{orgData.systemId}</span>
      </div>

      {/* Document */}
      <article className="dossier-doc">
        {/* Title block */}
        <header className="dossier-title-block">
          <h1 className="dossier-title" data-text="Organization Dossier">
            Organization Dossier
          </h1>
          <div className="dossier-meta">
            <span>Archive Node: AUXNET</span>
            <span className="meta-sep">·</span>
            <span>Modified: {orgData.lastUpdated}</span>
            <span className="meta-sep">·</span>
            <span>Status: Active</span>
          </div>
        </header>

        <div className="dossier-rule" />

        {/* Sections */}
        <div className="dossier-sections">
          {orgData.sections.map((section, i) => (
            <section
              key={i}
              className={`dossier-section ${visibleSections.includes(i) ? 'visible' : ''}`}
            >
              <div className="section-label">
                <span className="section-num">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="section-heading">{section.title}</h2>
              </div>

              <div className="section-body">
                {section.content.map((block, j) => (
                  <p key={j} className="section-paragraph">
                    {block.type === 'text' && block.value}
                    {block.type === 'redacted' && (
                      <span className="redacted-block">{block.value}</span>
                    )}
                    {block.type === 'glitch' && (
                      <span className="glitch-subtle" data-text={block.value}>
                        {block.value}
                      </span>
                    )}
                  </p>
                ))}
              </div>

              {i < orgData.sections.length - 1 && <div className="section-divider" />}
            </section>
          ))}
        </div>

        {/* End */}
        <div className="dossier-end">
          <span>END OF FILE</span>
        </div>
      </article>
    </div>
  );
}
