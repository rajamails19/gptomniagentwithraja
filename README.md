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

## Backend API Foundation

The app now includes a minimal TanStack Start/Nitro API layer mounted from `src/server.ts`.
Storage is currently in-memory and seeded from the deterministic demo scenarios.

Available endpoints:

- `GET /api/health`
- `GET /api/scenarios`
- `GET /api/scenarios/:id`
- `GET /api/runs`
- `POST /api/runs`
- `GET /api/runs/:id`
- `GET /api/runs/:id/trace`
- `GET /api/runs/:id/artifact`

Local API testing:

```sh
npm run dev

curl http://localhost:8087/api/health
curl http://localhost:8087/api/scenarios
curl http://localhost:8087/api/scenarios/security-incident
curl http://localhost:8087/api/runs
curl -X POST http://localhost:8087/api/runs \
  -H "content-type: application/json" \
  -d '{"scenarioId":"pull-request-review"}'
curl http://localhost:8087/api/runs/exec_pr_104
curl http://localhost:8087/api/runs/exec_pr_104/trace
curl http://localhost:8087/api/runs/exec_pr_104/artifact
```

If your local dev server starts on a different port, replace `8087` with the port printed by Vite.

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
