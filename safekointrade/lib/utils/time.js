/** Current time in ms. Isolated so render code reads "now" from one place. */
export function nowMs() {
  return Date.now();
}
