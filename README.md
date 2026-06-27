# OmniAgents

OmniAgents is an interactive AI agent control-room demo for planning, execution, debugging, monitoring, and governance.

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
- Vercel temporary path: `/tmp/gptomniagents.sqlite`
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
- Scenario policy can pause a run as `waiting_for_approval` before final artifact release.
- Trace events are persisted as the run progresses.
- The final artifact is persisted when the run reaches `completed`.
- The current frontend calls the backend first and falls back to the local deterministic demo engine if the API is unavailable.

Human approval gates:

- Approval logic lives under `src/server/approvals/`.
- Approval requests are persisted in SQLite in `approval_requests`.
- The current policy gates the API Documentation Generation scenario before final artifact publishing and can also trigger on cost threshold.
- Pending approvals expose risk level, reason, requested action, and artifact preview.
- Approving resumes the run and completes final artifact publishing.
- Rejecting marks the run `rejected` and writes the decision path to trace events.
- The Workflow page includes a compact approvals panel. The Debugger shows approval request/decision events in the trace stream.

Approval APIs:

- `GET /api/v1/approvals`
- `GET /api/v1/approvals/:id`
- `GET /api/v1/runs/:id/approvals`
- `POST /api/v1/approvals/:id/approve`
- `POST /api/v1/approvals/:id/reject`

LLM provider configuration:

- Active provider: `LLM_PROVIDER` defaults to `openai`
- Active model: `LLM_MODEL` or `OPENAI_MODEL`, defaulting to `gpt-5-mini`
- OpenAI key: `OPENAI_API_KEY`
- Timeout: `LLM_TIMEOUT_MS`, defaulting to `20000`

All LLM access goes through `src/server/llm/`. The frontend never calls provider APIs directly. The API Documentation Generation workflow attempts a real LLM artifact generation at completion; if the provider is missing or unavailable, it falls back to the deterministic demo artifact and records the fallback in execution logs.

Demo safety controls:

- Basic API rate limiting is enabled in memory for all `/api/*` routes.
- `API_RATE_LIMIT_MAX` controls requests per bucket. Default: `120`.
- `API_RATE_LIMIT_WINDOW_MS` controls the window. Default: `60000`.
- Developer endpoints under `/api/v1/developer/*` are protected by `DEVELOPER_API_TOKEN` in production.
- The `/developer/api` page is also protected by `DEVELOPER_API_TOKEN` in production.
- To open the developer page, visit `/developer/api?token=<DEVELOPER_API_TOKEN>`. A session cookie is set after a successful token check.
- For curl access to developer endpoints, pass `x-developer-token: <DEVELOPER_API_TOKEN>`.
- In local development, if `DEVELOPER_API_TOKEN` is not set, the developer page remains available.

Tool execution framework:

- Tools live under `src/server/tools/`.
- Every tool has an ID, name, description, category, Zod input schema, Zod output schema, and server-only `execute()` method.
- The frontend never calls tool implementations directly; it only talks to API routes.
- Tool executions are logged to SQLite with run ID, trace event ID, input/output summaries, status, duration, error, and timestamp.
- Initial safe local tools: `openapi-inspector`, `markdown-generator`, `risk-scanner`, `cost-estimator`, and `trace-summarizer`.
- To add a tool, implement `BaseTool`, register it in `ToolRegistry`, and keep inputs/outputs non-dangerous and schema-validated.

Agent memory system:

- Memory lives under `src/server/memory/`.
- Supported scopes are `run`, `workflow`, and `global`.
- Run memory is current-execution context only.
- Workflow memory is reusable for the selected scenario.
- Global memory is shared demo-level knowledge across workflows.
- Memory records include `id`, `scope`, `runId`, `scenarioId`, `agentId`, `content`, `tags`, `importance`, `source`, `createdAt`, and `updatedAt`.
- Before an agent runs, the orchestrator retrieves relevant memories through `MemoryRetriever`.
- After an agent finishes, `MemorySummarizer` writes concise memory summaries.
- `MemoryPolicy` redacts or blocks API keys, bearer tokens, passwords, raw private tokens, and other secrets.
- Current retrieval is deterministic and tag/keyword based; no vector database is used yet.
- Future vector search can add embeddings to a `memory_embeddings` table or a managed vector store while keeping `MemoryService` and frontend API contracts stable.

MCP configuration:

- MCP support lives under `src/server/mcp/`.
- MCP tools are discovered server-side and merged into the same tool registry as local tools.
- Config loading order is `MCP_SERVERS_JSON`, then optional `mcp.config.json`, then fallback mock servers.
- Invalid config does not crash the app. The server records config errors, keeps the app running, and falls back to mock MCP servers.
- Supported config fields: `id`, `name`, `description`, `enabled`, `transport`, `command`, `args`, `url`, `endpoint`, and `timeoutMs`.
- Supported transports are `mock`, `stdio`, `http`, and `sse`.
- Current limitation: `stdio`, `http`, and `sse` transports are validation stubs only. They do not spawn processes or make network calls yet. Mock MCP remains available by default.

