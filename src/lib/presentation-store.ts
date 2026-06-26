import { useEffect, useState } from "react";

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
let _open = false;

export function openPresentation() {
  _open = true;
  listeners.forEach((l) => l(true));
}
export function closePresentation() {
  _open = false;
  listeners.forEach((l) => l(false));
}
export function togglePresentation() {
  if (_open) {
    closePresentation();
  } else {
    openPresentation();
  }
}
export function usePresentation() {
  const [open, setOpen] = useState(_open);
  useEffect(() => {
    listeners.add(setOpen);
    return () => {
      listeners.delete(setOpen);
    };
  }, []);
  return { open, openPresentation, closePresentation, togglePresentation };
}
