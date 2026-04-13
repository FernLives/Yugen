import { useNavigate } from 'react-router-dom';
import './InfoPage.css';

export default function InfoPage() {
  const navigate = useNavigate();

  const specs = [
    { label: 'NETWORK STATUS', value: 'OPERATIONAL', status: 'pos' },
    { label: 'UPLINK NODES', value: '7 ACTIVE', status: 'neu' },
    { label: 'ENCRYPTION', value: 'RSA-4096', status: 'neu' },
    { label: 'LATENCY', value: '42ms', status: 'pos' },
    { label: 'DATA PARITY', value: '100%', status: 'pos' },
  ];

  const modules = [
    {
      id: 'refinery',
      title: 'REFINERY LOGISTICS',
      desc: 'Real-time yield modifier tracking across civilian refinery terminals. optimized for efficient mineral processing and profit maximization.',
      icon: '⚙️'
    },
    {
      id: 'resources',
      title: 'RESOURCE DATABASE',
      desc: 'Collaborative survey data for raw materials and minerals. community-driven coordinate sharing for all civilian miners.',
      icon: '💎'
    },
    {
      id: 'admin',
      title: 'NETWORK OPERATIONS',
      desc: 'Restricted access for station registry and material signature management. providing the structural data that powers the YŪGEN network.',
      icon: '🛂'
    }
  ];

  return (
    <div className="info-page fade-in">
      {/* ── Header ── */}
      <header className="info-header">
        <div className="info-title-group">
          <div className="info-tag">DECENTRALIZED CIVILIAN UTILITY</div>
          <h1 className="info-main-title">YŪGEN NETWORK <span className="title-version">v2.4.0</span></h1>
        </div>
        <div className="info-header-pips">
          <span className="pip">✧</span>
          <span className="pip">✧</span>
          <span className="pip">✧</span>
        </div>
      </header>

      <div className="info-content-grid">
        {/* ── Column Left: Philosophy & Founder ── */}
        <div className="info-col main-info">
          <section className="info-section">
            <h2 className="section-heading">01 // THE PHILOSOPHY</h2>
            <p className="philosophy-text">
              YŪGEN is not a corporation. We are not a military organization. 
              We are a collective of civilian operators, miners, and haulers dedicated to 
              democratizing industrial intelligence. 
            </p>
            <p className="philosophy-text">
              Our mission is to provide the community with the high-fidelity data needed 
              to thrive in the deep black. By sharing yields and signatures, we elevate 
              every pilot from a lone worker to a synchronized part of a greater industrial node.
            </p>
          </section>

          <section className="info-section founder-section">
            <h2 className="section-heading">02 // NETWORK FOUNDER</h2>
            <div className="founder-card" onClick={() => navigate('/profile/fernlives')}>
              <div className="founder-avatar-placeholder">
                <span className="founder-symbol">◆</span>
              </div>
              <div className="founder-info">
                <div className="founder-name">FERN-LIVES</div>
                <div className="founder-role">Lead Architect & Community Founder</div>
                <div className="founder-status">UPLINK ACTIVE [STATIONARY]</div>
              </div>
              <div className="founder-link-arrow">›</div>
            </div>
          </section>
        </div>

        {/* ── Column Right: Capabilities & Specs ── */}
        <div className="info-col meta-info">
          <section className="info-section">
            <h2 className="section-heading">03 // UTILITY MODULES</h2>
            <div className="module-deck">
              {modules.map(m => (
                <div key={m.id} className="info-module-card">
                  <div className="mod-card-header">
                    <span className="mod-icon">{m.icon}</span>
                    <h3 className="mod-title">{m.title}</h3>
                  </div>
                  <p className="mod-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="info-section specs-section">
            <h2 className="section-heading">04 // SYSTEM DIAGNOSTICS</h2>
            <div className="specs-table">
              {specs.map(s => (
                <div key={s.label} className="spec-row">
                  <span className="spec-label">{s.label}</span>
                  <span className={`spec-value ${s.status}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="info-footer">
        <div className="footer-line">FOR THE COMMUNITY, BY THE COMMUNITY.</div>
        <div className="footer-credits">YŪGEN INDUSTRIAL SUITE © 2954-2955</div>
      </footer>
    </div>
  );
}
