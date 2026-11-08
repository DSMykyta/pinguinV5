/**
 * PINGUIN NEXT — PULL STATE
 * ПРИЗНАЧЕННЯ: Чиста математика межі та порога навігації.
 * ЗАЛЕЖНОСТІ: Немає.
 * ПУБЛІЧНИЙ API: isAtBoundary, normalizeWheelDelta, getPullProgress.
 * ПРИНЦИП: Без DOM, таймерів, глобального стану чи знання секцій.
 */

export function isAtBoundary({ scrollTop, scrollHeight, clientHeight }, direction) {
  const maximum = Math.max(0, scrollHeight - clientHeight);
  const position = Math.min(maximum, Math.max(0, scrollTop));
  return direction === 'previous' ? position <= 1 : maximum - position <= 1;
}

export function normalizeWheelDelta(event, pageHeight, lineHeight = 20) {
  // Read deltaMode first: some engines choose delta units when it is accessed.
  const mode = event.deltaMode;
  const value = event.deltaY * (mode === 1 ? lineHeight : mode === 2 ? pageHeight : 1);
  return Number.isFinite(value) ? Math.max(-60, Math.min(60, value)) : 0;
}

export function getPullProgress(distance, threshold = 88) {
  return Math.max(0, Math.min(1, distance / threshold));
}
