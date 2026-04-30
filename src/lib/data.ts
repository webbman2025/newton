import type { ConfidenceBand, Locale, Mode } from "@/lib/translations";
import { dbQuery, ensureSchema, withTransaction } from "@/lib/db";

type Mark6PredictionType = "single" | "multiple" | "banker";

export type SuggestionResponse = {
  status: "ok" | "stale";
  mode: Mode;
  targetDate: string;
  mark6PredictionType?: Mark6PredictionType;
  progress: ["fetching", "analyzing", "generating", "done"];
  suggestions: string[];
  mark6Prediction?: {
    type: Mark6PredictionType;
    single?: number[];
    multiple?: number[][];
    banker?: {
      banker: number;
      selections: number[];
    };
  };
  horseSuggestions?: {
    horseNumber: number;
    horseName: string;
    horseProfile: string;
    jockey: string;
    trainer: string;
    speedIndex?: number;
    modelProbability?: number;
    impliedProbability?: number;
    edgeScore?: number;
    marketOdds?: string;
  }[];
  confidenceBand: ConfidenceBand;
  explanation: string;
  disclaimer: string;
};

type HorseSuggestionItem = {
  horseNumber: number;
  horseName: string;
  horseProfile: string;
  jockey: string;
  trainer: string;
  speedIndex?: number;
  modelProbability?: number;
  impliedProbability?: number;
  edgeScore?: number;
  marketOdds?: string;
};

type SelectedRaceInput = {
  venueCode: "ST" | "HV";
  venueName: string;
  raceNo: number;
  raceName: string;
  postTime: string;
  distance?: number;
  runners: {
    horseNumber: number;
    horseName: string;
    jockey: string;
    trainer: string;
    draw: string;
    winOdds?: string;
  }[];
};

type SuggestionBase = {
  suggestions: string[];
  mark6PredictionType?: Mark6PredictionType;
  mark6Prediction?: SuggestionResponse["mark6Prediction"];
  horseSuggestions?: HorseSuggestionItem[];
  confidenceBand: ConfidenceBand;
  explanation: string;
};

type HistoryEntry = {
  date: string;
  raceId?: string;
  result: string;
  note: string;
};

type Mark6FallbackResult = {
  date: string;
  numbers: number[];
};

type RaceFallbackResult = {
  date: string;
  raceId: string;
  horseNumber: number;
  horseName: string;
  horseProfile: string;
  jockey: string;
  trainer: string;
  position: number;
};

const mark6FallbackRows: Mark6FallbackResult[] = [
  { date: "2026-04-10", numbers: [2, 6, 13, 18, 31, 47] },
  { date: "2026-04-14", numbers: [4, 12, 19, 24, 33, 41] },
  { date: "2026-04-17", numbers: [1, 9, 15, 22, 35, 44] },
  { date: "2026-04-21", numbers: [5, 11, 17, 28, 32, 49] },
  { date: "2026-04-24", numbers: [3, 8, 16, 23, 36, 45] },
];

const raceFallbackRows: RaceFallbackResult[] = [
  {
    date: "2026-04-20",
    raceId: "ST-R3",
    horseNumber: 1,
    horseName: "Golden Harbor",
    horseProfile: "Front-runner with strong gate speed over sprint distances.",
    jockey: "K. Teetan",
    trainer: "A. Cruz",
    position: 1,
  },
  {
    date: "2026-04-20",
    raceId: "ST-R3",
    horseNumber: 4,
    horseName: "Sky Rocket",
    horseProfile: "Late-closing runner that performs well in fast pace races.",
    jockey: "H. Bowman",
    trainer: "F. Lor",
    position: 2,
  },
  {
    date: "2026-04-20",
    raceId: "ST-R3",
    horseNumber: 7,
    horseName: "Night Storm",
    horseProfile: "Consistent top-3 finisher with balanced pace profile.",
    jockey: "Z. Purton",
    trainer: "D. Hayes",
    position: 3,
  },
  {
    date: "2026-04-20",
    raceId: "ST-R3",
    horseNumber: 10,
    horseName: "Urban Legend",
    horseProfile: "Settles midfield and improves late over sprint trips.",
    jockey: "C. Y. Ho",
    trainer: "J. Size",
    position: 4,
  },
  {
    date: "2026-04-20",
    raceId: "ST-R3",
    horseNumber: 12,
    horseName: "Bright Falcon",
    horseProfile: "Honest type that can hold a sustained pace in the straight.",
    jockey: "A. Badel",
    trainer: "K. W. Lui",
    position: 5,
  },
  {
    date: "2026-04-20",
    raceId: "ST-R3",
    horseNumber: 14,
    horseName: "Harbour Hero",
    horseProfile: "Needs cover early and can finish strongly with clear running.",
    jockey: "L. Ferraris",
    trainer: "C. Fownes",
    position: 6,
  },
  {
    date: "2026-04-24",
    raceId: "HV-R5",
    horseNumber: 2,
    horseName: "Silver Arrow",
    horseProfile: "Sharp recent form and positive jockey synergy.",
    jockey: "B. Avdulla",
    trainer: "J. Size",
    position: 1,
  },
  {
    date: "2026-04-24",
    raceId: "HV-R5",
    horseNumber: 5,
    horseName: "Rapid Crest",
    horseProfile: "Reliable mid-pack mover with strong final sectionals.",
    jockey: "L. Ferraris",
    trainer: "C. Fownes",
    position: 2,
  },
  {
    date: "2026-04-24",
    raceId: "HV-R5",
    horseNumber: 9,
    horseName: "Ocean Gift",
    horseProfile: "Stamina-oriented horse with stable improvement trend.",
    jockey: "M. Chadwick",
    trainer: "P. O'Sullivan",
    position: 3,
  },
  {
    date: "2026-04-24",
    raceId: "HV-R5",
    horseNumber: 1,
    horseName: "Lucky Sapphire",
    horseProfile: "Runs on steadily and handles turning tracks well.",
    jockey: "H. Bowman",
    trainer: "D. J. Hall",
    position: 4,
  },
  {
    date: "2026-04-24",
    raceId: "HV-R5",
    horseNumber: 6,
    horseName: "Victory Anthem",
    horseProfile: "Front-half runner with solid closing sectionals lately.",
    jockey: "K. Teetan",
    trainer: "A. S. Cruz",
    position: 5,
  },
  {
    date: "2026-04-24",
    raceId: "HV-R5",
    horseNumber: 11,
    horseName: "Racing Comet",
    horseProfile: "Can improve second-up and prefers genuine pace races.",
    jockey: "C. L. Chau",
    trainer: "W. K. Mo",
    position: 6,
  },
];

