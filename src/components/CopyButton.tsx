import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({ text, className }: { text: string; className?: string }) {
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
        "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px] font-medium bg-white/5 border border-border/60 hover:bg-white/10 transition",
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3 text-[var(--emerald)]" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
