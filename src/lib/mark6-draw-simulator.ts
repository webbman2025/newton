export const MARK6_BALL_SECTIONS = [
  { min: 1, max: 10 },
  { min: 11, max: 20 },
  { min: 21, max: 30 },
  { min: 31, max: 49 },
] as const;

export const MARK6_DRAW_SIMULATOR_BATCH_DELAY_MS = 1_000;
export const MARK6_DRAW_SIMULATOR_MIX_MS = 5_000;
export const MARK6_SIMULATOR_POOL_SIZE = 18;
export const MARK6_SIMULATOR_MAX_BANKERS = 3;

export type Mark6DrawSimulatorPayload = {
  mainNumbers: number[];
  bonusNumber: number;
  bankers?: number[];
  /** Draw sequence on the machine (defaults to sorted mains). */
  revealOrder?: number[];
};

export type Mark6DrawSimulatorFetchResult = {
  payload: Mark6DrawSimulatorPayload;
  source: "predictive" | "random";
};

export type Mark6DrawSimulatorLabels = {
  sectionRolling: string;
  mixing: string;
  drawingMain: string;
  drawingBonus: string;
  complete: string;
};

type RankedNumber = {
  number: number;
  score: number;
};

export function getMark6BallColor(number: number): number {
  if (number <= 10) {
    return 0xc62828;
  }
  if (number <= 20) {
    return 0x1565c0;
  }
  if (number <= 30) {
    return 0x2e7d32;
  }
  return 0xf9a825;
}

export function formatMark6SectionRange(min: number, max: number): string {
  return `${min}–${max}`;
}

