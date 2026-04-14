# 🚀 AUXNET Deployment Strategy

**[UPDATED FOR PERSISTENT DATABASE UPGRADE]**

Since AUXNET has been upgraded from a local-storage static app to a **Full-Stack Application with a persistent SQLite database**, the hosting requirements have changed.

You can no longer use simple "Static Hosts" (like GitHub Pages or basic Cloudflare Pages) because they do not run the Node.js backend or allow writing data to a persistent disk (`auxnet.db`).

## 🔐 CRITICAL: SECURITY NOTE

When you host this online, **do not** upload your `.env` file to a public repository (GitHub/GitLab). Instead, use the platform's System Environment Variables interface.

---

## 1. Local Network / Self-Hosting

1. In your project folder, run `npm install`.
2. Build the UI: `npm run build`.
3. Boot the system: `npm start`.
4. Access via your local IP at port **3001** (e.g., `http://192.168.1.50:3001`).

_(For development with hot-reloading, still use `npm run dev:full` and access `5173`)._

---

## 2. Server-based Hosting Platforms (Railway, Render, Fly.io)

**Best for**: Global access with persistent file storage.
The system is now configured for **Unified Hosting**, meaning the backend serves the frontend on a single port.

### Example: Deploying to Railway.app

1. Go to [Railway](https://railway.app/).
2. Create a "New Project" > "Deploy from GitHub repo".
3. **Important**: Add a "Volume" in Railway settings and mount it to **`/app/data`**. (Do NOT mount to `/app/server` or your code will disappear!).
4. Start Command: `npm start`.
5. Environment Variables:
   - **Key**: `PORT` (Railway provides this automatically).
   - **Key**: `DB_PATH`
   - **Value**: `/app/data/auxnet.db`
   - **Key**: `VITE_ADMIN_PIN`
   - **Value**: _[Your Custom Pin]_

## 3. What about Vercel?

You **can** still use Vercel for the frontend, but:

- Vercel's "Serverless Functions" do **not** support writing to a local SQLite file persistently. Every time the function sleeps, your database will be wiped back to the original seed file.
- **If you must use Vercel**: You will need to spin up an external database (such as a free Postgres database via Supabase or Neon) and migrate the `database.js` file to use Postgres instead of SQLite.

---

### 🛰️ DEPLOYMENT STATUS

| Platform             | Requires Config    | Persistence | Complexity |
| :------------------- | :----------------- | :---------- | :--------- |
| **Local Network**    | Minimal            | Absolute    | ★☆☆☆☆      |
| **Railway / Render** | Disk Volumes       | Absolute    | ★★★☆☆      |
| **Vercel**           | External DB needed | via Cloud   | ★★★★★      |

**Protocol**: Secure Hosting // System: AUTHORIZED
