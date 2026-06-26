import { sqlite } from "./connection";

let migrated = false;

export function runMigrations() {
  if (migrated) return;

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
      status text not null check (status in ('success', 'running', 'error')),
      duration text not null,
      tokens integer not null,
      cost real not null,
      started text not null,
      current_step_id text,
      cost_summary_json text not null,
      final_artifact_json text not null,
      created_at text not null,
      updated_at text not null
    );

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
  `);

  migrated = true;
}