const HISTORY_YEARS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HISTORY_WINDOW_DAYS = HISTORY_YEARS * 365;

function extractRaceNumber(raceId?: string): number {
  if (!raceId) {
    return Number.MAX_SAFE_INTEGER;
  }
  const match = raceId.match(/-R(\d+)$/i);
  if (!match?.[1]) {
    return Number.MAX_SAFE_INTEGER;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function canUseDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function getHistoryWindow(targetDate: string) {
  const end = new Date(targetDate);
  if (Number.isNaN(end.getTime())) {
    const now = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - HISTORY_YEARS);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
      endDateObject: now,
    };
  }

  const start = new Date(end);
  start.setFullYear(start.getFullYear() - HISTORY_YEARS);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    endDateObject: end,
  };
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

type FormStats = { total: number; top3: number; wins: number };
type HorsePerformanceStats = {
  recentForm: number;
  distanceTop3Rate: number;
  distanceWinRate: number;
  trackTop3Rate: number;
};

function getTop3Rate(stats?: FormStats): number {
  if (!stats || stats.total === 0) {
    return 0;
  }
  return stats.top3 / stats.total;
}

function getWinRate(stats?: FormStats): number {
  if (!stats || stats.total === 0) {
    return 0;
  }
  return stats.wins / stats.total;
}

function parseDrawNumber(draw: string): number | null {
  const parsed = Number.parseInt(draw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getDrawBias(draw: string): number {
  const gate = parseDrawNumber(draw);
  if (!gate) {
    return 0;
  }
  // Slightly favor inside draws while keeping impact limited.
  const normalized = (16 - Math.min(gate, 16)) / 16;
  return normalized * 0.6;
}

function normalizeSpeedIndex(
  score: number,
  minScore: number,
  maxScore: number,
): number {
  if (maxScore - minScore < 0.0001) {
    return 70;
  }
  const ratio = (score - minScore) / (maxScore - minScore);
  return Math.round((40 + ratio * 60) * 10) / 10;
}

function parseMarketOdds(odds?: string): number | undefined {
  if (!odds) {
    return undefined;
  }
  const parsed = Number.parseFloat(odds);
  if (!Number.isFinite(parsed) || parsed <= 1) {
    return undefined;
  }
  return parsed;
}

function impliedProbabilityFromOdds(odds?: string): number | undefined {
  const marketOdds = parseMarketOdds(odds);
  if (!marketOdds) {
    return undefined;
  }
  return 100 / marketOdds;
}

function recentFormFromPositions(positions: number[]): number {
  if (positions.length === 0) {
    return 0;
  }
  const weighted = positions.map((position, index) => {
    const placingScore = Math.max(0, 6 - position) / 5;
    const recencyWeight = 1 - index * 0.12;
    return placingScore * Math.max(0.4, recencyWeight);
  });
  return weighted.reduce((sum, value) => sum + value, 0) / weighted.length;
}

type HorseConfidenceThresholds = {
  lowThreshold: number;
  highThreshold: number;
  sampleSize: number;
};

type HorseAnalystProfile = "paulJones" | "andyGibson" | "topHandicapper";
type HorseAnalystStrategy = "consensus" | "single";

const HORSE_PROFILE_WEIGHTS: Record<
  HorseAnalystProfile,
  {
    historicalHorseScore: number;
    recentForm: number;
    distanceTop3Rate: number;
    distanceWinRate: number;
    trackTop3Rate: number;
    pairTop3Rate: number;
    jockeyTop3Rate: number;
    trainerTop3Rate: number;
    jockeyWinRate: number;
    trainerWinRate: number;
    drawBias: number;
  }
> = {
  // Trend-heavy profile inspired by big-race trend analysis.
  paulJones: {
    historicalHorseScore: 1.3,
    recentForm: 1.8,
    distanceTop3Rate: 1.2,
    distanceWinRate: 0.9,
    trackTop3Rate: 1.1,
    pairTop3Rate: 2.0,
    jockeyTop3Rate: 2.0,
    trainerTop3Rate: 1.5,
    jockeyWinRate: 1.0,
    trainerWinRate: 0.8,
    drawBias: 0.4,
  },
  // Pace/form-sensitive profile inspired by sectional observations.
  andyGibson: {
    historicalHorseScore: 0.9,
    recentForm: 2.4,
    distanceTop3Rate: 1.8,
    distanceWinRate: 1.1,
    trackTop3Rate: 1.5,
    pairTop3Rate: 2.0,
    jockeyTop3Rate: 1.9,
    trainerTop3Rate: 1.4,
    jockeyWinRate: 1.0,
    trainerWinRate: 0.7,
    drawBias: 0.8,
  },
  // Balanced handicapper-style profile.
  topHandicapper: {
    historicalHorseScore: 1.0,
    recentForm: 2.0,
    distanceTop3Rate: 1.4,
    distanceWinRate: 0.8,
    trackTop3Rate: 1.2,
    pairTop3Rate: 2.4,
    jockeyTop3Rate: 2.2,
    trainerTop3Rate: 1.6,
    jockeyWinRate: 1.2,
    trainerWinRate: 0.8,
    drawBias: 0.6,
  },
};

function getHorseAnalystConfig(overrides?: {
  strategy?: HorseAnalystStrategy;
  primaryProfile?: HorseAnalystProfile;
}): {
  strategy: HorseAnalystStrategy;
  primaryProfile: HorseAnalystProfile;
} {
  const strategyRaw = (process.env.HORSE_ANALYST_STRATEGY ?? "consensus").toLowerCase();
  const profileRaw = (process.env.HORSE_ANALYST_PROFILE ?? "topHandicapper").toLowerCase();

  const strategy: HorseAnalystStrategy =
    strategyRaw === "single" ? "single" : "consensus";

  let primaryProfile: HorseAnalystProfile = "topHandicapper";
  if (profileRaw === "pauljones") {
    primaryProfile = "paulJones";
  } else if (profileRaw === "andygibson") {
    primaryProfile = "andyGibson";
  }

  return {
    strategy: overrides?.strategy ?? strategy,
    primaryProfile: overrides?.primaryProfile ?? primaryProfile,
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rawIndex = Math.max(0, Math.min(sorted.length - 1, ratio * (sorted.length - 1)));
  const lowerIndex = Math.floor(rawIndex);
  const upperIndex = Math.ceil(rawIndex);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex] ?? 0;
  }
  const lowerValue = sorted[lowerIndex] ?? 0;
  const upperValue = sorted[upperIndex] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (rawIndex - lowerIndex);
}

function deriveHorseConfidenceThresholds(margins: number[]): HorseConfidenceThresholds {
  if (margins.length < 12) {
    return {
      lowThreshold: 0.8,
      highThreshold: 1.8,
      sampleSize: margins.length,
    };
  }
  const lowThreshold = percentile(margins, 0.35);
  const highThreshold = percentile(margins, 0.75);
  return {
    lowThreshold: Math.max(0.2, Math.min(lowThreshold, highThreshold)),
    highThreshold: Math.max(lowThreshold + 0.1, highThreshold),
    sampleSize: margins.length,
  };
}

function classifyHorseConfidence(
  margin: number | undefined,
  thresholds: HorseConfidenceThresholds,
): ConfidenceBand {
  if (typeof margin !== "number") {
    return "Low";
  }
  if (margin >= thresholds.highThreshold) {
    return "High";
  }
  if (margin >= thresholds.lowThreshold) {
    return "Medium";
  }
  return "Low";
}

function computeHorseRunnerScoreForProfile(
  profile: HorseAnalystProfile,
  {
    horseName,
    jockey,
    trainer,
    draw,
    performance,
    horseScore,
    pairStats,
    jockeyStats,
    trainerStats,
  }: {
    horseName: string;
    jockey: string;
    trainer: string;
    draw: string;
    performance?: HorsePerformanceStats;
    horseScore: Map<string, number>;
    pairStats: Map<string, FormStats>;
    jockeyStats: Map<string, FormStats>;
    trainerStats: Map<string, FormStats>;
  },
): number {
  const weights = HORSE_PROFILE_WEIGHTS[profile];
  const historicalHorseScore = horseScore.get(horseName) ?? 0;
  const pairKey = `${jockey}|${trainer}`;
  const pairForm = pairStats.get(pairKey);
  const jockeyForm = jockeyStats.get(jockey);
  const trainerForm = trainerStats.get(trainer);
  const recentForm = performance?.recentForm ?? 0;
  const distanceTop3Rate = performance?.distanceTop3Rate ?? 0;
  const distanceWinRate = performance?.distanceWinRate ?? 0;
  const trackTop3Rate = performance?.trackTop3Rate ?? 0;
  return (
    historicalHorseScore * weights.historicalHorseScore +
    recentForm * weights.recentForm +
    distanceTop3Rate * weights.distanceTop3Rate +
    distanceWinRate * weights.distanceWinRate +
    trackTop3Rate * weights.trackTop3Rate +
    getTop3Rate(pairForm) * weights.pairTop3Rate +
    getTop3Rate(jockeyForm) * weights.jockeyTop3Rate +
    getTop3Rate(trainerForm) * weights.trainerTop3Rate +
    getWinRate(jockeyForm) * weights.jockeyWinRate +
    getWinRate(trainerForm) * weights.trainerWinRate +
    getDrawBias(draw) * weights.drawBias
  );
}

function computeHorseRunnerScore({
  horseName,
  jockey,
  trainer,
  draw,
  performance,
  horseScore,
  pairStats,
  jockeyStats,
  trainerStats,
  activeProfiles,
}: {
  horseName: string;
  jockey: string;
  trainer: string;
  draw: string;
  performance?: HorsePerformanceStats;
  horseScore: Map<string, number>;
  pairStats: Map<string, FormStats>;
  jockeyStats: Map<string, FormStats>;
  trainerStats: Map<string, FormStats>;
  activeProfiles: HorseAnalystProfile[];
}): number {
  const profiles: HorseAnalystProfile[] =
    activeProfiles.length > 0 ? activeProfiles : ["topHandicapper"];
  const profileScores = profiles.map((profile) =>
    computeHorseRunnerScoreForProfile(profile, {
      horseName,
      jockey,
      trainer,
      draw,
      performance,
      horseScore,
      pairStats,
      jockeyStats,
      trainerStats,
    }),
  );
  return profileScores.reduce((sum, value) => sum + value, 0) / profileScores.length;
}

function pickWeightedNumbers(
  entries: Array<{ number: number; score: number }>,
  count: number,
) {
  const pool = [...entries];
  const picked: number[] = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + Math.max(item.score, 0.001), 0);
    let cursor = Math.random() * total;
    let selectedIndex = 0;

    for (let i = 0; i < pool.length; i += 1) {
      cursor -= Math.max(pool[i]?.score ?? 0, 0.001);
      if (cursor <= 0) {
        selectedIndex = i;
        break;
      }
    }

    const selected = pool.splice(selectedIndex, 1)[0];
    if (selected) {
      picked.push(selected.number);
    }
  }

  return picked.sort((a, b) => a - b);
}

