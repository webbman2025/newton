import { dbQuery, ensureSchema, hasDatabaseConfig } from "@/lib/db";

export const mark6Personas = ["lotteryAnalyst", "gameTheorist", "patternFinder"] as const;
export type Mark6Persona = (typeof mark6Personas)[number];

export function getMark6PersonaGenerationConfig(persona?: Mark6Persona): {
  strategy: "consensus" | "single";
  primaryProfile: "frequencyHistorian" | "drawPatternSpecialist";
  diversifyCommonSelectionPatterns: boolean;
} {
  if (persona === "patternFinder") {
    return {
      strategy: "single",
      primaryProfile: "drawPatternSpecialist",
      diversifyCommonSelectionPatterns: false,
    };
  }
  if (persona === "lotteryAnalyst") {
    return {
      strategy: "single",
      primaryProfile: "frequencyHistorian",
      diversifyCommonSelectionPatterns: false,
    };
  }
  return {
    strategy: "consensus",
    primaryProfile: "frequencyHistorian",
    diversifyCommonSelectionPatterns: persona === "gameTheorist",
  };
}

export const mark6AnalysisQueries = ["hotCold", "oddEven", "repeatingPatterns", "recentTrends"] as const;
export type Mark6AnalysisQuery = (typeof mark6AnalysisQueries)[number];

export type Mark6Draw = {
  date: string;
  numbers: number[];
};

export type Mark6AnalysisInsight = {
  code:
    | "hotLeaders"
    | "coldLeaders"
    | "oddEvenBalance"
    | "highLowBalance"
    | "repeatingPairs"
    | "repeatingTriples"
    | "recentMomentum"
    | "commonSelectionProxy";
  numbers?: number[];
  value?: number;
  secondaryValue?: number;
  text?: string;
};

export type Mark6AnalysisResult = {
  persona: Mark6Persona;
  query: Mark6AnalysisQuery;
  window: number;
  drawCount: number;
  dataSource: "database" | "fallback";
  latestDrawDate?: string;
  numberStats: Array<{
    number: number;
    count: number;
    rate: number;
    trend: number;
    heat: number;
  }>;
  topFrequency: Array<{ number: number; count: number }>;
  oddEven: Array<{ odd: number; even: number; draws: number }>;
  highLow: Array<{ low: number; high: number; draws: number }>;
  repeatingPairs: Array<{ numbers: [number, number]; count: number }>;
  repeatingTriples: Array<{ numbers: [number, number, number]; count: number }>;
  recentTrend: Array<{ label: string; odd: number; high: number; average: number }>;
  commonSelectionProxy: {
    birthdayNumberShare: number;
    consecutivePairDrawShare: number;
    repeatedEndingDrawShare: number;
    note: "proxy-not-ticket-sales";
  };
  insights: Mark6AnalysisInsight[];
  suggestedQueries: Mark6AnalysisQuery[];
};

const FALLBACK_DRAWS: Mark6Draw[] = [
  { date: "2026-04-24", numbers: [3, 8, 16, 23, 36, 45] },
  { date: "2026-04-21", numbers: [5, 11, 17, 28, 32, 49] },
  { date: "2026-04-17", numbers: [1, 9, 15, 22, 35, 44] },
  { date: "2026-04-14", numbers: [4, 12, 19, 24, 33, 41] },
  { date: "2026-04-10", numbers: [2, 6, 13, 18, 31, 47] },
  { date: "2026-04-07", numbers: [7, 14, 21, 26, 38, 43] },
  { date: "2026-04-03", numbers: [6, 10, 20, 29, 34, 48] },
  { date: "2026-03-31", numbers: [3, 11, 18, 27, 37, 46] },
];

function combinations<T>(items: T[], size: 2 | 3): T[][] {
  const output: T[][] = [];
  const visit = (start: number, chosen: T[]) => {
    if (chosen.length === size) {
      output.push(chosen);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      const item = items[index];
      if (item !== undefined) {
        visit(index + 1, [...chosen, item]);
      }
    }
  };
  visit(0, []);
  return output;
}

function percentage(value: number, total: number): number {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
}

function normalizeDraw(draw: Mark6Draw): Mark6Draw {
  return {
    date: draw.date,
    numbers: [...new Set(draw.numbers)]
      .filter((number) => Number.isInteger(number) && number >= 1 && number <= 49)
      .sort((a, b) => a - b)
      .slice(0, 6),
  };
}

