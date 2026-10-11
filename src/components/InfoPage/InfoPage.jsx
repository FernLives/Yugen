import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Command, Flame, Orbit, Newspaper, Gauge, Radar, Gem, Layers, Globe2, Quote } from 'lucide-react';
import { getRefineryData, getResourceData, getBodies, getBulletins } from '../../data/dataStore';
import { signed, materialBase, stationParts, timeAgo, clamp } from '../../lib/format';
import { useSpotlight } from '../../lib/hooks';
import CountUp from '../ui/CountUp';
import Magnetic from '../ui/Magnetic';
import Reveal from '../ui/Reveal';
import Logo from '../ui/Logo';
import './InfoPage.css';

/* ── Orrery: a live, pointer-parallaxed miniature of the active star system ── */
function Orrery({ system, bodies, resources }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });
  const rx = useTransform(sy, [-1, 1], [14, -14]);
  const rz = useTransform(sx, [-1, 1], [-14, 14]);

  const planets = useMemo(() => {
    const list = bodies.map((b, i) => ({
      name: b.name,
      n: resources.filter((r) => r.parentBody === b.name).length,
      i,
    }));
    return list.slice(0, 7).map((p, i, arr) => ({
      ...p,
      radius: 17 + ((i + 1) / Math.max(arr.length, 4)) * 29,
      dur: 38 + i * 14,
      phase: ((i * 0.381966) % 1).toFixed(3),
      size: clamp(9 + p.n * 1.6, 9, 20),
    }));
  }, [bodies, resources]);

  return (
    <div
      className="orrery"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      aria-hidden="true"
    >
      <motion.div className="orrery-plane" style={{ rotateX: rx, rotateZ: rz }}>
        <div className="orrery-star" />
        {[1, 2, 3].map((k) => <span key={k} className="orrery-guide" style={{ inset: `${50 - k * 14}%` }} />)}
        {planets.map((p) => (
          <div key={p.name} className="orbit" style={{ '--r': `${p.radius}%`, '--d': `${p.dur}s`, '--ph': p.phase }}>
            <span className="orbit-ring" />
            <div className="orbit-arm">
              <div className="planet" style={{ '--s': `${p.size}px` }}>
                <span className="planet-core" />
                <span className="planet-label"><b>{p.name}</b>{p.n > 0 && <em>{p.n}</em>}</span>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
      <div className="orrery-caption">
        <span className="live" /> {system} · {bodies.length} {bodies.length === 1 ? 'body' : 'bodies'} indexed
      </div>
    </div>
  );
}

/* ── Marquee ticker of live top yields ── */
function Ticker({ items }) {
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="ticker" aria-label="Top refinery yields">
      <div className="ticker-track">
        {row.map((it, i) => (
          <span key={i} className="tick" aria-hidden={i >= items.length}>
            <b>{materialBase(it.ore)}</b>
            <span className={`num ${it.modifier >= 0 ? 'pos' : 'neg'}`}>{signed(it.modifier)}</span>
            <em>{stationParts(it.station).code || stationParts(it.station).name} · {it.system}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Mini heat grid for the refinery card ── */
function MiniMatrix({ data }) {
  const { stations, ores, cells } = useMemo(() => {
    const st = [...new Set(data.map((d) => d.station))].slice(0, 6);
    const orePick = [...new Set(data.map((d) => d.ore))].slice(0, 7);
    const m = {};
    data.forEach((d) => { m[`${d.station}|${d.ore}`] = d.modifier; });
    const max = Math.max(1, ...data.map((d) => Math.abs(d.modifier)));
    return { stations: st, ores: orePick, cells: { m, max } };
  }, [data]);
  if (!stations.length) return <div className="mini-matrix empty" />;
  return (
    <div className="mini-matrix" style={{ gridTemplateColumns: `repeat(${stations.length}, 1fr)` }} aria-hidden="true">
      {ores.flatMap((o, r) => stations.map((s, c) => {
        const v = cells.m[`${s}|${o}`];
        const i = v === undefined ? 0 : clamp(Math.abs(v) / cells.max, 0, 1);
        return (
          <motion.span
            key={`${o}${s}`}
            className={`mm-cell ${v === undefined ? 'none' : v >= 0 ? 'pos' : 'neg'}`}
            style={{ '--i': i }}
            initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ delay: (r + c) * 0.035, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      }))}
    </div>
  );
}

function BentoCard({ className = '', onClick, children, label }) {
  const sp = useSpotlight();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`glass spot bento ${className} ${onClick ? 'clickable' : ''}`} onClick={onClick} {...sp} aria-label={label}>
      {children}
    </Tag>
  );
}

export default function InfoPage({ system = 'Stanton' }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ refinery: [], resources: [], bodies: [], bulletins: [], ready: false });
  const [ping, setPing] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const t0 = performance.now();
      const [refinery, resources, bodies, bulletins] = await Promise.all([getRefineryData(), getResourceData(), getBodies(), getBulletins()]);
      if (!live) return;
      setPing(Math.round(performance.now() - t0));
      setState({ refinery, resources, bodies, bulletins, ready: true });
    })();
    return () => { live = false; };
  }, []);

  const { refinery, resources, bodies, bulletins } = state;
  const sysBodies = useMemo(() => bodies.filter((b) => b.system === system), [bodies, system]);
  const sysRefinery = useMemo(() => refinery.filter((r) => r.system === system), [refinery, system]);

  const stats = useMemo(() => ({
    stations: new Set(refinery.map((r) => r.station)).size,
    materials: new Set(refinery.map((r) => r.ore)).size,
    sites: resources.length,
    systems: new Set([...refinery, ...resources].map((r) => r.system)).size,
  }), [refinery, resources]);

  const ticker = useMemo(() => [...refinery].sort((a, b) => b.modifier - a.modifier).slice(0, 14), [refinery]);
  const latest = useMemo(() => bulletins.filter((b) => b.type === 'announcement').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0], [bulletins]);

  const openPalette = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));

  return (
    <div className="info">
      {/* ═════════ HERO ═════════ */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <motion.span className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}>
              <span className="pip" /> Intelligence suite · v3
            </motion.span>

            <h1 className="display hero-title">
              {['Quiet', 'precision'].map((w, i) => (
                <motion.span key={w} className="word" initial={{ opacity: 0, y: '60%', filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.15 + i * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}>{w}&nbsp;</motion.span>
              ))}
              <br />
              {['for', 'the'].map((w, i) => (
                <motion.span key={w} className="word" initial={{ opacity: 0, y: '60%', filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.35 + i * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}>{w}&nbsp;</motion.span>
              ))}
              <motion.em className="word" initial={{ opacity: 0, y: '60%', filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.55, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}>civilian frontier.</motion.em>
            </h1>

            <motion.p className="lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}>
              Yūgen maps refinery yields, planetary survey data and studio news into one calm, fast interface — built for independent operators who value depth over noise.
            </motion.p>

            <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95, duration: 0.8 }}>
              <Magnetic><button className="btn primary lg" onClick={() => navigate('/refinery')}>Open refinery matrix <ArrowRight /></button></Magnetic>
              <button className="btn lg" onClick={openPalette}><Command /> Command palette <span className="kbd"><Command size={10} />K</span></button>
            </motion.div>
          </div>

          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 1.3, ease: [0.22, 1, 0.36, 1] }}>
            <Orrery system={system} bodies={sysBodies} resources={resources} />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
          <Ticker items={ticker} />
        </motion.div>
      </section>

      <div className="info-body">
        {/* ═════════ LIVE STATS ═════════ */}
        <Reveal className="stat-strip glass">
          {[
            { k: 'Refinery terminals', v: stats.stations, icon: Flame },
            { k: 'Materials tracked', v: stats.materials, icon: Gem },
            { k: 'Survey signatures', v: stats.sites, icon: Radar },
            { k: 'Star systems', v: stats.systems, icon: Globe2 },
          ].map((s) => (
            <div className="stat" key={s.k}>
              <s.icon size={15} className="stat-ico" />
              <b className="stat-v serif"><CountUp value={s.v} /></b>
              <span className="stat-k">{s.k}</span>
            </div>
          ))}
          <div className="stat pulse">
            <Gauge size={15} className="stat-ico" />
            <b className="stat-v serif">{ping === null ? '—' : <><CountUp value={ping} /><small>ms</small></>}</b>
            <span className="stat-k"><span className="live" /> Uplink pulse</span>
          </div>
        </Reveal>

        {/* ═════════ BENTO ═════════ */}
        <Reveal className="section-label" y={12}><b>01</b><span>The suite</span></Reveal>
        <div className="bento-grid">
          <Reveal className="b-refinery"><BentoCard className="tall" onClick={() => navigate('/refinery')} label="Open refinery module">
            <div className="b-top"><span className="b-ico"><Flame size={18} /></span><span className="chip gold">Module 01</span></div>
            <MiniMatrix data={sysRefinery.length ? sysRefinery : refinery} />
            <div className="b-bottom">
              <h3 className="serif">Refinery matrix</h3>
              <p>A heat-mapped comparison of every terminal and material. Crosshair inspection, rankings and one-click CSV export.</p>
              <span className="b-link">Explore yields <ArrowRight size={15} /></span>
            </div>
          </BentoCard></Reveal>

          <Reveal className="b-resources" delay={0.08}><BentoCard onClick={() => navigate('/resources')} label="Open resources module">
            <div className="b-top"><span className="b-ico teal"><Orbit size={18} /></span><span className="chip teal">Module 02</span></div>
            <div className="b-mini-orbit" aria-hidden="true">
              {[0, 1, 2].map((i) => <span key={i} className="mo-ring" style={{ inset: `${i * 18}%`, animationDuration: `${24 + i * 10}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}><i /></span>)}
              <span className="mo-core" />
            </div>
            <div className="b-bottom">
              <h3 className="serif">Survey archive</h3>
              <p>Planetary findings by body and extraction vector, with rarity, yield and field tips.</p>
              <span className="b-link">Browse sectors <ArrowRight size={15} /></span>
            </div>
          </BentoCard></Reveal>

          <Reveal className="b-bulletin" delay={0.16}><BentoCard onClick={() => navigate('/bulletin')} label="Open bulletin module">
            <div className="b-top"><span className="b-ico violet"><Newspaper size={18} /></span><span className="chip violet">Module 03</span></div>
            <div className="b-news">
              {latest ? (
                <>
                  <span className="b-news-meta"><span className="live" /> Latest · {timeAgo(latest.timestamp)}</span>
                  <p className="b-news-text">“{latest.content.length > 150 ? `${latest.content.slice(0, 150)}…` : latest.content}”</p>
                </>
              ) : <p className="b-news-text dim">No announcements yet. Studio news will appear here.</p>}
            </div>
            <div className="b-bottom">
              <h3 className="serif">Bulletin & roadmap</h3>
              <span className="b-link">Read updates <ArrowRight size={15} /></span>
            </div>
          </BentoCard></Reveal>

          <Reveal className="b-cmd" delay={0.1}><BentoCard onClick={openPalette} label="Open command palette">
            <div className="b-top"><span className="b-ico"><Command size={18} /></span><span className="chip">Command layer</span></div>
            <div className="fake-cp" aria-hidden="true">
              <div className="fake-input"><span className="caret" />refin<span className="ghost">ery · bexalite · levski…</span></div>
              <div className="fake-item on"><Flame size={13} /> Refinery <em>/refinery</em></div>
              <div className="fake-item"><Gem size={13} /> Quantanium <em>Yields</em></div>
              <div className="fake-item"><Layers size={13} /> Switch to Pyro <em>System</em></div>
            </div>
            <div className="b-bottom">
              <h3 className="serif">Search everything</h3>
              <p>Fuzzy-jump to any module, terminal, material or survey site. Press <span className="kbd"><Command size={10} /></span> <span className="kbd">K</span> or <span className="kbd">/</span> anywhere.</p>
            </div>
          </BentoCard></Reveal>

          <Reveal className="b-quote" delay={0.12}><BentoCard>
            <Quote size={22} className="q-ico" />
            <p className="q-text serif">Precision is our primary currency. In the vastness of the frontier, depth of information is the boundary between survival and success.</p>
            <div className="q-by"><Logo size={18} id="q" /> <span>The Yūgen manifesto</span></div>
          </BentoCard></Reveal>

          <Reveal className="b-founder" delay={0.18}><BentoCard onClick={() => navigate('/profile/fernlives')} label="View founder profile">
            <div className="b-top"><span className="chip gold">Principal architect</span></div>
            <div className="founder">
              <span className="founder-orb"><Logo size={30} id="f" /></span>
              <div>
                <h3 className="serif">FernLives</h3>
                <p>Founder & lead architect</p>
              </div>
              <ArrowRight size={18} className="founder-arrow" />
            </div>
          </BentoCard></Reveal>
        </div>

        {/* ═════════ PRINCIPLES ═════════ */}
        <Reveal className="section-label" y={12}><b>02</b><span>Principles</span></Reveal>
        <div className="principles">
          {[
            ['Civilian-first', 'Not a tactical console. A refined utility for independent operators who want clear answers, fast.'],
            ['Transparent by default', 'Every modifier, signature and note is traceable. No dark patterns, no hidden weighting.'],
            ['Depth without noise', 'Dense data presented with restraint — hierarchy, space and motion that guide the eye.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.08} className="principle">
              <span className="p-idx num">0{i + 1}</span>
              <h3 className="serif">{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