function getMark6Confidence({
  drawCount,
  rankedScores,
}: {
  drawCount: number;
  rankedScores: number[];
}): ConfidenceBand {
  if (drawCount < 45 || rankedScores.length < 6) {
    return "Low";
  }

  const topSlice = rankedScores.slice(0, 6);
  const lowerSlice = rankedScores.slice(6, 12);
  if (topSlice.length < 6 || lowerSlice.length < 3) {
    return "Low";
  }

  const topAvg = topSlice.reduce((sum, value) => sum + value, 0) / topSlice.length;
  const lowerAvg =
    lowerSlice.reduce((sum, value) => sum + value, 0) / lowerSlice.length;

  const separationRatio = lowerAvg > 0 ? topAvg / lowerAvg : 1;
  return separationRatio >= 1.12 ? "Medium" : "Low";
}

function getLocalizedDisclaimer(locale: Locale) {
  return locale === "zh-HK"
    ? "僅供娛樂用途，不保證中獎，並非財務建議。"
    : "For entertainment only. No guaranteed winnings. No financial advice.";
}

async function getMark6Suggestion(
  locale: Locale,
  targetDate: string,
  predictionType: Mark6PredictionType,
): Promise<SuggestionBase> {
  if (!canUseDatabase()) {
    return getMark6SuggestionFallback(locale, predictionType);
  }

  try {
    const { startDate, endDate, endDateObject } = getHistoryWindow(targetDate);
    const draws = await dbQuery<{ draw_date: string; numbers: number[] }>(
      `
        SELECT draw_date, numbers
        FROM mark6_results
        WHERE draw_date BETWEEN $1::date AND $2::date
        ORDER BY draw_date ASC
      `,
      [startDate, endDate],
    );

    if (draws.rows.length === 0) {
      return getMark6SuggestionFallback(locale, predictionType);
    }

    const scoreByNumber = new Map<number, number>();
    for (let number = 1; number <= 49; number += 1) {
      scoreByNumber.set(number, 0);
    }

    for (const draw of draws.rows) {
      const drawDate = toDate(draw.draw_date);
      const ageDays = Math.max(
        0,
        Math.round((endDateObject.getTime() - drawDate.getTime()) / MS_PER_DAY),
      );
      const recencyRatio = Math.max(0, 1 - ageDays / HISTORY_WINDOW_DAYS);
      const recencyWeight = 1 + recencyRatio * 0.6;

      for (const number of draw.numbers) {
        scoreByNumber.set(number, (scoreByNumber.get(number) ?? 0) + recencyWeight);
      }
    }

    const ranked = [...scoreByNumber.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([number, score]) => ({ number, score }));
    const confidenceBand = getMark6Confidence({
      drawCount: draws.rows.length,
      rankedScores: ranked.map((item) => item.score),
    });
    const topSix = pickWeightedNumbers(ranked, 6);
    const mark6Prediction = buildMark6Prediction(predictionType, ranked);

    return {
      suggestions:
        predictionType === "single"
          ? topSix.map((value) => value.toString())
          : mark6PredictionToSuggestionStrings(mark6Prediction),
      mark6PredictionType: predictionType,
      mark6Prediction,
      confidenceBand,
      explanation:
        locale === "zh-HK"
          ? `已學習近${HISTORY_YEARS}年（${draws.rows.length}期）歷史結果，按頻率與時間加權生成本次組合（每次生成會有變化），信心會在低至中等間動態調整。`
          : `Learned from the last ${HISTORY_YEARS} years of draws (${draws.rows.length} records), then generated this run with weighted sampling. Confidence is dynamically adjusted between Low and Medium.`,
    };
  } catch {
    return getMark6SuggestionFallback(locale, predictionType);
  }
}