function distribution(
  draws: Mark6Draw[],
  countFor: (numbers: number[]) => number,
  firstKey: "odd" | "low",
  secondKey: "even" | "high",
) {
  const buckets = Array.from({ length: 7 }, (_value, count) => ({
    [firstKey]: count,
    [secondKey]: 6 - count,
    draws: 0,
  })) as Array<Record<string, number>>;
  for (const draw of draws) {
    const count = countFor(draw.numbers);
    if (buckets[count]) {
      buckets[count].draws += 1;
    }
  }
  return buckets;
}

function coOccurrences(draws: Mark6Draw[], size: 2 | 3) {
  const counts = new Map<string, number>();
  for (const draw of draws) {
    for (const group of combinations(draw.numbers, size)) {
      const key = group.join("-");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }))
    .slice(0, 8);
}

function hasConsecutivePair(numbers: number[]): boolean {
  return numbers.some((number, index) => index > 0 && number - (numbers[index - 1] ?? number) === 1);
}

function hasRepeatedEnding(numbers: number[]): boolean {
  return new Set(numbers.map((number) => number % 10)).size < numbers.length;
}

export function scoreMark6CommonSelectionProxy(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const birthdayCount = sorted.filter((number) => number <= 31).length;
  const consecutivePairs = sorted.filter(
    (number, index) => index > 0 && number - (sorted[index - 1] ?? number) === 1,
  ).length;
  const repeatedEndings = sorted.length - new Set(sorted.map((number) => number % 10)).size;
  const spread = (sorted.at(-1) ?? 0) - (sorted[0] ?? 0);
  const oddCount = sorted.filter((number) => number % 2 === 1).length;
  return (
    Math.max(0, birthdayCount - 3) * 2 +
    consecutivePairs * 2.5 +
    repeatedEndings * 1.5 +
    Math.max(0, 30 - spread) / 5 +
    Math.abs(3 - oddCount) * 0.6
  );
}

