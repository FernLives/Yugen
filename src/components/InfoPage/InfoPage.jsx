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
      desc: 'Real-time yield modifier tracking across civilian refinery terminals. Ensure you are getting the absolute maximum payout for your hard-earned hauls.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <path d="M4 12V4h16v8" strokeDasharray="4 4"/>
        </svg>
      ),
      code: 'MDL-REF-01'
    },
    {
      id: 'resources',
      title: 'RESOURCE DATABASE',
      desc: 'Collaborative survey data for raw materials and minerals. A shared community ledger mapping the most lucrative coordinates in the system.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      ),
      code: 'MDL-RES-02'
    },
    {
      id: 'admin',
      title: 'NETWORK OPERATIONS',
      desc: 'Restricted registry for station administration and material signature integrity. Maintaining the core data that keeps our community connected.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
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
                &gt; THE BLACK IS COLD.<br/>
                &gt; NO MEGA-CORP IS COMING TO SAVE US.<br/><br/>
                YŪGEN was forged in the void for one simple reason: to ensure that no civilian operator—miner, hauler, or salvager—has to fly blind. 
              </p>
              <p className="terminal-text">
                We are a collective built on grit and mutual survival. We share our yields, our intelligence, and our safe routes. When you uplink to this network, you are no longer just a lone worker scraping by; you are supported by a community that believes <strong>shared knowledge is the strongest armor we have</strong>.
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
        <div className="footer-code block">THROUGH THE BLACK, TOGETHER.</div>
        <div className="footer-copyright">YŪGEN INDUSTRIAL SUITE © 2954-2955</div>
      </footer>

    </div>
  );
}
