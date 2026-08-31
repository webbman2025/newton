import type { ConfidenceBand, Locale } from "@/lib/translations";
import { dbQuery, ensureSchema, hasDatabaseConfig } from "@/lib/db";
import {
  getMark6Analysis,
  type Mark6Persona,
} from "@/lib/mark6-analysis";
import { getLatestMark6PreviousDraw, getSuggestion } from "@/lib/data";
import { ingestMarkSixFromWeb } from "@/lib/web-ingest";
import { getUpcomingMark6DrawDates } from "@/lib/upcoming-mark6";

const HISTORY_YEARS = 5;
const MARK6_BASELINE = 6 / 49;
const MS_PER_DAY = 86_400_000;
const HISTORY_WINDOW_DAYS = HISTORY_YEARS * 365;

type TrainingDraw = {
  drawDate: Date;
  numbers: number[];
  specialNumber?: number;
};

export type Mark6PredictiveSignalTag =
  | "historicalFrequency"
  | "trainedModel"
  | "previousDrawPattern"
  | "seasonalMatch"
  | "hotTrend"
  | "coldRebound";

export type Mark6PredictiveNumberRow = {
  number: number;
  rank: number;
  score: number;
  displayScore: number;
  tags: Mark6PredictiveSignalTag[];
};

export type Mark6PredictiveDrawResult = {
  targetDate: string;
  drawLabel: string;
  generatedAt: string;
  dataSource: "database" | "fallback";
  trainingDrawCount: number;
  historyRange: { start: string; end: string };
  latestOfficialDraw?: {
    date: string;
    numbers: number[];
    specialNumber?: number;
    source?: string;
  };
  backtest: {
    evaluatedDraws: number;
    averageTop6Hits: number;
    averageTop12Hits: number;
    top6HitRatePct: number;
    note: string;
  };
  primarySet: number[];
  alternativeSets: Array<{ label: string; numbers: number[] }>;
  specialNumberPick?: number;
  topSignals: Mark6PredictiveNumberRow[];
  analysisHighlights: {
    hotNumbers: number[];
    coldNumbers: number[];
    oddEvenLabel: string;
    windowDraws: number;
  };
  confidenceBand: ConfidenceBand;
  modelVersion: string;
  persona: Mark6Persona;
  methodology: string;
  disclaimer: string;
};

function canUseDatabase() {
  return hasDatabaseConfig();
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(`${value}T00:00:00`);
}

function formatDateKey(value: string | Date) {
  const date = toDate(value);
  return date.toISOString().slice(0, 10);
}

function getHistoryWindow(targetDate: string) {
  const end = toDate(targetDate);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - HISTORY_YEARS);
  return {
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
    endDateObject: end,
  };
}

function getTemporalWeight(drawDate: Date, targetDate: Date) {
  const ageDays = Math.max(0, Math.round((targetDate.getTime() - drawDate.getTime()) / MS_PER_DAY));
  const recencyRatio = Math.max(0, 1 - ageDays / HISTORY_WINDOW_DAYS);
  const recencyWeight = 1 + recencyRatio * 0.6;

  const sameDayMonth =
    drawDate.getMonth() === targetDate.getMonth() && drawDate.getDate() === targetDate.getDate();
  const sameMonth = drawDate.getMonth() === targetDate.getMonth();
  const sameWeekday = drawDate.getDay() === targetDate.getDay();

  let seasonalBoost = 1;
  if (sameDayMonth) {
    seasonalBoost += 1;
  }
  if (sameMonth) {
    seasonalBoost += 0.25;
  }
  if (sameWeekday) {
    seasonalBoost += 0.18;
  }

  return recencyWeight * seasonalBoost;
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
}

function getFrequency(draws: TrainingDraw[], number: number, filter?: (draw: TrainingDraw) => boolean) {
  const pool = filter ? draws.filter(filter) : draws;
  if (pool.length === 0) {
    return MARK6_BASELINE;
  }
  return pool.filter((draw) => draw.numbers.includes(number)).length / pool.length;
}