async function getHorseSuggestion(
  locale: Locale,
  targetDate: string,
  selectedRace?: SelectedRaceInput,
  analystOverrides?: {
    strategy?: HorseAnalystStrategy;
    primaryProfile?: HorseAnalystProfile;
  },
): Promise<SuggestionBase> {
  if (!canUseDatabase()) {
    return getHorseSuggestionFallback(locale);
  }

  try {
    const analystConfig = getHorseAnalystConfig(analystOverrides);
    const activeProfileList: HorseAnalystProfile[] =
      analystConfig.strategy === "single"
        ? [analystConfig.primaryProfile]
        : ["paulJones", "andyGibson", "topHandicapper"];

    const { startDate, endDate, endDateObject } = getHistoryWindow(targetDate);
    const raceRows = await dbQuery<{
      race_date: string;
      race_id: string;
      race_course: string | null;
      race_distance: number | null;
      horse_number: number;
      horse_name: string;
      horse_profile: string;
      jockey: string;
      trainer: string;
      position: number;
    }>(
      `
        SELECT race_date, race_id, race_course, race_distance, horse_number, horse_name, horse_profile, jockey, trainer, position
        FROM race_results
        WHERE race_date BETWEEN $1::date AND $2::date
        ORDER BY race_date ASC
      `,
      [startDate, endDate],
    );

    if (raceRows.rows.length === 0) {
      return getHorseSuggestionFallback(locale);
    }

    const pairStats = new Map<string, FormStats>();
    const jockeyStats = new Map<string, FormStats>();
    const trainerStats = new Map<string, FormStats>();
    for (const row of raceRows.rows) {
      const pairKey = `${row.jockey}|${row.trainer}`;
      const pair = pairStats.get(pairKey) ?? { total: 0, top3: 0, wins: 0 };
      const jockey = jockeyStats.get(row.jockey) ?? { total: 0, top3: 0, wins: 0 };
      const trainer = trainerStats.get(row.trainer) ?? { total: 0, top3: 0, wins: 0 };
      pair.total += 1;
      jockey.total += 1;
      trainer.total += 1;
      if (row.position <= 3) {
        pair.top3 += 1;
        jockey.top3 += 1;
        trainer.top3 += 1;
      }
      if (row.position === 1) {
        pair.wins += 1;
        jockey.wins += 1;
        trainer.wins += 1;
      }
      pairStats.set(pairKey, pair);
      jockeyStats.set(row.jockey, jockey);
      trainerStats.set(row.trainer, trainer);
    }

    const horseScore = new Map<string, number>();
    const horseMeta = new Map<
      string,
      {
        horseNumber: number;
        horseProfile: string;
        jockey: string;
        trainer: string;
      }
    >();
    for (const row of raceRows.rows) {
      const raceDate = toDate(row.race_date);
      const ageDays = Math.max(
        0,
        Math.round((endDateObject.getTime() - raceDate.getTime()) / MS_PER_DAY),
      );
      const recencyRatio = Math.max(0, 1 - ageDays / HISTORY_WINDOW_DAYS);
      const recencyWeight = 1 + recencyRatio * 0.5;
      const placingScore = Math.max(0, 6 - row.position);

      const pairKey = `${row.jockey}|${row.trainer}`;
      const stats = pairStats.get(pairKey);
      const top3Rate = stats && stats.total > 0 ? stats.top3 / stats.total : 0;
      const synergyBonus = top3Rate * 1.2;

      const score = placingScore * recencyWeight + synergyBonus;
      horseScore.set(row.horse_name, (horseScore.get(row.horse_name) ?? 0) + score);
      if (!horseMeta.has(row.horse_name)) {
        horseMeta.set(row.horse_name, {
          horseNumber: row.horse_number,
          horseProfile: row.horse_profile,
          jockey: row.jockey,
          trainer: row.trainer,
        });
      }
    }

    const horseHistory = new Map<
      string,
      Array<{ raceDateMs: number; position: number; raceDistance?: number; raceCourse?: string }>
    >();
    for (const row of raceRows.rows) {
      const key = row.horse_name;
      const history = horseHistory.get(key) ?? [];
      history.push({
        raceDateMs: toDate(row.race_date).getTime(),
        position: row.position,
        raceDistance: row.race_distance ?? undefined,
        raceCourse: row.race_course ?? undefined,
      });
      horseHistory.set(key, history);
    }

    const horsePerformanceByName = new Map<string, HorsePerformanceStats>();
    if (selectedRace?.runners?.length) {
      const selectedDistance =
        typeof selectedRace.distance === "number" && selectedRace.distance > 0
          ? selectedRace.distance
          : undefined;
      for (const runner of selectedRace.runners) {
        const history = [...(horseHistory.get(runner.horseName) ?? [])].sort(
          (a, b) => b.raceDateMs - a.raceDateMs,
        );
        const recentPositions = history.slice(0, 5).map((item) => item.position);
        const distanceHistory =
          typeof selectedDistance === "number"
            ? history.filter(
                (item) =>
                  typeof item.raceDistance === "number" &&
                  Math.abs(item.raceDistance - selectedDistance) <= 200,
              )
            : [];
        const trackHistory = history.filter((item) => item.raceCourse === selectedRace.venueCode);

        const distanceTotal = distanceHistory.length;
        const distanceTop3Rate =
          distanceTotal > 0
            ? distanceHistory.filter((item) => item.position <= 3).length / distanceTotal
            : 0;
        const distanceWinRate =
          distanceTotal > 0
            ? distanceHistory.filter((item) => item.position === 1).length / distanceTotal
            : 0;
        const trackTop3Rate =
          trackHistory.length > 0
            ? trackHistory.filter((item) => item.position <= 3).length / trackHistory.length
            : 0;

        horsePerformanceByName.set(runner.horseName, {
          recentForm: recentFormFromPositions(recentPositions),
          distanceTop3Rate,
          distanceWinRate,
          trackTop3Rate,
        });
      }
    }

    const groupedByDateRace = new Map<
      string,
      Array<{
        horseNumber: number;
        horseName: string;
        jockey: string;
        trainer: string;
        position: number;
      }>
    >();
    for (const row of raceRows.rows) {
      const raceKey = `${row.race_date}-${row.race_id}`;
      const group = groupedByDateRace.get(raceKey) ?? [];
      group.push({
        horseNumber: row.horse_number,
        horseName: row.horse_name,
        jockey: row.jockey,
        trainer: row.trainer,
        position: row.position,
      });
      groupedByDateRace.set(raceKey, group);
    }

    const backtestMargins: number[] = [];
    for (const group of groupedByDateRace.values()) {
      if (group.length < 3) {
        continue;
      }
      const winner = group.find((entry) => entry.position === 1);
      if (!winner) {
        continue;
      }
      const scored = group
        .map((entry) => ({
          ...entry,
          score: computeHorseRunnerScore({
            horseName: entry.horseName,
            jockey: entry.jockey,
            trainer: entry.trainer,
            draw: "-",
            horseScore,
            pairStats,
            jockeyStats,
            trainerStats,
            activeProfiles: activeProfileList,
          }),
        }))
        .sort((a, b) => b.score - a.score || a.horseNumber - b.horseNumber);
      const top = scored[0];
      const second = scored[1];
      if (!top || !second) {
        continue;
      }
      const allScores = scored.map((item) => item.score);
      const minScore = Math.min(...allScores);
      const maxScore = Math.max(...allScores);
      const topSpeed = normalizeSpeedIndex(top.score, minScore, maxScore);
      const secondSpeed = normalizeSpeedIndex(second.score, minScore, maxScore);
      const margin = topSpeed - secondSpeed;
      if (Number.isFinite(margin)) {
        backtestMargins.push(margin);
      }
    }
    const confidenceThresholds = deriveHorseConfidenceThresholds(backtestMargins);

    const horseSuggestions =
      selectedRace && selectedRace.runners.length > 0
        ? (() => {
            const candidates = selectedRace.runners.map((runner) => {
              const meta = horseMeta.get(runner.horseName);
              const score = computeHorseRunnerScore({
                horseName: runner.horseName,
                jockey: runner.jockey,
                trainer: runner.trainer,
                draw: runner.draw,
                performance: horsePerformanceByName.get(runner.horseName),
                horseScore,
                pairStats,
                jockeyStats,
                trainerStats,
                activeProfiles: activeProfileList,
              });
              return {
                score,
                horseNumber: runner.horseNumber,
                horseName: runner.horseName,
                horseProfile:
                  meta?.horseProfile ||
                  `Declared runner in ${selectedRace.venueName} Race ${selectedRace.raceNo}.`,
                jockey: runner.jockey,
                trainer: runner.trainer,
                drawValue: parseDrawNumber(runner.draw),
                marketOdds: runner.winOdds,
              };
            });
            const maxRawScore = Math.max(...candidates.map((item) => item.score));
            const expCandidates = candidates.map((item) => ({
              ...item,
              expScore: Math.exp((item.score - maxRawScore) / 3),
            }));
            const expTotal = expCandidates.reduce((sum, item) => sum + item.expScore, 0);
            const sorted = expCandidates.sort(
              (a, b) =>
                b.score - a.score ||
                (a.drawValue ?? Number.MAX_SAFE_INTEGER) -
                  (b.drawValue ?? Number.MAX_SAFE_INTEGER) ||
                a.horseNumber - b.horseNumber,
            );
            const scores = sorted.map((item) => item.score);
            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);
            return sorted.slice(0, 3).map((item) => ({
              horseNumber: item.horseNumber,
              horseName: item.horseName,
              horseProfile: item.horseProfile,
              jockey: item.jockey,
              trainer: item.trainer,
              speedIndex: normalizeSpeedIndex(item.score, minScore, maxScore),
              modelProbability:
                expTotal > 0 ? Math.round(((item.expScore / expTotal) * 100) * 10) / 10 : undefined,
              impliedProbability:
                Math.round((impliedProbabilityFromOdds(item.marketOdds) ?? 0) * 10) / 10 || undefined,
              edgeScore:
                typeof impliedProbabilityFromOdds(item.marketOdds) === "number" && expTotal > 0
                  ? Math.round(
                      (((item.expScore / expTotal) * 100) -
                        (impliedProbabilityFromOdds(item.marketOdds) ?? 0)) *
                        10,
                    ) / 10
                  : undefined,
              marketOdds: item.marketOdds,
            }));
          })()
        : [...horseScore.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([horseName]) => {
              const meta = horseMeta.get(horseName);
              if (!meta) {
                return {
                  horseNumber: 0,
                  horseName,
                  horseProfile: "",
                  jockey: "",
                  trainer: "",
                };
              }
              return {
                horseNumber: meta.horseNumber,
                horseName,
                horseProfile: meta.horseProfile,
                jockey: meta.jockey,
                trainer: meta.trainer,
                speedIndex: 70,
              };
            });

    const currentMargin =
      horseSuggestions.length >= 2 &&
      typeof horseSuggestions[0]?.speedIndex === "number" &&
      typeof horseSuggestions[1]?.speedIndex === "number"
        ? (horseSuggestions[0].speedIndex ?? 0) - (horseSuggestions[1].speedIndex ?? 0)
        : undefined;
    const calibratedBand = classifyHorseConfidence(currentMargin, confidenceThresholds);

    return {
      suggestions: horseSuggestions.map((item) => `#${item.horseNumber} ${item.horseName}`),
      horseSuggestions,
      confidenceBand: calibratedBand,
      explanation:
        locale === "zh-HK"
          ? selectedRace
            ? `已聚焦 ${selectedRace.venueName} 第${selectedRace.raceNo}場已報名馬匹，按近${HISTORY_YEARS}年（${raceRows.rows.length}筆）賽果、近期走勢、路程/場地適配、騎師/練馬師近況、配搭與檔位作賽前排序，並以歷史回測邊際校準信心。`
            : `已學習近${HISTORY_YEARS}年（${raceRows.rows.length}筆）賽果，按名次、時間權重及騎師/練馬師組合穩定性計分，得出前三匹推薦。`
          : selectedRace
            ? `Focused on declared runners for ${selectedRace.venueName} Race ${selectedRace.raceNo}, then ranked them pre-race using ${HISTORY_YEARS}-year history (${raceRows.rows.length} records), recent form, distance/track fit, jockey/trainer form, pair synergy, and draw bias with confidence calibrated from historical backtest margins.`
            : `Learned from the last ${HISTORY_YEARS} years of race history (${raceRows.rows.length} records), scoring by placing, recency, and jockey-trainer consistency to rank the top three picks.`,
    };
  } catch {
    return getHorseSuggestionFallback(locale, selectedRace);
  }
}

