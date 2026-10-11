# ✧ YŪGEN — INTELLIGENCE SUITE
### Unified Intelligence for the Civilian Frontier

YŪGEN is a premium, open-source intelligence suite designed for decentralized civilian operations. It provides a high-fidelity interface for material logistics, resource survey archives, and automated community announcements.

---

## ◈ THE MANIFESTO
> "Precision is our primary currency. In the vastness of the civilian frontier, depth of information defines the boundary between survival and success."

YŪGEN is built on a **Civilian-First** philosophy. It is not a military platform or a tactical command center. It is a sophisticated utility for independent operators who demand precision, transparency, and a professional-grade aesthetic.

---

## ◈ CORE MODULES

### ✧ THE REFINERY MATRIX
A real-time yield analysis terminal. Track material modifiers across all active refinery hubs with high-fidelity matrix rendering and "Best in Class" highlighting.

### ✧ RESOURCE INTELLIGENCE
A decentralized archive of planetary survey findings. Categorize minerals, ores, and gas signatures across multiple star systems with localized tips and extraction methods.

### ✧ STUDIO BULLETIN & ROADMAP
A community-focused broadcast hub. Live system logs, automated change reports, and a vertical strategic roadmap for project milestones—all delivered in a premium "Studio" aesthetic.

---

## ◈ TECHNOLOGY STACK
*   **Frontend**: React 19 + Vite, motion (animation), lucide-react (icons), self-hosted Geist / Geist Mono / Instrument Serif via Fontsource — a bespoke "Midnight Ink" design system (`src/index.css`) with glass surfaces, cursor spotlights, 3D tilt, an orbital hero, a ⌘K command palette and a staged boot sequence
*   **Backend**: Node.js + Express (High-Performance REST Architecture)
*   **Persistence**: SQLite (Local, Lightweight, and Portable)
*   **Design**: Vanilla CSS with deep Glassmorphism and Silk-Gold accents.

---

## ◈ SETUP GUIDE

### 1. CLONE & INITIALIZE
```bash
git clone https://github.com/FernLives/Yugen.git
cd Yugen
npm install
```

### 2. CONFIGURE ENVIRONMENT
Duplicate the template and add your own secure credentials.
```bash
cp .env.example .env
# Edit .env with your own JWT_SECRET
```

### 3. LAUNCH UPLINK
```bash
# Start both Frontend (Vite, :5173) & Backend (Express, :3001) concurrently
npm run dev:full
```
Vite proxies `/api` to the backend, so open http://localhost:5173.

### 4. SHIP IT
```bash
npm run build   # bundles the frontend into dist/
npm start       # Express serves the API *and* dist/ on $PORT
```

---

## ◈ SCRIPTS
| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server only |
| `npm run server` | API with auto-reload (nodemon) |
| `npm run dev:full` | Both of the above |
| `npm run build` | Production frontend build |
| `npm start` | Production server (API + static frontend) |
| `npm run lint` | ESLint |
| `npm test` | API integration tests (boots the real server against a throw-away database) |
| `npm run check` | lint + test + build — what CI runs |

## ◈ CONFIGURATION
All settings are environment variables — see [`.env.example`](.env.example).

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | **Required.** Signs login tokens |
| `PORT` | Listen port (default `3001`) |
| `DB_PATH` | SQLite file location — use a persistent volume in production |
| `TRUST_PROXY` | Hop count when behind a proxy, so rate limits see real client IPs |
| `CORS_ORIGIN` | Comma-separated cross-origin allow-list (unset = same-origin setup) |

> **First administrator:** the very first account registered on an empty database becomes the admin. Register it yourself right after deploying a fresh instance.

---

## ◈ SECURITY NOTICE
* Passwords are hashed with bcrypt; sessions are 7-day JWTs. Roles are re-checked against the database on every request, so demoting an account takes effect immediately.
* Sign-in and registration are rate limited, every write endpoint validates its input, and the last administrator can't be demoted.
* Keep `JWT_SECRET` private and keep your live `auxnet.db` out of public version control.

---

## ◈ AI TRANSPARENCY
This suite was developed through a high-fidelity partnership between a human founder and **Antigravity**, an advanced AI coding intelligence. Every component—from the "Civlian Studio" UI architecture to the persistent SQLite backend—has been refined through iterative human-AI collaboration.

We believe in the future of augmented intelligence as a tool for independent civilian groups to build professional-grade infrastructure for the frontier.

---

**YŪGEN INTELLIGENCE // COMMUNITY HUB // PRODUCED BY FERNLIVES**
