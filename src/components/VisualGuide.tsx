import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { VISUAL_GUIDE_STEPS, type VisualGuideStep } from "@/lib/visual-guide-steps";
import { closeVisualGuide, useVisualGuide } from "@/lib/visual-guide-store";

const STEP_DURATION_MS = 3600;
const CALLOUT_GAP = 18;

type TargetRect = Pick<DOMRect, "top" | "left" | "right" | "bottom" | "width" | "height">;

export function VisualGuide() {
  const { open } = useVisualGuide();
  const navigate = useNavigate();
  const demo = useDemo();
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const startedDemoRef = useRef(false);

  const step = VISUAL_GUIDE_STEPS[index];
  const isLastStep = index === VISUAL_GUIDE_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    startedDemoRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void navigate({ to: step.route });
  }, [open, navigate, step.route]);

  useEffect(() => {
    if (!open || !step.autoStartDemo || startedDemoRef.current) return;
    startedDemoRef.current = true;

    if (!demo.isRunning && !demo.isComplete) {
      demo.start();
    }
  }, [demo, open, step.autoStartDemo]);

  useEffect(() => {
    if (!open) return;

    const updateTarget = () => {
      const target = document.querySelector<HTMLElement>(step.selector);
      if (!target) {
        setTargetRect(null);
        return;
      }

      target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      window.setTimeout(() => setTargetRect(target.getBoundingClientRect()), 220);
    };

    updateTarget();
    const retryTimer = window.setTimeout(updateTarget, 450);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);

    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [open, step.selector]);

  useEffect(() => {
    if (!open) return;

    const stepTimer = window.setTimeout(() => {
      if (isLastStep) {
        closeVisualGuide();
      } else {
        setIndex((value) => value + 1);
      }
    }, STEP_DURATION_MS);

    return () => window.clearTimeout(stepTimer);
  }, [index, isLastStep, open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeVisualGuide();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const marker = getMarkerPosition(targetRect);
  const callout = getCalloutPosition(targetRect, step);
  const ArrowIcon = getArrowIcon(step.placement);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-live="polite">
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-red-500/90 shadow-[0_0_0_9999px_oklch(0_0_0/0.08),0_0_28px_oklch(0.64_0.25_28/0.55)]"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <div
        className="absolute grid h-9 w-9 place-items-center rounded-full bg-red-500 text-sm font-black text-white shadow-[0_0_0_6px_oklch(0.64_0.25_28/0.18),0_12px_24px_-10px_oklch(0_0_0/0.7)] animate-pulse"
        style={{ top: marker.top, left: marker.left }}
      >
        {index + 1}
      </div>

      <div
        className="absolute text-red-500 drop-shadow-[0_8px_18px_oklch(0_0_0/0.55)] animate-bounce"
        style={{ top: marker.arrowTop, left: marker.arrowLeft }}
      >
        <ArrowIcon className="h-10 w-10 stroke-[3]" />
      </div>

      <div
        className="absolute w-[min(270px,calc(100vw-32px))] rounded-xl border border-red-300/80 bg-white/95 p-3 text-slate-950 shadow-[0_18px_48px_-18px_oklch(0_0_0/0.85)] backdrop-blur"
        style={{ top: callout.top, left: callout.left }}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-500 text-xs font-black text-white">
            {index + 1}
          </div>
          <div>
            <div className="text-sm font-bold leading-snug">{step.title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-700">{step.body}</div>
          </div>
        </div>
      </div>

      <button
        onClick={closeVisualGuide}
        className="pointer-events-auto fixed bottom-4 left-1/2 inline-flex h-9 -translate-x-1/2 items-center gap-2 rounded-full border border-white/30 bg-white/95 px-4 text-xs font-semibold text-slate-950 shadow-[0_12px_36px_-16px_oklch(0_0_0/0.9)] transition hover:bg-white focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label="Exit visual guide"
      >
        <X className="h-3.5 w-3.5" />
        Exit guide
      </button>
    </div>
  );
}

function getMarkerPosition(rect: TargetRect | null) {
  const fallbackTop = 96;
  const fallbackLeft = Math.max(16, window.innerWidth / 2 - 18);
  if (!rect) {
    return {
      top: fallbackTop,
      left: fallbackLeft,
      arrowTop: fallbackTop + 32,
      arrowLeft: fallbackLeft - 2,
    };
  }

  const top = clamp(rect.top - 22, 12, window.innerHeight - 56);
  const left = clamp(rect.left + rect.width - 18, 12, window.innerWidth - 52);

  return {
    top,
    left,
    arrowTop: clamp(top + 30, 12, window.innerHeight - 56),
    arrowLeft: clamp(left - 2, 12, window.innerWidth - 52),
  };
}

function getCalloutPosition(rect: TargetRect | null, step: VisualGuideStep) {
  const width = Math.min(270, window.innerWidth - 32);
  const height = 118;

  if (!rect) {
    return {
      top: 142,
      left: clamp(window.innerWidth / 2 - width / 2, 16, window.innerWidth - width - 16),
    };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  if (step.placement === "right") {
    return {
      top: clamp(centerY - height / 2, 16, window.innerHeight - height - 72),
      left: clamp(rect.right + CALLOUT_GAP, 16, window.innerWidth - width - 16),
    };
  }

  if (step.placement === "left") {
    return {
      top: clamp(centerY - height / 2, 16, window.innerHeight - height - 72),
      left: clamp(rect.left - width - CALLOUT_GAP, 16, window.innerWidth - width - 16),
    };
  }

  if (step.placement === "top") {
    return {
      top: clamp(rect.top - height - CALLOUT_GAP, 16, window.innerHeight - height - 72),
      left: clamp(centerX - width / 2, 16, window.innerWidth - width - 16),
    };
  }

  return {
    top: clamp(rect.bottom + CALLOUT_GAP, 16, window.innerHeight - height - 72),
    left: clamp(centerX - width / 2, 16, window.innerWidth - width - 16),
  };
}

function getArrowIcon(placement: VisualGuideStep["placement"]) {
  if (placement === "right") return ArrowLeft;
  if (placement === "left") return ArrowRight;
  if (placement === "top") return ArrowDown;
  return ArrowUp;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