function getMark6SuggestionFallback(
  locale: Locale,
  predictionType: Mark6PredictionType,
): SuggestionBase {
  const frequencies = new Map<number, number>();
  for (const draw of mark6FallbackRows) {
    for (const number of draw.numbers) {
      frequencies.set(number, (frequencies.get(number) ?? 0) + 1);
    }
  }

  const ranked = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([number, score]) => ({ number, score }));
  const confidenceBand = getMark6Confidence({
    drawCount: mark6FallbackRows.length,
    rankedScores: ranked.map((item) => item.score),
  });
  const topSix = pickWeightedNumbers(ranked, 6);
  const mark6Prediction = buildMark6Prediction(predictionType, ranked);

  return {
    suggestions:
      predictionType === "single"
        ? topSix.map((value) => value.toString())
        : mark6PredictionToSuggestionStrings(mark6Prediction),
    mark6PredictionType: predictionType,
    mark6Prediction,
    confidenceBand,
    explanation:
      locale === "zh-HK"
        ? "此組合基於最近資料樣本的號碼頻率與分佈，並加入加權抽樣；信心會在低至中等之間動態評估。"
        : "This set uses frequency/distribution signals plus weighted sampling, with confidence dynamically evaluated between Low and Medium.",
  };
}

function getHorseSuggestionFallback(
  locale: Locale,
  selectedRace?: SelectedRaceInput,
): SuggestionBase {
  const grouped = raceFallbackRows.reduce<Record<string, number>>((acc, row) => {
    const score = 4 - row.position;
    acc[row.horseName] = (acc[row.horseName] ?? 0) + score;
    return acc;
  }, {});

  const fallbackJockeyStats = new Map<string, FormStats>();
  const fallbackTrainerStats = new Map<string, FormStats>();
  const fallbackPairStats = new Map<string, FormStats>();
  for (const row of raceFallbackRows) {
    const pairKey = `${row.jockey}|${row.trainer}`;
    const jockey = fallbackJockeyStats.get(row.jockey) ?? { total: 0, top3: 0, wins: 0 };
    const trainer = fallbackTrainerStats.get(row.trainer) ?? { total: 0, top3: 0, wins: 0 };
    const pair = fallbackPairStats.get(pairKey) ?? { total: 0, top3: 0, wins: 0 };
    jockey.total += 1;
    trainer.total += 1;
    pair.total += 1;
    if (row.position <= 3) {
      jockey.top3 += 1;
      trainer.top3 += 1;
      pair.top3 += 1;
    }
    if (row.position === 1) {
      jockey.wins += 1;
      trainer.wins += 1;
      pair.wins += 1;
    }
    fallbackJockeyStats.set(row.jockey, jockey);
    fallbackTrainerStats.set(row.trainer, trainer);
    fallbackPairStats.set(pairKey, pair);
  }

  const horseSuggestions =
    selectedRace && selectedRace.runners.length > 0
      ? (() => {
          const candidates = selectedRace.runners.map((runner) => {
            const pairKey = `${runner.jockey}|${runner.trainer}`;
            const score =
              (grouped[runner.horseName] ?? 0) * 1.0 +
              getTop3Rate(fallbackPairStats.get(pairKey)) * 2.0 +
              getTop3Rate(fallbackJockeyStats.get(runner.jockey)) * 1.8 +
              getTop3Rate(fallbackTrainerStats.get(runner.trainer)) * 1.2 +
              getWinRate(fallbackJockeyStats.get(runner.jockey)) * 0.8 +
              getWinRate(fallbackTrainerStats.get(runner.trainer)) * 0.5 +
              getDrawBias(runner.draw);
            return {
              score,
              horseNumber: runner.horseNumber,
              horseName: runner.horseName,
              horseProfile: `Declared runner in ${selectedRace.venueName} Race ${selectedRace.raceNo}.`,
              jockey: runner.jockey,
              trainer: runner.trainer,
              drawValue: parseDrawNumber(runner.draw),
            };
          });
          const sorted = candidates.sort(
            (a, b) =>
              b.score - a.score ||
              (a.drawValue ?? Number.MAX_SAFE_INTEGER) -
                (b.drawValue ?? Number.MAX_SAFE_INTEGER) ||
              a.horseNumber - b.horseNumber,
          );
          const scores = sorted.map((item) => item.score);
          const minScore = Math.min(...scores);
          const maxScore = Math.max(...scores);
          return sorted.slice(0, 3).map((item) => ({
            horseNumber: item.horseNumber,
            horseName: item.horseName,
            horseProfile: item.horseProfile,
            jockey: item.jockey,
            trainer: item.trainer,
            speedIndex: normalizeSpeedIndex(item.score, minScore, maxScore),
          }));
        })()
      : Object.entries(grouped)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([horse]) => {
            const details = raceFallbackRows.find((row) => row.horseName === horse);
            if (!details) {
              return {
                horseNumber: 0,
                horseName: horse,
                horseProfile: "",
                jockey: "",
                trainer: "",
              };
            }
            return {
              horseNumber: details.horseNumber,
              horseName: details.horseName,
              horseProfile: details.horseProfile,
              jockey: details.jockey,
              trainer: details.trainer,
              speedIndex: 70,
            };
          });

  return {
    suggestions: horseSuggestions.map((item) => `#${item.horseNumber} ${item.horseName}`),
    horseSuggestions,
    confidenceBand: "Medium" as ConfidenceBand,
    explanation:
      locale === "zh-HK"
        ? selectedRace
          ? "已按你選擇的賽事聚焦分析已報名馬匹（示例資料模式）。"
          : "推薦按最近樣本賽果建立加權排序，幫助初學者理解基本賽馬評估方式。"
        : selectedRace
          ? "Focused on your selected race's declared runners (sample-data mode)."
          : "Picks are weighted from recent sample race results to provide a beginner-friendly evaluation approach.",
  };
}

