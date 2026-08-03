/**
 * One scroll signal for the whole shell.
 *
 * Lenis takes the wheel off the document, so a plain `window` scroll listener
 * never fires while smooth scroll is running. Lenis's own event is forwarded
 * here; the native listener stays attached as the fallback for the
 * reduced-motion path, where Lenis is never constructed.
 */

type Callback = () => void;

const subscribers = new Set<Callback>();
let nativeBound = false;

export function emitScroll(): void {
  subscribers.forEach((cb) => cb());
}

export function subscribeScroll(cb: Callback): () => void {
  subscribers.add(cb);

  if (!nativeBound && typeof window !== 'undefined') {
    nativeBound = true;
    window.addEventListener('scroll', emitScroll, { passive: true });
  }

  return () => {
    subscribers.delete(cb);
  };
}
