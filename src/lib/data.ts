import type { ConfidenceBand, Locale, Mode } from "@/lib/translations";
import { dbQuery, ensureSchema, hasDatabaseConfig, withTransaction } from "@/lib/db";
import {
  isHorseHistoryEntryShape,
} from "@/lib/horse-history-shape";
import { ingestHorseRacingFromHkjc, ingestMarkSixFromWeb } from "@/lib/web-ingest";

type Mark6PredictionType = "single" | "multiple" | "banker";
type Mark6NumberMix = "mixed" | "smallOnly" | "bigOnly";
type Mark6GenerateMode = "auto" | "manual";
type Mark6NumberProbability = {
  number: number;
  probability: number;
};
type Mark6TrainingDraw = {
  drawDate: Date;
  numbers: number[];
};

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
  mark6BatchSets?: number[][];
  mark6PreviousDraw?: Mark6PreviousDraw;
  mark6NumberProbabilities?: Mark6NumberProbability[];
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
    marketSignal?: "value" | "neutral" | "overbet";
    topFactors?: Array<{
      label: string;
      impactScore: number;
    }>;
  }[];
  modelVersion?: string;
  generatedAt?: string;
  dataFreshness?: {
    source: "database" | "fallback";
    historyRecordCount: number;
    historyWindowYears: number;
  };
  featureCoverage?: {
    probability: boolean;
    explainability: boolean;
    marketContext: boolean;
    paceProxy: boolean;
    breedingProxy: boolean;
  };
  horseAnalysis?: {
    strategy: HorseAnalystStrategy;
    activeProfiles: HorseAnalystProfile[];
  };
  mark6Analysis?: {
    strategy: Mark6ExpertStrategy;
    activeProfiles: Mark6ExpertProfile[];
  };
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
  marketSignal?: "value" | "neutral" | "overbet";
  topFactors?: Array<{
    label: string;
    impactScore: number;
  }>;
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
  responseStatus?: "ok" | "stale";
  suggestions: string[];
  mark6PredictionType?: Mark6PredictionType;
  mark6Prediction?: SuggestionResponse["mark6Prediction"];
  mark6BatchSets?: number[][];
  mark6PreviousDraw?: Mark6PreviousDraw;
  mark6NumberProbabilities?: Mark6NumberProbability[];
  horseSuggestions?: HorseSuggestionItem[];
  modelVersion?: string;
  generatedAt?: string;
  dataFreshness?: SuggestionResponse["dataFreshness"];
  featureCoverage?: SuggestionResponse["featureCoverage"];
  horseAnalysis?: SuggestionResponse["horseAnalysis"];
  mark6Analysis?: SuggestionResponse["mark6Analysis"];
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

type Mark6PreviousDraw = {
  date: string;
  numbers: number[];
  specialNumber?: number;
  source?: "hkjc" | "database" | "fallback";
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
const MARK6_BASELINE_PROBABILITY = 6 / 49;
const HKJC_MARK6_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HKJC_MARK6_DRAW_QUERY = `
fragment lotteryDrawsFragment on LotteryDraw {
    id
    year
    no
    openDate
    closeDate
    drawDate
    status
    snowballCode
    snowballName_en
    snowballName_ch
    lotteryPool {
      sell
      status
      totalInvestment
      jackpot
      unitBet
      estimatedPrize
      derivedFirstPrizeDiv
      lotteryPrizes {
        type
        winningUnit
        dividend
      }
    }
    drawResult {
      drawnNo
      xDrawnNo
    }
  }
query marksixDraw {
            timeOffset {
                m6  
                ts  
            }
            lotteryDraws {
                ...lotteryDrawsFragment
            }
        }`;

type HkjcMark6Draw = {
  drawDate?: string;
  status?: string;
  drawResult?: {
    drawnNo?: number[];
    xDrawnNo?: number;
  };
};

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

function extractRaceCourse(raceId?: string): "ST" | "HV" | undefined {
  const match = raceId?.match(/(?:^|[-])(ST|HV)-R\d+$/i);
  return (match?.[1]?.toUpperCase() as "ST" | "HV" | undefined) ?? undefined;
}

function dedupeMirroredHorseHistoryRows(rows: HistoryEntry[]): HistoryEntry[] {
  const dateCourseHasRaceOne = new Set<string>();
  for (const row of rows) {
    const course = extractRaceCourse(row.raceId);
    if (course && extractRaceNumber(row.raceId) === 1) {
      dateCourseHasRaceOne.add(`${row.date}-${course}`);
    }
  }

  const byRaceResult = new Map<string, HistoryEntry>();
  for (const row of rows) {
    const raceNo = extractRaceNumber(row.raceId);
    const key = `${row.date}-${raceNo}-${row.result}`;
    const existing = byRaceResult.get(key);
    if (!existing) {
      byRaceResult.set(key, row);
      continue;
    }

    const rowCourse = extractRaceCourse(row.raceId);
    const existingCourse = extractRaceCourse(existing.raceId);
    const rowCourseHasRaceOne = rowCourse
      ? dateCourseHasRaceOne.has(`${row.date}-${rowCourse}`)
      : false;
    const existingCourseHasRaceOne = existingCourse
      ? dateCourseHasRaceOne.has(`${existing.date}-${existingCourse}`)
      : false;
    if (rowCourseHasRaceOne && !existingCourseHasRaceOne) {
      byRaceResult.set(key, row);
    }
  }

  return [...byRaceResult.values()];
}

export type GetHistoryOptions = {
  /** Restrict horse history to HK calendar dates from (today − (pastDays − 1)) through today inclusive. Omit for full list (legacy API clients). */
  horsePastDays?: number;
};

function normalizeHorsePastDays(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const n = Math.floor(value);
  if (n < 1) {
    return undefined;
  }
  return Math.min(n, 366);
}

function subtractCalendarDaysIso(ymd: string, subtractDays: number): string {
  const [ys, ms, ds] = ymd.split("-");
  const y = Number.parseInt(ys ?? "0", 10);
  const m = Number.parseInt(ms ?? "0", 10);
  const d = Number.parseInt(ds ?? "0", 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return ymd;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - subtractDays);
  return dt.toISOString().slice(0, 10);
}

/** HK calendar date fallback when DB is unreachable. */
function hkYmdIntlFallback(): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  let year = "";
  let month = "";
  let day = "";
  for (const p of parts) {
    if (p.type === "year") {
      year = p.value;
    }
    if (p.type === "month") {
      month = p.value;
    }
    if (p.type === "day") {
      day = p.value;
    }
  }
  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

async function hkTodayYmdForHistory(): Promise<string> {
  if (!canUseDatabase()) {
    return hkYmdIntlFallback();
  }
  try {
    const row = await dbQuery<{ ymd: string }>(
      `SELECT TO_CHAR((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Hong_Kong')::date, 'YYYY-MM-DD') AS ymd`,
    );
    const ymd = row.rows[0]?.ymd;
    if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return ymd;
    }
  } catch {
    /* fall through */
  }
  return hkYmdIntlFallback();
}

function filterHorseHistoryByPastDays(rows: HistoryEntry[], pastDays: number, hkToday: string): HistoryEntry[] {
  const cutoff = subtractCalendarDaysIso(hkToday, pastDays - 1);
  return rows.filter((row) => row.date >= cutoff);
}

function calendarDaysBetween(earlierYmd: string, laterYmd: string): number {
  const [ey, em, ed] = earlierYmd.split("-").map((part) => Number.parseInt(part, 10));
  const [ly, lm, ld] = laterYmd.split("-").map((part) => Number.parseInt(part, 10));
  if (![ey, em, ed, ly, lm, ld].every(Number.isFinite)) {
    return 0;
  }
  const earlier = Date.UTC(ey, em - 1, ed);
  const later = Date.UTC(ly, lm - 1, ld);
  return Math.max(0, Math.round((later - earlier) / MS_PER_DAY));
}

async function getLatestHorseRaceDateYmd(): Promise<string | null> {
  if (!canUseDatabase()) {
    return null;
  }
  try {
    const { rows } = await dbQuery<{ ymd: string | null }>(
      `
      SELECT TO_CHAR(MAX(race_date), 'YYYY-MM-DD') AS ymd
      FROM race_results
      WHERE race_id ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}-)?(ST|HV)-R[0-9]+$'
      `,
    );
    const ymd = rows[0]?.ymd;
    return ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
  } catch {
    return null;
  }
}

async function getLatestMark6DrawDateYmd(): Promise<string | null> {
  if (!canUseDatabase()) {
    return null;
  }
  try {
    const { rows } = await dbQuery<{ ymd: string | null }>(
      `SELECT TO_CHAR(MAX(draw_date), 'YYYY-MM-DD') AS ymd FROM mark6_results`,
    );
    const ymd = rows[0]?.ymd;
    return ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
  } catch {
    return null;
  }
}

