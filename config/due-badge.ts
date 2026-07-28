export const DUE_BADGE_WARNING_DAYS = 3;

export function isWithinDueBadgeWarningWindow(
  daysRemaining: number
): boolean {
  return daysRemaining <= DUE_BADGE_WARNING_DAYS;
}
