import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Search, X, Rocket, Truck, Hand, Orbit, Lightbulb, MapPin, ChevronDown, Telescope } from 'lucide-react';
import { getResourceData, getBodies } from '../../data/dataStore';
import { materialBase, materialQualifier } from '../../lib/format';
import SpotCard from '../ui/SpotCard';
import LoadingState from '../common/LoadingState';
import './ResourceModule.css';

const VECTORS = [
  { id: 'ship', label: 'Ship', icon: Rocket, match: (t) => t.includes('ship') },
  { id: 'vehicle', label: 'Vehicle', icon: Truck, match: (t) => t.includes('vehicle') || t.includes('ground') },
  { id: 'hand', label: 'Hand', icon: Hand, match: (t) => t.includes('hand') },
];
const vectorOf = (type = '') => VECTORS.find((v) => v.match(type.toLowerCase()))?.id || 'ship';

const RARITY = { common: 'plain', uncommon: 'teal', rare: 'violet', epic: 'gold', legendary: 'gold' };
const YIELD = { low: 1, medium: 2, moderate: 2, high: 3, 'very high': 4, extreme: 4 };

/* ── Animated radial gauge ── */
function Ring({ value, total, icon: Icon, label, active, onClick, color }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const frac = total ? value / total : 0;
  return (
    <button className={`ring-stat ${active ? 'on' : ''} ${value ? '' : 'dim'}`} onClick={onClick} aria-pressed={active} style={{ '--c': color }}>
      <svg viewBox="0 0 64 64" className="ring-svg" aria-hidden="true">
        <circle cx="32" cy="32" r={R} className="ring-bg" />
        <motion.circle
          cx="32" cy="32" r={R} className="ring-fg"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - frac) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <Icon size={17} className="ring-icon" />
      <span className="ring-meta"><b className="num">{value}</b><em>{label}</em></span>
    </button>
  );
}

function ResourceCard({ item, expanded, onToggle, isMatch }) {
  const v = VECTORS.find((x) => x.id === vectorOf(item.type));
  const rarityKey = (item.rarity || '').toLowerCase();
  const pips = YIELD[(item.yield || '').toLowerCase()] || 0;
  const q = materialQualifier(item.name);
  const hasMore = Boolean(item.tips) || Boolean(item.description);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      className={`rc-wrap ${expanded ? 'open' : ''}`}
    >
      <SpotCard className={`rc ${isMatch ? 'match' : ''}`}>
        <button className="rc-hit" onClick={onToggle} aria-expanded={expanded} disabled={!hasMore}>
          <div className="rc-top">
            <span className={`rc-vec ${v.id}`}><v.icon size={15} /></span>
            <div className="rc-titles">
              <h3 className="rc-name">{materialBase(item.name)}</h3>
              <div className="rc-sub">
                {q && <span>{q}</span>}
                <span className="rc-type">{item.type}</span>
              </div>
            </div>
            {hasMore && <ChevronDown size={16} className={`rc-chev ${expanded ? 'up' : ''}`} />}
          </div>

          <div className="rc-meta">
            {item.location && <span className="rc-loc"><MapPin size={12} /> {item.location}</span>}
            {item.rarity && <span className={`chip ${RARITY[rarityKey] === 'plain' ? '' : RARITY[rarityKey] || ''}`}>{item.rarity}</span>}
            {item.yield && (
              <span className="rc-yield" title={`Yield: ${item.yield}`}>
                {[0, 1, 2, 3].map((i) => <i key={i} className={i < pips ? 'on' : ''} />)}
                <em>{item.yield}</em>
              </span>
            )}
          </div>

          {item.description && <p className="rc-desc">{item.description}</p>}
        </button>

        <AnimatePresence initial={false}>
          {expanded && item.tips && (
            <motion.div
              className="rc-tips"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rc-tips-inner"><Lightbulb size={14} /><p>{item.tips}</p></div>
            </motion.div>
          )}
        </AnimatePresence>
      </SpotCard>
    </motion.article>
  );
}

