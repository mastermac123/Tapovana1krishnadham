/**
 * Handoff between the loader and the hero.
 *
 * The prototype drives the hero from the loader's own completion callback and
 * from an independent 5.3s timer, so a stalled timeline can never strand the
 * page behind the overlay. The same contract lives here: whoever finishes
 * first calls introDone(), and every waiter runs exactly once.
 */

type Waiter = () => void;

let done = false;
const waiters: Waiter[] = [];

export function introDone() {
  if (done) return;
  done = true;
  const pending = waiters.splice(0, waiters.length);
  for (const fn of pending) fn();
}

export function isIntroDone() {
  return done;
}

/** Run `fn` when the loader lifts, or immediately if it already has. */
export function onIntro(fn: Waiter): () => void {
  if (done) {
    fn();
    return () => {};
  }
  waiters.push(fn);
  return () => {
    const i = waiters.indexOf(fn);
    if (i >= 0) waiters.splice(i, 1);
  };
}
