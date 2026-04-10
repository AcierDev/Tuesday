/** Display for controlled number inputs: unset / invalid reads as empty (no leading 0). */
export function formatPackageNumberForInput(n: number): string {
  if (n === 0 || !Number.isFinite(n)) {
    return "";
  }
  return String(n);
}

/** Parse package dimension/weight input; empty clears to 0. */
export function parsePackageNumericInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}
