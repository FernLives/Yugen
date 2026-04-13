import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../data/dataStore';
import './ProfilePage.css';

// ── Procedural Avatar Generator ──
function drawAvatar(canvas, seed, size = 200) {
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  // Parse seed into numbers
  const nums = [];
  for (let i = 0; i < seed.length; i += 2) {
    nums.push(parseInt(seed.substr(i, 2), 16) || 0);
  }

  // Background circle
  const hue = nums[0] * 1.4;
  const sat = 30 + (nums[1] % 30);
  ctx.fillStyle = `hsl(${hue}, ${sat}%, 12%)`;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Geometric pattern — hexagonal grid
  const cx = size / 2;
  const cy = size / 2;
  const cellSize = size / 6;

  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const idx = (Math.abs(row * 5 + col) + 3) % nums.length;
      const val = nums[idx];
      if (val % 3 === 0) continue; // skip some cells for pattern

      const x = cx + col * cellSize * 0.95 + (row % 2 ? cellSize * 0.475 : 0);
      const y = cy + row * cellSize * 0.82;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > size * 0.42) continue;

      const alpha = 0.3 + (val % 8) * 0.08;
      const lightness = 40 + (val % 30);
      ctx.fillStyle = `hsla(${hue + (val % 40) - 20}, ${sat + 10}%, ${lightness}%, ${alpha})`;

      // Draw organic circle
      ctx.beginPath();
      ctx.arc(x, y, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Center glow
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.15);
  gradient.addColorStop(0, `hsla(${hue}, ${sat}%, 70%, 0.15)`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = `hsla(${hue}, ${sat}%, 50%, 0.25)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();
}

const CLEARANCE_LEVELS = ['ASSOCIATE', 'DIRECTOR', 'PRINCIPAL'];

function formatDate(iso) {
  if (!iso) return 'UNKNOWN';
  const d = new Date(iso);
  const year = d.getFullYear() + 930;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${year}`;
}

function timeAgo(iso) {
  if (!iso) return 'NEVER';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}m AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h AGO`;
  const days = Math.floor(hrs / 24);
  return `${days}d AGO`;
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const avatarRef = useRef(null);

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

  const loadProfile = useCallback(async () => {
    const p = await getUserProfile(username);
    if (!p) { setLoading(false); return; }
    setProfile(p);
    setLoading(false);
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (profile?.avatarSeed && avatarRef.current) {
      drawAvatar(avatarRef.current, profile.avatarSeed, 180);
    }
  }, [profile]);

  const startEdit = () => {
    setEditing(true);
    setEditForm({ callsign: profile.callsign, bio: profile.bio || '', newPassword: '' });
  };

  const saveEdit = async () => {
    try {
      const payload = { callsign: editForm.callsign, bio: editForm.bio };
      if (editForm.newPassword) {
        if (editForm.newPassword.length < 4) throw new Error('Password too short');
        payload.password = editForm.newPassword;
      }
      const updated = await updateProfile(payload);
      setProfile(updated);
      setEditing(false);
      setSaveStatus('Profile updated');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus(err.message);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-pulse" />
          <span>OPENING PROFILE...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-not-found">
          <div className="pnf-icon">?</div>
          <h2>IDENTITY NOT FOUND</h2>
          <p>No operator registered under handle "{username}"</p>
          <button className="pnf-back" onClick={() => navigate('/refinery')}>RETURN HOME</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page fade-in-up">
      {/* ── Hero Card ── */}
      <div className="profile-card">
        <div className="profile-card-bg" />

        <div className="profile-card-content">
          {/* Avatar */}
          <div className="profile-avatar-wrapper">
            <canvas ref={avatarRef} className="profile-avatar" />
            <div className={`profile-status-dot ${profile.status?.toLowerCase()}`} />
          </div>

          {/* Identity */}
          <div className="profile-identity">
            {editing ? (
              <input
                className="profile-callsign-edit"
                value={editForm.callsign}
                onChange={e => setEditForm({ ...editForm, callsign: e.target.value })}
                spellCheck={false}
              />
            ) : (
              <h1 className="profile-callsign">{profile.callsign}</h1>
            )}
            <span className="profile-handle">@{profile.username}</span>

            {/* Role badge */}
            <div className={`profile-role-badge ${profile.role}`}>
              {profile.role === 'admin' ? 'PRINCIPAL' : 'MEMBER'}
            </div>
          </div>

          {/* Clearance strip */}
          <div className="clearance-strip">
            {CLEARANCE_LEVELS.map(level => (
              <span
                key={level}
                className={`clearance-tier ${(profile.clearance || 'ASSOCIATE') === level ? 'active' : ''}`}
              >
                {level}
              </span>
            ))}
          </div>

          {/* Stats bar */}
          <div className="profile-stats">
            <div className="stat-block">
              <span className="stat-label">REGISTERED</span>
              <span className="stat-value">{formatDate(profile.createdAt)}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-block">
              <span className="stat-label">LAST SEEN</span>
              <span className="stat-value">{timeAgo(profile.lastSeen)}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-block">
              <span className="stat-label">STATUS</span>
              <span className={`stat-value status-${profile.status?.toLowerCase()}`}>{profile.status}</span>
            </div>
          </div>

          {/* Bio Narrative */}
          <div className="profile-bio-section">
            <span className="bio-label">NARRATIVE</span>
            {editing ? (
              <textarea
                className="profile-bio-edit"
                value={editForm.bio}
                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Write something about yourself..."
                rows={3}
              />
            ) : (
              <p className="profile-bio">{profile.bio || 'No brief filed.'}</p>
            )}
          </div>

          {/* Credentials Editor */}
          {editing && (
            <div className="profile-bio-section" style={{ marginTop: '0' }}>
              <span className="bio-label">CREDENTIALS</span>
              <input
                type="password"
                className="profile-callsign-edit"
                style={{ fontSize: '12px', letterSpacing: '0.1em', textAlign: 'left', fontWeight: '400', color: 'var(--text-bright)' }}
                value={editForm.newPassword || ''}
                onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                placeholder="Enter a new password to change..."
                spellCheck={false}
              />
            </div>
          )}

          {/* Actions */}
          {isOwnProfile && (
            <div className="profile-actions">
              {editing ? (
                <>
                  <button className="profile-btn primary" onClick={saveEdit}>SAVE CHANGES</button>
                  <button className="profile-btn" onClick={() => setEditing(false)}>CANCEL</button>
                </>
              ) : (
                <button className="profile-btn" onClick={startEdit}>EDIT PROFILE</button>
              )}
            </div>
          )}

          {saveStatus && <div className="profile-save-status">{saveStatus}</div>}
        </div>
      </div>
    </div>
  );
}
