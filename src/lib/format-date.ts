/**
 * format-date.ts — Centralized deterministic date & time formatting for AutoOps.
 *
 * Prevents SSR / client hydration mismatches by explicitly enforcing:
 * 1. Locale: 'en-US'
 * 2. Timezone: 'Asia/Kolkata' (IST)
 * 3. Consistent 12-hour format: "Sep 14, 08:31 PM"
 *
 * Safe for server components, SSR passes, and client hydration.
 */

export const standardDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/**
 * Formats a date string, timestamp number, or Date instance into a deterministic string.
 *
 * Example output: "Sep 14, 08:31 PM"
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return "—";
  try {
    const d =
      typeof dateInput === "object" && dateInput instanceof Date
        ? dateInput
        : new Date(dateInput);

    if (isNaN(d.getTime())) return "—";
    return standardDateTimeFormatter.format(d);
  } catch {
    return "—";
  }
}
