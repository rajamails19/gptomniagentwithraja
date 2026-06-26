import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

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
    <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          <span className="text-gradient">{title}</span>
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl glass p-5", className)}>{children}</div>;
}

export function StatusDot({ status }: { status: string }) {
  const color =
    status === "success"
      ? "bg-[var(--emerald)]"
      : status === "running"
        ? "bg-[var(--electric)]"
        : status === "error"
          ? "bg-[var(--destructive)]"
          : status === "queued"
            ? "bg-[var(--amber)]"
            : "bg-muted-foreground";
  const pulse = status === "running" || status === "queued";
  return (
    <span className="relative inline-flex items-center justify-center">
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-2.5 w-2.5 rounded-full opacity-50 animate-ping",
            color,
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}

export function StatBadge({
  tone,
  children,
}: {
  tone?: "default" | "success" | "warn" | "error" | "info";
  children: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--emerald)] bg-[oklch(0.78_0.17_165/0.12)] border-[oklch(0.78_0.17_165/0.3)]"
      : tone === "warn"
        ? "text-[var(--amber)] bg-[oklch(0.82_0.17_75/0.12)] border-[oklch(0.82_0.17_75/0.3)]"
        : tone === "error"
          ? "text-[oklch(0.78_0.2_25)] bg-[oklch(0.65_0.22_25/0.12)] border-[oklch(0.65_0.22_25/0.3)]"
          : tone === "info"
            ? "text-[var(--cyan)] bg-[oklch(0.82_0.16_210/0.12)] border-[oklch(0.82_0.16_210/0.3)]"
            : "text-foreground bg-white/5 border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}
