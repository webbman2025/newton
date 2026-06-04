/** Match IDs used in DB ingestion: optional YYYY-MM-DD- prefix then ST/HV-Rn. */
export const HORSE_RACE_ID_PATTERN = /^([0-9]{4}-[0-9]{2}-[0-9]{2}-)?(ST|HV)-R\d+$/i;

/**
 * Keeps aggregated HKJC finishing-order rows (`1. #12 Name | …`) and rejects stray
 * Mark Six-shaped strings (`1, 4, …` or specials) mistaken for horses.
 */
export function isHorseRaceId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && HORSE_RACE_ID_PATTERN.test(value.trim());
}

export function isHorseRaceResultAggregate(result: unknown): boolean {
  if (typeof result !== "string") {
    return false;
  }
  const trimmed = result.trim();
  if (!trimmed) {
    return false;
  }
  const segment =
    trimmed
      .split(" | ")
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.length > 0) ?? "";
  /** First placings line from STRING_AGG aggregation */
  return /^\d+\.\s*#\d+\b/.test(segment);
}

export function isHorseHistoryEntryShape(row: { raceId?: string; result?: string }): boolean {
  return Boolean(row.result && isHorseRaceId(row.raceId) && isHorseRaceResultAggregate(row.result));
}
