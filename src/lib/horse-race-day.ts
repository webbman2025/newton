import type { UpcomingRace } from "@/lib/upcoming-races";

export type HorseHistoryRow = {
  date: string;
  raceId?: string;
  result: string;
  note: string;
};

export type HorseRacePrediction = {
  raceId: string;
  stableKey: string;
  venueCode: "ST" | "HV";
  raceNo: number;
  postTime?: string;
  picks: {
    horseNumber: number;
    horseName: string;
    speedIndex?: number;
    modelProbability?: number;
    impliedProbability?: number;
    edgeScore?: number;
    marketOdds?: string;
    marketSignal?: "value" | "neutral" | "overbet";
    topFactors?: Array<{
      label: string;
      impactScore: number;
    }>;
  }[];
  confidenceBand: "Low" | "Medium" | "High";
  generatedAt: string;
  predictionMargin?: number;
  dataFreshnessSource?: "database" | "fallback";
};

export type HorseSeenRace = {
  stableKey: string;
  legacyRaceId: string;
  venueCode: "ST" | "HV";
  raceNo: number;
  postTime: string;
  venueName: string;
  venueNameZh?: string;
  raceName: string;
  raceNameZh?: string;
  distance: number;
  raceClass: string;
  raceClassZh?: string;
};

export type HorseDayRaceSlot = {
  stableKey: string;
  date: string;
  venueCode: "ST" | "HV";
  raceNo: number;
  postTime?: string;
  legacyRaceId: string;
  upcoming?: UpcomingRace;
  resultRow?: HorseHistoryRow;
  prediction?: HorseRacePrediction;
  status: "upcoming" | "finished" | "awaiting-result";
};

export function buildStableRaceKey(date: string, venueCode: string, raceNo: number): string {
  return `${date}-${venueCode}-R${raceNo}`;
}

export function buildLegacyRaceId(venueCode: string, raceNo: number, postTime: string): string {
  return `${venueCode}-${raceNo}-${postTime}`;
}

export function parseHistoryRaceId(raceId?: string): {
  date: string;
  venueCode: "ST" | "HV";
  raceNo: number;
} | null {
  if (!raceId) {
    return null;
  }
  const match = raceId.match(/^(\d{4}-\d{2}-\d{2})-(ST|HV)-R(\d+)$/i);
  if (!match?.[1] || !match[2] || !match[3]) {
    const short = raceId.match(/^(ST|HV)-R(\d+)$/i);
    if (!short?.[1] || !short[2]) {
      return null;
    }
    return {
      date: "",
      venueCode: short[1].toUpperCase() as "ST" | "HV",
      raceNo: Number.parseInt(short[2], 10),
    };
  }
  return {
    date: match[1],
    venueCode: match[2].toUpperCase() as "ST" | "HV",
    raceNo: Number.parseInt(match[3], 10),
  };
}

export function parseLegacyPredictionRaceId(raceId: string): {
  venueCode: "ST" | "HV";
  raceNo: number;
  postTime: string;
} | null {
  const match = raceId.match(/^(ST|HV)-(\d+)-(.+)$/i);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }
  const raceNo = Number.parseInt(match[2], 10);
  if (!Number.isFinite(raceNo)) {
    return null;
  }
  return {
    venueCode: match[1].toUpperCase() as "ST" | "HV",
    raceNo,
    postTime: match[3],
  };
}

export function horsePredictionsStorageKey(targetDate: string): string {
  return `mba-horse-predictions-${targetDate}`;
}

export function horseSeenRacesStorageKey(targetDate: string): string {
  return `mba-horse-seen-races-${targetDate}`;
}

export function postTimeToDateKey(postTime: string): string {
  return postTime.slice(0, 10);
}

export function loadStoredHorseSeenRaces(targetDate: string): Record<string, HorseSeenRace> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(horseSeenRacesStorageKey(targetDate));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, HorseSeenRace>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStoredHorseSeenRaces(
  targetDate: string,
  seenRaces: Record<string, HorseSeenRace>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(horseSeenRacesStorageKey(targetDate), JSON.stringify(seenRaces));
  } catch {
    /* quota / private mode */
  }
}

export function mergeHorseSeenRacesFromUpcoming(
  existing: Record<string, HorseSeenRace>,
  targetDate: string,
  upcomingRaces: UpcomingRace[],
): Record<string, HorseSeenRace> {
  const merged = { ...existing };
  for (const race of upcomingRaces) {
    if (postTimeToDateKey(race.postTime) !== targetDate) {
      continue;
    }
    const stableKey = buildStableRaceKey(targetDate, race.venueCode, race.raceNo);
    merged[stableKey] = {
      stableKey,
      legacyRaceId: buildLegacyRaceId(race.venueCode, race.raceNo, race.postTime),
      venueCode: race.venueCode,
      raceNo: race.raceNo,
      postTime: race.postTime,
      venueName: race.venueName,
      venueNameZh: race.venueNameZh,
      raceName: race.raceName,
      raceNameZh: race.raceNameZh,
      distance: race.distance,
      raceClass: race.raceClass,
      raceClassZh: race.raceClassZh,
    };
  }
  return merged;
}