export async function getSuggestion({
  mode,
  targetDate,
  locale,
  mark6PredictionType = "single",
  selectedRace,
  horseAnalystStrategy,
  horseAnalystProfile,
}: {
  mode: Mode;
  targetDate: string;
  locale: Locale;
  mark6PredictionType?: Mark6PredictionType;
  selectedRace?: SelectedRaceInput;
  horseAnalystStrategy?: HorseAnalystStrategy;
  horseAnalystProfile?: HorseAnalystProfile;
}): Promise<SuggestionResponse> {
  if (canUseDatabase()) {
    try {
      await ensureSchema();
    } catch {
      // Allow fallback behavior when schema initialization fails.
    }
  }

  const base =
    mode === "mark6"
      ? await getMark6Suggestion(locale, targetDate, mark6PredictionType)
      : await getHorseSuggestion(locale, targetDate, selectedRace, {
          strategy: horseAnalystStrategy,
          primaryProfile: horseAnalystProfile,
        });

  if (canUseDatabase()) {
    try {
      await withTransaction(async (client) => {
        await client.query(
          `
          INSERT INTO suggestion_logs (
            mode, target_date, input_snapshot, suggestion_payload, confidence_band, model_version, locale
          ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
          `,
          [
            mode,
            targetDate,
            JSON.stringify({
              mode,
              targetDate,
              locale,
              selectedRace,
              horseAnalystStrategy,
              horseAnalystProfile,
            }),
            JSON.stringify(base.suggestions),
            base.confidenceBand,
            "heuristic-v1",
            locale,
          ],
        );
      });
    } catch {
      // Keep UI responsive even if DB write fails in local setup.
    }
  }

  return {
    status: "ok",
    mode,
    targetDate,
    mark6PredictionType: base.mark6PredictionType,
    progress: ["fetching", "analyzing", "generating", "done"],
    suggestions: base.suggestions,
    mark6Prediction: base.mark6Prediction,
    horseSuggestions: base.horseSuggestions,
    confidenceBand: base.confidenceBand,
    explanation: base.explanation,
    disclaimer: getLocalizedDisclaimer(locale),
  };
}

