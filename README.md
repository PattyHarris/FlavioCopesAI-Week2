# Events Dashboard (API + Local UI)

Two-part app:
1. `api/`: Remote Node.js REST API that accepts events with API key auth.
2. `dashboard/`: Local React dashboard with real-time feed, filters, search, and chart.

Data is stored in Supabase cloud Postgres.

## 1) Supabase setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase project settings, copy:
- Project URL
- `publishable` key
- `secret` key

## 2) API setup (deploy this remotely)

```bash
cd api
cp .env.example .env
npm install
npm run dev
```

Required env:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
- `PORT`
- `CORS_ORIGINS` (comma-separated; include `http://localhost:5173`)

### API endpoints

- `POST /api/projects`
  - Body: `{ "name": "My Project" }`
  - Returns a one-time `apiKey` and `project.id`

- `POST /api/events` (authenticated)
  - Header: `x-api-key: <your key>`
  - Body:

```json
{
  "channel": "orders",
  "title": "Checkout completed",
  "description": "Order #10021",
  "emoji": "🛒",
  "tags": ["paid", "stripe"],
  "eventTime": "2026-03-06T20:22:00.000Z"
}
```

- `GET /api/events/recent` (authenticated)

### Create project + key

```bash
curl -X POST http://localhost:8080/api/projects \
  -H 'content-type: application/json' \
  -d '{"name":"My Monitoring Project"}'
```

Save the returned `apiKey` and `project.id`.

### Send test event

```bash
curl -X POST http://localhost:8080/api/events \
  -H 'content-type: application/json' \
  -H 'x-api-key: evt_your_key_here' \
  -d '{"channel":"deploys","title":"Production deploy succeeded","emoji":"🚀","tags":["prod","v1.4.2"]}'
```

### Import test dataset from JSON

If your data is in a file like `TestData/saas-demo.json` with events under `.events[]`:

```bash
./scripts/import-events.sh evt_your_key_here TestData/saas-demo.json
```

Optional API URL (if not local):

```bash
./scripts/import-events.sh evt_your_key_here TestData/saas-demo.json https://your-api-host.com
```

## 3) Dashboard setup (run locally)

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev
```

Set in `dashboard/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`)
- `VITE_API_BASE_URL` (defaults to `http://localhost:8080`)
- Optional: `VITE_PROJECT_ID` for initial selection only

Project flow in the dashboard UI:
- Use the top-right `+` button to create a project (API call to `/api/projects`) or add an existing one.
- Use the project dropdown (left of `+`) to switch between saved projects.
- After creating a project, an API key modal appears with a copy button. Save the key immediately.
- The dashboard stores created/added projects in local browser storage.

Open `http://localhost:5173`.

## Deployment

Deploy `api` to any always-on Node host (Railway, Render, Fly.io, VPS). Keep the `dashboard` local.