function getGap(draws: TrainingDraw[], number: number) {
  for (let index = draws.length - 1; index >= 0; index -= 1) {
    if (draws[index]?.numbers.includes(number)) {
      return draws.length - index;
    }
  }
  return 40;
}

function trainModel(draws: TrainingDraw[]) {
  if (draws.length < 25) {
    return null;
  }
  const weights = [
    Math.log(MARK6_BASELINE / (1 - MARK6_BASELINE)),
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
      const prior = draws.slice(0, drawIndex);
      const actual = new Set(draws[drawIndex]?.numbers ?? []);
      const drawDate = draws[drawIndex]?.drawDate ?? new Date();

      for (let number = 1; number <= 49; number += 1) {
        const previous = prior.at(-1)?.numbers ?? [];
        const recent10 = prior.slice(-10);
        const recent30 = prior.slice(-30);
        const features = [
          1,
          (getFrequency(prior, number) - MARK6_BASELINE) * 6,
          (getFrequency(recent10, number) - MARK6_BASELINE) * 4,
          (getFrequency(recent30, number) - MARK6_BASELINE) * 5,
          Math.min(getGap(prior, number), 40) / 40 - 0.5,
          previous.includes(number) ? 1 : 0,
          previous.some((item) => Math.abs(item - number) <= 2) ? 1 : 0,
          previous.some((item) => 50 - item === number) ? 1 : 0,
          previous.some(
            (item) =>
              Math.floor((item - 1) / 10) === Math.floor((number - 1) / 10) && item !== number,
          )
            ? 1
            : 0,
          (getFrequency(prior, number, (draw) => draw.drawDate.getDay() === drawDate.getDay()) -
            MARK6_BASELINE) *
            4,
          (getFrequency(prior, number, (draw) => draw.drawDate.getMonth() === drawDate.getMonth()) -
            MARK6_BASELINE) *
            4,
        ];
        const prediction = sigmoid(
          features.reduce((sum, feature, index) => sum + feature * (weights[index] ?? 0), 0),
        );
        const error = (actual.has(number) ? 1 : 0) - prediction;
        for (let index = 0; index < weights.length; index += 1) {
          const regularization = index === 0 ? 0 : l2 * (weights[index] ?? 0);
          weights[index] = (weights[index] ?? 0) + learningRate * (error * (features[index] ?? 0) - regularization);
        }
      }
    }
  }
  return weights;
}

function applyPreviousDrawSignal(
  scores: Map<number, number>,
  previousDraw?: { numbers: number[]; specialNumber?: number },
) {
  if (!previousDraw || previousDraw.numbers.length < 6) {
    return;
  }
  const drawn = new Set(previousDraw.numbers);
  const signals = previousDraw.specialNumber
    ? [...previousDraw.numbers, previousDraw.specialNumber]
    : previousDraw.numbers;

  for (let number = 1; number <= 49; number += 1) {
    let score = scores.get(number) ?? 0;
    if (drawn.has(number)) {
      score *= 0.72;
    }
    for (const signal of signals) {
      const distance = Math.abs(number - signal);
      if (distance === 1) {
        score += 0.35;
      } else if (distance === 2) {
        score += 0.18;
      }
      if (number === 50 - signal) {
        score += 0.22;
      }
    }
    scores.set(number, score);
  }
}

