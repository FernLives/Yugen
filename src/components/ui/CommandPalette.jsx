import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Compass, Newspaper, Flame, Orbit, ShieldCheck, Globe2, Gem, Building2, LogIn, LogOut, UserRound, Mountain } from 'lucide-react';
import { fuzzy } from '../../lib/format';
import { getRefineryData, getResourceData } from '../../data/dataStore';
import { useScrollLock } from '../../lib/hooks';
import './CommandPalette.css';

const ICONS = { info: Compass, bulletin: Newspaper, refinery: Flame, resources: Orbit, admin: ShieldCheck };

function Highlight({ text, ranges }) {
  if (!ranges?.length) return text;
  const out = [];
  let last = 0;
  ranges.forEach(([a, b], i) => {
    if (a > last) out.push(<Fragment key={`t${i}`}>{text.slice(last, a)}</Fragment>);
    out.push(<mark key={`m${i}`}>{text.slice(a, b)}</mark>);
    last = b;
  });
  if (last < text.length) out.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return out;
}

/**
 * ⌘K command palette — fuzzy search across navigation, systems, account actions
 * and (lazily loaded) live refinery / survey data.
 */
export default function CommandPalette({ open, onClose, modules, systems, activeSystem, onSystemChange, navigate, user, onSignIn, onSignOut }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [catalog, setCatalog] = useState({ ores: [], stations: [], resources: [] });
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  useScrollLock(open);

  // Lazy-load the searchable catalogue the first time the palette opens.
  useEffect(() => {
    if (!open || loaded) return;
    let live = true;
    (async () => {
      const [ref, res] = await Promise.all([getRefineryData(), getResourceData()]);
      if (!live) return;
      const oreMap = new Map();
      const stationMap = new Map();
      ref.forEach((r) => {
        const o = oreMap.get(r.ore) || { name: r.ore, systems: new Set() };
        o.systems.add(r.system);
        oreMap.set(r.ore, o);
        stationMap.set(r.station, r.system);
      });
      setCatalog({
        ores: [...oreMap.values()].map((o) => ({ name: o.name, system: [...o.systems][0] })),
        stations: [...stationMap.entries()].map(([name, system]) => ({ name, system })),
        resources: res.map((r) => ({ id: r.id, name: r.name, body: r.parentBody, system: r.system })),
      });
      setLoaded(true);
    })();
    return () => { live = false; };
  }, [open, loaded]);

  useEffect(() => {
    if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const go = (path, system) => {
    if (system && system !== activeSystem) onSystemChange(system);
    navigate(path);
    onClose();
  };

  const baseItems = useMemo(() => {
    const items = [];
    modules.forEach((m) => items.push({ id: `nav-${m.id}`, group: 'Navigate', label: m.label, hint: m.shortcut, icon: ICONS[m.id] || Compass, run: () => go(m.shortcut) }));
    systems.forEach((s) => items.push({ id: `sys-${s}`, group: 'Systems', label: `Switch to ${s}`, search: `${s} system`, hint: s === activeSystem ? 'Active' : '', icon: Globe2, run: () => { onSystemChange(s); onClose(); } }));
    if (user) {
      items.push({ id: 'acct-profile', group: 'Account', label: 'Open my profile', hint: `@${user.username}`, icon: UserRound, run: () => go(`/profile/${user.username}`) });
      items.push({ id: 'acct-out', group: 'Account', label: 'Sign out', icon: LogOut, run: () => { onSignOut(); onClose(); } });
    } else {
      items.push({ id: 'acct-in', group: 'Account', label: 'Sign in or register', icon: LogIn, run: () => { onClose(); onSignIn(); } });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, systems, activeSystem, user]);

  const dataItems = useMemo(() => {
    const items = [];
    catalog.ores.forEach((o) => items.push({ id: `ore-${o.name}`, group: 'Materials', label: o.name, hint: 'Refinery yields', icon: Gem, run: () => go(`/refinery?ore=${encodeURIComponent(o.name)}`, o.system) }));
    catalog.stations.forEach((s) => items.push({ id: `st-${s.name}`, group: 'Stations', label: s.name, hint: s.system, icon: Building2, run: () => go(`/refinery?station=${encodeURIComponent(s.name)}`, s.system) }));
    catalog.resources.forEach((r) => items.push({ id: `res-${r.id}`, group: 'Survey archive', label: r.name, hint: `${r.body} · ${r.system}`, icon: Mountain, run: () => go(`/resources?body=${encodeURIComponent(r.body)}&q=${encodeURIComponent(r.name)}`, r.system) }));
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, activeSystem]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return baseItems.map((it) => ({ ...it, ranges: [] }));
    const pool = [...baseItems, ...dataItems];
    const scored = [];
    for (const it of pool) {
      const m = fuzzy(q, it.label) || (it.search && fuzzy(q, it.search));
      if (m) scored.push({ ...it, score: m.score, ranges: fuzzy(q, it.label) ? m.ranges : [] });
    }
    scored.sort((a, b) => b.score - a.score);
    const perGroup = {};
    const limited = scored.filter((it) => { perGroup[it.group] = (perGroup[it.group] || 0) + 1; return perGroup[it.group] <= 6; });
    // group order by best score
    const order = [];
    limited.forEach((it) => { if (!order.includes(it.group)) order.push(it.group); });
    return order.flatMap((g) => limited.filter((it) => it.group === g));
  }, [query, baseItems, dataItems]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (results.length ? (c + 1) % results.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); results[cursor]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cp-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="cp glass"
            role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: -18, scale: 0.97, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="cp-input-row">
              <Search size={18} aria-hidden="true" />
              <input
                ref={inputRef}
                className="cp-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search modules, stations, materials, survey sites…"
                spellCheck={false}
                autoComplete="off"
                role="combobox"
                aria-expanded="true"
                aria-controls="cp-list"
              />
              <span className="kbd">esc</span>
            </div>

            <div className="cp-list" id="cp-list" role="listbox" ref={listRef}>
              {results.length === 0 && (
                <div className="cp-empty">
                  <p>No matches for “{query}”.</p>
                  <span>{loaded ? 'Try a material, station or module name.' : 'Loading catalogue…'}</span>
                </div>
              )}
              {results.map((it, i) => {
                const header = it.group !== lastGroup;
                lastGroup = it.group;
                const Icon = it.icon;
                return (
                  <Fragment key={it.id}>
                    {header && <div className="cp-group">{it.group}</div>}
                    <button
                      role="option"
                      aria-selected={i === cursor}
                      data-active={i === cursor}
                      className={`cp-item ${i === cursor ? 'active' : ''}`}
                      onMouseMove={() => i !== cursor && setCursor(i)}
                      onClick={it.run}
                    >
                      {i === cursor && <motion.span layoutId="cp-active" className="cp-active-bg" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                      <span className="cp-ico"><Icon size={16} /></span>
                      <span className="cp-label"><Highlight text={it.label} ranges={it.ranges} /></span>
                      {it.hint && <span className="cp-hint">{it.hint}</span>}
                      {i === cursor && <CornerDownLeft size={14} className="cp-enter" />}
                    </button>
                  </Fragment>
                );
              })}
            </div>

            <div className="cp-foot">
              <span><span className="kbd"><ArrowUp size={11} /></span> <span className="kbd"><ArrowDown size={11} /></span> navigate</span>
              <span><span className="kbd"><CornerDownLeft size={11} /></span> select</span>
              <span className="cp-spacer" />
              <span>{loaded ? `${catalog.ores.length + catalog.stations.length + catalog.resources.length} indexed entries` : 'indexing…'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
