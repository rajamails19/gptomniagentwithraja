import { sqlite } from "./connection";

let migrated = false;

export function runMigrations() {
  if (migrated) return;

  migrateRunsTableIfNeeded();

  sqlite.exec(`
    create table if not exists scenarios (
      id text primary key,
      title text not null,
      payload_json text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists runs (
      id text primary key,
      scenario_id text not null,
      workflow text not null,
      status text not null check (status in ('queued', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled', 'rejected')),
      duration text not null,
      tokens integer not null,
      cost real not null,
      started text not null,
      current_step_id text,
      cost_summary_json text not null,
      final_artifact_json text not null,
      started_at text,
      completed_at text,
      cancelled_at text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists workflow_steps (
      id text primary key,
      run_id text not null,
      step_id text not null,
      label text not null,
      agent text not null,
      status text not null check (status in ('pending', 'running', 'completed', 'failed', 'retried', 'skipped')),
      sequence integer not null,
      started_at text,
      completed_at text,
      updated_at text not null,
      foreign key (run_id) references runs(id) on delete cascade
    );

    create index if not exists idx_workflow_steps_run_sequence
      on workflow_steps (run_id, sequence);

    create table if not exists trace_events (
      id text primary key,
      run_id text not null,
      step_id text not null,
      sequence integer not null,
      ts text not null,
      agent text not null,
      message text not null,
      tone text not null check (tone in ('info', 'success', 'warn', 'error')),
      type text not null check (type in ('prompt', 'tool_call', 'tool_result', 'retry', 'review', 'artifact', 'status')),
      latency_ms integer,
      cost real,
      tool_call_id text,
      memory_ids_json text,
      created_at text not null,
      foreign key (run_id) references runs(id) on delete cascade
    );

    create index if not exists idx_trace_events_run_sequence
      on trace_events (run_id, sequence);

    create table if not exists artifacts (
      run_id text primary key,
      title text not null,
      filename text not null,
      size_label text not null,
      status text not null check (status in ('draft', 'approved')),
      approved_by text not null,
      markdown text not null,
      created_at text not null,
      updated_at text not null,
      foreign key (run_id) references runs(id) on delete cascade
    );

    create table if not exists agents (
      id text primary key,
      name text not null,
      role text not null,
      model text not null,
      payload_json text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists tools (
      id text primary key,
      name text not null,
      payload_json text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists settings (
      key text primary key,
      value_json text not null,
      updated_at text not null
    );

    create table if not exists llm_logs (
      id text primary key,
      execution_id text,
      provider text not null,
      model text not null,
      prompt text not null,
      response text not null,
      latency_ms integer not null,
      input_tokens integer,
      output_tokens integer,
      total_tokens integer,
      status text not null check (status in ('success', 'error')),
      error_message text,
      created_at text not null
    );

    create index if not exists idx_llm_logs_execution_created
      on llm_logs (execution_id, created_at);

    create table if not exists tool_executions (
      id text primary key,
      run_id text,
      trace_event_id text,
      tool_id text not null,
      input_summary text not null,
      output_summary text not null,
      status text not null check (status in ('success', 'error')),
      duration_ms integer not null,
      error text,
      created_at text not null
    );

    create index if not exists idx_tool_executions_run_created
      on tool_executions (run_id, created_at);

    create table if not exists orchestration_contexts (
      run_id text primary key,
      payload_json text not null,
      updated_at text not null,
      foreign key (run_id) references runs(id) on delete cascade
    );

    create table if not exists agent_handoffs (
      id text primary key,
      run_id text not null,
      sequence integer not null,
      from_agent text not null,
      to_agent text not null,
      step_id text not null,
      message text not null,
      confidence real not null,
      latency_ms integer not null,
      created_at text not null,
      foreign key (run_id) references runs(id) on delete cascade
    );

    create index if not exists idx_agent_handoffs_run_sequence
      on agent_handoffs (run_id, sequence);

    create table if not exists memories (
      id text primary key,
      scope text not null check (scope in ('run', 'workflow', 'global')),
      run_id text,
      scenario_id text,
      agent_id text,
      content text not null,
      tags_json text not null,
      importance integer not null,
      source text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_memories_scope_created
      on memories (scope, created_at);

    create index if not exists idx_memories_run
      on memories (run_id);

    create index if not exists idx_memories_scenario
      on memories (scenario_id);

    create table if not exists approval_requests (
      id text primary key,
      run_id text not null,
      scenario_id text not null,
      agent_id text,
      step_id text not null,
      status text not null check (status in ('pending', 'approved', 'rejected', 'expired', 'skipped')),
      reason text not null,
      risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
      requested_action text not null,
      artifact_preview text not null,
      reviewer_note text,
      created_at text not null,
      decided_at text,
      foreign key (run_id) references runs(id) on delete cascade
    );

    create index if not exists idx_approval_requests_run_created
      on approval_requests (run_id, created_at);

    create index if not exists idx_approval_requests_status_created
      on approval_requests (status, created_at);

    create table if not exists page_visits (
      id text primary key,
      path text not null,
      referrer text,
      user_agent text,
      visitor_hash text not null,
      device_type text not null default 'unknown' check (device_type in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
      country text,
      region text,
      city text,
      timezone text,
      is_bot integer not null default 0,
      created_at text not null
    );

    create index if not exists idx_page_visits_created
      on page_visits (created_at);

    create index if not exists idx_page_visits_path_created
      on page_visits (path, created_at);

    create index if not exists idx_page_visits_visitor_created
      on page_visits (visitor_hash, created_at);
  `);

  addColumnIfMissing("trace_events", "memory_ids_json", "text");

  migrated = true;
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  const rows = sqlite.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) return;
  sqlite.exec(`alter table ${table} add column ${column} ${definition}`);
}

function migrateRunsTableIfNeeded() {
  const table = sqlite
    .prepare("select sql from sqlite_master where type = 'table' and name = 'runs'")
    .get() as { sql?: string } | undefined;

  if (!table?.sql) return;
  if (
    table.sql.includes("'queued'") &&
    table.sql.includes("started_at") &&
    table.sql.includes("'waiting_for_approval'") &&
    table.sql.includes("'rejected'")
  ) {
    return;
  }

  sqlite.exec(`
    pragma foreign_keys = off;

    create table if not exists runs_next (
      id text primary key,
      scenario_id text not null,
      workflow text not null,
      status text not null check (status in ('queued', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled', 'rejected')),
      duration text not null,
      tokens integer not null,
      cost real not null,
      started text not null,
      current_step_id text,
      cost_summary_json text not null,
      final_artifact_json text not null,
      started_at text,
      completed_at text,
      cancelled_at text,
      created_at text not null,
      updated_at text not null
    );

    insert into runs_next (
      id,
      scenario_id,
      workflow,
      status,
      duration,
      tokens,
      cost,
      started,
      current_step_id,
      cost_summary_json,
      final_artifact_json,
      started_at,
      completed_at,
      cancelled_at,
      created_at,
      updated_at
    )
    select
      id,
      scenario_id,
      workflow,
      case
        when status = 'success' then 'completed'
        when status = 'error' then 'failed'
        when status in ('queued', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled', 'rejected') then status
        else 'completed'
      end,
      duration,
      tokens,
      cost,
      started,
      current_step_id,
      cost_summary_json,
      final_artifact_json,
      null,
      case when status in ('success', 'completed') then updated_at else null end,
      null,
      created_at,
      updated_at
    from runs;

    drop table runs;
    alter table runs_next rename to runs;

    pragma foreign_keys = on;
  `);
}
