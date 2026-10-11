import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pencil, Check, X, Calendar, Clock, Activity, ShieldCheck, UserX, KeyRound, ArrowLeft, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../data/dataStore';
import { universeDate, timeAgo } from '../../lib/format';
import Avatar from '../ui/Avatar';
import Tilt from '../ui/Tilt';
import Logo from '../ui/Logo';
import SpotCard from '../ui/SpotCard';
import LoadingState from '../common/LoadingState';
import './ProfilePage.css';

const CLEARANCE_LEVELS = ['ASSOCIATE', 'DIRECTOR', 'PRINCIPAL'];

function seedHue(seed = '') {
  const n = parseInt(seed.slice(0, 2), 16);
  return Number.isNaN(n) ? 40 : Math.round((n / 255) * 360);
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [note, setNote] = useState(null);

  const isOwn = currentUser && profile && currentUser.id === profile.id;

  const load = useCallback(async () => {
    setLoading(true);
    const p = await getUserProfile(username);
    setProfile(p || null);
    setLoading(false);
  }, [username]);
  useEffect(() => { load(); }, [load]);

  const hue = useMemo(() => seedHue(profile?.avatarSeed), [profile]);
  const tierIdx = Math.max(0, CLEARANCE_LEVELS.indexOf(profile?.clearance || 'ASSOCIATE'));

  const flash = (kind, text) => { setNote({ kind, text }); setTimeout(() => setNote(null), 3200); };

  const startEdit = () => { setForm({ callsign: profile.callsign, bio: profile.bio || '', newPassword: '' }); setEditing(true); };
  const save = async () => {
    try {
      const payload = { callsign: form.callsign, bio: form.bio };
      if (form.newPassword) {
        if (form.newPassword.length < 8) throw new Error('Password must be at least 8 characters');
        payload.password = form.newPassword;
      }
      const updated = await updateProfile(payload);
      setProfile(updated);
      setEditing(false);
      flash('ok', 'Profile updated');
    } catch (err) {
      flash('bad', err.message);
    }
  };

  if (loading) return <LoadingState message="Opening profile" variant="split" />;

  if (!profile) {
    return (
      <div className="page">
        <div className="empty-state glass" style={{ borderRadius: 'var(--r-xl)' }}>
          <div className="icon-wrap"><UserX size={24} /></div>
          <h2>Identity not found</h2>
          <p>No operator is registered under the handle “{username}”.</p>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => navigate('/info')}><ArrowLeft /> Back to overview</button>
        </div>
      </div>
    );
  }

  const isPrincipal = profile.role === 'admin';
  const memberId = (profile.id || '').replace('usr-', '').slice(0, 8).toUpperCase();

  return (
    <div className="page pf" style={{ '--h': hue }}>
      <div className="pf-grid">
        {/* ── ID card ── */}
        <div className="pf-card-col">
          <Tilt className="pf-card" max={8}>
            <div className="pf-card-sheen" aria-hidden="true" />
            <div className="pf-card-top">
              <span className="pf-card-brand"><Logo size={18} id="pfc" /> Yūgen</span>
              <span className={`chip ${isPrincipal ? 'gold' : ''}`}>{isPrincipal ? <><Crown size={11} /> Principal</> : 'Member'}</span>
            </div>

            <div className="pf-avatar-wrap">
              <div className="pf-avatar-halo" />
              <Avatar seed={profile.avatarSeed} size={148} title={profile.callsign} />
              <span className={`pf-dot ${(profile.status || '').toLowerCase()}`} title={profile.status} />
            </div>

            <div className="pf-id">
              {editing ? (
                <input className="input pf-callsign-input" value={form.callsign} onChange={(e) => setForm({ ...form, callsign: e.target.value })} spellCheck={false} maxLength={32} aria-label="Callsign" />
              ) : (
                <h1 className="pf-callsign serif">{profile.callsign}</h1>
              )}
              <span className="pf-handle">@{profile.username}</span>
            </div>

            <div className="pf-card-foot">
              <div><span>Member ID</span><b className="mono">{memberId}</b></div>
              <div><span>Tier</span><b>{CLEARANCE_LEVELS[tierIdx]}</b></div>
              <div><span>Since</span><b className="mono">{(universeDate(profile.createdAt).split(', ')[1]) || '—'}</b></div>
            </div>
          </Tilt>

          {isOwn && (
            <div className="pf-actions">
              {editing ? (
                <>
                  <button className="btn primary" onClick={save}><Check /> Save changes</button>
                  <button className="btn" onClick={() => setEditing(false)}><X /> Cancel</button>
                </>
              ) : (
                <button className="btn" onClick={startEdit}><Pencil /> Edit profile</button>
              )}
            </div>
          )}
          <AnimatePresence>
            {note && <motion.div className={`pf-note ${note.kind}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status">{note.text}</motion.div>}
          </AnimatePresence>
        </div>

        {/* ── Details ── */}
        <div className="pf-details">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}>
            <SpotCard className="pf-panel">
              <div className="section-label"><b>01</b><span>Narrative</span></div>
              {editing ? (
                <textarea className="input" rows={4} maxLength={280} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Write something about yourself…" />
              ) : (
                <p className={`pf-bio ${profile.bio ? 'serif' : 'empty'}`}>{profile.bio || 'No brief has been filed.'}</p>
              )}
              {editing && (
                <label className="pf-pass">
                  <span className="pf-pass-label"><KeyRound size={13} /> New password <em>(optional)</em></span>
                  <input type="password" className="input" value={form.newPassword || ''} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="Leave blank to keep current (min 8 characters)" autoComplete="new-password" maxLength={72} />
                </label>
              )}
            </SpotCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6 }}>
            <SpotCard className="pf-panel">
              <div className="section-label"><b>02</b><span>Clearance</span></div>
              <div className="ladder">
                <div className="ladder-track"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: tierIdx / (CLEARANCE_LEVELS.length - 1) }} transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }} /></div>
                {CLEARANCE_LEVELS.map((l, i) => (
                  <div key={l} className={`rung ${i <= tierIdx ? 'reached' : ''} ${i === tierIdx ? 'current' : ''}`}>
                    <span className="rung-dot">{i <= tierIdx && <ShieldCheck size={12} />}</span>
                    <span className="rung-label">{l}</span>
                  </div>
                ))}
              </div>
            </SpotCard>
          </motion.div>

          <motion.div className="pf-stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.6 }}>
            <SpotCard className="pf-stat"><Calendar size={15} /><span>Registered</span><b>{universeDate(profile.createdAt)}</b></SpotCard>
            <SpotCard className="pf-stat"><Clock size={15} /><span>Last seen</span><b>{timeAgo(profile.lastSeen)}</b></SpotCard>
            <SpotCard className="pf-stat"><Activity size={15} /><span>Status</span><b className={`st-${(profile.status || '').toLowerCase()}`}><span className="live" style={{ display: 'inline-block', marginRight: 8 }} />{profile.status}</b></SpotCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
