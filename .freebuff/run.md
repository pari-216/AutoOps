# AutoOps — Run Doc

Next.js 16 (App Router) + TypeScript + Tailwind v4 SaaS UI. Phase 1: UI only —
no database, auth, or external services required to run.

## 1. Reproduce the artifacts (fresh checkout)

1. **Install dependencies** — npm is the package manager (`package-lock.json` is committed):
   ```bash
   npm install
   ```
2. **Environment variables** — copy the example env file and fill in Supabase
   credentials if you have them (they are OPTIONAL in Phase 1; the app builds
   and runs without them):
   ```bash
   cp .env.example .env.local
   ```
   Required variable names (values live only in your local `.env.local`, never
   in the repo): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   If a sibling/main checkout already has a configured `.env.local`, copy it
   from there instead of starting from `.env.example`.
3. No build artifacts are needed for dev mode (`npm run dev` compiles on the
   fly). For a production check: `npm run build && npm run start`.

## 2. Run the dev server

```bash
npm run dev
```

- Default port is **3000** (`next dev`). If 3000 is busy, Next.js
  automatically picks the next free port (watch the `Local:` line in the
  output) — or force one with `npm run dev -- -p <port>`.
- Verify before registering a preview: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/dashboard`
  should return `200`.

Routes: `/`, `/login`, `/dashboard`, `/dashboard/queue`,
`/dashboard/activity`, `/dashboard/settings` — all should answer `200`.