function scoreDraws(
  draws: TrainingDraw[],
  targetDate: Date,
  previousDraw?: { numbers: number[]; specialNumber?: number },
  heatByNumber?: Map<number, number>,
) {
  const historical = new Map<number, number>();
  const modelOnly = new Map<number, number>();
  const finalScores = new Map<number, number>();

  for (let number = 1; number <= 49; number += 1) {
    historical.set(number, 0);
    modelOnly.set(number, 0);
    finalScores.set(number, 0);
  }

  for (const draw of draws) {
    const weight = getTemporalWeight(draw.drawDate, targetDate);
    for (const number of draw.numbers) {
      historical.set(number, (historical.get(number) ?? 0) + weight);
    }
  }

  const weights = trainModel(draws);
  if (weights) {
    for (let number = 1; number <= 49; number += 1) {
      const previous = draws.at(-1)?.numbers ?? [];
      const recent10 = draws.slice(-10);
      const recent30 = draws.slice(-30);
      const features = [
        1,
        (getFrequency(draws, number) - MARK6_BASELINE) * 6,
        (getFrequency(recent10, number) - MARK6_BASELINE) * 4,
        (getFrequency(recent30, number) - MARK6_BASELINE) * 5,
        Math.min(getGap(draws, number), 40) / 40 - 0.5,
        previous.includes(number) ? 1 : 0,
        previous.some((item) => Math.abs(item - number) <= 2) ? 1 : 0,
        previous.some((item) => 50 - item === number) ? 1 : 0,
        previous.some(
          (item) =>
            Math.floor((item - 1) / 10) === Math.floor((number - 1) / 10) && item !== number,
        )
          ? 1
          : 0,
        (getFrequency(draws, number, (draw) => draw.drawDate.getDay() === targetDate.getDay()) -
          MARK6_BASELINE) *
          4,
        (getFrequency(draws, number, (draw) => draw.drawDate.getMonth() === targetDate.getMonth()) -
          MARK6_BASELINE) *
          4,
      ];
      modelOnly.set(
        number,
        sigmoid(features.reduce((sum, feature, index) => sum + feature * (weights[index] ?? 0), 0)),
      );
    }
  }

  const historicalAverage =
    [...historical.values()].reduce((sum, value) => sum + Math.max(value, 0.001), 0) / 49;

  for (let number = 1; number <= 49; number += 1) {
    const base = Math.max(historical.get(number) ?? 0.001, 0.001);
    const modelLift = (modelOnly.get(number) ?? MARK6_BASELINE) / MARK6_BASELINE;
    let score = base * 0.72 + historicalAverage * modelLift * 0.28;
    const heat = heatByNumber?.get(number) ?? 0;
    if (heat > 0) {
      score += heat * 0.12;
    }
    finalScores.set(number, score);
  }

  applyPreviousDrawSignal(finalScores, previousDraw);

  return { finalScores, historical, modelOnly };
}

function pickDeterministicMixedSet(ranked: Array<{ number: number; score: number }>) {
  const small = ranked.filter((row) => row.number <= 24);
  const big = ranked.filter((row) => row.number >= 25);
  const chosen: number[] = [];
  let smallIndex = 0;
  let bigIndex = 0;

  while (chosen.length < 6) {
    if (chosen.filter((value) => value <= 24).length < 3 && smallIndex < small.length) {
      const candidate = small[smallIndex]?.number;
      smallIndex += 1;
      if (candidate && !chosen.includes(candidate)) {
        chosen.push(candidate);
      }
      continue;
    }
    if (bigIndex < big.length) {
      const candidate = big[bigIndex]?.number;
      bigIndex += 1;
      if (candidate && !chosen.includes(candidate)) {
        chosen.push(candidate);
      }
      continue;
    }
    if (smallIndex < small.length) {
      const candidate = small[smallIndex]?.number;
      smallIndex += 1;
      if (candidate && !chosen.includes(candidate)) {
        chosen.push(candidate);
      }
      continue;
    }
    break;
  }

  for (const row of ranked) {
    if (chosen.length >= 6) {
      break;
    }
    if (!chosen.includes(row.number)) {
      chosen.push(row.number);
    }
  }

  return chosen.sort((a, b) => a - b).slice(0, 6);
}

