import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Search, X, Download, Crown, TrendingUp, Layers, Building2, Gem, ArrowDownUp, Sparkles, Info } from 'lucide-react';
import { getRefineryData } from '../../data/dataStore';
import { signed, materialBase, materialQualifier, stationParts, clamp } from '../../lib/format';
import { useMediaQuery } from '../../lib/hooks';
import CountUp from '../ui/CountUp';
import SpotCard from '../ui/SpotCard';
import LoadingState from '../common/LoadingState';
import './RefineryModule.css';

const SORTS = [
  { id: 'name', label: 'A–Z' },
  { id: 'best', label: 'Top yield' },
  { id: 'spread', label: 'Spread' },
];

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

/* ── One matrix cell (memoised – the grid has hundreds of these) ── */
const Cell = memo(function Cell({ value, max, best, rowHl, colHl, onEnter, onClick, label }) {
  if (value === undefined) {
    return <div className={`rm-cell empty ${rowHl ? 'row-hl' : ''} ${colHl ? 'col-hl' : ''}`} role="gridcell" onPointerEnter={onEnter}>—</div>;
  }
  const i = clamp(Math.abs(value) / (max || 1), 0, 1);
  const kind = value > 0 ? 'pos' : value < 0 ? 'neg' : 'zero';
  return (
    <button
      role="gridcell"
      className={`rm-cell ${kind} ${best ? 'best' : ''} ${rowHl ? 'row-hl' : ''} ${colHl ? 'col-hl' : ''}`}
      style={{ '--i': i }}
      onPointerEnter={onEnter}
      onFocus={onEnter}
      onClick={onClick}
      aria-label={label}
    >
      <span className="rm-val num">{signed(value)}</span>
      {best && <Crown size={10} className="rm-crown" aria-hidden="true" />}
    </button>
  );
});

