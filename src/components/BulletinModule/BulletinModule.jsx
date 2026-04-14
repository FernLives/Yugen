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
      try {
        setIsLoading(true);
        const [bData, rData] = await Promise.all([getBulletins(), getRoadmap()]);
        setBulletins(Array.isArray(bData) ? bData : []);
        setRoadmap(Array.isArray(rData) ? rData : []);
      } catch (err) {
        console.error('Bulletin Sync Error:', err);
      } finally {
        setIsLoading(false);
      }
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
      <div className="scanning-line"></div>
      
      <div className="board-header">
        <div className="board-header-left">
          <div className="board-tag">
            <span className="blink-dot"></span> SECURE BROADCAST UPLINK
            <span className="tag-coord">// 34.098.AF.78</span>
          </div>
          <h1 className="board-title">Bulletin & Updates</h1>
          <div className="board-system-status">
            SYSTEM STATUS: <span className="status-val">NOMINAL</span> // ENCRYPTION: <span className="status-val">ACTIVE</span>
          </div>
        </div>
        <div className="board-stats">
          <div className="board-stat">
            <span className="bs-val">{bulletins.length}</span>
            <span className="bs-label">ARCHIVED_REPORTS</span>
          </div>
        </div>
      </div>

      <div className="board-grid">
        {/* ── Announcements (Priority) ── */}
        <div className="board-col col-main">
          <div className="data-panel announcement-panel glass-pane">
            <div className="panel-brackets">
              <span className="br-tl"></span><span className="br-tr"></span>
              <span className="br-bl"></span><span className="br-br"></span>
            </div>
            
            <div className="panel-header">
              <span className="panel-idx">01</span>
              <h2 className="panel-title">LATEST ANNOUNCEMENTS</h2>
              <span className="panel-hash">#SYS_NEWS</span>
            </div>
            
            <div className="announcement-list">
              {categorized.announcements.length === 0 && (
                <div className="premium-empty-state">
                  <div className="empty-pips"><span></span><span></span><span></span></div>
                  <div className="empty-msg">NO ANNOUNCEMENTS RETRIEVED</div>
                  <div className="empty-code">STATUS_CODE: IDLE_001</div>
                </div>
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
          <div className="data-panel changes-panel glass-pane">
            <div className="panel-brackets">
              <span className="br-tl"></span><span className="br-tr"></span>
              <span className="br-bl"></span><span className="br-br"></span>
            </div>
            
            <div className="panel-header">
              <span className="panel-idx">02</span>
              <h2 className="panel-title">SYSTEM CHANGES</h2>
              <span className="panel-hash">#DATA_UPDATES</span>
            </div>
            
            <div className="changes-list">
              {categorized.changes.length === 0 && (
                <div className="premium-empty-state">
                  <div className="empty-pips"><span></span><span></span><span></span></div>
                  <div className="empty-msg">NO DATABASE MODIFICATIONS</div>
                  <div className="empty-code">STATUS_CODE: SYNC_002</div>
                </div>
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
            <div className="data-panel system-panel glass-pane">
              <div className="panel-brackets">
                <span className="br-tl"></span><span className="br-tr"></span>
                <span className="br-bl"></span><span className="br-br"></span>
              </div>
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
          <div className="data-panel roadmap-panel glass-pane">
            <div className="panel-brackets">
              <span className="br-tl"></span><span className="br-tr"></span>
              <span className="br-bl"></span><span className="br-br"></span>
            </div>
            
            <div className="panel-header">
              <span className="panel-idx">04</span>
              <h2 className="panel-title">STUDIO ROADMAP</h2>
              <span className="panel-hash">#STRATEGIC_GOALS</span>
            </div>

            <div className="timeline-container">
              {roadmap.length === 0 && (
                <div className="premium-empty-state">
                  <div className="empty-pips"><span></span><span></span><span></span></div>
                  <div className="empty-msg">NO ROADMAP GOALS DEFINED</div>
                  <div className="empty-code">STATUS_CODE: PLAN_003</div>
                </div>
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
        <div className="footer-code">YŪGEN INTELLIGENCE // AUTHENTICITY VERIFIED // {new Date().getFullYear() + 930}.0.0</div>
      </footer>
    </div>
  );
}
