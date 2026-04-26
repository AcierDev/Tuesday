/** Display for controlled number inputs: unset / invalid reads as empty (no leading 0). */
export function formatBoxNumberForInput(n: number): string {
  if (n === 0 || !Number.isFinite(n)) {
    return "";
  }
  return String(n);
}

/** Parse box dimension/weight input; empty clears to 0. */
export function parseBoxNumericInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}
