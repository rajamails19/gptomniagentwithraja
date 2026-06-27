import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles, Wand2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { planSteps } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-context";
import { toast } from "sonner";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — OmniAgents" },
      {
        name: "description",
        content:
          "Decompose any goal into an executable multi-agent plan with dependencies, cost and ETA.",
      },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const [goal, setGoal] = useState("Create API documentation for the payments service.");
  const [generated, setGenerated] = useState(true);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(planSteps.length);
  const demo = useDemo();
  const navigate = useNavigate();

  const generate = () => {
    setLoading(true);
    setGenerated(false);
    setRevealed(0);
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
      planSteps.forEach((_, i) =>
        setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 140 * (i + 1)),
      );
    }, 1100);
  };

  const sendToWorkflow = () => {
    demo.reset();
    setTimeout(() => demo.start(), 80);
    toast.success("Plan sent to Workflow", { description: "Execution started — opening canvas" });
    navigate({ to: "/workflow" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planner"
        description="Turn a user goal into a typed, dependency-aware plan executed by specialized agents."
      />

      <Panel>
        <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          User goal
        </label>
        <div className="mt-2 flex flex-col md:flex-row gap-3">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="flex-1 rounded-xl bg-white/5 border border-border/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40"
            placeholder="Describe what you want the agents to accomplish…"
          />
          <Button
            onClick={generate}
            disabled={loading}
            className="md:self-end h-11 px-5 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0 hover:opacity-95"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {loading ? "Planning…" : "Generate Plan"}
          </Button>
        </div>
      </Panel>

      {/* Visual flow */}
      <Panel>
        <div className="text-sm font-semibold mb-3">Decomposition flow</div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px] flex items-center justify-between gap-2 text-xs">
            {["Goal", "Planner", "Tasks", "Agents", "Final Output"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex-1 rounded-xl glass px-4 py-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Stage {i + 1}
                  </div>
                  <div className="font-medium">{s}</div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {loading && (
        <Panel className="text-center py-16">
          <div className="inline-flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[var(--electric)] animate-pulse" />
            <div className="flex gap-1">
              <span
                className="h-2 w-2 rounded-full bg-[var(--electric)] animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-[var(--violet)] animate-bounce"
                style={{ animationDelay: "120ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-[var(--cyan)] animate-bounce"
                style={{ animationDelay: "240ms" }}
              />
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Planner Agent is decomposing the goal…
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground/70 font-mono">
            Reading context · building dependency graph · estimating cost
          </div>
        </Panel>
      )}

      {generated && !loading && (
        <>
          {/* Dependency chain visualization */}
          <Panel>
            <div className="text-sm font-semibold mb-3">Dependency chain</div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px] flex items-center gap-2">
                {planSteps.map((s, i) => {
                  const visible = i < revealed;
                  return (
                    <div key={s.step} className="flex items-center gap-2 flex-1">
                      <div
                        className={`flex-1 rounded-xl p-3 border transition-all duration-500 ${visible ? "glass border-border/60 opacity-100 translate-y-0" : "border-dashed border-border/40 opacity-30 translate-y-1"}`}
                      >
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Step {s.step}
                        </div>
                        <div className="text-xs font-medium leading-tight mt-0.5 line-clamp-2">
                          {s.title}
                        </div>
                        <div className="mt-1.5 text-[10px] text-[var(--cyan)] truncate">
                          {s.agent}
                        </div>
                      </div>
                      {i < planSteps.length - 1 && (
                        <ArrowRight
                          className={`h-3.5 w-3.5 shrink-0 transition ${i + 1 < revealed ? "text-[var(--electric)]" : "text-muted-foreground/40"}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold">Generated plan · 6 steps</div>
                <div className="text-xs text-muted-foreground">
                  Est. total: ~9.0s · ~$0.41 · 5 agents
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatBadge tone="success">Ready to execute</StatBadge>
                <Button
                  onClick={sendToWorkflow}
                  className="h-9 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Send to Workflow
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr className="text-left">
                    <th className="font-normal py-2">#</th>
                    <th className="font-normal">Task</th>
                    <th className="font-normal">Agent</th>
                    <th className="font-normal">Priority</th>
                    <th className="font-normal">Depends on</th>
                    <th className="font-normal text-right">ETA</th>
                    <th className="font-normal text-right">Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {planSteps.slice(0, revealed).map((s) => (
                    <tr
                      key={s.step}
                      className="border-t border-border/60 hover:bg-white/[0.03] animate-fade-in"
                    >
                      <td className="py-2.5 text-muted-foreground font-mono text-xs">
                        {s.step.toString().padStart(2, "0")}
                      </td>
                      <td className="font-medium">{s.title}</td>
                      <td className="text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-border/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--electric)]" />
                          {s.agent}
                        </span>
                      </td>
                      <td>
                        <StatBadge
                          tone={
                            s.priority === "Critical"
                              ? "error"
                              : s.priority === "High"
                                ? "warn"
                                : "info"
                          }
                        >
                          {s.priority}
                        </StatBadge>
                      </td>
                      <td className="text-xs text-muted-foreground font-mono">{s.deps}</td>
                      <td className="text-right tabular-nums text-xs">{s.est}</td>
                      <td className="text-right tabular-nums text-xs">${s.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
