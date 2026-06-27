import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — OmniAgents" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace, models, safety policies and integrations."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="text-sm font-semibold mb-3">Workspace</div>
          {[
            { k: "Workspace name", v: "NuvRajLabs · OmniAgents Demo" },
            { k: "Default environment", v: "Dev" },
            { k: "Region", v: "us-east-1" },
            { k: "Owner", v: "raja@nuvrajlabs.com" },
          ].map((f) => (
            <div
              key={f.k}
              className="flex items-center justify-between py-2.5 border-t border-border/60 first:border-t-0 text-sm"
            >
              <span className="text-muted-foreground">{f.k}</span>
              <span className="font-medium">{f.v}</span>
            </div>
          ))}
        </Panel>

        <Panel>
          <div className="text-sm font-semibold mb-3">Safety & guardrails</div>
          {[
            { k: "PII redaction", on: true },
            { k: "Prompt-injection guard", on: true },
            { k: "Tool allow-list enforced", on: true },
            { k: "Auto-cost cap ($500/day)", on: false },
          ].map((f) => (
            <div
              key={f.k}
              className="flex items-center justify-between py-2.5 border-t border-border/60 first:border-t-0 text-sm"
            >
              <span>{f.k}</span>
              <Switch defaultChecked={f.on} />
            </div>
          ))}
        </Panel>

        <Panel className="xl:col-span-2">
          <div className="text-sm font-semibold mb-3">Models</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "GPT-4o", provider: "OpenAI", status: "Primary" },
              { name: "Claude 3.5 Sonnet", provider: "Anthropic", status: "Active" },
              { name: "Gemini 1.5 Pro", provider: "Google", status: "Active" },
              { name: "Llama 3.1 70B", provider: "Meta", status: "Fallback" },
            ].map((m) => (
              <div
                key={m.name}
                className="rounded-xl bg-white/[0.03] border border-border/60 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.provider}</div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md border border-border/60 bg-white/5">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
