import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { FileSearch, Loader2 } from "lucide-react";

export type ProductStatus =
  | "running"
  | "completed"
  | "success"
  | "queued"
  | "pending"
  | "waiting"
  | "waiting_for_approval"
  | "idle"
  | "review"
  | "approved"
  | "failed"
  | "error"
  | "retrying"
  | "retried"
  | "cancelled"
  | "rejected"
  | "default";

const statusStyles: Record<
  ProductStatus,
  { label: string; dot: string; badge: string; pulse?: boolean }
> = {
  running: {
    label: "Running",
    dot: "bg-[var(--electric)]",
    badge: "text-[var(--cyan)] bg-[oklch(0.82_0.16_210/0.12)] border-[oklch(0.82_0.16_210/0.3)]",
    pulse: true,
  },
  completed: {
    label: "Completed",
    dot: "bg-[var(--emerald)]",
    badge: "text-[var(--emerald)] bg-[oklch(0.78_0.17_165/0.12)] border-[oklch(0.78_0.17_165/0.3)]",
  },
  success: {
    label: "Completed",
    dot: "bg-[var(--emerald)]",
    badge: "text-[var(--emerald)] bg-[oklch(0.78_0.17_165/0.12)] border-[oklch(0.78_0.17_165/0.3)]",
  },
  queued: {
    label: "Queued",
    dot: "bg-[var(--amber)]",
    badge: "text-[var(--amber)] bg-[oklch(0.82_0.17_75/0.12)] border-[oklch(0.82_0.17_75/0.3)]",
    pulse: true,
  },
  pending: {
    label: "Waiting",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground bg-white/5 border-border",
  },
  waiting: {
    label: "Waiting",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground bg-white/5 border-border",
  },
  waiting_for_approval: {
    label: "Approval",
    dot: "bg-[var(--amber)]",
    badge: "text-[var(--amber)] bg-[oklch(0.82_0.17_75/0.12)] border-[oklch(0.82_0.17_75/0.3)]",
    pulse: true,
  },
  idle: {
    label: "Waiting",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground bg-white/5 border-border",
  },
  review: {
    label: "Review",
    dot: "bg-[var(--violet)]",
    badge: "text-[var(--violet)] bg-[oklch(0.68_0.22_295/0.12)] border-[oklch(0.68_0.22_295/0.3)]",
  },
  approved: {
    label: "Approved",
    dot: "bg-[var(--emerald)]",
    badge: "text-[var(--emerald)] bg-[oklch(0.78_0.17_165/0.12)] border-[oklch(0.78_0.17_165/0.3)]",
  },
  failed: {
    label: "Failed",
    dot: "bg-[var(--destructive)]",
    badge:
      "text-[oklch(0.78_0.2_25)] bg-[oklch(0.65_0.22_25/0.12)] border-[oklch(0.65_0.22_25/0.3)]",
  },
  error: {
    label: "Failed",
    dot: "bg-[var(--destructive)]",
    badge:
      "text-[oklch(0.78_0.2_25)] bg-[oklch(0.65_0.22_25/0.12)] border-[oklch(0.65_0.22_25/0.3)]",
  },
  retrying: {
    label: "Retrying",
    dot: "bg-[var(--amber)]",
    badge: "text-[var(--amber)] bg-[oklch(0.82_0.17_75/0.12)] border-[oklch(0.82_0.17_75/0.3)]",
    pulse: true,
  },
  retried: {
    label: "Retried",
    dot: "bg-[var(--amber)]",
    badge: "text-[var(--amber)] bg-[oklch(0.82_0.17_75/0.12)] border-[oklch(0.82_0.17_75/0.3)]",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-muted-foreground",
    badge: "text-muted-foreground bg-white/5 border-border",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-[var(--destructive)]",
    badge:
      "text-[oklch(0.78_0.2_25)] bg-[oklch(0.65_0.22_25/0.12)] border-[oklch(0.65_0.22_25/0.3)]",
  },
  default: {
    label: "Waiting",
    dot: "bg-muted-foreground",
    badge: "text-foreground bg-white/5 border-border",
  },
};

function getStatus(status: string): (typeof statusStyles)[ProductStatus] {
  return statusStyles[
    (status.toLowerCase() as ProductStatus) in statusStyles
      ? (status.toLowerCase() as ProductStatus)
      : "default"
  ];
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          <span className="text-gradient">{title}</span>
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl glass p-4 transition-[border-color,background,box-shadow,transform] duration-200 hover:border-white/15 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const config = getStatus(status);
  const pulse = config.pulse;
  return (
    <span className="relative inline-flex items-center justify-center" aria-hidden="true">
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-2.5 w-2.5 rounded-full opacity-50 animate-ping",
            config.dot,
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
    </span>
  );
}

export function StatBadge({
  tone,
  status,
  label,
  children,
}: {
  tone?: "default" | "success" | "warn" | "error" | "info";
  status?: string;
  label?: string;
  children: ReactNode;
}) {
  const statusClass = status ? getStatus(status).badge : null;
  const toneClass =
    statusClass ??
    (tone === "success"
      ? "text-[var(--emerald)] bg-[oklch(0.78_0.17_165/0.12)] border-[oklch(0.78_0.17_165/0.3)]"
      : tone === "warn"
        ? "text-[var(--amber)] bg-[oklch(0.82_0.17_75/0.12)] border-[oklch(0.82_0.17_75/0.3)]"
        : tone === "error"
          ? "text-[oklch(0.78_0.2_25)] bg-[oklch(0.65_0.22_25/0.12)] border-[oklch(0.65_0.22_25/0.3)]"
          : tone === "info"
            ? "text-[var(--cyan)] bg-[oklch(0.82_0.16_210/0.12)] border-[oklch(0.82_0.16_210/0.3)]"
            : "text-foreground bg-white/5 border-border");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 transition-colors duration-200",
        toneClass,
      )}
    >
      {status && <StatusDot status={status} />}
      {label ?? children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <StatBadge status={status} label={label ?? getStatus(status).label}>
      {label ?? getStatus(status).label}
    </StatBadge>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-white/[0.025] p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-white/[0.05]">
        <FileSearch className="h-4 w-4 text-[var(--cyan)]" />
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-white/[0.04] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent",
        className,
      )}
    />
  );
}

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--electric)]" />
        {label}
      </div>
      <div className="mt-3 grid gap-2">
        <SkeletonBlock className="h-3 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-3 w-2/3" />
      </div>
    </div>
  );
}
