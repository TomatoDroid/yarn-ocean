// Keep taps separate from orbit/zoom gestures without owning DOM listeners.
// Once a second pointer joins, every pointer must leave before a new tap starts.
export function createTapGesture() {
  const pointers = new Set();
  let candidate = null;
  const clock = () => globalThis.performance?.now?.() ?? Date.now();
  const primary = event => (event.button ?? 0) === 0 && event.isPrimary !== false;
  const validPoint = event => Number.isFinite(event.clientX) && Number.isFinite(event.clientY);

  function down(event, now = clock()) {
    // Duplicate downs must not restart the timer or erase a drag's history.
    if (pointers.has(event.pointerId)) return;
    pointers.add(event.pointerId);
    if (pointers.size !== 1 || !primary(event) || !validPoint(event) || !Number.isFinite(now)) {
      candidate = null;
      return;
    }
    candidate = {id: event.pointerId, x: event.clientX, y: event.clientY, started: now};
  }

  function move(event) {
    if (!candidate || candidate.id !== event.pointerId) return;
    if (!validPoint(event) || Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 7) {
      candidate = null;
    }
  }

  function up(event, now = clock()) {
    if (!pointers.has(event.pointerId)) return false;
    move(event);
    const tap = candidate;
    pointers.delete(event.pointerId);
    candidate = null;
    return Boolean(tap && tap.id === event.pointerId && pointers.size === 0 && primary(event)
      && Number.isFinite(now) && now >= tap.started && now - tap.started <= 650);
  }

  function cancel(event) {
    pointers.delete(event.pointerId);
    candidate = null;
  }

  function reset() {
    pointers.clear();
    candidate = null;
  }

  return {down, move, up, cancel, reset};
}