export default function ResourceModule({ system }) {
  const [params, setParams] = useSearchParams();
  const [resData, setResData] = useState([]);
  const [bodies, setBodies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(params.get('q') || '');
  const [vector, setVector] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const [res, bods] = await Promise.all([getResourceData(system), getBodies()]);
      if (!live) return;
      setResData(res);
      setBodies(bods.filter((b) => b.system === system));
      setLoading(false);
    })();
    return () => { live = false; };
  }, [system]);

  const q = query.trim().toLowerCase();
  const countsByBody = useMemo(() => {
    const m = {};
    resData.forEach((r) => {
      const matches = !q || r.name.toLowerCase().includes(q);
      const e = (m[r.parentBody] ||= { total: 0, match: 0, ship: 0, vehicle: 0, hand: 0 });
      e.total++; if (matches) e.match++;
      e[vectorOf(r.type)]++;
    });
    return m;
  }, [resData, q]);

  const visibleBodies = useMemo(() => bodies.filter((b) => !q || (countsByBody[b.name]?.match || 0) > 0), [bodies, q, countsByBody]);

  const paramBody = params.get('body');
  const selected = (visibleBodies.find((b) => b.name === (paramBody || '')) || visibleBodies[0])?.name || null;

  const selectBody = (name) => {
    const p = new URLSearchParams(params);
    p.set('body', name);
    setParams(p, { replace: true });
    setVector(null);
    setOpen(null);
  };

  const items = useMemo(() => {
    if (!selected) return [];
    return resData
      .filter((r) => r.parentBody === selected)
      .filter((r) => !vector || vectorOf(r.type) === vector)
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resData, selected, vector, q]);

  const bodyCounts = countsByBody[selected] || { total: 0, ship: 0, vehicle: 0, hand: 0 };

  if (loading) return <LoadingState message="Establishing planetary link" variant="split" />;

  if (bodies.length === 0) {
    return (
      <div className="page">
        <div className="empty-state glass" style={{ borderRadius: 'var(--r-xl)' }}>
          <div className="icon-wrap"><Telescope size={24} /></div>
          <h2>Uncharted: {system}</h2>
          <p>No planetary survey data has been recorded in this system. Add bodies and signatures from the admin console.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page rs">
      <header className="page-head">
        <div>
          <span className="eyebrow"><span className="pip" style={{ background: 'var(--teal)', boxShadow: '0 0 12px var(--teal)' }} /> Survey archive · {system}</span>
          <h1 className="h-serif">Planetary <em>signatures</em></h1>
          <p>{resData.length} surveyed signature{resData.length !== 1 ? 's' : ''} across {bodies.length} {bodies.length === 1 ? 'body' : 'bodies'}. Choose a sector, then filter by extraction vector.</p>
        </div>
        <label className="rs-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search signatures…" spellCheck={false} aria-label="Search signatures" />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
        </label>
      </header>

      <div className="rs-layout">
        {/* ── Sector rail ── */}
        <aside className="rs-rail" aria-label="Sectors">
          <div className="rs-rail-head"><Orbit size={14} /> Sectors <span className="num">{visibleBodies.length}</span></div>
          <LayoutGroup id="rs-bodies">
            <ul className="rs-bodies">
              {visibleBodies.length === 0 && <li className="rs-nomatch">No signatures match “{query}”.</li>}
              {visibleBodies.map((b) => {
                const c = countsByBody[b.name] || { total: 0, match: 0, ship: 0, vehicle: 0, hand: 0 };
                const on = selected === b.name;
                return (
                  <li key={b.name}>
                    <button className={`rs-body ${on ? 'on' : ''}`} onClick={() => selectBody(b.name)} aria-current={on}>
                      {on && <motion.span layoutId="rs-body-pill" className="rs-body-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                      <span className="rs-orb" style={{ '--h': (b.name.charCodeAt(0) * 17 + b.name.length * 31) % 360 }} />
                      <span className="rs-body-name">{b.name}</span>
                      <span className="rs-body-n num">{q ? c.match : c.total}</span>
                      <span className="rs-body-bar" aria-hidden="true">
                        {['ship', 'vehicle', 'hand'].map((k) => c[k] > 0 && <i key={k} className={k} style={{ flex: c[k] }} />)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </LayoutGroup>
        </aside>

        {/* ── Main ── */}
        <section className="rs-main">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <SpotCard className="rs-hero">
                  <div className="rs-hero-copy">
                    <span className="eyebrow">Sector</span>
                    <h2 className="rs-hero-name serif">{selected}</h2>
                    <div className="rs-hero-meta">
                      <span className="chip teal"><span className="live" /> Link established</span>
                      <span className="chip">{bodyCounts.total} signature{bodyCounts.total !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="rs-rings">
                    <Ring value={bodyCounts.ship} total={bodyCounts.total} icon={Rocket} label="Ship" color="var(--gold)" active={vector === 'ship'} onClick={() => setVector(vector === 'ship' ? null : 'ship')} />
                    <Ring value={bodyCounts.vehicle} total={bodyCounts.total} icon={Truck} label="Vehicle" color="var(--teal)" active={vector === 'vehicle'} onClick={() => setVector(vector === 'vehicle' ? null : 'vehicle')} />
                    <Ring value={bodyCounts.hand} total={bodyCounts.total} icon={Hand} label="Hand" color="var(--violet)" active={vector === 'hand'} onClick={() => setVector(vector === 'hand' ? null : 'hand')} />
                  </div>
                </SpotCard>

                <div className="rs-filter-row">
                  <span className="section-label" style={{ flex: 1, margin: 0 }}><span>{items.length} result{items.length !== 1 ? 's' : ''}{vector ? ` · ${vector}` : ''}</span></span>
                  {vector && <button className="btn ghost sm" onClick={() => setVector(null)}><X /> Clear filter</button>}
                </div>

                <div className="rs-grid">
                  <AnimatePresence mode="popLayout">
                    {items.map((it) => (
                      <ResourceCard
                        key={it.id}
                        item={it}
                        isMatch={Boolean(q)}
                        expanded={open === it.id}
                        onToggle={() => setOpen(open === it.id ? null : it.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {items.length === 0 && (
                  <div className="empty-state">
                    <div className="icon-wrap"><Telescope size={22} /></div>
                    <h2>Nothing detected</h2>
                    <p>No signatures in this sector match the current filters.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
