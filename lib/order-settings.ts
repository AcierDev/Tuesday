export function removeDeprecatedDueBadgeDays(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const supportedSettings = { ...settings };
  delete supportedSettings.dueBadgeDays;
  return supportedSettings;
}
