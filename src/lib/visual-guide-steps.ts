export type VisualGuideRoute =
  | "/"
  | "/workflow"
  | "/debugger"
  | "/cost"
  | "/evals"
  | "/guardrails"
  | "/agents"
  | "/tools"
  | "/planner"
  | "/prompts"
  | "/about";

export interface VisualGuideStep {
  id: string;
  title: string;
  body: string;
  route: VisualGuideRoute;
  selector: string;
  fallbackSelector?: string;
  placement: "top" | "right" | "bottom" | "left";
  autoStartDemo?: boolean;
  closeResultsModal?: boolean;
  durationMs?: number;
}

export const VISUAL_GUIDE_STEPS: VisualGuideStep[] = [
  {
    id: "dashboard-run",
    title: "Start with the live workflow.",
    body: "This is the main demo entry point: a real backend run begins and the control room updates live.",
    route: "/",
    selector: '[data-guide="dashboard-run"]',
    placement: "bottom",
  },
  {
    id: "workflow-run",
    title: "The guide now starts the run for you.",
    body: "Watch the product behave like a control room: planner, agents, tools, memory, and review all move together.",
    route: "/workflow",
    selector: '[data-guide="workflow-run"]',
    placement: "bottom",
    autoStartDemo: true,
    durationMs: 2600,
  },
  {
    id: "workflow-canvas",
    title: "Follow the orchestration path.",
    body: "The canvas shows the user request moving through planner, specialist agents, QA, reviewer, and final output.",
    route: "/workflow",
    selector: '[data-guide="workflow-canvas"]',
    placement: "top",
    durationMs: 7200,
  },
  {
    id: "results-checkpoint",
    title: "A checkpoint appears at the right moment.",
    body: "The results overlay explains what happened and why the workflow paused for human approval.",
    route: "/workflow",
    selector: '[data-guide="demo-results-modal"]',
    fallbackSelector: '[data-guide="approval-gates"]',
    placement: "bottom",
    durationMs: 5200,
  },
  {
    id: "approval-gates",
    title: "Enterprise workflows need human gates.",
    body: "Sensitive releases pause here so a reviewer can approve or reject the final artifact before it ships.",
    route: "/workflow",
    selector: '[data-guide="approval-gates"]',
    placement: "top",
    closeResultsModal: true,
    durationMs: 4800,
  },
  {
    id: "debugger",
    title: "Debugger is the technical proof screen.",
    body: "This is where clients see prompts, models, memory, tool calls, retries, latency, cost, and trace evidence.",
    route: "/debugger",
    selector: '[data-guide="debugger-proof"]',
    fallbackSelector: "main h1",
    placement: "top",
    closeResultsModal: true,
  },
  {
    id: "cost",
    title: "Show operating discipline.",
    body: "Cost Analytics translates AI activity into spend, tokens, latency, and budget visibility.",
    route: "/cost",
    selector: '[data-guide="nav-cost"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "evals",
    title: "Show quality gates.",
    body: "Evals prove agent outputs can be tested, scored, compared, and gated before they reach real users.",
    route: "/evals",
    selector: '[data-guide="nav-evals"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "guardrails",
    title: "Show the control layer.",
    body: "Guardrails define what agents are allowed to do: privacy, security, tool permissions, cost limits, and human review.",
    route: "/guardrails",
    selector: '[data-guide="nav-guardrails"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "agents",
    title: "Show the agent workforce.",
    body: "Each agent has a role, tools, model access, memory behavior, reliability, and current status.",
    route: "/agents",
    selector: '[data-guide="nav-agents"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "tools",
    title: "Show safe tool execution.",
    body: "Agents call only registered local or MCP-ready tools through the backend registry.",
    route: "/tools",
    selector: '[data-guide="nav-tools"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "planner",
    title: "Show how work is planned.",
    body: "The planner turns a business goal into ordered tasks, agent assignments, and handoffs.",
    route: "/planner",
    selector: '[data-guide="nav-planner"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "prompts",
    title: "Show prompt governance.",
    body: "Prompt Library makes agent behavior reusable, reviewable, versioned, and easier to control.",
    route: "/prompts",
    selector: '[data-guide="nav-prompts"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
  {
    id: "about",
    title: "Close with the founder story.",
    body: "This makes Raja and NuvRajLabs visible as the builder behind OmniAgents.",
    route: "/about",
    selector: '[data-guide="about-founder"]',
    fallbackSelector: "main h1",
    placement: "right",
  },
];