async function finalizeHorseFallbackRows(locale: Locale, options?: GetHistoryOptions): Promise<HistoryEntry[]> {
  const rows = getHistoryFallback("horse", locale);
  const pd = normalizeHorsePastDays(options?.horsePastDays);
  if (!pd) {
    return rows;
  }
  const hk = await hkTodayYmdForHistory();
  return filterHorseHistoryByPastDays(rows, pd, hk);
}

async function finalizeHistoryFallback(
  mode: Mode,
  locale: Locale,
  options?: GetHistoryOptions,
): Promise<HistoryEntry[]> {
  if (mode !== "horse") {
    return getHistoryFallback(mode, locale);
  }
  return finalizeHorseFallbackRows(locale, options);
}

function canUseDatabase() {
  return hasDatabaseConfig();
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

/** Best-effort HKJC scrape of recent racedays — mirrors cron tuning so newest races appear on History shortly after HKJC publishes. */
let horseRaceIngestNearTermInFlight: Promise<void> | undefined;
/** Avoid hammering HKJC when the home calendar triggers many sequential requests. */
let horseRaceNearTermLastAttemptMs = 0;
const HORSE_RACE_NEAR_TERM_COOLDOWN_MS = 90_000;

/** When `/api/history` already has substantial race aggregates, skip on-read ingestion to avoid lambdas timing out (~60s) while sequentially scraping HKJC. */
async function horseHistoryCorpusWarmEnoughForSkipIngest(): Promise<boolean> {
  if (!canUseDatabase()) {
    return false;
  }
  try {
    const threshold = Number.parseInt(
      process.env.HISTORY_HORSE_SKIP_INGEST_MIN_DISTINCT ?? "",
      10,
    );
    const effectiveMinDistinct = Number.isFinite(threshold)
      ? Math.max(12, threshold)
      : 28;

    const { rows } = await dbQuery<{ races: number }>(
      `
      SELECT COUNT(DISTINCT (race_date::text || '|' || race_id))::int AS races
      FROM race_results
      WHERE race_id ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}-)?(ST|HV)-R[0-9]+$'
      `,
    );
    return (rows[0]?.races ?? 0) >= effectiveMinDistinct;
  } catch {
    return false;
  }
}

async function refreshHorseRaceResultsNearTerm(options?: { forHistory?: boolean }): Promise<void> {
  const now = Date.now();

  const inFlight = horseRaceIngestNearTermInFlight;
  if (inFlight) {
    await inFlight;
    return;
  }

  const hkToday = await hkTodayYmdForHistory();
  const latestRaceDate = await getLatestHorseRaceDateYmd();
  const dayGap = latestRaceDate ? calendarDaysBetween(latestRaceDate, hkToday) : 999;
  const needsRefresh = dayGap > 4 || !latestRaceDate;
  const corpusWarm = await horseHistoryCorpusWarmEnoughForSkipIngest();

  if (!needsRefresh && corpusWarm && !options?.forHistory) {
    return;
  }

  if (
    !needsRefresh &&
    !options?.forHistory &&
    now - horseRaceNearTermLastAttemptMs < HORSE_RACE_NEAR_TERM_COOLDOWN_MS
  ) {
    return;
  }

  if (
    options?.forHistory &&
    !needsRefresh &&
    now - horseRaceNearTermLastAttemptMs < HORSE_RACE_NEAR_TERM_COOLDOWN_MS
  ) {
    return;
  }

  horseRaceNearTermLastAttemptMs = now;

  const meetingCap = Number.parseInt(
    process.env.HISTORY_HORSE_INGEST_MAX_MEETING_DATES ?? "",
    10,
  );
  const effectiveMeetingsCap = Number.isFinite(meetingCap)
    ? Math.max(2, Math.min(options?.forHistory ? 4 : 12, meetingCap))
    : options?.forHistory
      ? 3
      : 4;

  const runIngest = (async (): Promise<void> => {
    const start = new Date();
    const from = new Date(start);
    from.setDate(start.getDate() - (options?.forHistory ? 21 : 18));
    const fromDate = from.toISOString().slice(0, 10);
    await ingestHorseRacingFromHkjc({
      fromDate,
      maxMeetingDates: effectiveMeetingsCap,
    }).catch(() => undefined);
  })();

  horseRaceIngestNearTermInFlight = runIngest.then(() => undefined).finally(() => {
    horseRaceIngestNearTermInFlight = undefined;
  });

  await horseRaceIngestNearTermInFlight;
}

let mark6IngestNearTermInFlight: Promise<void> | undefined;
let mark6NearTermLastAttemptMs = 0;
const MARK6_NEAR_TERM_COOLDOWN_MS = 90_000;

async function runMark6RecentIngest(maxDraws = 48, daysBack = 60): Promise<void> {
  const hkToday = await hkTodayYmdForHistory();
  const fromDate = subtractCalendarDaysIso(hkToday, daysBack);
  await ingestMarkSixFromWeb({ fromDate, maxDraws }).catch(() => undefined);
  const liveDraw = await getLatestHkjcMark6PreviousDraw().catch(() => null);
  if (liveDraw) {
    await upsertMark6PreviousDraw(liveDraw).catch(() => undefined);
  }
}

/** Best-effort Mark Six ingest for suggestions when DB is thin or stale. */
async function refreshMark6ResultsNearTerm(): Promise<void> {
  if (!canUseDatabase()) {
    return;
  }

  const inFlight = mark6IngestNearTermInFlight;
  if (inFlight) {
    await inFlight;
    return;
  }

  const hkToday = await hkTodayYmdForHistory();
  const latestDraw = await getLatestMark6DrawDateYmd();
  const dayGap = latestDraw ? calendarDaysBetween(latestDraw, hkToday) : 999;
  const needsRefresh = dayGap > 3 || !latestDraw;

  if (!needsRefresh) {
    try {
      const { rows } = await dbQuery<{ draws: number }>(
        `SELECT COUNT(*)::int AS draws FROM mark6_results`,
      );
      if ((rows[0]?.draws ?? 0) >= 25) {
        return;
      }
    } catch {
      return;
    }
  }

  const now = Date.now();
  if (!needsRefresh && now - mark6NearTermLastAttemptMs < MARK6_NEAR_TERM_COOLDOWN_MS) {
    return;
  }
  mark6NearTermLastAttemptMs = now;

  const runIngest = runMark6RecentIngest(48, 60);

  mark6IngestNearTermInFlight = runIngest.then(() => undefined).finally(() => {
    mark6IngestNearTermInFlight = undefined;
  });

  await mark6IngestNearTermInFlight;
}

/** History page: always refresh recent draws (bounded) instead of a 5-year backfill. */
async function refreshMark6ResultsForHistory(): Promise<void> {
  if (!canUseDatabase()) {
    return;
  }

  const inFlight = mark6IngestNearTermInFlight;
  if (inFlight) {
    await inFlight;
    return;
  }

  const hkToday = await hkTodayYmdForHistory();
  const latestDraw = await getLatestMark6DrawDateYmd();
  const dayGap = latestDraw ? calendarDaysBetween(latestDraw, hkToday) : 999;
  const needsRefresh = dayGap > 2 || !latestDraw;
  const now = Date.now();

  if (!needsRefresh && now - mark6NearTermLastAttemptMs < MARK6_NEAR_TERM_COOLDOWN_MS) {
    return;
  }

  mark6NearTermLastAttemptMs = now;

  const runIngest = runMark6RecentIngest(56, 75);

  mark6IngestNearTermInFlight = runIngest.then(() => undefined).finally(() => {
    mark6IngestNearTermInFlight = undefined;
  });

  await mark6IngestNearTermInFlight;
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function formatDateKey(value: string | Date): string {
  return toDate(value).toISOString().slice(0, 10);
}

function getFallbackPreviousMark6Draw(targetDate: string): Mark6PreviousDraw {
  const target = toDate(targetDate);
  const targetTime = Number.isNaN(target.getTime()) ? Date.now() : target.getTime();
  const previousDraw =
    [...mark6FallbackRows]
      .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime())
      .find((row) => toDate(row.date).getTime() < targetTime) ?? mark6FallbackRows.at(-1);

  return {
    date: previousDraw?.date ?? "",
    numbers: [...(previousDraw?.numbers ?? [])].sort((a, b) => a - b),
    source: "fallback",
  };
}

async function getLatestHkjcMark6PreviousDraw(): Promise<Mark6PreviousDraw | null> {
  const response = await fetch(HKJC_MARK6_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; MobileBettingAssistant/1.0)",
      Origin: "https://bet.hkjc.com",
      Referer: "https://bet.hkjc.com/marksix/Results.aspx?lang=en",
    },
    body: JSON.stringify({
      query: HKJC_MARK6_DRAW_QUERY,
      variables: {},
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HKJC Mark Six fetch failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { lotteryDraws?: HkjcMark6Draw[] | null };
  };
  const latestResult = (payload.data?.lotteryDraws ?? []).find(
    (draw) =>
      draw.status === "Result" &&
      (draw.drawResult?.drawnNo?.filter((value) => Number.isInteger(value)).length ?? 0) >= 6,
  );
  if (!latestResult?.drawDate || !latestResult.drawResult?.drawnNo) {
    return null;
  }

  return {
    date: latestResult.drawDate.slice(0, 10),
    numbers: latestResult.drawResult.drawnNo.slice(0, 6).sort((a, b) => a - b),
    specialNumber: Number.isInteger(latestResult.drawResult.xDrawnNo)
      ? latestResult.drawResult.xDrawnNo
      : undefined,
    source: "hkjc",
  };
}

async function upsertMark6PreviousDraw(draw: Mark6PreviousDraw) {
  if (!canUseDatabase() || draw.source !== "hkjc" || draw.numbers.length !== 6) {
    return;
  }

  try {
    await dbQuery(
      `
      INSERT INTO mark6_results (draw_date, numbers, special_number, jackpot_amount, source)
      VALUES ($1::date, $2::int[], $3, NULL, 'hkjc-live')
      ON CONFLICT (draw_date)
      DO UPDATE SET
        numbers = EXCLUDED.numbers,
        special_number = EXCLUDED.special_number,
        source = EXCLUDED.source,
        ingested_at = NOW()
      `,
      [draw.date, draw.numbers, draw.specialNumber ?? null],
    );
  } catch {
    // Live display should not fail if the local history cache cannot be updated.
  }
}

export async function getLatestMark6PreviousDraw(
  targetDate = new Date().toISOString().slice(0, 10),
): Promise<Mark6PreviousDraw> {
  const liveDraw = await getLatestHkjcMark6PreviousDraw().catch(() => null);
  if (liveDraw) {
    await upsertMark6PreviousDraw(liveDraw);
    return liveDraw;
  }

  if (canUseDatabase()) {
    try {
      await ensureSchema();
      const rows = await dbQuery<{
        draw_date: string;
        numbers: number[];
        special_number: number | null;
      }>(
        `
        SELECT draw_date, numbers, special_number
        FROM mark6_results
        ORDER BY draw_date DESC
        LIMIT 1
        `,
      );
      const latest = rows.rows[0];
      if (latest) {
        return {
          date: formatDateKey(latest.draw_date),
          numbers: [...latest.numbers].sort((a, b) => a - b),
          specialNumber: latest.special_number ?? undefined,
          source: "database",
        };
      }
    } catch {
      // Fall through to bundled sample result.
    }
  }

  return getFallbackPreviousMark6Draw(targetDate);
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
type HorseSignalComponent =
  | "historicalHorseScore"
  | "recentForm"
  | "distanceTop3Rate"
  | "distanceWinRate"
  | "trackTop3Rate"
  | "pairTop3Rate"
  | "jockeyTop3Rate"
  | "trainerTop3Rate"
  | "jockeyWinRate"
  | "trainerWinRate"
  | "drawBias";
type HorseSignalWeights = Record<HorseSignalComponent, number>;

const HORSE_PROFILE_WEIGHTS: Record<HorseAnalystProfile, HorseSignalWeights> = {
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

function getAverageHorseSignalWeights(activeProfiles: HorseAnalystProfile[]): HorseSignalWeights {
  const profiles: HorseAnalystProfile[] =
    activeProfiles.length > 0 ? activeProfiles : ["topHandicapper"];
  const componentKeys = Object.keys(HORSE_PROFILE_WEIGHTS.topHandicapper) as HorseSignalComponent[];
  const averaged = componentKeys.reduce(
    (acc, key) => {
      const sum = profiles.reduce((value, profile) => value + HORSE_PROFILE_WEIGHTS[profile][key], 0);
      acc[key] = sum / profiles.length;
      return acc;
    },
    {} as HorseSignalWeights,
  );
  return averaged;
}

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

export type Mark6ExpertProfile = "frequencyHistorian" | "momentumTracker" | "drawPatternSpecialist";
export type Mark6ExpertStrategy = "consensus" | "single";

type Mark6ExpertWeightProfile = {
  historicalHitWeight: number;
  trainedModelFrequencyBlend: number;
  trainedModelLiftBlend: number;
  previousDrawRepeatMultiplier: number;
  previousDrawAdjacentBoost: number;
  previousDrawNearBoost: number;
  previousDrawMirrorBoost: number;
  previousDrawDecadeBoost: number;
  temporalSeasonalBoost: number;
};

const MARK6_EXPERT_WEIGHTS: Record<Mark6ExpertProfile, Mark6ExpertWeightProfile> = {
  /** Long-horizon frequency + statistical model emphasis (PRD: Data Scientist). */
  frequencyHistorian: {
    historicalHitWeight: 1.35,
    trainedModelFrequencyBlend: 0.35,
    trainedModelLiftBlend: 0.65,
    previousDrawRepeatMultiplier: 0.78,
    previousDrawAdjacentBoost: 0.45,
    previousDrawNearBoost: 0.15,
    previousDrawMirrorBoost: 0.2,
    previousDrawDecadeBoost: 0.06,
    temporalSeasonalBoost: 1.05,
  },
  /** Recency, seasonal windows, and short-run model lift. */
  momentumTracker: {
    historicalHitWeight: 1.1,
    trainedModelFrequencyBlend: 0.48,
    trainedModelLiftBlend: 0.72,
    previousDrawRepeatMultiplier: 0.7,
    previousDrawAdjacentBoost: 0.55,
    previousDrawNearBoost: 0.22,
    previousDrawMirrorBoost: 0.28,
    previousDrawDecadeBoost: 0.1,
    temporalSeasonalBoost: 1.35,
  },
  /** Previous-draw neighbours, mirrors, and decade clustering. */
  drawPatternSpecialist: {
    historicalHitWeight: 0.9,
    trainedModelFrequencyBlend: 0.42,
    trainedModelLiftBlend: 0.48,
    previousDrawRepeatMultiplier: 0.65,
    previousDrawAdjacentBoost: 0.95,
    previousDrawNearBoost: 0.42,
    previousDrawMirrorBoost: 0.55,
    previousDrawDecadeBoost: 0.14,
    temporalSeasonalBoost: 1.0,
  },
};

const MARK6_EXPERT_PROFILE_KEYS = Object.keys(MARK6_EXPERT_WEIGHTS) as Mark6ExpertProfile[];

function getAverageMark6ExpertWeights(activeProfiles: Mark6ExpertProfile[]): Mark6ExpertWeightProfile {
  const profiles: Mark6ExpertProfile[] =
    activeProfiles.length > 0 ? activeProfiles : ["frequencyHistorian"];
  const keys = Object.keys(MARK6_EXPERT_WEIGHTS.frequencyHistorian) as (keyof Mark6ExpertWeightProfile)[];
  return keys.reduce((acc, key) => {
    const sum = profiles.reduce((value, profile) => value + MARK6_EXPERT_WEIGHTS[profile][key], 0);
    acc[key] = sum / profiles.length;
    return acc;
  }, {} as Mark6ExpertWeightProfile);
}

function getMark6ExpertConfig(overrides?: {
  strategy?: Mark6ExpertStrategy;
  primaryProfile?: Mark6ExpertProfile;
}): {
  strategy: Mark6ExpertStrategy;
  primaryProfile: Mark6ExpertProfile;
} {
  const strategyRaw = (process.env.MARK6_EXPERT_STRATEGY ?? "consensus").toLowerCase();
  const profileRaw = (process.env.MARK6_EXPERT_PROFILE ?? "frequencyHistorian").toLowerCase();

  const strategy: Mark6ExpertStrategy = strategyRaw === "single" ? "single" : "consensus";

  let primaryProfile: Mark6ExpertProfile = "frequencyHistorian";
  if (profileRaw === "momentumtracker") {
    primaryProfile = "momentumTracker";
  } else if (profileRaw === "drawpatternspecialist") {
    primaryProfile = "drawPatternSpecialist";
  }

  return {
    strategy: overrides?.strategy ?? strategy,
    primaryProfile: overrides?.primaryProfile ?? primaryProfile,
  };
}

function getMark6ExpertProfileList(config: ReturnType<typeof getMark6ExpertConfig>): Mark6ExpertProfile[] {
  return config.strategy === "single"
    ? [config.primaryProfile]
    : MARK6_EXPERT_PROFILE_KEYS;
}

function getMark6ExpertExplanationSnippet(
  locale: Locale,
  activeProfiles: Mark6ExpertProfile[],
  strategy: Mark6ExpertStrategy,
): string {
  const label =
    locale === "zh-HK"
      ? {
          frequencyHistorian: "頻率史學家",
          momentumTracker: "動能追蹤",
          drawPatternSpecialist: "開獎圖形專家",
        }
      : {
          frequencyHistorian: "Frequency Historian",
          momentumTracker: "Momentum Tracker",
          drawPatternSpecialist: "Draw Pattern Specialist",
        };
  const names = activeProfiles.map((profile) => label[profile]).join(locale === "zh-HK" ? "、" : ", ");
  if (locale === "zh-HK") {
    return strategy === "single"
      ? ` 並由 Mark Six 專家「${names}」調整各訊號權重。`
      : ` 並由 Mark Six 專家共識（${names}）混合各訊號權重。`;
  }
  return strategy === "single"
    ? ` Mark Six expert "${names}" tuned the signal weights.`
    : ` Mark Six expert consensus (${names}) blended the signal weights.`;
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

function computeHorseRunnerSignals(
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
  },
): {
  score: number;
  components: Record<HorseSignalComponent, number>;
} {
  const weights = getAverageHorseSignalWeights(activeProfiles);
  const historicalHorseScore = horseScore.get(horseName) ?? 0;
  const pairKey = `${jockey}|${trainer}`;
  const pairForm = pairStats.get(pairKey);
  const jockeyForm = jockeyStats.get(jockey);
  const trainerForm = trainerStats.get(trainer);
  const recentForm = performance?.recentForm ?? 0;
  const distanceTop3Rate = performance?.distanceTop3Rate ?? 0;
  const distanceWinRate = performance?.distanceWinRate ?? 0;
  const trackTop3Rate = performance?.trackTop3Rate ?? 0;
  const components: Record<HorseSignalComponent, number> = {
    historicalHorseScore: historicalHorseScore * weights.historicalHorseScore,
    recentForm: recentForm * weights.recentForm,
    distanceTop3Rate: distanceTop3Rate * weights.distanceTop3Rate,
    distanceWinRate: distanceWinRate * weights.distanceWinRate,
    trackTop3Rate: trackTop3Rate * weights.trackTop3Rate,
    pairTop3Rate: getTop3Rate(pairForm) * weights.pairTop3Rate,
    jockeyTop3Rate: getTop3Rate(jockeyForm) * weights.jockeyTop3Rate,
    trainerTop3Rate: getTop3Rate(trainerForm) * weights.trainerTop3Rate,
    jockeyWinRate: getWinRate(jockeyForm) * weights.jockeyWinRate,
    trainerWinRate: getWinRate(trainerForm) * weights.trainerWinRate,
    drawBias: getDrawBias(draw) * weights.drawBias,
  };
  const score = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { score, components };
}

const HORSE_COMPONENT_LABELS: Record<HorseSignalComponent, string> = {
  historicalHorseScore: "Historical trend",
  recentForm: "Recent form",
  distanceTop3Rate: "Distance top-3 fit",
  distanceWinRate: "Distance win fit",
  trackTop3Rate: "Track fit",
  pairTop3Rate: "Jockey-trainer synergy",
  jockeyTop3Rate: "Jockey form",
  trainerTop3Rate: "Trainer form",
  jockeyWinRate: "Jockey win rate",
  trainerWinRate: "Trainer win rate",
  drawBias: "Draw bias",
};

function buildHorseTopFactors(components: Record<HorseSignalComponent, number>) {
  return (Object.entries(components) as Array<[HorseSignalComponent, number]>)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => ({
      label: HORSE_COMPONENT_LABELS[key],
      impactScore: Math.round(value * 100) / 100,
    }));
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

function getNumberMixFilteredEntries(
  entries: Array<{ number: number; score: number }>,
  numberMix: Mark6NumberMix,
) {
  if (numberMix === "smallOnly") {
    return entries.filter((item) => item.number <= 24);
  }
  if (numberMix === "bigOnly") {
    return entries.filter((item) => item.number >= 25);
  }
  return entries;
}

function normalizeManualMark6Numbers(numbers?: number[]): number[] {
  if (!numbers || numbers.length === 0) {
    return [];
  }
  const unique = new Set<number>();
  for (const value of numbers) {
    if (Number.isInteger(value) && value >= 1 && value <= 49) {
      unique.add(value);
    }
  }
  return [...unique].sort((a, b) => a - b);
}

function buildRankedMark6Entries(
  candidateEntries: Array<[number, number]>,
  minimumCandidateCount: number,
  numberMix: Mark6NumberMix,
): Array<{ number: number; score: number }> {
  const sortedEntries = [...candidateEntries].sort((a, b) => b[1] - a[1]);
  const selectedNumbers = new Set<number>();
  const rankedEntries = sortedEntries.slice(0, minimumCandidateCount);

  for (const [number] of rankedEntries) {
    selectedNumbers.add(number);
  }

  if (numberMix === "bigOnly") {
    for (const entry of sortedEntries) {
      const [number] = entry;
      if (number >= 25 && !selectedNumbers.has(number)) {
        rankedEntries.push(entry);
        selectedNumbers.add(number);
      }
    }
  }

  return rankedEntries.map(([number, score]) => ({ number, score }));
}

function pickMark6SetWithMix(
  entries: Array<{ number: number; score: number }>,
  numberMix: Mark6NumberMix,
): number[] {
  if (numberMix === "mixed") {
    const smallPool = entries.filter((item) => item.number <= 24);
    const bigPool = entries.filter((item) => item.number >= 25);
    if (smallPool.length >= 3 && bigPool.length >= 3) {
      const smallPicks = pickWeightedNumbers(smallPool, 3);
      const bigPicks = pickWeightedNumbers(bigPool, 3);
      return [...smallPicks, ...bigPicks].sort((a, b) => a - b);
    }
  }

  const filtered = getNumberMixFilteredEntries(entries, numberMix);
  if (filtered.length >= 6) {
    return pickWeightedNumbers(filtered, 6);
  }
  return pickWeightedNumbers(entries, 6);
}

function buildMark6BatchSets(
  entries: Array<{ number: number; score: number }>,
  batchCount: number,
  numberMix: Mark6NumberMix,
): number[][] {
  const normalizedCount = Math.max(1, Math.min(batchCount, 12));
  const sets: number[][] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (sets.length < normalizedCount && attempts < normalizedCount * 8) {
    attempts += 1;
    const set = pickMark6SetWithMix(entries, numberMix);
    const key = set.join("-");
    if (!seen.has(key)) {
      seen.add(key);
      sets.push(set);
    }
  }
  if (sets.length === 0) {
    sets.push(pickMark6SetWithMix(entries, numberMix));
  }
  return sets;
}

function applyPreviousDrawSignal(
  scoreByNumber: Map<number, number>,
  previousDraw?: Mark6PreviousDraw | null,
  expertWeights?: Mark6ExpertWeightProfile,
) {
  if (!previousDraw || previousDraw.numbers.length < 6) {
    return;
  }

  const w = expertWeights ?? getAverageMark6ExpertWeights(["frequencyHistorian"]);
  const drawnNumbers = new Set(previousDraw.numbers);
  const signalNumbers = previousDraw.specialNumber
    ? [...previousDraw.numbers, previousDraw.specialNumber]
    : previousDraw.numbers;

  for (let number = 1; number <= 49; number += 1) {
    let score = scoreByNumber.get(number) ?? 0;

    if (drawnNumbers.has(number)) {
      score *= w.previousDrawRepeatMultiplier;
    }

    for (const drawnNumber of signalNumbers) {
      const distance = Math.abs(number - drawnNumber);
      if (distance === 1) {
        score += w.previousDrawAdjacentBoost;
      } else if (distance === 2) {
        score += w.previousDrawNearBoost;
      }
      if (number === 50 - drawnNumber) {
        score += w.previousDrawMirrorBoost;
      }
      if (
        Math.floor((number - 1) / 10) === Math.floor((drawnNumber - 1) / 10) &&
        number !== drawnNumber
      ) {
        score += w.previousDrawDecadeBoost;
      }
    }

    scoreByNumber.set(number, score);
  }
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
}

function getNumberDrawFrequency(
  draws: Mark6TrainingDraw[],
  number: number,
  predicate?: (draw: Mark6TrainingDraw) => boolean,
) {
  const matchingDraws = predicate ? draws.filter(predicate) : draws;
  if (matchingDraws.length === 0) {
    return MARK6_BASELINE_PROBABILITY;
  }

  const hits = matchingDraws.filter((draw) => draw.numbers.includes(number)).length;
  return hits / matchingDraws.length;
}

function getDrawGap(draws: Mark6TrainingDraw[], number: number) {
  for (let index = draws.length - 1; index >= 0; index -= 1) {
    if (draws[index]?.numbers.includes(number)) {
      return draws.length - index;
    }
  }
  return 40;
}

function buildMark6ModelFeatures(
  number: number,
  priorDraws: Mark6TrainingDraw[],
  targetDate: Date,
) {
  const previousDraw = priorDraws.at(-1);
  const previousNumbers = previousDraw?.numbers ?? [];
  const recent10 = priorDraws.slice(-10);
  const recent30 = priorDraws.slice(-30);
  const targetWeekday = targetDate.getDay();
  const targetMonth = targetDate.getMonth();

  const longFrequency = getNumberDrawFrequency(priorDraws, number);
  const recent10Frequency = getNumberDrawFrequency(recent10, number);
  const recent30Frequency = getNumberDrawFrequency(recent30, number);
  const weekdayFrequency = getNumberDrawFrequency(
    priorDraws,
    number,
    (draw) => draw.drawDate.getDay() === targetWeekday,
  );
  const monthFrequency = getNumberDrawFrequency(
    priorDraws,
    number,
    (draw) => draw.drawDate.getMonth() === targetMonth,
  );
  const gap = getDrawGap(priorDraws, number);

  return [
    1,
    (longFrequency - MARK6_BASELINE_PROBABILITY) * 6,
    (recent10Frequency - MARK6_BASELINE_PROBABILITY) * 4,
    (recent30Frequency - MARK6_BASELINE_PROBABILITY) * 5,
    Math.min(gap, 40) / 40 - 0.5,
    previousNumbers.includes(number) ? 1 : 0,
    previousNumbers.some((drawnNumber) => Math.abs(drawnNumber - number) <= 2) ? 1 : 0,
    previousNumbers.some((drawnNumber) => 50 - drawnNumber === number) ? 1 : 0,
    previousNumbers.some(
      (drawnNumber) =>
        Math.floor((drawnNumber - 1) / 10) === Math.floor((number - 1) / 10) &&
        drawnNumber !== number,
    )
      ? 1
      : 0,
    (weekdayFrequency - MARK6_BASELINE_PROBABILITY) * 4,
    (monthFrequency - MARK6_BASELINE_PROBABILITY) * 4,
  ];
}

function trainMark6StatisticalModel(draws: Mark6TrainingDraw[]) {
  if (draws.length < 25) {
    return null;
  }

  const weights = [
    Math.log(MARK6_BASELINE_PROBABILITY / (1 - MARK6_BASELINE_PROBABILITY)),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  const learningRate = 0.025;
  const l2 = 0.0005;

  for (let epoch = 0; epoch < 4; epoch += 1) {
    for (let drawIndex = 12; drawIndex < draws.length; drawIndex += 1) {
      const priorDraws = draws.slice(0, drawIndex);
      const actualNumbers = new Set(draws[drawIndex]?.numbers ?? []);
      const drawDate = draws[drawIndex]?.drawDate ?? new Date();

      for (let number = 1; number <= 49; number += 1) {
        const features = buildMark6ModelFeatures(number, priorDraws, drawDate);
        const prediction = sigmoid(
          features.reduce((sum, feature, index) => sum + feature * (weights[index] ?? 0), 0),
        );
        const label = actualNumbers.has(number) ? 1 : 0;
        const error = label - prediction;

        for (let index = 0; index < weights.length; index += 1) {
          const regularization = index === 0 ? 0 : l2 * (weights[index] ?? 0);
          weights[index] = (weights[index] ?? 0) + learningRate * (error * (features[index] ?? 0) - regularization);
        }
      }
    }
  }

  return weights;
}

function applyTrainedMark6Model(
  scoreByNumber: Map<number, number>,
  draws: Mark6TrainingDraw[],
  targetDate: Date,
  expertWeights?: Mark6ExpertWeightProfile,
) {
  const weights = trainMark6StatisticalModel(draws);
  if (!weights) {
    return;
  }

  const blend = expertWeights ?? getAverageMark6ExpertWeights(["frequencyHistorian"]);

  const modelProbabilities = new Map<number, number>();
  for (let number = 1; number <= 49; number += 1) {
    const features = buildMark6ModelFeatures(number, draws, targetDate);
    modelProbabilities.set(
      number,
      sigmoid(features.reduce((sum, feature, index) => sum + feature * (weights[index] ?? 0), 0)),
    );
  }

  const averageScore =
    [...scoreByNumber.values()].reduce((sum, score) => sum + Math.max(score, 0.001), 0) /
    Math.max(1, scoreByNumber.size);

  for (let number = 1; number <= 49; number += 1) {
    const currentScore = Math.max(scoreByNumber.get(number) ?? 0.001, 0.001);
    const modelLift = (modelProbabilities.get(number) ?? MARK6_BASELINE_PROBABILITY) / MARK6_BASELINE_PROBABILITY;
    scoreByNumber.set(
      number,
      currentScore * blend.trainedModelFrequencyBlend +
        averageScore * modelLift * blend.trainedModelLiftBlend,
    );
  }
}

type Mark6HolidayKey =
  | "newYear"
  | "valentines"
  | "labourDay"
  | "hksarDay"
  | "nationalDay"
  | "christmas"
  | "newYearsEve";

const MARK6_HOLIDAY_ANCHORS: Array<{ key: Mark6HolidayKey; month: number; day: number }> = [
  { key: "newYear", month: 1, day: 1 },
  { key: "valentines", month: 2, day: 14 },
  { key: "labourDay", month: 5, day: 1 },
  { key: "hksarDay", month: 7, day: 1 },
  { key: "nationalDay", month: 10, day: 1 },
  { key: "christmas", month: 12, day: 25 },
  { key: "newYearsEve", month: 12, day: 31 },
];

function getHolidaySeasonKey(date: Date): Mark6HolidayKey | null {
  const month = date.getMonth() + 1;
  for (const anchor of MARK6_HOLIDAY_ANCHORS) {
    const anchorDate = new Date(date.getFullYear(), anchor.month - 1, anchor.day);
    const diffDays = Math.abs(Math.round((date.getTime() - anchorDate.getTime()) / MS_PER_DAY));
    if (diffDays <= 3 && month === anchor.month) {
      return anchor.key;
    }
  }
  return null;
}

function getDayMonthDistance(source: Date, target: Date): number {
  const sourceMonth = source.getMonth() + 1;
  const sourceDay = source.getDate();
  const targetMonth = target.getMonth() + 1;
  const targetDay = target.getDate();
  if (sourceMonth !== targetMonth) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.abs(sourceDay - targetDay);
}

function getMark6TemporalWeight(drawDate: Date, targetDate: Date): number {
  const ageDays = Math.max(0, Math.round((targetDate.getTime() - drawDate.getTime()) / MS_PER_DAY));
  const recencyRatio = Math.max(0, 1 - ageDays / HISTORY_WINDOW_DAYS);
  const recencyWeight = 1 + recencyRatio * 0.6;

  const sameDayMonth = drawDate.getMonth() === targetDate.getMonth() && drawDate.getDate() === targetDate.getDate();
  const sameMonth = drawDate.getMonth() === targetDate.getMonth();
  const sameWeekday = drawDate.getDay() === targetDate.getDay();
  const dayMonthDistance = getDayMonthDistance(drawDate, targetDate);
  const nearDayMonth = dayMonthDistance <= 7;

  const targetHoliday = getHolidaySeasonKey(targetDate);
  const drawHoliday = getHolidaySeasonKey(drawDate);
  const sameHolidaySeason = targetHoliday && drawHoliday && targetHoliday === drawHoliday;
  const bothHolidaySeason = targetHoliday && drawHoliday;

  let seasonalBoost = 1;
  if (sameDayMonth) {
    seasonalBoost += 1.0;
  } else if (nearDayMonth) {
    seasonalBoost += 0.45;
  }
  if (sameMonth) {
    seasonalBoost += 0.25;
  }
  if (sameWeekday) {
    seasonalBoost += 0.18;
  }
  if (sameHolidaySeason) {
    seasonalBoost += 0.8;
  } else if (bothHolidaySeason) {
    seasonalBoost += 0.35;
  }

  return recencyWeight * seasonalBoost;
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

function buildMark6NumberProbabilities(
  entries: Array<{ number: number; score: number }>,
): Mark6NumberProbability[] {
  const positiveEntries = entries
    .map((entry) => ({
      number: entry.number,
      score: Math.max(entry.score, 0.001),
    }))
    .filter((entry) => entry.number >= 1 && entry.number <= 49);
  const totalScore = positiveEntries.reduce((sum, entry) => sum + entry.score, 0);
  if (totalScore <= 0) {
    return [];
  }

  return positiveEntries
    .map((entry) => ({
      number: entry.number,
      probability: Math.round(Math.min(99.9, (entry.score / totalScore) * 600) * 10) / 10,
    }))
    .sort((a, b) => b.probability - a.probability || a.number - b.number);
}

function getLocalizedDisclaimer(locale: Locale) {
  return locale === "zh-HK"
    ? "僅供娛樂用途，不保證中獎，並非財務建議。"
    : "For entertainment only. No guaranteed winnings. No financial advice.";
}

function getPreviousDrawSignalExplanation(locale: Locale, previousDraw?: Mark6PreviousDraw | null) {
  if (!previousDraw) {
    return "";
  }
  return locale === "zh-HK"
    ? ` 並已用歷史開彩序列訓練統計模型，再加入上一期（${previousDraw.date}）官方號碼作相鄰號、鏡像號及避免即時重複的權重訊號。`
    : ` It also trains a statistical model on the historical draw sequence, then uses the previous draw (${previousDraw.date}) as a weighting signal for adjacent numbers, mirror numbers, and reduced immediate repeats.`;
}

async function getMark6Suggestion(
  locale: Locale,
  targetDate: string,
  predictionType: Mark6PredictionType,
  batchCount: number,
  numberMix: Mark6NumberMix,
  generateMode: Mark6GenerateMode,
  manualNumbers?: number[],
  previousDrawSignal?: Mark6PreviousDraw | null,
  expertOverrides?: {
    strategy?: Mark6ExpertStrategy;
    primaryProfile?: Mark6ExpertProfile;
  },
): Promise<SuggestionBase> {
  const expertConfig = getMark6ExpertConfig(expertOverrides);
  const activeExpertProfiles = getMark6ExpertProfileList(expertConfig);
  const expertWeights = getAverageMark6ExpertWeights(activeExpertProfiles);
  const expertSnippet = getMark6ExpertExplanationSnippet(
    locale,
    activeExpertProfiles,
    expertConfig.strategy,
  );

  if (!canUseDatabase()) {
    return getMark6SuggestionFallback(
      locale,
      targetDate,
      predictionType,
      batchCount,
      numberMix,
      generateMode,
      manualNumbers,
      previousDrawSignal,
      expertConfig,
      activeExpertProfiles,
      expertWeights,
      expertSnippet,
    );
  }

  try {
    await ensureSchema();
  } catch {
    return getMark6SuggestionFallback(
      locale,
      targetDate,
      predictionType,
      batchCount,
      numberMix,
      generateMode,
      manualNumbers,
      previousDrawSignal,
      expertConfig,
      activeExpertProfiles,
      expertWeights,
      expertSnippet,
    );
  }

  try {
    await refreshMark6ResultsNearTerm();
  } catch {
    // Continue with whatever mark6_results already exist.
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
      return getMark6SuggestionFallback(
        locale,
        targetDate,
        predictionType,
        batchCount,
        numberMix,
        generateMode,
        manualNumbers,
        previousDrawSignal,
        expertConfig,
        activeExpertProfiles,
        expertWeights,
        expertSnippet,
      );
    }

    const scoreByNumber = new Map<number, number>();
    for (let number = 1; number <= 49; number += 1) {
      scoreByNumber.set(number, 0);
    }

    for (const draw of draws.rows) {
      const drawDate = toDate(draw.draw_date);
      const temporalWeight =
        getMark6TemporalWeight(drawDate, endDateObject) * expertWeights.temporalSeasonalBoost;

      for (const number of draw.numbers) {
        scoreByNumber.set(
          number,
          (scoreByNumber.get(number) ?? 0) + temporalWeight * expertWeights.historicalHitWeight,
        );
      }
    }
    const trainingDraws = draws.rows.map((draw) => ({
      drawDate: toDate(draw.draw_date),
      numbers: draw.numbers,
    }));
    applyTrainedMark6Model(scoreByNumber, trainingDraws, endDateObject, expertWeights);
    applyPreviousDrawSignal(scoreByNumber, previousDrawSignal, expertWeights);

    const normalizedManualPool = normalizeManualMark6Numbers(manualNumbers);
    const effectiveGenerateMode: Mark6GenerateMode =
      generateMode === "manual" && normalizedManualPool.length >= 6 ? "manual" : "auto";
    const candidateEntries =
      effectiveGenerateMode === "manual" && normalizedManualPool.length > 0
        ? [...scoreByNumber.entries()].filter(([number]) => normalizedManualPool.includes(number))
        : [...scoreByNumber.entries()];

    const ranked = buildRankedMark6Entries(
      candidateEntries,
      Math.max(20, normalizedManualPool.length || 0),
      numberMix,
    );
    const confidenceBand = getMark6Confidence({
      drawCount: draws.rows.length,
      rankedScores: ranked.map((item) => item.score),
    });
    const batchSets = buildMark6BatchSets(ranked, batchCount, numberMix);
    const topSix = batchSets[0] ?? pickMark6SetWithMix(ranked, numberMix);
    const mark6Prediction = buildMark6Prediction(predictionType, ranked, numberMix, batchCount);
    const mark6NumberProbabilities = buildMark6NumberProbabilities(
      candidateEntries.map(([number, score]) => ({ number, score })),
    );
    const previousDraw = draws.rows.at(-1);

    return {
      suggestions:
        predictionType === "single"
          ? topSix.map((value) => value.toString())
          : mark6PredictionToSuggestionStrings(mark6Prediction),
      mark6PredictionType: predictionType,
      mark6Prediction,
      mark6BatchSets: batchSets,
      mark6PreviousDraw: previousDraw
        ? {
            date: formatDateKey(previousDraw.draw_date),
            numbers: [...previousDraw.numbers].sort((a, b) => a - b),
            source: "database",
          }
        : getFallbackPreviousMark6Draw(targetDate),
      mark6NumberProbabilities,
      modelVersion: "mark6-expert-consensus-v1",
      mark6Analysis: {
        strategy: expertConfig.strategy,
        activeProfiles: activeExpertProfiles,
      },
      confidenceBand,
      explanation:
        locale === "zh-HK"
          ? effectiveGenerateMode === "manual" && normalizedManualPool.length > 0
            ? `已學習近${HISTORY_YEARS}年（${draws.rows.length}期）歷史結果與節日/週期信號，並在你手動選擇的號碼池內生成${Math.max(1, Math.min(batchCount, 12))}組建議。${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`
            : `已學習近${HISTORY_YEARS}年（${draws.rows.length}期）歷史結果，並加入同月同日、相鄰週期與節日檔期權重，按你選擇的號碼分佈模式生成${Math.max(1, Math.min(batchCount, 12))}組建議。${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`
          : effectiveGenerateMode === "manual" && normalizedManualPool.length > 0
            ? `Learned from the last ${HISTORY_YEARS} years of draws (${draws.rows.length} records) with seasonal weighting, then generated ${Math.max(1, Math.min(batchCount, 12))} set(s) inside your manually selected number pool.${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`
            : `Learned from the last ${HISTORY_YEARS} years of draws (${draws.rows.length} records), then weighted same day-month patterns, nearby weekly/monthly windows, and holiday seasons to generate ${Math.max(1, Math.min(batchCount, 12))} set(s) with your selected number-mix style.${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`,
    };
  } catch {
    return getMark6SuggestionFallback(
      locale,
      targetDate,
      predictionType,
      batchCount,
      numberMix,
      generateMode,
      manualNumbers,
      previousDrawSignal,
      expertConfig,
      activeExpertProfiles,
      expertWeights,
      expertSnippet,
    );
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
    await ensureSchema();
  } catch {
    return getHorseSuggestionFallback(locale, selectedRace);
  }

  try {
    /** Same near-term HKJC ingest as History — wakes analyst weights on Vercel without a manual cron run. */
    await refreshHorseRaceResultsNearTerm();
  } catch {
    // Continue with whatever race_results already exist.
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
          score: computeHorseRunnerSignals({
            horseName: entry.horseName,
            jockey: entry.jockey,
            trainer: entry.trainer,
            draw: "-",
            horseScore,
            pairStats,
            jockeyStats,
            trainerStats,
            activeProfiles: activeProfileList,
          }).score,
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
              const signal = computeHorseRunnerSignals({
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
                score: signal.score,
                topFactors: buildHorseTopFactors(signal.components),
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
              marketSignal:
                typeof impliedProbabilityFromOdds(item.marketOdds) === "number" && expTotal > 0
                  ? ((item.expScore / expTotal) * 100) -
                      (impliedProbabilityFromOdds(item.marketOdds) ?? 0) >=
                    3
                    ? "value"
                    : ((item.expScore / expTotal) * 100) -
                          (impliedProbabilityFromOdds(item.marketOdds) ?? 0) <=
                        -3
                      ? "overbet"
                      : "neutral"
                  : "neutral",
              topFactors: item.topFactors,
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
      responseStatus: "ok",
      suggestions: horseSuggestions.map((item) => `#${item.horseNumber} ${item.horseName}`),
      horseSuggestions,
      modelVersion: "horse-heuristic-v1.5.0",
      generatedAt: new Date().toISOString(),
      dataFreshness: {
        source: "database",
        historyRecordCount: raceRows.rows.length,
        historyWindowYears: HISTORY_YEARS,
      },
      featureCoverage: {
        probability: true,
        explainability: true,
        marketContext: true,
        paceProxy: true,
        breedingProxy: false,
      },
      horseAnalysis: {
        strategy: analystConfig.strategy,
        activeProfiles: activeProfileList,
      },
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
  targetDate: string,
  predictionType: Mark6PredictionType,
  batchCount: number,
  numberMix: Mark6NumberMix,
  generateMode: Mark6GenerateMode,
  manualNumbers?: number[],
  previousDrawSignal?: Mark6PreviousDraw | null,
  expertConfig: ReturnType<typeof getMark6ExpertConfig> = getMark6ExpertConfig(),
  activeExpertProfiles: Mark6ExpertProfile[] = getMark6ExpertProfileList(getMark6ExpertConfig()),
  expertWeights: Mark6ExpertWeightProfile = getAverageMark6ExpertWeights(activeExpertProfiles),
  expertSnippet: string = getMark6ExpertExplanationSnippet(
    locale,
    activeExpertProfiles,
    expertConfig.strategy,
  ),
): SuggestionBase {
  const frequencies = new Map<number, number>();
  for (let number = 1; number <= 49; number += 1) {
    frequencies.set(number, 0.001);
  }
  for (const draw of mark6FallbackRows) {
    for (const number of draw.numbers) {
      frequencies.set(
        number,
        (frequencies.get(number) ?? 0) + expertWeights.historicalHitWeight,
      );
    }
  }
  applyTrainedMark6Model(
    frequencies,
    mark6FallbackRows.map((draw) => ({
      drawDate: toDate(draw.date),
      numbers: draw.numbers,
    })),
    toDate(targetDate),
    expertWeights,
  );
  applyPreviousDrawSignal(frequencies, previousDrawSignal, expertWeights);

  const normalizedManualPool = normalizeManualMark6Numbers(manualNumbers);
  const effectiveGenerateMode: Mark6GenerateMode =
    generateMode === "manual" && normalizedManualPool.length >= 6 ? "manual" : "auto";
  const candidateEntries =
    effectiveGenerateMode === "manual" && normalizedManualPool.length > 0
      ? [...frequencies.entries()].filter(([number]) => normalizedManualPool.includes(number))
      : [...frequencies.entries()];

  const ranked = buildRankedMark6Entries(
    candidateEntries,
    Math.max(16, normalizedManualPool.length || 0),
    numberMix,
  );
  const confidenceBand = getMark6Confidence({
    drawCount: mark6FallbackRows.length,
    rankedScores: ranked.map((item) => item.score),
  });
  const batchSets = buildMark6BatchSets(ranked, batchCount, numberMix);
  const topSix = batchSets[0] ?? pickMark6SetWithMix(ranked, numberMix);
  const mark6Prediction = buildMark6Prediction(predictionType, ranked, numberMix, batchCount);
  const mark6NumberProbabilities = buildMark6NumberProbabilities(ranked);

  return {
    suggestions:
      predictionType === "single"
        ? topSix.map((value) => value.toString())
        : mark6PredictionToSuggestionStrings(mark6Prediction),
    mark6PredictionType: predictionType,
    mark6Prediction,
    mark6BatchSets: batchSets,
    mark6PreviousDraw: getFallbackPreviousMark6Draw(targetDate),
    mark6NumberProbabilities,
    modelVersion: "mark6-expert-consensus-v1-fallback",
    mark6Analysis: {
      strategy: expertConfig.strategy,
      activeProfiles: activeExpertProfiles,
    },
    confidenceBand,
    explanation:
      locale === "zh-HK"
        ? effectiveGenerateMode === "manual" && normalizedManualPool.length > 0
          ? `此組合基於示例樣本中的頻率與週期信號，並限制在你手動選擇的號碼池內生成。${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`
          : `此組合基於最近樣本的頻率、週期與節日檔期信號，並按所選號碼分佈模式加權抽樣生成。${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`
        : effectiveGenerateMode === "manual" && normalizedManualPool.length > 0
          ? `This set uses sample frequency and cyclical signals, constrained to your manually selected number pool.${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`
          : `This set is generated from sample frequency, cyclical, and holiday-season signals, then weighted by your selected number-mix style.${getPreviousDrawSignalExplanation(locale, previousDrawSignal)}${expertSnippet}`,
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
    responseStatus: "stale",
    suggestions: horseSuggestions.map((item) => `#${item.horseNumber} ${item.horseName}`),
    horseSuggestions,
    modelVersion: "horse-heuristic-v1.5.0-fallback",
    generatedAt: new Date().toISOString(),
    dataFreshness: {
      source: "fallback",
      historyRecordCount: raceFallbackRows.length,
      historyWindowYears: HISTORY_YEARS,
    },
    featureCoverage: {
      probability: false,
      explainability: true,
      marketContext: false,
      paceProxy: true,
      breedingProxy: false,
    },
    horseAnalysis: {
      strategy: "consensus",
      activeProfiles: ["topHandicapper"],
    },
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
  mark6BatchCount = 1,
  mark6NumberMix = "mixed",
  mark6GenerateMode = "auto",
  mark6ManualNumbers,
  selectedRace,
  horseAnalystStrategy,
  horseAnalystProfile,
  mark6ExpertStrategy,
  mark6ExpertProfile,
}: {
  mode: Mode;
  targetDate: string;
  locale: Locale;
  mark6PredictionType?: Mark6PredictionType;
  mark6BatchCount?: number;
  mark6NumberMix?: Mark6NumberMix;
  mark6GenerateMode?: Mark6GenerateMode;
  mark6ManualNumbers?: number[];
  selectedRace?: SelectedRaceInput;
  horseAnalystStrategy?: HorseAnalystStrategy;
  horseAnalystProfile?: HorseAnalystProfile;
  mark6ExpertStrategy?: Mark6ExpertStrategy;
  mark6ExpertProfile?: Mark6ExpertProfile;
}): Promise<SuggestionResponse> {
  if (canUseDatabase()) {
    try {
      await ensureSchema();
    } catch {
      // Allow fallback behavior when schema initialization fails.
    }
  }

  const liveMark6PreviousDraw =
    mode === "mark6" ? await getLatestHkjcMark6PreviousDraw().catch(() => null) : null;
  if (liveMark6PreviousDraw) {
    await upsertMark6PreviousDraw(liveMark6PreviousDraw);
  }

  const base =
    mode === "mark6"
      ? await getMark6Suggestion(
          locale,
          targetDate,
          mark6PredictionType,
          Math.max(1, Math.min(mark6BatchCount, 12)),
          mark6NumberMix,
          mark6GenerateMode,
          mark6ManualNumbers,
          liveMark6PreviousDraw,
          {
            strategy: mark6ExpertStrategy,
            primaryProfile: mark6ExpertProfile,
          },
        )
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
              mark6BatchCount,
              mark6NumberMix,
              mark6GenerateMode,
              mark6ManualNumbers,
              selectedRace,
              horseAnalystStrategy,
              horseAnalystProfile,
              mark6ExpertStrategy,
              mark6ExpertProfile,
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
    status: base.responseStatus ?? "ok",
    mode,
    targetDate,
    mark6PredictionType: base.mark6PredictionType,
    progress: ["fetching", "analyzing", "generating", "done"],
    suggestions: base.suggestions,
    mark6Prediction: base.mark6Prediction,
    mark6BatchSets: base.mark6BatchSets,
    mark6PreviousDraw: liveMark6PreviousDraw ?? base.mark6PreviousDraw,
    mark6NumberProbabilities: base.mark6NumberProbabilities,
    horseSuggestions: base.horseSuggestions,
    modelVersion: base.modelVersion,
    generatedAt: base.generatedAt,
    dataFreshness: base.dataFreshness,
    featureCoverage: base.featureCoverage,
    horseAnalysis: base.horseAnalysis,
    mark6Analysis: base.mark6Analysis,
    confidenceBand: base.confidenceBand,
    explanation: base.explanation,
    disclaimer: getLocalizedDisclaimer(locale),
  };
}

export async function getHistory(mode: Mode, locale: Locale, options?: GetHistoryOptions): Promise<HistoryEntry[]> {
  if (!canUseDatabase()) {
    return finalizeHistoryFallback(mode, locale, options);
  }
  try {
    await ensureSchema();
  } catch {
    return finalizeHistoryFallback(mode, locale, options);
  }

  if (mode === "mark6") {
    try {
      await refreshMark6ResultsForHistory();

      const rows = await dbQuery<{
        draw_date: string;
        numbers: number[];
        special_number: number | null;
      }>(
        `
        SELECT TO_CHAR(draw_date, 'YYYY-MM-DD') AS draw_date, numbers, special_number
        FROM mark6_results
        ORDER BY draw_date DESC
        LIMIT 40
        `,
      );

      if (rows.rows.length > 0) {
        return rows.rows.map((row) => ({
          date: row.draw_date,
          result: row.special_number
            ? `${row.numbers.join(", ")} | ${locale === "zh-HK" ? "特別號碼" : "Special"}: ${row.special_number}`
            : row.numbers.join(", "),
          note:
            locale === "zh-HK"
              ? "已由香港賽馬會近期開彩結果更新。"
              : "Updated from recent HKJC Mark Six draw results.",
        }));
      }
      return getHistoryFallback(mode, locale);
    } catch {
      return getHistoryFallback(mode, locale);
    }
  }

  try {
    const hkToday = await hkTodayYmdForHistory();
    const latestRaceDate = await getLatestHorseRaceDateYmd();
    const dayGap = latestRaceDate ? calendarDaysBetween(latestRaceDate, hkToday) : 999;
    const needsHorseRefresh = dayGap > 4 || !latestRaceDate;

    const pd = normalizeHorsePastDays(options?.horsePastDays);
    const dateFilterClause =
      pd != null
        ? `AND race_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Hong_Kong')::date - ($1::integer - 1)`
        : "";

    const queryHorseRows = () =>
      dbQuery<{ race_date: string; race_id: string; result: string }>(
        `
      SELECT
        TO_CHAR(race_date, 'YYYY-MM-DD') AS race_date,
        race_id,
        STRING_AGG(
          position::text || '. #' || horse_number::text || ' ' || horse_name,
          ' | '
          ORDER BY position
        ) AS result
      FROM race_results
      WHERE race_id ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}-)?(ST|HV)-R[0-9]+$'
      ${dateFilterClause}
      GROUP BY race_date, race_id
      ORDER BY
        race_date DESC,
        CASE
          WHEN race_id LIKE '%-HV-R%' THEN 0
          WHEN race_id LIKE '%-ST-R%' THEN 1
          ELSE 2
        END,
        race_id ASC
      LIMIT 200
      `,
        pd != null ? [pd] : [],
      );

    let raceRows = await queryHorseRows();

    if (needsHorseRefresh) {
      if (raceRows.rows.length === 0) {
        await refreshHorseRaceResultsNearTerm({ forHistory: true });
        raceRows = await queryHorseRows();
      } else {
        void refreshHorseRaceResultsNearTerm({ forHistory: true });
      }
    }

    if (raceRows.rows.length > 0) {
      const shaped = dedupeMirroredHorseHistoryRows(
        raceRows.rows.map((row) => ({
          date: row.race_date,
          raceId: row.race_id,
          result: row.result,
          note:
            locale === "zh-HK"
              ? "按每場賽事完整名次整理。"
              : "Full finishing order from recent race results.",
        })),
      ).filter(isHorseHistoryEntryShape);

      if (shaped.length > 0) {
        return shaped.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date > b.date ? -1 : 1;
          }
          return extractRaceNumber(a.raceId) - extractRaceNumber(b.raceId);
        });
      }
    }
    return finalizeHorseFallbackRows(locale, options);
  } catch {
    return finalizeHorseFallbackRows(locale, options);
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
    await refreshHorseRaceResultsNearTerm({ forHistory: true });

    const raceRows = await dbQuery<{ race_date: string; race_id: string; result: string }>(
      `
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
        AND race_id ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}-)?(ST|HV)-R[0-9]+$'
      GROUP BY race_date, race_id
      ORDER BY
        race_date DESC,
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
      const shaped = dedupeMirroredHorseHistoryRows(
        raceRows.rows.map((row) => ({
          date: row.race_date,
          raceId: row.race_id,
          result: row.result,
          note:
            locale === "zh-HK"
              ? "按每場賽事完整名次整理。"
              : "Full finishing order from recent race results.",
        })),
      ).filter(isHorseHistoryEntryShape);

      if (shaped.length > 0) {
        return shaped.sort((a, b) => extractRaceNumber(a.raceId) - extractRaceNumber(b.raceId));
      }
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
  let horseLogRows: Array<{
    target_date: string;
    confidence_band: ConfidenceBand;
    input_snapshot: {
      selectedRace?: {
        venueCode?: "ST" | "HV";
        raceNo?: number;
      };
    };
    suggestion_payload: string[] | string;
  }> = [];
  let raceWinnerRows: Array<{ race_date: string; race_id: string; horse_number: number }> = [];
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
    const horseLogsResult = await dbQuery<{
      target_date: string;
      confidence_band: ConfidenceBand;
      input_snapshot: {
        selectedRace?: {
          venueCode?: "ST" | "HV";
          raceNo?: number;
        };
      };
      suggestion_payload: string[] | string;
    }>(
      `
      SELECT target_date::text, confidence_band, input_snapshot, suggestion_payload
      FROM suggestion_logs
      WHERE mode = 'horse'
      ORDER BY created_at DESC
      LIMIT 500
      `,
    );
    const raceWinnersResult = await dbQuery<{
      race_date: string;
      race_id: string;
      horse_number: number;
    }>(
      `
      SELECT TO_CHAR(race_date, 'YYYY-MM-DD') AS race_date, race_id, horse_number
      FROM race_results
      WHERE position = 1
      `,
    );
    confidenceRows = confidenceResult.rows;
    trendRows = trendResult.rows;
    horseLogRows = horseLogsResult.rows;
    raceWinnerRows = raceWinnersResult.rows;
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

  const winnerMap = new Map<string, number>();
  for (const row of raceWinnerRows) {
    const raceNo = extractRaceNumber(row.race_id);
    const venueMatch = row.race_id.match(/-(ST|HV)-R\d+$/i);
    const venueCode = (venueMatch?.[1]?.toUpperCase() as "ST" | "HV" | undefined) ?? undefined;
    if (!venueCode || !Number.isFinite(raceNo) || raceNo <= 0) {
      continue;
    }
    const key = `${row.race_date}-${venueCode}-${raceNo}`;
    winnerMap.set(key, row.horse_number);
  }

  const calibrationByBand = {
    Low: { total: 0, correct: 0 },
    Medium: { total: 0, correct: 0 },
    High: { total: 0, correct: 0 },
  };
  let totalEvaluated = 0;
  let totalCorrect = 0;
  for (const row of horseLogRows) {
    const selectedRace = row.input_snapshot?.selectedRace;
    const venueCode = selectedRace?.venueCode;
    const raceNo = selectedRace?.raceNo;
    if (!venueCode || !raceNo) {
      continue;
    }
    const key = `${row.target_date}-${venueCode}-${raceNo}`;
    const winnerHorseNumber = winnerMap.get(key);
    if (!winnerHorseNumber) {
      continue;
    }
    const suggestions =
      typeof row.suggestion_payload === "string"
        ? [row.suggestion_payload]
        : Array.isArray(row.suggestion_payload)
          ? row.suggestion_payload
          : [];
    const topSuggestion = suggestions[0] ?? "";
    const match = topSuggestion.match(/^#(\d+)\b/);
    if (!match?.[1]) {
      continue;
    }
    const predictedWinner = Number.parseInt(match[1], 10);
    if (!Number.isFinite(predictedWinner)) {
      continue;
    }

    totalEvaluated += 1;
    calibrationByBand[row.confidence_band].total += 1;
    if (predictedWinner === winnerHorseNumber) {
      totalCorrect += 1;
      calibrationByBand[row.confidence_band].correct += 1;
    }
  }

  const top1AccuracyPct =
    totalEvaluated > 0 ? Math.round((totalCorrect / totalEvaluated) * 1000) / 10 : 0;

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
    horseBacktest: {
      sampleSize: totalEvaluated,
      top1AccuracyPct,
      byBand: [
        {
          band: "Low" as ConfidenceBand,
          sampleSize: calibrationByBand.Low.total,
          hitRatePct:
            calibrationByBand.Low.total > 0
              ? Math.round((calibrationByBand.Low.correct / calibrationByBand.Low.total) * 1000) /
                10
              : 0,
        },
        {
          band: "Medium" as ConfidenceBand,
          sampleSize: calibrationByBand.Medium.total,
          hitRatePct:
            calibrationByBand.Medium.total > 0
              ? Math.round(
                  (calibrationByBand.Medium.correct / calibrationByBand.Medium.total) * 1000,
                ) / 10
              : 0,
        },
        {
          band: "High" as ConfidenceBand,
          sampleSize: calibrationByBand.High.total,
          hitRatePct:
            calibrationByBand.High.total > 0
              ? Math.round((calibrationByBand.High.correct / calibrationByBand.High.total) * 1000) /
                10
              : 0,
        },
      ],
    },
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
    horseBacktest: {
      sampleSize: 68,
      top1AccuracyPct: 29.4,
      byBand: [
        { band: "Low" as ConfidenceBand, sampleSize: 24, hitRatePct: 16.7 },
        { band: "Medium" as ConfidenceBand, sampleSize: 32, hitRatePct: 31.3 },
        { band: "High" as ConfidenceBand, sampleSize: 12, hitRatePct: 50.0 },
      ],
    },
  };
}

function buildMark6Prediction(
  predictionType: Mark6PredictionType,
  ranked: Array<{ number: number; score: number }>,
  numberMix: Mark6NumberMix,
  batchCount: number,
) {
  if (predictionType === "multiple") {
    const sets: number[][] = [];
    const seen = new Set<string>();
    const targetSetCount = Math.max(2, Math.min(batchCount, 8));
    while (sets.length < targetSetCount) {
      const set = pickMark6SetWithMix(ranked, numberMix);
      const key = set.join("-");
      if (!seen.has(key)) {
        seen.add(key);
        sets.push(set);
      }
      if (seen.size > 20) {
        break;
      }
    }
    return { type: "multiple" as const, multiple: sets };
  }

  if (predictionType === "banker") {
    const filteredForMix = getNumberMixFilteredEntries(ranked, numberMix);
    const bankerPool = (filteredForMix.length >= 8 ? filteredForMix : ranked).slice(0, 8);
    const banker = pickWeightedNumbers(bankerPool, 1)[0] ?? ranked[0]?.number ?? 1;
    const selections = pickWeightedNumbers(
      (filteredForMix.length >= 10 ? filteredForMix : ranked)
        .filter((item) => item.number !== banker)
        .slice(0, 18),
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

  const single = pickMark6SetWithMix(ranked, numberMix);
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
