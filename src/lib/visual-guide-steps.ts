export type VisualGuideRoute =
  | "/"
  | "/workflow"
  | "/debugger"
  | "/cost"
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
  placement: "top" | "right" | "bottom" | "left";
  autoStartDemo?: boolean;
}

export const VISUAL_GUIDE_STEPS: VisualGuideStep[] = [
  {
    id: "dashboard-run",
    title: "Click here to start the product story.",
    body: "This starts a governed AI workflow, not just a chat response.",
    route: "/",
    selector: '[data-guide="dashboard-run"]',
    placement: "bottom",
  },
  {
    id: "workflow-run",
    title: "Now run the workflow canvas.",
    body: "The guide triggers the demo so viewers can watch planning, handoffs, checks, and approval.",
    route: "/workflow",
    selector: '[data-guide="workflow-run"]',
    placement: "bottom",
    autoStartDemo: true,
  },
  {
    id: "workflow-canvas",
    title: "Watch the agents move step by step.",
    body: "User request, planner, research, code, docs, QA, reviewer, and final artifact stay visible.",
    route: "/workflow",
    selector: '[data-guide="workflow-canvas"]',
    placement: "top",
  },
  {
    id: "debugger",
    title: "Next, inspect the proof trail.",
    body: "Debugger shows prompts, models, memory, tool calls, retries, latency, cost, and output evidence.",
    route: "/debugger",
    selector: '[data-guide="nav-debugger"]',
    placement: "right",
  },
  {
    id: "cost",
    title: "Show cost control.",
    body: "This is where investors see tokens, spend, workflow cost, and operating discipline.",
    route: "/cost",
    selector: '[data-guide="nav-cost"]',
    placement: "right",
  },
  {
    id: "agents",
    title: "Show the agent workforce.",
    body: "Each agent has a role, tools, model access, memory, reliability, and current status.",
    route: "/agents",
    selector: '[data-guide="nav-agents"]',
    placement: "right",
  },
  {
    id: "tools",
    title: "Show approved tools.",
    body: "This is the safety layer: agents can call only registered local or MCP-ready tools.",
    route: "/tools",
    selector: '[data-guide="nav-tools"]',
    placement: "right",
  },
  {
    id: "planner",
    title: "Show the planner.",
    body: "The planner turns a business goal into ordered tasks and agent handoffs.",
    route: "/planner",
    selector: '[data-guide="nav-planner"]',
    placement: "right",
  },
  {
    id: "prompts",
    title: "Show prompt governance.",
    body: "Prompt Library makes AI behavior reusable, reviewable, and versioned.",
    route: "/prompts",
    selector: '[data-guide="nav-prompts"]',
    placement: "right",
  },
  {
    id: "about",
    title: "Close with the founder story.",
    body: "This makes Raja and NuvRajLabs visible as the builder behind the product.",
    route: "/about",
    selector: '[data-guide="about-founder"]',
    placement: "right",
  },
];
