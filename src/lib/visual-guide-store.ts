import { useEffect, useState } from "react";

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
let _open = false;

export function openVisualGuide() {
  _open = true;
  listeners.forEach((listener) => listener(true));
}

export function closeVisualGuide() {
  _open = false;
  listeners.forEach((listener) => listener(false));
}

export function toggleVisualGuide() {
  if (_open) {
    closeVisualGuide();
  } else {
    openVisualGuide();
  }
}

export function useVisualGuide() {
  const [open, setOpen] = useState(_open);

  useEffect(() => {
    listeners.add(setOpen);
    return () => {
      listeners.delete(setOpen);
    };
  }, []);

  return { open, openVisualGuide, closeVisualGuide, toggleVisualGuide };
}