/* ── Diverging bar used in the inspector ── */
function DivBar({ value, max, delay = 0, highlight }) {
  const pct = clamp((Math.abs(value) / (max || 1)) * 50, 0, 50);
  return (
    <div className="div-bar" aria-hidden="true">
      <span className="div-zero" />
      <motion.span
        className={`div-fill ${value >= 0 ? 'pos' : 'neg'} ${highlight ? 'hi' : ''}`}
        style={value >= 0 ? { left: '50%' } : { right: '50%' }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function Inspector({ mode, ore, station, model, onSelectOre, onSelectStation, onClose }) {
  const { matrix, stations, ores, max, bestPerOre } = model;

  if (mode === 'ore') {
    const ranked = stations
      .map((s) => ({ station: s, v: matrix[s]?.[ore] }))
      .filter((r) => r.v !== undefined)
      .sort((a, b) => b.v - a.v);
    const vals = ranked.map((r) => r.v);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const q = materialQualifier(ore);
    return (
      <>
        <header className="insp-head">
          <div>
            <span className="eyebrow"><Gem size={12} /> Material</span>
            <h2 className="insp-title serif">{materialBase(ore)}</h2>
            {q && <span className="chip">{q}</span>}
          </div>
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Close inspector"><X size={16} /></button>
        </header>

        {best && (
          <div className="insp-hero">
            <span className="insp-hero-label">Best location</span>
            <div className="insp-hero-row">
              <span className={`insp-big num ${best.v >= 0 ? 'pos' : 'neg'}`}>{signed(best.v)}</span>
              <div className="insp-hero-meta">
                <b>{stationParts(best.station).name}</b>
                <span>{stationParts(best.station).code || 'Terminal'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="insp-stats">
          <div><span>Mean</span><b className="num">{signed(mean(vals), 1)}</b></div>
          <div><span>Spread</span><b className="num">{vals.length ? (Math.max(...vals) - Math.min(...vals)).toFixed(1) : '—'}</b></div>
          <div><span>Terminals</span><b className="num">{vals.length}</b></div>
        </div>

        <div className="section-label"><span>Ranking</span></div>
        <ol className="insp-list">
          {ranked.map((r, i) => {
            const p = stationParts(r.station);
            return (
              <motion.li
                key={r.station}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <button className="insp-row" onClick={() => onSelectStation(r.station)}>
                  <span className="insp-rank num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="insp-name"><b>{p.name}</b>{p.code && <em>{p.code}</em>}</span>
                  <span className={`insp-v num ${r.v >= 0 ? 'pos' : 'neg'}`}>{signed(r.v)}</span>
                  <DivBar value={r.v} max={max} delay={0.05 * i} highlight={i === 0} />
                </button>
              </motion.li>
            );
          })}
        </ol>

        {best && worst && best !== worst && (
          <p className="insp-note">
            <Sparkles size={13} /> Refining at <b>{stationParts(best.station).name}</b> instead of <b>{stationParts(worst.station).name}</b> is a swing of <b className="num">{(best.v - worst.v).toFixed(1)}</b> points.
          </p>
        )}
      </>
    );
  }

  // station mode
  const entries = ores.map((o) => ({ ore: o, v: matrix[station]?.[o] })).filter((r) => r.v !== undefined).sort((a, b) => b.v - a.v);
  const vals = entries.map((e) => e.v);
  const wins = entries.filter((e) => e.v === bestPerOre[e.ore] && e.v > 0);
  const p = stationParts(station);
  const top = entries.slice(0, 6);
  const bottom = entries.filter((e) => e.v < 0).slice(-3).reverse();

  return (
    <>
      <header className="insp-head">
        <div>
          <span className="eyebrow"><Building2 size={12} /> Terminal</span>
          <h2 className="insp-title serif">{p.name}</h2>
          {p.code && <span className="chip gold">{p.code}</span>}
        </div>
        <button className="btn ghost icon sm" onClick={onClose} aria-label="Close inspector"><X size={16} /></button>
      </header>

      <div className="insp-hero">
        <span className="insp-hero-label">Best-in-class for</span>
        <div className="insp-hero-row">
          <span className="insp-big num gold">{wins.length}</span>
          <div className="insp-hero-meta"><b>material{wins.length === 1 ? '' : 's'}</b><span>of {entries.length} listed</span></div>
        </div>
      </div>

      <div className="insp-stats">
        <div><span>Mean</span><b className="num">{signed(mean(vals), 1)}</b></div>
        <div><span>Peak</span><b className="num">{vals.length ? signed(Math.max(...vals)) : '—'}</b></div>
        <div><span>Floor</span><b className="num">{vals.length ? signed(Math.min(...vals)) : '—'}</b></div>
      </div>

      <div className="section-label"><span>Strongest yields</span></div>
      <ol className="insp-list">
        {top.map((e, i) => (
          <motion.li key={e.ore} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <button className="insp-row" onClick={() => onSelectOre(e.ore)}>
              <span className="insp-rank num">{String(i + 1).padStart(2, '0')}</span>
              <span className="insp-name"><b>{materialBase(e.ore)}</b><em>{materialQualifier(e.ore)}</em></span>
              <span className={`insp-v num ${e.v >= 0 ? 'pos' : 'neg'}`}>{signed(e.v)}</span>
              <DivBar value={e.v} max={max} delay={0.05 * i} highlight={e.v === bestPerOre[e.ore] && e.v > 0} />
            </button>
          </motion.li>
        ))}
      </ol>

      {bottom.length > 0 && (
        <>
          <div className="section-label"><span>Avoid here</span></div>
          <ol className="insp-list">
            {bottom.map((e, i) => (
              <li key={e.ore}>
                <button className="insp-row" onClick={() => onSelectOre(e.ore)}>
                  <span className="insp-rank num">—</span>
                  <span className="insp-name"><b>{materialBase(e.ore)}</b><em>{materialQualifier(e.ore)}</em></span>
                  <span className="insp-v num neg">{signed(e.v)}</span>
                  <DivBar value={e.v} max={max} delay={0.05 * i} />
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

export default function RefineryModule({ system }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [hover, setHover] = useState({ ore: null, station: null });
  const rowRefs = useRef({});
  const narrow = useMediaQuery('(max-width: 1100px)');

  const selOre = params.get('ore');
  const selStation = params.get('station');

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const result = await getRefineryData(system);
      if (!live) return;
      setData(result);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [system]);

  const model = useMemo(() => {
    const matrix = {};
    const oreSet = new Set();
    data.forEach((d) => {
      (matrix[d.station] ||= {})[d.ore] = d.modifier;
      oreSet.add(d.ore);
    });
    const ores = [...oreSet];
    const stationsRaw = Object.keys(matrix);

    // stations ranked by mean yield
    const stationMean = Object.fromEntries(stationsRaw.map((s) => [s, mean(Object.values(matrix[s]))]));
    const stations = [...stationsRaw].sort((a, b) => stationMean[b] - stationMean[a] || a.localeCompare(b));

    const oreStats = {};
    ores.forEach((o) => {
      const vals = stations.map((s) => matrix[s]?.[o]).filter((v) => v !== undefined);
      oreStats[o] = { best: Math.max(...vals), worst: Math.min(...vals), spread: Math.max(...vals) - Math.min(...vals), mean: mean(vals), n: vals.length };
    });
    const bestPerOre = Object.fromEntries(ores.map((o) => [o, oreStats[o].best]));
    const max = Math.max(1, ...data.map((d) => Math.abs(d.modifier)));

    // headline stats
    let bestDeal = null;
    data.forEach((d) => { if (!bestDeal || d.modifier > bestDeal.modifier) bestDeal = d; });
    const widest = ores.reduce((acc, o) => (!acc || oreStats[o].spread > oreStats[acc].spread ? o : acc), null);
    const topStation = stations[0];
    const wins = {};
    ores.forEach((o) => stations.forEach((s) => { if (matrix[s]?.[o] === bestPerOre[o] && bestPerOre[o] > 0) wins[s] = (wins[s] || 0) + 1; }));
    const coverage = stations.length && ores.length ? (data.length / (stations.length * ores.length)) * 100 : 0;

    return { matrix, ores, stations, stationMean, oreStats, bestPerOre, max, bestDeal, widest, topStation, wins, coverage };
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = model.ores.filter((o) => !q || o.toLowerCase().includes(q));
    const st = model.oreStats;
    if (sort === 'name') list = [...list].sort((a, b) => a.localeCompare(b));
    if (sort === 'best') list = [...list].sort((a, b) => st[b].best - st[a].best || a.localeCompare(b));
    if (sort === 'spread') list = [...list].sort((a, b) => st[b].spread - st[a].spread || a.localeCompare(b));
    return list;
  }, [model, query, sort]);

  const setSel = useCallback((next) => {
    const p = new URLSearchParams(params);
    ['ore', 'station'].forEach((k) => p.delete(k));
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    setParams(p, { replace: true });
  }, [params, setParams]);

  const toggleOre = useCallback((o) => setSel(selOre === o ? {} : { ore: o }), [selOre, setSel]);
  const toggleStation = useCallback((s) => setSel(selStation === s ? {} : { station: s }), [selStation, setSel]);

  // Scroll selected row into view when arriving via deep link / palette
  const lastScrolled = useRef(null);
  useEffect(() => {
    if (!selOre || loading || lastScrolled.current === selOre) return;
    const el = rowRefs.current[selOre];
    if (el) { lastScrolled.current = selOre; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }, [selOre, loading, rows]);

  const exportCsv = () => {
    const head = ['Material', ...model.stations];
    const lines = [head, ...model.ores.sort().map((o) => [o, ...model.stations.map((s) => model.matrix[s]?.[o] ?? '')])]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `yugen-refinery-${system.toLowerCase()}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState message="Connecting to refinery network" variant="split" />;

  if (data.length === 0) {
    return (
      <div className="page">
        <div className="empty-state glass" style={{ borderRadius: 'var(--r-xl)' }}>
          <div className="icon-wrap"><Layers size={24} /></div>
          <h2>No terminals in {system}</h2>
          <p>No refinery data has been surveyed for this system yet. Contributors can add terminals from the admin console.</p>
        </div>
      </div>
    );
  }

  const { stations, bestDeal, widest, topStation } = model;
  const inspMode = selOre && model.ores.includes(selOre) ? 'ore' : selStation && stations.includes(selStation) ? 'station' : null;
  const cols = `minmax(170px, 1.35fr) repeat(${stations.length}, minmax(76px, 1fr)) 104px`;

  return (
    <div className="page rm">
      <header className="page-head">
        <div>
          <span className="eyebrow"><span className="pip" /> Refinery · {system}</span>
          <h1 className="h-serif">Yield <em>matrix</em></h1>
          <p>Where to refine matters. Compare static location modifiers across {stations.length} terminal{stations.length !== 1 ? 's' : ''} and {model.ores.length} materials. Select any row or terminal for a deep read.</p>
        </div>
        <div className="rm-tools">
          <label className="rm-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter materials" spellCheck={false} aria-label="Filter materials" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear filter"><X size={14} /></button>}
          </label>
          <div className="seg" role="radiogroup" aria-label="Sort materials">
            <ArrowDownUp size={14} className="seg-ico" />
            <LayoutGroup id="rm-sort">
              {SORTS.map((s) => (
                <button key={s.id} role="radio" aria-checked={sort === s.id} className={sort === s.id ? 'on' : ''} onClick={() => setSort(s.id)}>
                  {sort === s.id && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                  <span>{s.label}</span>
                </button>
              ))}
            </LayoutGroup>
          </div>
          <button className="btn sm" onClick={exportCsv} title="Download matrix as CSV"><Download /> CSV</button>
        </div>
      </header>

      {/* ── Headline stats ── */}
      <div className="rm-stats">
        <SpotCard className="rm-stat">
          <span className="rm-stat-k"><TrendingUp size={13} /> Best single deal</span>
          <b className="rm-stat-v num gold">+<CountUp value={bestDeal?.modifier ?? 0} decimals={Number.isInteger(bestDeal?.modifier) ? 0 : 1} /></b>
          <span className="rm-stat-s">{materialBase(bestDeal?.ore)} · {stationParts(bestDeal?.station).name}</span>
        </SpotCard>
        <SpotCard className="rm-stat">
          <span className="rm-stat-k"><Layers size={13} /> Widest spread</span>
          <b className="rm-stat-v num"><CountUp value={model.oreStats[widest]?.spread ?? 0} decimals={1} /></b>
          <span className="rm-stat-s">{materialBase(widest)} — location matters most</span>
        </SpotCard>
        <SpotCard className="rm-stat">
          <span className="rm-stat-k"><Crown size={13} /> Top terminal</span>
          <b className="rm-stat-v serif">{stationParts(topStation).short}</b>
          <span className="rm-stat-s">Best for {model.wins[topStation] || 0} materials · mean {signed(model.stationMean[topStation], 1)}</span>
        </SpotCard>
        <SpotCard className="rm-stat">
          <span className="rm-stat-k"><Info size={13} /> Survey coverage</span>
          <b className="rm-stat-v num"><CountUp value={model.coverage} decimals={0} suffix="%" /></b>
          <span className="rm-stat-s">{data.length} of {stations.length * model.ores.length} cells recorded</span>
        </SpotCard>
      </div>

      <div className={`rm-layout ${inspMode && !narrow ? 'with-insp' : ''}`}>
        {/* ── Matrix ── */}
        <div className="rm-matrix glass" role="grid" aria-label={`${system} refinery yield matrix`} onPointerLeave={() => setHover({ ore: null, station: null })}>
          <div className="rm-row rm-head-row" role="row" style={{ gridTemplateColumns: cols }}>
            <div className="rm-corner" role="columnheader"><span>Material</span><em>{rows.length} shown</em></div>
            {stations.map((s, i) => {
              const p = stationParts(s);
              return (
                <button
                  key={s}
                  role="columnheader"
                  className={`rm-colhead ${selStation === s ? 'sel' : ''} ${hover.station === s ? 'hl' : ''}`}
                  onClick={() => toggleStation(s)}
                  onPointerEnter={() => setHover((h) => ({ ...h, station: s }))}
                  title={s}
                >
                  <span className="rm-rank num">#{i + 1}</span>
                  <b>{p.short}</b>
                  <em>{p.rest}</em>
                </button>
              );
            })}
            <div className="rm-colhead static" role="columnheader"><b>Best</b><em>top terminal</em></div>
          </div>

          <LayoutGroup id="rm-rows">
            {rows.length === 0 && <div className="rm-none">No materials match “{query}”.</div>}
            {rows.map((o) => {
              const st = model.oreStats[o];
              const bestStation = stations.find((s) => model.matrix[s]?.[o] === st.best);
              const selected = selOre === o;
              return (
                <motion.div
                  key={o}
                  layout="position"
                  transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                  ref={(el) => { rowRefs.current[o] = el; }}
                  className={`rm-row ${selected ? 'sel' : ''} ${hover.ore === o ? 'hl' : ''}`}
                  role="row"
                  style={{ gridTemplateColumns: cols }}
                >
                  <button className="rm-ore" role="rowheader" onClick={() => toggleOre(o)} onPointerEnter={() => setHover((h) => ({ ...h, ore: o }))} aria-pressed={selected}>
                    <span className="rm-ore-name">{materialBase(o)}</span>
                    {materialQualifier(o) && <span className="rm-ore-q">{materialQualifier(o)}</span>}
                  </button>
                  {stations.map((s) => {
                    const v = model.matrix[s]?.[o];
                    return (
                      <Cell
                        key={s}
                        value={v}
                        max={model.max}
                        best={v !== undefined && v === st.best && v > 0}
                        rowHl={hover.ore === o}
                        colHl={hover.station === s}
                        onEnter={() => setHover({ ore: o, station: s })}
                        onClick={() => toggleOre(o)}
                        label={`${materialBase(o)} at ${s}: ${signed(v)}`}
                      />
                    );
                  })}
                  <div className="rm-best" role="gridcell">
                    <b className={`num ${st.best > 0 ? 'pos' : st.best < 0 ? 'neg' : ''}`}>{signed(st.best)}</b>
                    <em title={bestStation}>{stationParts(bestStation).short}</em>
                  </div>
                </motion.div>
              );
            })}
          </LayoutGroup>

          <footer className="rm-legend">
            <div className="legend-scale" aria-hidden="true"><span>−{model.max}</span><i /><span>0</span><i className="p" /><span>+{model.max}</span></div>
            <span className="legend-item"><Crown size={11} className="gold" /> Best in class</span>
            <span className="legend-note">Static location modifiers. Final yield also depends on your refining method.</span>
          </footer>
        </div>

        {/* ── Inspector ── */}
        {!narrow && (
          <aside className="rm-insp-wrap" aria-live="polite">
            <AnimatePresence mode="wait">
              {inspMode ? (
                <motion.div
                  key={`${inspMode}-${selOre || selStation}`}
                  className="rm-insp glass"
                  initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: 12, filter: 'blur(4px)' }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Inspector mode={inspMode} ore={selOre} station={selStation} model={model} onSelectOre={(o) => setSel({ ore: o })} onSelectStation={(s) => setSel({ station: s })} onClose={() => setSel({})} />
                </motion.div>
              ) : (
                <motion.div key="hint" className="rm-insp hint glass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="icon-wrap"><Gem size={20} /></div>
                  <h3 className="serif">Inspector</h3>
                  <p>Select a material row or terminal header to see rankings, spreads and the best place to refine.</p>
                  <p className="hint-keys"><span className="kbd">/</span> to search everything</p>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        )}
      </div>

      {/* mobile bottom sheet */}
      <AnimatePresence>
        {narrow && inspMode && (
          <>
            <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSel({})} />
            <motion.div
              className="sheet glass"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setSel({}); }}
            >
              <span className="sheet-grip" />
              <Inspector mode={inspMode} ore={selOre} station={selStation} model={model} onSelectOre={(o) => setSel({ ore: o })} onSelectStation={(s) => setSel({ station: s })} onClose={() => setSel({})} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
