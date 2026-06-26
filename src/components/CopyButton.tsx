import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  className,
  label = "Copy",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* noop */
        }
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-white/5 px-2 text-[11px] font-medium transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:bg-white/10 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3 text-[var(--emerald)]" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}