export async function getHistory(mode: Mode, locale: Locale): Promise<HistoryEntry[]> {
  if (!canUseDatabase()) {
    return getHistoryFallback(mode, locale);
  }
  try {
    await ensureSchema();
  } catch {
    return getHistoryFallback(mode, locale);
  }

  if (mode === "mark6") {
    try {
      const rows = await dbQuery<{ draw_date: string; numbers: number[] }>(
        `
        SELECT TO_CHAR(draw_date, 'YYYY-MM-DD') AS draw_date, numbers
        FROM mark6_results
        ORDER BY draw_date DESC
        LIMIT 20
        `,
      );

      if (rows.rows.length > 0) {
        return rows.rows.map((row) => ({
          date: row.draw_date,
          result: row.numbers.join(", "),
          note:
            locale === "zh-HK"
              ? "近期號碼分布較平均。"
              : "Recent draws show a relatively balanced spread.",
        }));
      }
      return getHistoryFallback(mode, locale);
    } catch {
      return getHistoryFallback(mode, locale);
    }
  }

  try {
    const raceRows = await dbQuery<{ race_date: string; race_id: string; result: string }>(
      `
      WITH grouped AS (
        SELECT
          TO_CHAR(race_date, 'YYYY-MM-DD') AS race_date,
          race_id,
          STRING_AGG(
            position::text || '. #' || horse_number::text || ' ' || horse_name,
            ' | '
            ORDER BY position
          ) AS result
        FROM race_results
        WHERE race_id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-(ST|HV)-R[0-9]+$'
        GROUP BY race_date, race_id
      )
      SELECT DISTINCT ON (race_date, result)
        race_date,
        race_id,
        result
      FROM grouped
      ORDER BY
        race_date DESC,
        result,
        CASE
          WHEN race_id LIKE '%-HV-R%' THEN 0
          WHEN race_id LIKE '%-ST-R%' THEN 1
          ELSE 2
        END,
        race_id ASC
      LIMIT 200
      `,
    );

    if (raceRows.rows.length > 0) {
      return raceRows.rows
        .map((row) => ({
          date: row.race_date,
          raceId: row.race_id,
          result: row.result,
          note:
            locale === "zh-HK"
              ? "按每場賽事完整名次整理。"
              : "Full finishing order from recent race results.",
        }))
        .sort((a, b) => {
          if (a.date !== b.date) {
            return a.date > b.date ? -1 : 1;
          }
          return extractRaceNumber(a.raceId) - extractRaceNumber(b.raceId);
        });
    }
    return getHistoryFallback(mode, locale);
  } catch {
    return getHistoryFallback(mode, locale);
  }
}

