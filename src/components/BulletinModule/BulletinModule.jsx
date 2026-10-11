import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Megaphone, GitCommitHorizontal, CircleDashed, Hammer, CheckCircle2, Newspaper, Sparkles } from 'lucide-react';
import { getBulletins, getRoadmap } from '../../data/dataStore';
import { shortDateTime, timeAgo } from '../../lib/format';
import SpotCard from '../ui/SpotCard';
import Reveal from '../ui/Reveal';
import LoadingState from '../common/LoadingState';
import './BulletinModule.css';

const CAT_TONE = { refinery: 'gold', resource: 'teal', system: 'violet', general: '', ui: 'sky' };
const COLUMNS = [
  { id: 'PLANNED', label: 'Planned', icon: CircleDashed, tone: 'plain' },
  { id: 'IN DEVELOPMENT', label: 'In development', icon: Hammer, tone: 'gold' },
  { id: 'RELEASED', label: 'Released', icon: CheckCircle2, tone: 'done' },
];

export default function BulletinModule() {
  const [bulletins, setBulletins] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [b, r] = await Promise.all([getBulletins(), getRoadmap()]);
        if (!live) return;
        setBulletins(Array.isArray(b) ? b : []);
        setRoadmap(Array.isArray(r) ? r : []);
      } catch (err) {
        console.error('Bulletin sync error:', err);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const { featured, announcements, changes, categories } = useMemo(() => {
    const sorted = [...bulletins].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const ann = sorted.filter((b) => b.type === 'announcement');
    return {
      featured: ann[0] || null,
      announcements: ann.slice(1),
      changes: sorted.filter((b) => b.type === 'change' || b.type === 'system'),
      categories: ['all', ...new Set(ann.slice(1).map((a) => a.category || 'general'))],
    };
  }, [bulletins]);

  const visible = announcements.filter((a) => filter === 'all' || (a.category || 'general') === filter);
  const byStatus = (s) => roadmap.filter((r) => (r.status || '').toUpperCase() === s);

  if (loading) return <LoadingState message="Retrieving studio bulletins" variant="split" />;

  return (
    <div className="page bl">
      <header className="page-head">
        <div>
          <span className="eyebrow"><span className="pip" style={{ background: 'var(--violet)', boxShadow: '0 0 12px var(--violet)' }} /> Studio bulletin</span>
          <h1 className="h-serif">News &amp; <em>roadmap</em></h1>
          <p>Announcements from the studio, a running log of system changes, and where the project is headed next.</p>
        </div>
        <div className="bl-status">
          <span className="chip pos"><span className="live" style={{ width: 6, height: 6 }} /> Network nominal</span>
          <span className="chip">Build 3.0</span>
        </div>
      </header>

      <div className="bl-top">
        {/* ── Featured + feed ── */}
        <div className="bl-main">
          {featured ? (
            <Reveal>
              <SpotCard className="bl-featured" spot="rgba(145,137,247,0.14)">
                <div className="bl-feat-meta">
                  <span className="chip violet"><Sparkles size={11} /> Latest</span>
                  {featured.category && <span className={`chip ${CAT_TONE[featured.category] || ''}`}>{featured.category}</span>}
                  <span className="bl-time">{timeAgo(featured.timestamp)}</span>
                </div>
                <p className="bl-feat-text serif">{featured.content}</p>
                <div className="bl-by"><span className="bl-av">{(featured.author || '?')[0].toUpperCase()}</span> @{featured.author} <i>·</i> {shortDateTime(featured.timestamp)}</div>
              </SpotCard>
            </Reveal>
          ) : (
            <div className="empty-state glass" style={{ borderRadius: 'var(--r-xl)' }}>
              <div className="icon-wrap"><Newspaper size={22} /></div>
              <h2>All quiet</h2>
              <p>No announcements have been published yet.</p>
            </div>
          )}

          {announcements.length > 0 && (
            <>
              <div className="bl-filter">
                <span className="section-label" style={{ margin: 0, flex: 'none' }}><span>Earlier</span></span>
                <LayoutGroup id="bl-filter">
                  <div className="bl-chips" role="tablist">
                    {categories.map((c) => (
                      <button key={c} role="tab" aria-selected={filter === c} className={`bl-chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
                        {filter === c && <motion.span layoutId="bl-chip-pill" className="bl-chip-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                        <span>{c}</span>
                      </button>
                    ))}
                  </div>
                </LayoutGroup>
              </div>

              <ul className="bl-feed">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((a, i) => (
                    <motion.li
                      key={a.id} layout
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 38, delay: i * 0.03 }}
                    >
                      <SpotCard className="bl-item">
                        <div className="bl-item-meta">
                          <Megaphone size={13} />
                          <span className={`chip ${CAT_TONE[a.category] || ''}`}>{a.category || 'general'}</span>
                          <span className="bl-time">{timeAgo(a.timestamp)}</span>
                        </div>
                        <p>{a.content}</p>
                        <span className="bl-author">@{a.author}</span>
                      </SpotCard>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </>
          )}
        </div>

        {/* ── Changelog ── */}
        <aside className="bl-side">
          <div className="section-label"><b><GitCommitHorizontal size={13} style={{ verticalAlign: '-2px' }} /></b><span>System intel</span></div>
          <div className="bl-log glass">
            {changes.length === 0 && <p className="bl-empty">System logs are clear.</p>}
            <ol className="bl-timeline">
              {changes.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className={`tl-dot ${CAT_TONE[c.category] || ''}`} />
                  <div className="tl-meta"><span className={`chip ${CAT_TONE[c.category] || ''}`}>{c.category}</span><time>{shortDateTime(c.timestamp)}</time></div>
                  <p>{c.content}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {/* ── Roadmap ── */}
      <Reveal className="section-label" y={12} style={{ marginTop: 'clamp(48px, 7vw, 88px)' }}><b>Roadmap</b><span>Where we are headed</span></Reveal>
      {roadmap.length === 0 ? (
        <div className="empty-state"><p>No milestones have been published.</p></div>
      ) : (
        <div className="rd-board">
          {COLUMNS.map((col, ci) => {
            const items = byStatus(col.id);
            return (
              <Reveal key={col.id} delay={ci * 0.08} className="rd-col">
                <div className={`rd-col-head ${col.tone}`}>
                  <col.icon size={15} />
                  <span>{col.label}</span>
                  <em className="num">{items.length}</em>
                </div>
                <div className="rd-col-body">
                  {items.length === 0 && <div className="rd-col-empty">Nothing here yet</div>}
                  {items.map((g) => (
                    <SpotCard key={g.id} className={`goal ${col.tone}`}>
                      <div className="goal-top">
                        <span className={`chip ${CAT_TONE[(g.category || '').toLowerCase()] || ''}`}>{g.category}</span>
                      </div>
                      <h3 className="serif">{g.title}</h3>
                      {g.description && <p>{g.description}</p>}
                      {col.id === 'IN DEVELOPMENT' && <div className="goal-progress" aria-label="In progress"><span /></div>}
                    </SpotCard>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
