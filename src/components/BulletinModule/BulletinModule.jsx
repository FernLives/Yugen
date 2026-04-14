import { useState, useEffect, useMemo } from 'react';
import { getBulletins, getRoadmap } from '../../data/dataStore';
import LoadingState from '../common/LoadingState';
import './BulletinModule.css';

export default function BulletinModule() {
  const [bulletins, setBulletins] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [bData, rData] = await Promise.all([getBulletins(), getRoadmap()]);
      setBulletins(bData);
      setRoadmap(rData);
      setIsLoading(false);
    };
    load();
  }, []);

  const formatDate = (isoStr) => {
    const date = new Date(isoStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const categorized = useMemo(() => {
    const announcements = bulletins.filter(b => b.type === 'announcement');
    const changes = bulletins.filter(b => b.type === 'change');
    const systems = bulletins.filter(b => b.type === 'system');
    return { announcements, changes, systems };
  }, [bulletins]);

  if (isLoading) {
    return <LoadingState message="Retrieving Studio Bulletins" />;
  }

  return (
    <div className="bulletin-board fade-in">
      <div className="board-header">
        <div className="board-header-left">
          <div className="board-tag">
            <span className="blink-dot"></span> STUDIO BROADCAST
          </div>
          <h1 className="board-title">Bulletin & Updates</h1>
        </div>
        <div className="board-stats">
          <div className="board-stat">
            <span className="bs-val">{bulletins.length}</span>
            <span className="bs-label">REPORTS</span>
          </div>
        </div>
      </div>

      <div className="board-grid">
        {/* ── Announcements (Priority) ── */}
        <div className="board-col col-main">
          <div className="data-panel announcement-panel">
            <div className="panel-header">
              <span className="panel-idx">01</span>
              <h2 className="panel-title">LATEST ANNOUNCEMENTS</h2>
              <span className="panel-hash">#SYS_NEWS</span>
            </div>
            
            <div className="announcement-list">
              {categorized.announcements.length === 0 && (
                <div className="bulletin-empty">No active announcements.</div>
              )}
              {categorized.announcements.map((ann, idx) => (
                <div key={ann.id} className="hardware-blade announcement-blade animate-slide-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="blade-accent"></div>
                  <div className="blade-content">
                    <div className="blade-top">
                      <span className="ann-author">@{ann.author}</span>
                      <span className="ann-time">{formatDate(ann.timestamp)}</span>
                    </div>
                    <p className="ann-text">{ann.content}</p>
                    <div className="blade-footer">
                      <span className="ann-category">{ann.category?.toUpperCase() || 'GENERAL'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Change Logs (Automation) ── */}
        <div className="board-col col-side">
          <div className="data-panel changes-panel">
            <div className="panel-header">
              <span className="panel-idx">02</span>
              <h2 className="panel-title">SYSTEM CHANGES</h2>
              <span className="panel-hash">#DATA_UPDATES</span>
            </div>
            
            <div className="changes-list">
              {categorized.changes.length === 0 && (
                <div className="bulletin-empty">No recent data modifications.</div>
              )}
              {categorized.changes.map((log, idx) => (
                <div key={log.id} className="change-item animate-slide-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="change-dot"></div>
                  <div className="change-body">
                    <div className="change-meta">
                      <span className="change-time">{formatDate(log.timestamp)}</span>
                      <span className="change-cat">{log.category}</span>
                    </div>
                    <p className="change-content">{log.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── System Reports ── */}
          {categorized.systems.length > 0 && (
            <div className="data-panel system-panel">
              <div className="panel-header">
                <span className="panel-idx">03</span>
                <h2 className="panel-title">NETWORK PROTOCOLS</h2>
                <span className="panel-hash">#SYS_HEALTH</span>
              </div>
              <div className="system-logs">
                {categorized.systems.map(log => (
                  <div key={log.id} className="sys-log-row">
                    <span className="sl-time">{formatDate(log.timestamp)}</span>
                    <span className="sl-content">{log.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Development Roadmap (Vertical Timeline) ── */}
        <div className="board-col col-roadmap">
          <div className="data-panel roadmap-panel">
            <div className="panel-header">
              <span className="panel-idx">04</span>
              <h2 className="panel-title">DEVELOPMENT ROADMAP</h2>
              <span className="panel-hash">#FUTURE_GOALS</span>
            </div>

            <div className="timeline-container">
              {roadmap.length === 0 && (
                <div className="bulletin-empty">No roadmap goals defined.</div>
              )}
              <div className="timeline-track"></div>
              {roadmap.map((goal, idx) => (
                <div key={goal.id} className="timeline-item animate-slide-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className={`timeline-dot ${goal.status.toLowerCase().replace(' ', '-')}`}></div>
                  <div className="timeline-content hardware-blade">
                    <div className="blade-accent"></div>
                    <div className="roadmap-meta">
                      <span className="roadmap-cat">{goal.category?.toUpperCase()}</span>
                      <span className={`roadmap-status status-${goal.status.toLowerCase().replace(' ', '-')}`}>
                        {goal.status}
                      </span>
                    </div>
                    <h3 className="roadmap-title">{goal.title}</h3>
                    <p className="roadmap-desc">{goal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="board-footer fade-in-up">
        <div className="footer-code">AUTHENTICITY VERIFIED // STUDIO-LEVEL-CLEARANCE</div>
      </footer>
    </div>
  );
}
