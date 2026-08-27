export type CanvasHistory<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createCanvasHistory<T>(present: T): CanvasHistory<T> {
  return { past: [], present, future: [] };
}

export function pushCanvasHistory<T>(history: CanvasHistory<T>, next: T, limit = 100): CanvasHistory<T> {
  if (Object.is(history.present, next)) return history;
  const past = [...history.past, history.present];
  return { past: past.slice(-limit), present: next, future: [] };
}

export function undoCanvasHistory<T>(history: CanvasHistory<T>): CanvasHistory<T> {
  if (!history.past.length) return history;
  const previous = history.past[history.past.length - 1];
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redoCanvasHistory<T>(history: CanvasHistory<T>): CanvasHistory<T> {
  if (!history.future.length) return history;
  const next = history.future[0];
  return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
}