function shuffleInPlace(values: number[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

function isValidMark6Number(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 49;
}

export function uniqueValidNumbers(values: number[] | undefined, limit = 49) {
  const seen = new Set<number>();
  const next: number[] = [];
  for (const value of values ?? []) {
    if (!isValidMark6Number(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    next.push(value);
    if (next.length >= limit) {
      break;
    }
  }
  return next;
}

export function pickRandomMark6Draw(bankers: number[] = []): Mark6DrawSimulatorPayload {
  const pinned = uniqueValidNumbers(bankers, MARK6_SIMULATOR_MAX_BANKERS);
  const pool = Array.from({ length: 49 }, (_value, index) => index + 1).filter(
    (value) => !pinned.includes(value),
  );
  shuffleInPlace(pool);
  const mainNumbers = [...pinned, ...pool.slice(0, Math.max(0, 6 - pinned.length))]
    .sort((a, b) => a - b)
    .slice(0, 6);
  const remaining = pool.filter((value) => !mainNumbers.includes(value));
  return {
    mainNumbers,
    bonusNumber: remaining[0] ?? 49,
    bankers: pinned,
  };
}

export function deriveSimulatorBankers(
  history: Array<{ mainNumbers: number[] }>,
  current?: { mainNumbers: number[] } | null,
  maxBankers = MARK6_SIMULATOR_MAX_BANKERS,
) {
  const recent = [...(current ? [current] : []), ...history].slice(0, 5);
  const counts = new Map<number, number>();
  for (const entry of recent) {
    for (const number of uniqueValidNumbers(entry.mainNumbers, 6)) {
      counts.set(number, (counts.get(number) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, maxBankers)
    .map(([number]) => number);
}

function pickWeightedNumber(pool: RankedNumber[]) {
  const weights = pool.map((row) => Math.max(0.001, row.score) ** 1.35);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * total;
  for (let index = 0; index < pool.length; index += 1) {
    cursor -= weights[index] ?? 0;
    if (cursor <= 0) {
      return pool[index];
    }
  }
  return pool[pool.length - 1];
}

function pickWeightedWithoutReplacement(pool: RankedNumber[], count: number) {
  const remaining = [...pool];
  const chosen: number[] = [];
  while (chosen.length < count && remaining.length > 0) {
    const picked = pickWeightedNumber(remaining);
    if (!picked) {
      break;
    }
    chosen.push(picked.number);
    const removeAt = remaining.findIndex((row) => row.number === picked.number);
    if (removeAt >= 0) {
      remaining.splice(removeAt, 1);
    }
  }
  return chosen;
}

function softenSizeMix(chosen: number[], remaining: RankedNumber[]) {
  const smallCount = chosen.filter((value) => value <= 24).length;
  if (smallCount > 0 && smallCount < 6) {
    return chosen;
  }

  const wantSmall = smallCount === 0;
  const blocked = new Set(chosen);
  const replacement = remaining.find(
    (row) => !blocked.has(row.number) && (wantSmall ? row.number <= 24 : row.number >= 25),
  );
  if (!replacement) {
    return chosen;
  }

  const dropIndex = chosen.findIndex((value) => (wantSmall ? value >= 25 : value <= 24));
  if (dropIndex < 0) {
    return chosen;
  }

  const next = [...chosen];
  next[dropIndex] = replacement.number;
  return uniqueValidNumbers(next, 6);
}

function pickBonusNumber(mainNumbers: number[], rankedSpecials: number[], leftover: RankedNumber[]) {
  const blocked = new Set(mainNumbers);
  const specialPool = uniqueValidNumbers(rankedSpecials, 12)
    .filter((number) => !blocked.has(number))
    .map((number, index) => ({ number, score: 12 - index }));
  if (specialPool.length > 0) {
    return pickWeightedNumber(specialPool)?.number ?? specialPool[0].number;
  }
  const leftoverPick = leftover.find((row) => !blocked.has(row.number));
  if (leftoverPick) {
    return leftoverPick.number;
  }
  const remaining = Array.from({ length: 49 }, (_value, index) => index + 1).filter(
    (value) => !blocked.has(value),
  );
  return remaining[Math.floor(Math.random() * remaining.length)] ?? 1;
}

export function pickSimulatorDrawFromRankedPool(
  ranked: RankedNumber[],
  options: {
    bankers?: number[];
    specialNumberRanks?: number[];
    fallbackSet?: number[];
  } = {},
): Mark6DrawSimulatorPayload {
  const bankers = uniqueValidNumbers(options.bankers, MARK6_SIMULATOR_MAX_BANKERS);
  const scoreByNumber = new Map(ranked.filter((row) => isValidMark6Number(row.number)).map((row) => [row.number, row.score]));
  const maxRankScore = ranked.reduce((max, row) => Math.max(max, row.score), 0.001);
  for (const number of uniqueValidNumbers(options.fallbackSet, 6)) {
    const existing = scoreByNumber.get(number);
    scoreByNumber.set(number, Math.max(existing ?? 0, maxRankScore * 0.92));
  }
  for (const banker of bankers) {
    const existing = scoreByNumber.get(banker);
    scoreByNumber.set(banker, Math.max(existing ?? 0, maxRankScore * 1.08));
  }

  const poolMap = new Map(
    [...scoreByNumber.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, MARK6_SIMULATOR_POOL_SIZE),
  );
  for (const banker of bankers) {
    poolMap.set(banker, Math.max(poolMap.get(banker) ?? 0, scoreByNumber.get(banker) ?? 1.2));
  }
  const pool = [...poolMap.entries()]
    .map(([number, score]) => ({ number, score }))
    .sort((a, b) => b.score - a.score || a.number - b.number);

  if (pool.length < 6) {
    return pickRandomMark6Draw(bankers);
  }

  const pinned = bankers.filter((number) => pool.some((row) => row.number === number)).slice(0, 6);
  const remainingPool = pool.filter((row) => !pinned.includes(row.number));
  let mainNumbers = [
    ...pinned,
    ...pickWeightedWithoutReplacement(remainingPool, Math.max(0, 6 - pinned.length)),
  ];
  mainNumbers = uniqueValidNumbers(mainNumbers, 6);
  if (mainNumbers.length < 6) {
    const leftover = pool.filter((row) => !mainNumbers.includes(row.number));
    mainNumbers = uniqueValidNumbers(
      [...mainNumbers, ...leftover.map((row) => row.number)],
      6,
    );
  }

  const leftoverAfterPick = pool.filter((row) => !mainNumbers.includes(row.number));
  mainNumbers = uniqueValidNumbers(softenSizeMix(mainNumbers, leftoverAfterPick), 6).sort(
    (a, b) => a - b,
  );

  return {
    mainNumbers,
    bonusNumber: pickBonusNumber(mainNumbers, options.specialNumberRanks ?? [], leftoverAfterPick),
    bankers: pinned,
  };
}

/** Same mains + bonus as the AI Draw Predictor card for this date/persona. */
export function buildMirroredPredictiveDrawPayload(
  primarySet: number[] | undefined,
  specialNumberPick: number | undefined,
  specialNumberRanks: number[],
  bankers: number[] = [],
): Mark6DrawSimulatorPayload | null {
  const mainNumbers = uniqueValidNumbers(primarySet, 6);
  if (mainNumbers.length !== 6) {
    return null;
  }
  const sorted = [...mainNumbers].sort((a, b) => a - b);
  const blocked = new Set(sorted);
  let bonusNumber: number;
  if (isValidMark6Number(specialNumberPick ?? 0) && !blocked.has(specialNumberPick ?? 0)) {
    bonusNumber = specialNumberPick as number;
  } else {
    const leftover = Array.from({ length: 49 }, (_value, index) => index + 1)
      .filter((value) => !blocked.has(value))
      .map((number) => ({ number, score: 1 }));
    bonusNumber = pickBonusNumber(sorted, specialNumberRanks, leftover);
  }
  const pinnedBankers = bankers.filter((number) => sorted.includes(number));
  return {
    mainNumbers: sorted,
    bonusNumber,
    bankers: pinnedBankers,
    revealOrder: shuffleRevealOrder(sorted),
  };
}

export function shuffleRevealOrder(mainNumbers: number[]) {
  const order = [...mainNumbers];
  shuffleInPlace(order);
  return order;
}

export function mark6DrawSignature(payload: Mark6DrawSimulatorPayload): string {
  const mains = uniqueValidNumbers(payload.mainNumbers, 6).sort((a, b) => a - b).join("-");
  return `${mains}|${payload.bonusNumber}`;
}

const SIMULATOR_DRAW_ATTEMPTS = 24;

function applyPlayJitter(ranked: RankedNumber[]): RankedNumber[] {
  return ranked.map((row) => ({
    number: row.number,
    score: Math.max(0.001, row.score * (0.9 + Math.random() * 0.22)),
  }));
}

function applyRecentDrawPenalty(
  ranked: RankedNumber[],
  recentDraws: Mark6DrawSimulatorPayload[],
): RankedNumber[] {
  if (recentDraws.length === 0) {
    return ranked;
  }
  const recentMains = new Set(recentDraws.flatMap((draw) => uniqueValidNumbers(draw.mainNumbers, 6)));
  return ranked.map((row) => ({
    number: row.number,
    score: recentMains.has(row.number) ? row.score * 0.82 : row.score,
  }));
}

function pickUniqueSimulatorDraw(
  ranked: RankedNumber[],
  options: {
    bankers?: number[];
    specialNumberRanks?: number[];
    recentDraws?: Mark6DrawSimulatorPayload[];
  },
): Mark6DrawSimulatorPayload {
  const recentKeys = new Set((options.recentDraws ?? []).map(mark6DrawSignature));
  let lastCandidate = pickSimulatorDrawFromRankedPool(ranked, {
    bankers: options.bankers,
    specialNumberRanks: options.specialNumberRanks,
  });

  for (let attempt = 0; attempt < SIMULATOR_DRAW_ATTEMPTS; attempt += 1) {
    const jittered = applyPlayJitter(applyRecentDrawPenalty(ranked, options.recentDraws ?? []));
    const candidate = pickSimulatorDrawFromRankedPool(jittered, {
      bankers: options.bankers,
      specialNumberRanks: options.specialNumberRanks,
    });
    lastCandidate = candidate;
    if (!recentKeys.has(mark6DrawSignature(candidate))) {
      return candidate;
    }
  }

  return lastCandidate;
}

export async function fetchMark6DrawSimulatorNumbers(
  targetDate: string,
  persona: string,
  locale: string,
  bankers: number[] = [],
  recentDraws: Mark6DrawSimulatorPayload[] = [],
): Promise<Mark6DrawSimulatorFetchResult> {
  const recentKeys = new Set(recentDraws.map(mark6DrawSignature));
  const randomResult = (): Mark6DrawSimulatorFetchResult => {
    let payload = pickRandomMark6Draw(bankers);
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate = pickRandomMark6Draw(bankers);
      payload = candidate;
      if (!recentKeys.has(mark6DrawSignature(candidate))) {
        break;
      }
    }
    return {
      payload: { ...payload, revealOrder: shuffleRevealOrder(payload.mainNumbers) },
      source: "random",
    };
  };

  try {
    const params = new URLSearchParams({
      targetDate,
      persona,
      locale,
    });
    const response = await fetch(`/api/mark6-predictive-draw?${params.toString()}`);
    if (!response.ok) {
      return randomResult();
    }
    const payload = (await response.json()) as {
      error?: string;
      primarySet?: number[];
      specialNumberPick?: number;
      specialNumberRanks?: number[];
      topSignals?: Array<{ number: number; score?: number; displayScore?: number }>;
    };
    if (payload.error) {
      return randomResult();
    }
    const ranked = (payload.topSignals ?? [])
      .filter((row) => isValidMark6Number(row.number))
      .map((row) => ({
        number: row.number,
        score: Math.max(0.001, typeof row.score === "number" ? row.score : 0.001),
      }));
    const specialNumberRanks = uniqueValidNumbers(
      [...(payload.specialNumberRanks ?? []), payload.specialNumberPick ?? 0],
      12,
    );

    if (ranked.length >= 6) {
      const weighted = pickUniqueSimulatorDraw(ranked, {
        bankers,
        specialNumberRanks,
        recentDraws,
      });
      return {
        payload: { ...weighted, revealOrder: shuffleRevealOrder(weighted.mainNumbers) },
        source: "predictive",
      };
    }

    if (payload.primarySet?.length === 6) {
      const fallbackRanked = uniqueValidNumbers(payload.primarySet, 6).map((number, index) => ({
        number,
        score: 6 - index,
      }));
      const weighted = pickUniqueSimulatorDraw(
        ranked.length > 0 ? ranked : fallbackRanked,
        {
          bankers,
          specialNumberRanks,
          recentDraws,
        },
      );
      return {
        payload: { ...weighted, revealOrder: shuffleRevealOrder(weighted.mainNumbers) },
        source: "predictive",
      };
    }

    return randomResult();
  } catch {
    return randomResult();
  }
}
