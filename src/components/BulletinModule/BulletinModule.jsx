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
      <div className="board-header">
        <div className="board-header-left">
          <div className="board-tag">
            <span className="dot"></span> SECURE INTELLIGENCE UPLINK
          </div>
          <h1 className="board-title">Bulletin & Roadmap</h1>
          <div className="board-subtitle">
            NETWORK STATUS: <span className="status-nominal">NOMINAL</span> // VERSION: <span className="status-val">2.0.4</span>
          </div>
        </div>
        <div className="board-stats">
          <div className="board-stat">
            <span className="bs-val">{bulletins.length}</span>
            <span className="bs-label">ARCHIVED REPORTS</span>
          </div>
        </div>
      </div>

      <div className="studio-layout">
        {/* ── Main Stream: Studio Updates ── */}
        <div className="studio-col col-primary">
          <div className="studio-pane primary-pane">
            <div className="pane-header">
              <h2 className="pane-title">Studio Updates</h2>
            </div>
            
            <div className="announcement-list">
              {categorized.announcements.length === 0 && (
                <div className="studio-empty-state">
                  <div className="empty-msg">NO RECENT UPDATES RETRIEVED</div>
                </div>
              )}
              {categorized.announcements.map((ann, idx) => (
                <div key={ann.id} className="studio-blade announcement-blade animate-slide-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="blade-content">
                    <div className="blade-top">
                      <span className="ann-author">@{ann.author}</span>
                      <span className="ann-time">{formatDate(ann.timestamp)}</span>
                    </div>
                    <p className="ann-text">{ann.content}</p>
                    <div className="blade-footer">
                      <span className="ann-category">{ann.category || 'general'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar: Intel & Roadmap ── */}
        <div className="studio-col col-sidebar">
          {/* Intelligence Live Feed */}
          <div className="studio-pane sidebar-pane feed-pane">
            <div className="pane-header">
              <h2 className="pane-title">System Intel</h2>
            </div>
            
            <div className="changes-list">
              {categorized.changes.length === 0 && (
                <div className="studio-empty-state mini">
                  <div className="empty-msg">SYSTEM LOGS CLEAR</div>
                </div>
              )}
              {categorized.changes.map((log, idx) => (
                <div key={log.id} className="studio-change-item animate-slide-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="change-meta">
                    <span className="change-time">{formatDate(log.timestamp)}</span>
                    <span className="change-cat">{log.category}</span>
                  </div>
                  <p className="change-content">{log.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Roadmap */}
          <div className="studio-pane sidebar-pane roadmap-pane">
            <div className="pane-header">
              <h2 className="pane-title">Strategic Roadmap</h2>
            </div>

            <div className="studio-timeline">
              {roadmap.length === 0 && (
                <div className="studio-empty-state mini">
                  <div className="empty-msg">NO PENDING MILESTONES</div>
                </div>
              )}
              {roadmap.map((goal, idx) => (
                <div key={goal.id} className="timeline-segment animate-slide-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className={`timeline-indicator ${goal.status.toLowerCase().replace(' ', '-')}`}></div>
                  <div className="timeline-card">
                    <div className="roadmap-meta">
                      <span className="roadmap-cat">{goal.category}</span>
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

      <footer className="board-footer">
        <div className="footer-mark">YŪGEN INTELLIGENCE // COMMUNITY HUB // {new Date().getFullYear() + 930}</div>
      </footer>
    </div>
  );
}
