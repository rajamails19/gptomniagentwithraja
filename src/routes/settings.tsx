import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { getSettings, patchSettings, type ApiSettings } from "@/lib/api/client";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — OmniAgents" }] }),
  component: SettingsPage,
});

type SaveState = "idle" | "saving" | "saved";

function guardrailLabel(key: keyof ApiSettings["guardrails"]): string {
  const labels: Record<keyof ApiSettings["guardrails"], string> = {
    piiRedaction: "PII redaction",
    promptInjectionGuard: "Prompt-injection guard",
    toolAllowList: "Tool allow-list",
    autoCostCap: "Auto-cost cap",
  };
  return labels[key];
}

function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() =>
        setSettings({
          workspaceName: "OmniAgents Demo",
          defaultEnvironment: "development",
          region: "local",
          storageMode: "sqlite",
          apiVersion: "v1",
          guardrails: {
            piiRedaction: true,
            promptInjectionGuard: true,
            toolAllowList: true,
            autoCostCap: false,
          },
        }),
      );
  }, []);

  const persist = (patch: Partial<ApiSettings>) => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    patchSettings(patch)
      .then((updated) => {
        setSettings(updated);
        setSaveState("saved");
        saveTimer.current = setTimeout(() => setSaveState("idle"), 2000);
      })
      .catch(() => {
        toast.error("Failed to save settings");
        setSaveState("idle");
      });
  };

  const toggleGuardrail = (key: keyof ApiSettings["guardrails"], value: boolean) => {
    if (!settings) return;
    const next = { ...settings, guardrails: { ...settings.guardrails, [key]: value } };
    setSettings(next);
    persist({ guardrails: next.guardrails });
    toast.success(`${guardrailLabel(key)} ${value ? "enabled" : "disabled"}`, { duration: 2000 });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace, models, safety policies and integrations."
        actions={
          <div className="flex items-center gap-2 text-xs min-h-[36px]">
            {saveState === "saving" && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1.5 text-[var(--emerald)] animate-fade-in">
                <Check className="h-3 w-3" /> Saved to database
              </span>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Workspace — read-only display */}
        <Panel>
          <div className="text-sm font-semibold mb-3">Workspace</div>
          {(
            [
              { k: "Workspace name", v: settings.workspaceName },
              { k: "Default environment", v: settings.defaultEnvironment },
              { k: "Region", v: settings.region },
              { k: "Storage", v: settings.storageMode },
              { k: "API version", v: settings.apiVersion },
              { k: "Owner", v: "raja@nuvrajlabs.com" },
            ] as const
          ).map((f) => (
            <div
              key={f.k}
              className="flex items-center justify-between py-2.5 border-t border-border/60 first:border-t-0 text-sm"
            >
              <span className="text-muted-foreground">{f.k}</span>
              <span className="font-medium font-mono text-xs">{f.v}</span>
            </div>
          ))}
        </Panel>

        {/* Guardrails — live toggles, persisted to SQLite */}
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Safety &amp; guardrails</div>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded border border-border/60 font-mono">
              persisted · SQLite
            </span>
          </div>
          {(
            [
              { key: "piiRedaction", label: "PII redaction" },
              { key: "promptInjectionGuard", label: "Prompt-injection guard" },
              { key: "toolAllowList", label: "Tool allow-list enforced" },
              { key: "autoCostCap", label: "Auto-cost cap ($500/day)" },
            ] as const
          ).map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2.5 border-t border-border/60 first:border-t-0 text-sm"
            >
              <div className="flex items-center gap-2">
                <span>{label}</span>
                <span
                  className={`text-[10px] font-semibold tabular-nums ${
                    settings.guardrails[key] ? "text-[var(--emerald)]" : "text-muted-foreground/40"
                  }`}
                >
                  {settings.guardrails[key] ? "ON" : "OFF"}
                </span>
              </div>
              <Switch
                checked={settings.guardrails[key]}
                onCheckedChange={(v) => toggleGuardrail(key, v)}
                disabled={saveState === "saving"}
              />
            </div>
          ))}
        </Panel>

        {/* Models — display */}
        <Panel className="xl:col-span-2">
          <div className="text-sm font-semibold mb-3">Models</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "GPT-4o", provider: "OpenAI", status: "Primary", active: true },
              { name: "Claude 3.5 Sonnet", provider: "Anthropic", status: "Active", active: true },
              { name: "Gemini 1.5 Pro", provider: "Google", status: "Active", active: true },
              { name: "Llama 3.1 70B", provider: "Meta", status: "Fallback", active: false },
            ].map((m) => (
              <div
                key={m.name}
                className="rounded-xl bg-white/[0.03] border border-border/60 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${m.active ? "bg-[var(--emerald)]" : "bg-muted-foreground/30"}`}
                  />
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.provider}</div>
                  </div>
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