export function analyzeMark6Draws(
  inputDraws: Mark6Draw[],
  options: { persona: Mark6Persona; query: Mark6AnalysisQuery; window: number; dataSource?: "database" | "fallback" },
): Mark6AnalysisResult {
  const requestedWindow = Math.min(100, Math.max(10, Math.round(options.window)));
  const allDraws = inputDraws.map(normalizeDraw).filter((draw) => draw.numbers.length === 6);
  const draws = allDraws.slice(0, requestedWindow);
  const previousDraws = allDraws.slice(requestedWindow, requestedWindow * 2);
  const currentCounts = new Map<number, number>();
  const previousCounts = new Map<number, number>();

  for (const draw of draws) {
    for (const number of draw.numbers) {
      currentCounts.set(number, (currentCounts.get(number) ?? 0) + 1);
    }
  }
  for (const draw of previousDraws) {
    for (const number of draw.numbers) {
      previousCounts.set(number, (previousCounts.get(number) ?? 0) + 1);
    }
  }

  const maximumCount = Math.max(1, ...currentCounts.values());
  const numberStats = Array.from({ length: 49 }, (_value, index) => {
    const number = index + 1;
    const count = currentCounts.get(number) ?? 0;
    const previousRate = previousDraws.length
      ? (previousCounts.get(number) ?? 0) / previousDraws.length
      : 0;
    const currentRate = draws.length ? count / draws.length : 0;
    return {
      number,
      count,
      rate: percentage(count, draws.length),
      trend: Number(((currentRate - previousRate) * 100).toFixed(1)),
      heat: Number(((count / maximumCount) * 100).toFixed(1)),
    };
  });
  const ranked = [...numberStats].sort((a, b) => b.count - a.count || b.trend - a.trend || a.number - b.number);
  const cold = [...numberStats].sort((a, b) => a.count - b.count || a.trend - b.trend || a.number - b.number);
  const oddEven = distribution(draws, (numbers) => numbers.filter((number) => number % 2 === 1).length, "odd", "even") as Mark6AnalysisResult["oddEven"];
  const highLow = distribution(draws, (numbers) => numbers.filter((number) => number <= 24).length, "low", "high") as Mark6AnalysisResult["highLow"];
  const pairRows = coOccurrences(draws, 2).map(([key, count]) => ({
    numbers: key.split("-").map(Number) as [number, number],
    count,
  }));
  const tripleRows = coOccurrences(draws, 3).map(([key, count]) => ({
    numbers: key.split("-").map(Number) as [number, number, number],
    count,
  }));

  const recentTrend = [...draws]
    .reverse()
    .slice(-12)
    .map((draw) => ({
      label: draw.date.slice(5),
      odd: draw.numbers.filter((number) => number % 2 === 1).length,
      high: draw.numbers.filter((number) => number >= 25).length,
      average: Number((draw.numbers.reduce((sum, number) => sum + number, 0) / 6).toFixed(1)),
    }));

  const allNumbers = draws.flatMap((draw) => draw.numbers);
  const proxy = {
    birthdayNumberShare: percentage(allNumbers.filter((number) => number <= 31).length, allNumbers.length),
    consecutivePairDrawShare: percentage(draws.filter((draw) => hasConsecutivePair(draw.numbers)).length, draws.length),
    repeatedEndingDrawShare: percentage(draws.filter((draw) => hasRepeatedEnding(draw.numbers)).length, draws.length),
    note: "proxy-not-ticket-sales" as const,
  };

  const totalOdd = allNumbers.filter((number) => number % 2 === 1).length;
  const totalLow = allNumbers.filter((number) => number <= 24).length;
  const insights: Mark6AnalysisInsight[] = [
    { code: "hotLeaders", numbers: ranked.slice(0, 5).map((row) => row.number) },
    { code: "coldLeaders", numbers: cold.slice(0, 5).map((row) => row.number) },
    { code: "oddEvenBalance", value: percentage(totalOdd, allNumbers.length), secondaryValue: percentage(allNumbers.length - totalOdd, allNumbers.length) },
    { code: "highLowBalance", value: percentage(totalLow, allNumbers.length), secondaryValue: percentage(allNumbers.length - totalLow, allNumbers.length) },
    { code: "repeatingPairs", numbers: pairRows[0]?.numbers, value: pairRows[0]?.count ?? 0 },
    { code: "repeatingTriples", numbers: tripleRows[0]?.numbers, value: tripleRows[0]?.count ?? 0 },
    { code: "recentMomentum", numbers: ranked.filter((row) => row.trend > 0).slice(0, 5).map((row) => row.number) },
    { code: "commonSelectionProxy", value: proxy.birthdayNumberShare, secondaryValue: proxy.consecutivePairDrawShare },
  ];

  const queryOrder: Mark6AnalysisQuery[] = ["hotCold", "oddEven", "repeatingPatterns", "recentTrends"];
  return {
    persona: options.persona,
    query: options.query,
    window: requestedWindow,
    drawCount: draws.length,
    dataSource: options.dataSource ?? "database",
    latestDrawDate: draws[0]?.date,
    numberStats,
    topFrequency: ranked.slice(0, 10).map(({ number, count }) => ({ number, count })),
    oddEven,
    highLow,
    repeatingPairs: pairRows,
    repeatingTriples: tripleRows,
    recentTrend,
    commonSelectionProxy: proxy,
    insights,
    suggestedQueries: queryOrder.filter((query) => query !== options.query).slice(0, 3),
  };
}

export async function getMark6Analysis(options: {
  persona: Mark6Persona;
  query: Mark6AnalysisQuery;
  window: number;
  targetDate?: string;
}): Promise<Mark6AnalysisResult> {
  const targetDate = options.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(options.targetDate)
    ? options.targetDate
    : new Date().toISOString().slice(0, 10);
  const limit = Math.min(200, Math.max(20, options.window * 2));

  if (hasDatabaseConfig()) {
    try {
      await ensureSchema();
      const result = await dbQuery<{ date: string; numbers: number[] }>(
        `SELECT TO_CHAR(draw_date, 'YYYY-MM-DD') AS date, numbers
         FROM mark6_results
         WHERE draw_date <= $1::date
         ORDER BY draw_date DESC
         LIMIT $2`,
        [targetDate, limit],
      );
      if (result.rows.length >= 5) {
        return analyzeMark6Draws(result.rows, { ...options, dataSource: "database" });
      }
    } catch {
      // Fall through to a small local sample so the analysis UI remains available.
    }
  }

  return analyzeMark6Draws(FALLBACK_DRAWS, { ...options, dataSource: "fallback" });
}
