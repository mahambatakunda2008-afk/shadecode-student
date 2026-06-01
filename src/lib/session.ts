export function hasCompletedFirstSession() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("shadecode_first_win") === "true";
}

export function markFirstSessionComplete() {
  localStorage.setItem("shadecode_first_win", "true");
}

export function getSessionStart() {
  return localStorage.getItem("shadecode_session_start");
}

export function startSession() {
  localStorage.setItem("shadecode_session_start", Date.now().toString());
}

export function endSession() {
  const start = getSessionStart();
  if (!start) return null;

  const durationMs = Date.now() - parseInt(start);
  localStorage.removeItem("shadecode_session_start");

  return Math.round(durationMs / 1000); // seconds
}
