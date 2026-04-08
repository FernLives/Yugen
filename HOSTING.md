# 🚀 AUXNET Deployment Strategy
**[UPDATED FOR PERSISTENT DATABASE UPGRADE]**

Since AUXNET has been upgraded from a local-storage static app to a **Full-Stack Application with a persistent SQLite database**, the hosting requirements have changed. 

You can no longer use simple "Static Hosts" (like GitHub Pages or basic Cloudflare Pages) because they do not run the Node.js backend or allow writing data to a persistent disk (`auxnet.db`).

## 🔐 CRITICAL: SECURITY NOTE
When you host this online, **do not** upload your `.env` file to a public repository (GitHub/GitLab). Instead, use the platform's System Environment Variables interface.

---

## 1. Local Network / Self-Hosting (Recommended for Immersion)
If you just want this running on a secondary tablet or laptop next to your main rig (the true "Admin Console" experience):
1. In your project folder, run `npm install`.
2. Find your local IP address (e.g., `192.168.1.50`).
3. Boot the system:
   ```powershell
   npm start
   ```
4. On your tablet, go to `http://192.168.1.50:5173`. 
*(Note: You may need to update `vite.config.js` with `server: { host: '0.0.0.0' }` to allow network access).*

## 2. Server-based Hosting Platforms (Railway, Render, Fly.io)
**Best for**: Global access with persistent file storage.
Because SQLite requires a persistent disk file to save data, platforms that offer "Persistent Volumes" are required.

### Example: Deploying to Railway.app
1. Go to [Railway](https://railway.app/).
2. Create a "New Project" > "Deploy from GitHub repo".
3. **Important**: Add a "Volume" to your deployment in Railway settings, and set its mount path to `/app/server` so your `auxnet.db` doesn't reset every deploy.
4. Set your Start Command to `npm run start` or `npm run server` (if you build the UI separately).
5. Add your Environment Variable:
   * **Key**: `VITE_ADMIN_PIN` 
   * **Value**: *[Your Custom Pin]*

## 3. What about Vercel?
You **can** still use Vercel for the frontend, but:
* Vercel's "Serverless Functions" do **not** support writing to a local SQLite file persistently. Every time the function sleeps, your database will be wiped back to the original seed file.
* **If you must use Vercel**: You will need to spin up an external database (such as a free Postgres database via Supabase or Neon) and migrate the `database.js` file to use Postgres instead of SQLite.

---

### 🛰️ DEPLOYMENT STATUS
| Platform | Requires Config | Persistence | Complexity |
| :--- | :--- | :--- | :--- |
| **Local Network** | Minimal | Absolute | ★☆☆☆☆ |
| **Railway / Render** | Disk Volumes | Absolute | ★★★☆☆ |
| **Vercel** | External DB needed | via Cloud | ★★★★★ |

**Protocol**: Secure Hosting // System: AUTHORIZED
