# GPT Omni Agents

GPT Omni Agents is an interactive AI agent control-room demo for planning, execution, debugging, monitoring, and governance.

This project is currently positioned as a client/investor-ready product demo. It uses realistic mock data and deterministic demo state, but it is not a live production backend yet.

## Tech Stack

- TanStack Start
- React 19
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS v4
- Radix UI / shadcn-style components
- Recharts
- Nitro Vercel preset

## Local Development

```sh
npm install
npm run dev
```

Vite will print the local URL in the terminal. In this workspace it has recently used `http://localhost:8087`.

## Validation

```sh
npm run check
```

`npm run check` runs lint and a production build. `npm run build` uses Nitro's Vercel preset and emits Vercel Build Output API files under `.vercel/output`.

## Backend Architecture

The app includes a versioned TanStack Start/Nitro API mounted from `src/server.ts`.
Backend code is organized under `src/server/`:

- `api/` - route registration and request dispatch
- `services/` - business logic
- `repositories/` - persistence boundary
- `models/` - API/domain mappers
- `validation/` - Zod schemas for params, bodies, and responses
- `types/` - server API types
- `utils/` - HTTP responses, structured errors, and request logging

Storage is currently in-memory and seeded from the deterministic demo scenarios. Repositories are the replacement point for PostgreSQL later.

Available endpoints:

- `GET /api/v1/health`
- `GET /api/v1/scenarios`
- `GET /api/v1/scenarios/:id`
- `GET /api/v1/runs`
- `POST /api/v1/runs`
- `GET /api/v1/runs/:id`
- `GET /api/v1/runs/:id/trace`
- `GET /api/v1/runs/:id/artifact`
- `GET /api/v1/agents`
- `GET /api/v1/tools`
- `GET /api/v1/settings`
- `GET /api/v1/developer/routes`
- `GET /api/v1/developer/logs`

Local API testing:

```sh
npm run dev

curl http://localhost:8087/api/v1/health
curl http://localhost:8087/api/v1/scenarios
curl http://localhost:8087/api/v1/scenarios/security-incident
curl http://localhost:8087/api/v1/runs
curl -X POST http://localhost:8087/api/v1/runs \
  -H "content-type: application/json" \
  -d '{"scenarioId":"pull-request-review"}'
curl http://localhost:8087/api/v1/runs/exec_pr_104
curl http://localhost:8087/api/v1/runs/exec_pr_104/trace
curl http://localhost:8087/api/v1/runs/exec_pr_104/artifact
```

If your local dev server starts on a different port, replace `8087` with the port printed by Vite.

Developer API explorer:

- Visit `/developer/api` while the dev server is running.
- It displays registered routes, sample requests, sample responses, API status, and recent request logs.

## Vercel Deployment

This repo includes `vercel.json` with:

- Build command: `npm run build`
- Output directory: `.vercel/output`

In Vercel, import the GitHub repository and keep the default install command unless you intentionally switch package managers. No required environment variables are currently defined.

Recommended Vercel settings:

- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `.vercel/output`

## GitHub First Commit

```sh
git add .
git commit -m "Initial GPT Omni Agents app"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
