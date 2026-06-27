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
- Drizzle ORM
- SQLite for local persistence
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

Runs, workflow steps, trace events, and artifacts are persisted in a local SQLite database through Drizzle ORM. Scenarios, agents, tools, and settings are still seeded from deterministic demo data and exposed through repository boundaries.

Local database:

- Default path: `.data/gptomniagents.sqlite`
- Override path: `GPT_OMNI_SQLITE_PATH=/absolute/path/to/file.sqlite`
- Generated SQLite files are ignored by git.

Database commands:

```sh
npm run db:migrate
npm run db:seed
npm run db:generate
npm run db:studio
```

`db:migrate` creates local SQLite tables if missing. `db:seed` inserts deterministic demo rows only when the database is empty, so restarts do not duplicate runs.

Execution lifecycle:

- `POST /api/v1/runs` creates a queued persisted run.
- `POST /api/v1/runs/:id/start` starts deterministic backend execution.
- `GET /api/v1/runs/:id/status` advances and returns the persisted lifecycle state.
- While running, steps move through `pending`, `running`, and `completed`.
- Trace events are persisted as the run progresses.
- The final artifact is persisted when the run reaches `completed`.
- The current frontend calls the backend first and falls back to the local deterministic demo engine if the API is unavailable.

LLM provider configuration:

- Active provider: `LLM_PROVIDER` defaults to `openai`
- Active model: `LLM_MODEL` or `OPENAI_MODEL`, defaulting to `gpt-5-mini`
- OpenAI key: `OPENAI_API_KEY`
- Timeout: `LLM_TIMEOUT_MS`, defaulting to `20000`

All LLM access goes through `src/server/llm/`. The frontend never calls provider APIs directly. The API Documentation Generation workflow attempts a real LLM artifact generation at completion; if the provider is missing or unavailable, it falls back to the deterministic demo artifact and records the fallback in execution logs.

Available endpoints:

- `GET /api/v1/health`
- `POST /api/v1/llm/test`
- `GET /api/v1/scenarios`
- `GET /api/v1/scenarios/:id`
- `GET /api/v1/runs`
- `POST /api/v1/runs`
- `GET /api/v1/runs/:id`
- `POST /api/v1/runs/:id/start`
- `POST /api/v1/runs/:id/cancel`
- `POST /api/v1/runs/:id/replay`
- `GET /api/v1/runs/:id/status`
- `GET /api/v1/runs/:id/trace`
- `GET /api/v1/runs/:id/artifact`
- `GET /api/v1/agents`
- `GET /api/v1/tools`
- `GET /api/v1/settings`
- `GET /api/v1/developer/routes`
- `GET /api/v1/developer/logs`
- `GET /api/v1/developer/execution-logs`

Local API testing:

```sh
npm run dev

curl http://localhost:8087/api/v1/health
curl -X POST http://localhost:8087/api/v1/llm/test \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about API documentation."}'
curl http://localhost:8087/api/v1/scenarios
curl http://localhost:8087/api/v1/scenarios/security-incident
curl http://localhost:8087/api/v1/runs
curl -X POST http://localhost:8087/api/v1/runs \
  -H "content-type: application/json" \
  -d '{"scenarioId":"pull-request-review"}'
curl -X POST http://localhost:8087/api/v1/runs/<run-id>/start
curl http://localhost:8087/api/v1/runs/<run-id>/status
curl http://localhost:8087/api/v1/runs/<run-id>/trace
curl http://localhost:8087/api/v1/runs/<run-id>/artifact
```

If your local dev server starts on a different port, replace `8087` with the port printed by Vite.

Developer API explorer:

- Visit `/developer/api` while the dev server is running.
- It displays registered routes, sample requests, sample responses, API status, and recent request logs.

PostgreSQL migration path:

- Keep the API client and service methods unchanged.
- Replace SQLite table definitions with Drizzle PostgreSQL table definitions.
- Replace the SQLite connection in `src/server/db/connection.ts` with a PostgreSQL connection.
- Preserve repository method contracts such as `list`, `findById`, `create`, `listForRun`, and `findForRun`.
- Move local `.data/` storage to managed PostgreSQL tables for `scenarios`, `runs`, `trace_events`, `artifacts`, `agents`, `tools`, and `settings`.

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
