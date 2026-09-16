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

function uniqueValidNumbers(values: number[] | undefined, limit = 49) {
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
  const replacement = remaining.find((row) => (wantSmall ? row.number <= 24 : row.number >= 25));
  if (!replacement) {
    return chosen;
  }

  const dropIndex = chosen.findIndex((value) => (wantSmall ? value >= 25 : value <= 24));
  if (dropIndex < 0) {
    return chosen;
  }

  const next = [...chosen];
  next[dropIndex] = replacement.number;
  return next;
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
  for (const number of uniqueValidNumbers(options.fallbackSet, 6)) {
    if (!scoreByNumber.has(number)) {
      scoreByNumber.set(number, 1);
    }
  }
  for (const banker of bankers) {
    if (!scoreByNumber.has(banker)) {
      scoreByNumber.set(banker, 1.2);
    }
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

export async function fetchMark6DrawSimulatorNumbers(
  targetDate: string,
  persona: string,
  locale: string,
  bankers: number[] = [],
): Promise<Mark6DrawSimulatorPayload> {
  try {
    const params = new URLSearchParams({
      targetDate,
      persona,
      locale,
    });
    const response = await fetch(`/api/mark6-predictive-draw?${params.toString()}`);
    if (!response.ok) {
      return pickRandomMark6Draw(bankers);
    }
    const payload = (await response.json()) as {
      primarySet?: number[];
      specialNumberPick?: number;
      specialNumberRanks?: number[];
      topSignals?: Array<{ number: number; score?: number; displayScore?: number }>;
    };
    const ranked = (payload.topSignals ?? [])
      .filter((row) => isValidMark6Number(row.number))
      .map((row) => ({
        number: row.number,
        score: Math.max(0.001, row.score ?? row.displayScore ?? 1),
      }));
    const specialNumberRanks = uniqueValidNumbers(
      [...(payload.specialNumberRanks ?? []), payload.specialNumberPick ?? 0],
      12,
    );
    if (ranked.length >= 6) {
      return pickSimulatorDrawFromRankedPool(ranked, {
        bankers,
        specialNumberRanks,
        fallbackSet: payload.primarySet,
      });
    }
    const mainNumbers = uniqueValidNumbers(payload.primarySet, 6);
    if (mainNumbers.length === 6) {
      return pickSimulatorDrawFromRankedPool(
        mainNumbers.map((number, index) => ({ number, score: 6 - index })),
        { bankers, specialNumberRanks, fallbackSet: mainNumbers },
      );
    }
    return pickRandomMark6Draw(bankers);
  } catch {
    return pickRandomMark6Draw(bankers);
  }
}