`MCP_SERVERS_JSON` example:

```sh
MCP_SERVERS_JSON='{"servers":[{"id":"filesystem-mcp","name":"Filesystem MCP","description":"Local mock OpenAPI catalog","enabled":true,"transport":"mock","timeoutMs":5000}]}'
```

`mcp.config.json` example:

```json
{
  "servers": [
    {
      "id": "filesystem-mcp",
      "name": "Filesystem MCP",
      "description": "Local mock OpenAPI catalog",
      "enabled": true,
      "transport": "mock",
      "timeoutMs": 5000
    }
  ]
}
```

Future GitHub MCP config example:

```json
{
  "id": "github-mcp",
  "name": "GitHub MCP",
  "description": "Repository context and pull request tools",
  "enabled": false,
  "transport": "stdio",
  "command": "github-mcp-server",
  "args": ["--repo", "owner/repo"],
  "timeoutMs": 10000
}
```

Future Postgres MCP config example:

```json
{
  "id": "postgres-mcp",
  "name": "Postgres MCP",
  "description": "Read-only database inspection tools",
  "enabled": false,
  "transport": "stdio",
  "command": "postgres-mcp-server",
  "args": ["--read-only"],
  "timeoutMs": 10000
}
```

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
- `GET /api/v1/tools/:id`
- `POST /api/v1/tools/:id/execute`
- `GET /api/v1/mcp`
- `GET /api/v1/mcp/servers`
- `GET /api/v1/mcp/tools`
- `POST /api/v1/mcp/connect`
- `POST /api/v1/mcp/disconnect`
- `GET /api/v1/memories`
- `GET /api/v1/memories/:id`
- `POST /api/v1/memories`
- `PATCH /api/v1/memories/:id`
- `DELETE /api/v1/memories/:id`
- `GET /api/v1/runs/:id/memories`
- `GET /api/v1/scenarios/:id/memories`
- `GET /api/v1/settings`
- `GET /api/v1/developer/routes`
- `GET /api/v1/developer/logs`
- `GET /api/v1/developer/execution-logs`
- `GET /api/v1/developer/tool-executions`

Local API testing:

```sh
npm run dev

curl http://localhost:8087/api/v1/health
curl -X POST http://localhost:8087/api/v1/llm/test \
  -H "content-type: application/json" \
  -d '{"prompt":"Write one sentence about API documentation."}'
curl http://localhost:8087/api/v1/scenarios
curl http://localhost:8087/api/v1/tools
curl http://localhost:8087/api/v1/mcp
curl http://localhost:8087/api/v1/mcp/servers
curl http://localhost:8087/api/v1/mcp/tools
curl -X POST http://localhost:8087/api/v1/tools/mcp.filesystem.openapi-catalog/execute \
  -H "content-type: application/json" \
  -d '{"input":{"service":"payments"}}'
curl -X POST http://localhost:8087/api/v1/tools/openapi-inspector/execute \
  -H "content-type: application/json" \
  -d '{"input":{"endpoints":[{"method":"GET","path":"/health","summary":"Health check"}]}}'
curl http://localhost:8087/api/v1/scenarios/security-incident
curl http://localhost:8087/api/v1/runs
curl -X POST http://localhost:8087/api/v1/runs \
  -H "content-type: application/json" \
  -d '{"scenarioId":"pull-request-review"}'
curl -X POST http://localhost:8087/api/v1/runs/<run-id>/start
curl http://localhost:8087/api/v1/runs/<run-id>/status
curl http://localhost:8087/api/v1/runs/<run-id>/trace
curl http://localhost:8087/api/v1/runs/<run-id>/artifact
curl http://localhost:8087/api/v1/memories
curl -X POST http://localhost:8087/api/v1/memories \
  -H "content-type: application/json" \
  -d '{"scope":"global","content":"Demo memory note","tags":["demo"],"importance":60,"source":"manual"}'
curl http://localhost:8087/api/v1/runs/<run-id>/memories
curl http://localhost:8087/api/v1/scenarios/payments-api-docs/memories
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
- Move local `.data/` storage to managed PostgreSQL tables for `scenarios`, `runs`, `trace_events`, `artifacts`, `agents`, `tools`, `settings`, and `memories`.

## Vercel Deployment

This repo includes `vercel.json` with:

- Build command: `npm run build`
- Output directory: `.vercel/output`

In Vercel, import the GitHub repository and keep the default install command unless you intentionally switch package managers. No required environment variables are currently defined.

SQLite on Vercel uses `/tmp`, which is writable but ephemeral. This keeps the demo deployable, but durable production persistence should use PostgreSQL.

Recommended Vercel settings:

- Framework preset: Other
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `.vercel/output`

## GitHub First Commit

```sh
git add .
git commit -m "Initial OmniAgents app"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