export async function getHorseHistoryByDate(
  targetDate: string,
  locale: Locale,
): Promise<HistoryEntry[]> {
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(targetDate);
  if (!isValidDate) {
    return [];
  }

  if (!canUseDatabase()) {
    return getHistoryFallback("horse", locale).filter((row) => row.date === targetDate);
  }

  try {
    await ensureSchema();
  } catch {
    return getHistoryFallback("horse", locale).filter((row) => row.date === targetDate);
  }

  try {
    const raceRows = await dbQuery<{ race_date: string; race_id: string; result: string }>(
      `
      WITH grouped AS (
        SELECT
          TO_CHAR(race_date, 'YYYY-MM-DD') AS race_date,
          race_id,
          STRING_AGG(
            position::text || '. #' || horse_number::text || ' ' || horse_name,
            ' | '
            ORDER BY position
          ) AS result
        FROM race_results
        WHERE race_date = $1::date
          AND race_id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-(ST|HV)-R[0-9]+$'
        GROUP BY race_date, race_id
      )
      SELECT DISTINCT ON (race_date, result)
        race_date,
        race_id,
        result
      FROM grouped
      ORDER BY
        race_date DESC,
        result,
        CASE
          WHEN race_id LIKE '%-HV-R%' THEN 0
          WHEN race_id LIKE '%-ST-R%' THEN 1
          ELSE 2
        END,
        race_id ASC
      `,
      [targetDate],
    );

    if (raceRows.rows.length > 0) {
      return raceRows.rows
        .map((row) => ({
          date: row.race_date,
          raceId: row.race_id,
          result: row.result,
          note:
            locale === "zh-HK"
              ? "按每場賽事完整名次整理。"
              : "Full finishing order from recent race results.",
        }))
        .sort((a, b) => extractRaceNumber(a.raceId) - extractRaceNumber(b.raceId));
    }
    return getHistoryFallback("horse", locale).filter((row) => row.date === targetDate);
  } catch {
    return getHistoryFallback("horse", locale).filter((row) => row.date === targetDate);
  }
}

export async function getAnalytics() {
  if (!canUseDatabase()) {
    return getAnalyticsFallback();
  }
  try {
    await ensureSchema();
  } catch {
    return getAnalyticsFallback();
  }

  let confidenceRows: { band: ConfidenceBand; value: string }[] = [];
  let trendRows: { label: string; value: string }[] = [];
  try {
    const confidenceResult = await dbQuery<{ band: ConfidenceBand; value: string }>(
      `
      SELECT confidence_band AS band, COUNT(*)::int AS value
      FROM suggestion_logs
      GROUP BY confidence_band
      `,
    );

    const trendResult = await dbQuery<{ label: string; value: string }>(
      `
      SELECT TO_CHAR(created_at::date, 'MM-DD') AS label, COUNT(*)::int AS value
      FROM suggestion_logs
      WHERE created_at >= NOW() - INTERVAL '28 days'
      GROUP BY created_at::date
      ORDER BY created_at::date ASC
      `,
    );
    confidenceRows = confidenceResult.rows;
    trendRows = trendResult.rows;
  } catch {
    return getAnalyticsFallback();
  }

  const confidenceMap = new Map<ConfidenceBand, number>([
    ["Low", 0],
    ["Medium", 0],
    ["High", 0],
  ]);
  for (const row of confidenceRows) {
    confidenceMap.set(row.band, Number(row.value));
  }

  return {
    confidenceDistribution: [
      { band: "Low", value: confidenceMap.get("Low") ?? 0 },
      { band: "Medium", value: confidenceMap.get("Medium") ?? 0 },
      { band: "High", value: confidenceMap.get("High") ?? 0 },
    ],
    trend: trendRows.map((row) => ({
      label: row.label,
      value: Number(row.value),
    })),
  };
}

function getHistoryFallback(mode: Mode, locale: Locale): HistoryEntry[] {
  if (mode === "mark6") {
    return mark6FallbackRows.map((row) => ({
      date: row.date,
      result: row.numbers.join(", "),
      note:
        locale === "zh-HK"
          ? "顯示本地示例資料（資料庫未連線）。"
          : "Showing local sample data (database is not connected).",
    }));
  }

  const grouped = new Map<string, RaceFallbackResult[]>();
  for (const row of raceFallbackRows) {
    const key = `${row.date}-${row.raceId}`;
    const value = grouped.get(key) ?? [];
    value.push(row);
    grouped.set(key, value);
  }

  return [...grouped.values()].map((entries) => ({
    date: entries[0]?.date ?? "",
    raceId: entries[0]?.raceId ?? "",
    result: entries
      .sort((a, b) => a.position - b.position)
      .map((item) => `${item.position}. #${item.horseNumber} ${item.horseName}`)
      .join(" | "),
    note:
      locale === "zh-HK"
        ? "顯示本地示例資料（資料庫未連線）。"
        : "Showing local sample data (database is not connected).",
  }));
}

function getAnalyticsFallback() {
  return {
    confidenceDistribution: [
      { band: "Low", value: 36 },
      { band: "Medium", value: 49 },
      { band: "High", value: 15 },
    ],
    trend: [
      { label: "W1", value: 42 },
      { label: "W2", value: 47 },
      { label: "W3", value: 45 },
      { label: "W4", value: 52 },
    ],
  };
}

function buildMark6Prediction(
  predictionType: Mark6PredictionType,
  ranked: Array<{ number: number; score: number }>,
) {
  if (predictionType === "multiple") {
    const sets: number[][] = [];
    const seen = new Set<string>();
    while (sets.length < 3) {
      const set = pickWeightedNumbers(ranked, 6);
      const key = set.join("-");
      if (!seen.has(key)) {
        seen.add(key);
        sets.push(set);
      }
      if (seen.size > 10) {
        break;
      }
    }
    return { type: "multiple" as const, multiple: sets };
  }

  if (predictionType === "banker") {
    const banker = pickWeightedNumbers(ranked.slice(0, 8), 1)[0] ?? ranked[0]?.number ?? 1;
    const selections = pickWeightedNumbers(
      ranked.filter((item) => item.number !== banker).slice(0, 18),
      8,
    );
    return {
      type: "banker" as const,
      banker: {
        banker,
        selections,
      },
    };
  }

  const single = pickWeightedNumbers(ranked, 6);
  return { type: "single" as const, single };
}

function mark6PredictionToSuggestionStrings(
  prediction: ReturnType<typeof buildMark6Prediction>,
) {
  if (prediction.type === "multiple") {
    return (prediction.multiple ?? []).flat().map((value) => value.toString());
  }
  if (prediction.type === "banker") {
    return [
      prediction.banker?.banker?.toString() ?? "",
      ...(prediction.banker?.selections ?? []).map((value) => value.toString()),
    ].filter(Boolean);
  }
  return (prediction.single ?? []).map((value) => value.toString());
}