function buildTags(
  number: number,
  draws: TrainingDraw[],
  historical: Map<number, number>,
  modelOnly: Map<number, number>,
  heatByNumber: Map<number, number>,
  previousDraw?: { numbers: number[]; specialNumber?: number },
): Mark6PredictiveSignalTag[] {
  const tags: Mark6PredictiveSignalTag[] = [];
  const historicalValues = [...historical.values()].sort((a, b) => b - a);
  const historicalRank =
    historicalValues.findIndex((value) => value === historical.get(number)) + 1;
  if (historicalRank > 0 && historicalRank <= 12) {
    tags.push("historicalFrequency");
  }
  if ((modelOnly.get(number) ?? 0) >= MARK6_BASELINE * 1.08) {
    tags.push("trainedModel");
  }
  if ((heatByNumber.get(number) ?? 0) >= 0.55) {
    tags.push("hotTrend");
  }
  if (getGap(draws, number) >= 12) {
    tags.push("coldRebound");
  }
  if (previousDraw) {
    const signals = previousDraw.specialNumber
      ? [...previousDraw.numbers, previousDraw.specialNumber]
      : previousDraw.numbers;
    if (signals.some((item) => Math.abs(item - number) <= 2 || 50 - item === number)) {
      tags.push("previousDrawPattern");
    }
  }
  return tags.length > 0 ? tags : ["historicalFrequency"];
}

function runBacktest(draws: TrainingDraw[], holdout = 24) {
  if (draws.length < holdout + 25) {
    return {
      evaluatedDraws: 0,
      averageTop6Hits: 0,
      averageTop12Hits: 0,
      top6HitRatePct: 0,
      note: "insufficient-history",
    };
  }

  let top6Total = 0;
  let top12Total = 0;
  const startIndex = draws.length - holdout;

  for (let index = startIndex; index < draws.length; index += 1) {
    const training = draws.slice(0, index);
    const actual = new Set(draws[index]?.numbers ?? []);
    const targetDate = draws[index]?.drawDate ?? new Date();
    const { finalScores } = scoreDraws(training, targetDate);
    const ranked = [...finalScores.entries()]
      .map(([number, score]) => ({ number, score }))
      .sort((a, b) => b.score - a.score || a.number - b.number);
    const top6 = new Set(pickDeterministicMixedSet(ranked));
    const top12 = new Set(ranked.slice(0, 12).map((row) => row.number));
    top6Total += [...actual].filter((number) => top6.has(number)).length;
    top12Total += [...actual].filter((number) => top12.has(number)).length;
  }

  const evaluatedDraws = draws.length - startIndex;
  const averageTop6Hits = Number((top6Total / evaluatedDraws).toFixed(2));
  const averageTop12Hits = Number((top12Total / evaluatedDraws).toFixed(2));

  return {
    evaluatedDraws,
    averageTop6Hits,
    averageTop12Hits,
    top6HitRatePct: Number(((averageTop6Hits / 6) * 100).toFixed(1)),
    note: "walk-forward-holdout",
  };
}

function getConfidence(drawCount: number, rankedScores: number[]): ConfidenceBand {
  if (drawCount < 45 || rankedScores.length < 6) {
    return "Low";
  }
  const top = rankedScores.slice(0, 6);
  const next = rankedScores.slice(6, 12);
  if (next.length < 3) {
    return "Low";
  }
  const topAvg = top.reduce((sum, value) => sum + value, 0) / top.length;
  const nextAvg = next.reduce((sum, value) => sum + value, 0) / next.length;
  const ratio = nextAvg > 0 ? topAvg / nextAvg : 1;
  if (drawCount >= 120 && ratio >= 1.25) {
    return "High";
  }
  if (ratio >= 1.12) {
    return "Medium";
  }
  return "Low";
}

