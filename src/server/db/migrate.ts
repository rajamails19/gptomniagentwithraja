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
      status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
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
  `);

  migrated = true;
}

function migrateRunsTableIfNeeded() {
  const table = sqlite
    .prepare("select sql from sqlite_master where type = 'table' and name = 'runs'")
    .get() as { sql?: string } | undefined;

  if (!table?.sql) return;
  if (table.sql.includes("'queued'") && table.sql.includes("started_at")) return;

  sqlite.exec(`
    pragma foreign_keys = off;

    create table if not exists runs_next (
      id text primary key,
      scenario_id text not null,
      workflow text not null,
      status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
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
        when status in ('queued', 'running', 'completed', 'failed', 'cancelled') then status
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
