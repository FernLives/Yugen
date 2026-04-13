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
      desc: 'Real-time yield modifier tracking across civilian refinery terminals. Optimized for efficient mineral processing and profit maximization.',
      icon: '⚙️',
      code: 'MDL-REF-01'
    },
    {
      id: 'resources',
      title: 'RESOURCE DATABASE',
      desc: 'Collaborative survey data for raw materials and minerals. Community-driven coordinate sharing for all civilian miners.',
      icon: '💎',
      code: 'MDL-RES-02'
    },
    {
      id: 'admin',
      title: 'NETWORK OPERATIONS',
      desc: 'Restricted access for station registry and material signature management. Providing the structural data that powers the YŪGEN network.',
      icon: '🛂',
      code: 'MDL-NOC-03'
    }
  ];

  return (
    <div className="info-dashboard">
      <div className="dashboard-scanlines"></div>
      
      {/* ── Header ── */}
      <header className="dash-header fade-in">
        <div className="dash-header-left">
          <div className="dash-tag">
            <span className="blink-dot"></span> DECENTRALIZED CIVILIAN UTILITY
          </div>
          <h1 className="dash-title">
            YŪGEN NETWORK <span className="dash-version">v2.4.0</span>
          </h1>
        </div>
        <div className="dash-header-decor">
          <svg width="120" height="20" viewBox="0 0 120 20">
            <line x1="0" y1="10" x2="100" y2="10" stroke="var(--accent-muted)" strokeWidth="1" />
            <circle cx="110" cy="10" r="2" fill="var(--accent)" />
            <circle cx="118" cy="10" r="2" fill="var(--accent)" />
          </svg>
        </div>
      </header>

      <div className="dash-grid">
        {/* ── Left Column: Manifesto & Founder ── */}
        <div className="dash-col col-left fade-in-up" style={{ animationDelay: '0.1s' }}>
          
          <div className="data-panel manifesto-panel">
            <div className="panel-edge-tracer"></div>
            <div className="panel-header">
              <span className="panel-idx">01</span>
              <h2 className="panel-title">THE PHILOSOPHY</h2>
              <span className="panel-hash">#SYS_MANIFESTO</span>
            </div>
            <div className="panel-content">
              <p className="terminal-text">
                &gt; YŪGEN IS NOT A CORPORATION.<br/>
                &gt; WE ARE NOT A MILITARY ORGANIZATION.<br/><br/>
                We are a collective of civilian operators, miners, and haulers dedicated to democratizing industrial intelligence. 
              </p>
              <p className="terminal-text">
                Our mission is to provide the community with the high-fidelity data needed to thrive in the deep black. By sharing yields and signatures, we elevate every pilot from a lone worker to a synchronized part of a greater industrial node.
              </p>
            </div>
          </div>

          <div className="data-panel founder-panel">
            <div className="panel-header">
              <span className="panel-idx">02</span>
              <h2 className="panel-title">NETWORK FOUNDER</h2>
              <span className="panel-hash">#USR_LEAD</span>
            </div>
            
            <div className="hardware-blade interactive" onClick={() => navigate('/profile/fernlives')}>
              <div className="blade-accent"></div>
              <div className="founder-avatar-ring">
                <span className="founder-symbol">◆</span>
              </div>
              <div className="blade-content">
                <h3 className="founder-name">FERN-LIVES</h3>
                <div className="founder-role">Lead Architect & Community Founder</div>
                <div className="founder-status">
                  <span className="pulse-beacon"></span> UPLINK ACTIVE [STATIONARY]
                </div>
              </div>
              <div className="blade-action">›</div>
            </div>
          </div>
          
        </div>

        {/* ── Right Column: Modules & Specs ── */}
        <div className="dash-col col-right fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          <div className="data-panel modules-panel">
            <div className="panel-header">
              <span className="panel-idx">03</span>
              <h2 className="panel-title">UTILITY MODULES</h2>
              <span className="panel-hash">#SYS_MODULES</span>
            </div>
            
            <div className="module-rack">
              {modules.map(m => (
                <div key={m.id} className="hardware-blade module-blade">
                  <div className="blade-accent"></div>
                  <div className="blade-graphic">{m.icon}</div>
                  <div className="blade-content">
                    <div className="mod-meta">
                      <h3 className="mod-title">{m.title}</h3>
                      <span className="mod-code">{m.code}</span>
                    </div>
                    <p className="mod-desc">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="data-panel specs-panel">
            <div className="panel-header">
              <span className="panel-idx">04</span>
              <h2 className="panel-title">SYSTEM DIAGNOSTICS</h2>
              <span className="panel-hash">#SYS_HEALTH</span>
            </div>
            
            <div className="diagnostics-grid">
              {specs.map(s => (
                <div key={s.label} className="diag-row">
                  <span className="diag-label">{s.label}</span>
                  <div className="diag-line"></div>
                  <span className={`diag-value ${s.status}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="dash-footer fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="footer-code block">FOR THE COMMUNITY, BY THE COMMUNITY.</div>
        <div className="footer-copyright">YŪGEN INDUSTRIAL SUITE © 2954-2955</div>
      </footer>

    </div>
  );
}