function predictSpecialNumber(draws: TrainingDraw[]) {
  const counts = new Map<number, number>();
  for (const draw of draws.slice(-80)) {
    if (draw.specialNumber && draw.specialNumber >= 1 && draw.specialNumber <= 49) {
      counts.set(draw.specialNumber, (counts.get(draw.specialNumber) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return ranked[0]?.[0];
}

export function resolveNextMark6DrawDate(preferredDate?: string, upcomingDates: string[] = []) {
  if (preferredDate) {
    return preferredDate;
  }
  const today = formatDateKey(new Date());
  const nextUpcoming = upcomingDates.find((date) => date >= today);
  if (nextUpcoming) {
    return nextUpcoming;
  }
  const cursor = new Date();
  for (let step = 0; step < 14; step += 1) {
    if (cursor.getDay() === 6) {
      return formatDateKey(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return today;
}

export async function getMark6PredictiveDraw({
  targetDate,
  locale,
  persona = "lotteryAnalyst",
}: {
  targetDate?: string;
  locale: Locale;
  persona?: Mark6Persona;
}): Promise<Mark6PredictiveDrawResult> {
  const upcoming = await getUpcomingMark6DrawDates(8).catch(() => ({ dates: [], source: "fallback" as const }));
  const resolvedDate = resolveNextMark6DrawDate(targetDate, upcoming.dates);
  const previousDraw = await getLatestMark6PreviousDraw(resolvedDate).catch(() => null);
  const analysis = await getMark6Analysis({
    persona,
    query: "hotCold",
    window: 50,
    targetDate: resolvedDate,
  });

  const heatByNumber = new Map<number, number>(
    analysis.numberStats.map((row) => [row.number, row.heat]),
  );

  let draws: TrainingDraw[] = [];
  let dataSource: "database" | "fallback" = "fallback";
  let historyRange = { start: resolvedDate, end: resolvedDate };

  if (canUseDatabase()) {
    try {
      await ensureSchema();
      try {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 60);
        await ingestMarkSixFromWeb({
          fromDate: formatDateKey(fromDate),
          maxDraws: 48,
        });
      } catch {
        // Continue with existing rows.
      }
      const { startDate, endDate } = getHistoryWindow(resolvedDate);
      historyRange = { start: startDate, end: endDate };
      const rows = await dbQuery<{
        draw_date: string;
        numbers: number[];
        special_number: number | null;
      }>(
        `
        SELECT draw_date, numbers, special_number
        FROM mark6_results
        WHERE draw_date BETWEEN $1::date AND $2::date
        ORDER BY draw_date ASC
        `,
        [startDate, endDate],
      );
      if (rows.rows.length > 0) {
        dataSource = "database";
        draws = rows.rows.map((row) => ({
          drawDate: toDate(row.draw_date),
          numbers: row.numbers,
          specialNumber: row.special_number ?? undefined,
        }));
      }
    } catch {
      draws = [];
    }
  }

  if (draws.length === 0) {
    dataSource = analysis.dataSource === "database" ? "database" : "fallback";
  }

  const suggestion = await getSuggestion({
    mode: "mark6",
    targetDate: resolvedDate,
    locale,
    mark6Persona: persona,
    mark6PredictionType: "single",
    mark6BatchCount: 5,
    mark6NumberMix: "mixed",
    mark6GenerateMode: "auto",
  });

  const endDateObject = toDate(resolvedDate);
  const { finalScores, historical, modelOnly } = scoreDraws(
    draws,
    endDateObject,
    previousDraw ?? undefined,
    heatByNumber,
  );

  const ranked = [...finalScores.entries()]
    .map(([number, score]) => ({ number, score }))
    .sort((a, b) => b.score - a.score || a.number - b.number);

  const primarySet =
    suggestion.mark6BatchSets?.[0]?.length === 6
      ? [...suggestion.mark6BatchSets[0]].sort((a, b) => a - b)
      : pickDeterministicMixedSet(ranked);

  const alternativeSets: Array<{ label: string; numbers: number[] }> = [];
  const batchSets = suggestion.mark6BatchSets ?? [];
  for (let index = 1; index < Math.min(batchSets.length, 4); index += 1) {
    const set = batchSets[index];
    if (set?.length === 6) {
      alternativeSets.push({
        label: locale === "zh-HK" ? `後備組合 ${index}` : `Alternate set ${index}`,
        numbers: [...set].sort((a, b) => a - b),
      });
    }
  }

  if (alternativeSets.length === 0 && ranked.length >= 12) {
    alternativeSets.push({
      label: locale === "zh-HK" ? "模型排名 7–12" : "Model ranks 7–12",
      numbers: pickDeterministicMixedSet(ranked.slice(6, 18)),
    });
  }

  const maxScore = ranked[0]?.score ?? 1;
  const topSignals: Mark6PredictiveNumberRow[] = ranked.slice(0, 12).map((row, index) => ({
    number: row.number,
    rank: index + 1,
    score: Number(row.score.toFixed(4)),
    displayScore: Number(((row.score / maxScore) * 100).toFixed(1)),
    tags: buildTags(
      row.number,
      draws,
      historical,
      modelOnly,
      heatByNumber,
      previousDraw ?? undefined,
    ),
  }));

  const hotNumbers = analysis.numberStats
    .filter((row) => row.heat >= 0.55)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 6)
    .map((row) => row.number);
  const coldNumbers = analysis.numberStats
    .filter((row) => row.heat <= 0.35)
    .sort((a, b) => a.heat - b.heat)
    .slice(0, 6)
    .map((row) => row.number);

  const oddEven = analysis.oddEven.at(-1);
  const oddEvenLabel =
    oddEven && oddEven.draws > 0
      ? `${oddEven.odd}/${oddEven.even} ${locale === "zh-HK" ? "單雙" : "odd/even"} (${analysis.window} ${locale === "zh-HK" ? "期" : "draws"})`
      : "-";

  const backtest = runBacktest(draws);
  const confidenceBand = getConfidence(
    Math.max(draws.length, analysis.drawCount),
    ranked.map((row) => row.score),
  );

  const drawDay = endDateObject.toLocaleDateString(locale === "zh-HK" ? "zh-HK" : "en-HK", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    targetDate: resolvedDate,
    drawLabel: drawDay,
    generatedAt: new Date().toISOString(),
    dataSource: dataSource === "database" ? "database" : analysis.dataSource,
    trainingDrawCount: Math.max(draws.length, analysis.drawCount),
    historyRange,
    latestOfficialDraw: previousDraw
      ? {
          date: previousDraw.date,
          numbers: previousDraw.numbers,
          specialNumber: previousDraw.specialNumber,
          source: previousDraw.source,
        }
      : undefined,
    backtest: {
      ...backtest,
      note:
        locale === "zh-HK"
          ? `以最近 ${backtest.evaluatedDraws} 期 walk-forward 回測：頭 6 個模型號碼平均命中 ${backtest.averageTop6Hits}/6（${backtest.top6HitRatePct}%）。`
          : `Walk-forward backtest on the last ${backtest.evaluatedDraws} draws: top-6 model picks averaged ${backtest.averageTop6Hits}/6 hits (${backtest.top6HitRatePct}%).`,
    },
    primarySet,
    alternativeSets,
    specialNumberPick: predictSpecialNumber(draws),
    topSignals,
    analysisHighlights: {
      hotNumbers,
      coldNumbers,
      oddEvenLabel,
      windowDraws: analysis.window,
    },
    confidenceBand,
    modelVersion: "mark6-predictive-v2",
    persona,
    methodology:
      locale === "zh-HK"
        ? `綜合 ${Math.max(draws.length, analysis.drawCount)} 期歷史開彩、walk-forward 邏輯回歸、上一期官方結果模式、50 期冷熱走勢與季節權重。`
        : `Ensemble of ${Math.max(draws.length, analysis.drawCount)} historical draws, walk-forward logistic scoring, previous-draw pattern boosts, 50-draw hot/cold trends, and seasonal weighting.`,
    disclaimer:
      locale === "zh-HK"
        ? "預測只供娛樂及研究用途。六合彩每個組合機會均等，歷史資料不能保證未來結果。"
        : "Predictions are for entertainment and research only. Mark Six draws are random; historical data cannot guarantee future outcomes.",
  };
}