export function loadStoredHorsePredictions(
  targetDate: string,
): Record<string, HorseRacePrediction> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(horsePredictionsStorageKey(targetDate));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, HorseRacePrediction>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStoredHorsePredictions(
  targetDate: string,
  predictions: Record<string, HorseRacePrediction>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      horsePredictionsStorageKey(targetDate),
      JSON.stringify(predictions),
    );
  } catch {
    /* quota / private mode */
  }
}

export function normalizeHorsePredictions(
  predictions: Record<string, HorseRacePrediction>,
  targetDate: string,
): Record<string, HorseRacePrediction> {
  const normalized: Record<string, HorseRacePrediction> = {};
  for (const [raceId, prediction] of Object.entries(predictions)) {
    const parsed = parseLegacyPredictionRaceId(prediction.raceId || raceId);
    if (!parsed) {
      continue;
    }
    const stableKey =
      prediction.stableKey ??
      buildStableRaceKey(targetDate, parsed.venueCode, parsed.raceNo);
    normalized[raceId] = {
      ...prediction,
      raceId: prediction.raceId || raceId,
      stableKey,
      venueCode: prediction.venueCode ?? parsed.venueCode,
      raceNo: prediction.raceNo ?? parsed.raceNo,
      postTime: prediction.postTime ?? parsed.postTime,
    };
  }
  return normalized;
}

export function buildHorseDayRaceSlots({
  targetDate,
  upcomingRaces,
  historyRows,
  predictions,
  seenRaces = {},
}: {
  targetDate: string;
  upcomingRaces: UpcomingRace[];
  historyRows: HorseHistoryRow[];
  predictions: Record<string, HorseRacePrediction>;
  seenRaces?: Record<string, HorseSeenRace>;
}): HorseDayRaceSlot[] {
  const slotMap = new Map<string, HorseDayRaceSlot>();

  for (const race of upcomingRaces) {
    const stableKey = buildStableRaceKey(targetDate, race.venueCode, race.raceNo);
    const legacyRaceId = buildLegacyRaceId(race.venueCode, race.raceNo, race.postTime);
    slotMap.set(stableKey, {
      stableKey,
      date: targetDate,
      venueCode: race.venueCode,
      raceNo: race.raceNo,
      postTime: race.postTime,
      legacyRaceId,
      upcoming: race,
      status: "upcoming",
    });
  }

  for (const row of historyRows) {
    const parsed = parseHistoryRaceId(row.raceId);
    if (!parsed) {
      continue;
    }
    const date = parsed.date || row.date;
    if (date !== targetDate) {
      continue;
    }
    const stableKey = buildStableRaceKey(date, parsed.venueCode, parsed.raceNo);
    const existing = slotMap.get(stableKey);
    slotMap.set(stableKey, {
      stableKey,
      date,
      venueCode: parsed.venueCode,
      raceNo: parsed.raceNo,
      postTime: existing?.postTime,
      legacyRaceId: existing?.legacyRaceId ?? `${parsed.venueCode}-${parsed.raceNo}`,
      upcoming: existing?.upcoming,
      resultRow: row,
      prediction: existing?.prediction,
      status: "finished",
    });
  }

  for (const prediction of Object.values(predictions)) {
    const parsed = parseLegacyPredictionRaceId(prediction.raceId);
    if (!parsed) {
      continue;
    }
    const stableKey =
      prediction.stableKey ?? buildStableRaceKey(targetDate, parsed.venueCode, parsed.raceNo);
    const existing = slotMap.get(stableKey);
    const legacyRaceId = prediction.raceId;
    if (existing) {
      slotMap.set(stableKey, { ...existing, prediction });
      continue;
    }
    slotMap.set(stableKey, {
      stableKey,
      date: targetDate,
      venueCode: parsed.venueCode,
      raceNo: parsed.raceNo,
      postTime: prediction.postTime ?? parsed.postTime,
      legacyRaceId,
      prediction,
      status: "awaiting-result",
    });
  }

  for (const seen of Object.values(seenRaces)) {
    const existing = slotMap.get(seen.stableKey);
    if (existing) {
      continue;
    }
    slotMap.set(seen.stableKey, {
      stableKey: seen.stableKey,
      date: targetDate,
      venueCode: seen.venueCode,
      raceNo: seen.raceNo,
      postTime: seen.postTime,
      legacyRaceId: seen.legacyRaceId,
      status: "awaiting-result",
    });
  }

  return [...slotMap.values()].sort((a, b) => a.raceNo - b.raceNo);
}

export function findPredictionForSlot(
  slot: HorseDayRaceSlot,
  predictions: Record<string, HorseRacePrediction>,
): HorseRacePrediction | undefined {
  if (slot.prediction) {
    return slot.prediction;
  }
  const direct = predictions[slot.legacyRaceId];
  if (direct) {
    return direct;
  }
  return Object.values(predictions).find(
    (item) =>
      item.stableKey === slot.stableKey ||
      (item.venueCode === slot.venueCode && item.raceNo === slot.raceNo),
  );
}
