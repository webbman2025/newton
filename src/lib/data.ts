import type { ConfidenceBand, Locale, Mode } from "@/lib/translations";
import { dbQuery, withTransaction } from "@/lib/db";

export type SuggestionResponse = {
  status: "ok" | "stale";
  mode: Mode;
  targetDate: string;
  progress: ["fetching", "analyzing", "generating", "done"];
  suggestions: string[];
  confidenceBand: ConfidenceBand;
  explanation: string;
  disclaimer: string;
};

type HistoryEntry = {
  date: string;
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
  horseName: string;
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
  { date: "2026-04-20", raceId: "ST-R3", horseName: "Golden Harbor", position: 1 },
  { date: "2026-04-20", raceId: "ST-R3", horseName: "Sky Rocket", position: 2 },
  { date: "2026-04-20", raceId: "ST-R3", horseName: "Night Storm", position: 3 },
  { date: "2026-04-24", raceId: "HV-R5", horseName: "Silver Arrow", position: 1 },
  { date: "2026-04-24", raceId: "HV-R5", horseName: "Rapid Crest", position: 2 },
  { date: "2026-04-24", raceId: "HV-R5", horseName: "Ocean Gift", position: 3 },
];

const HISTORY_YEARS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HISTORY_WINDOW_DAYS = HISTORY_YEARS * 365;

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

function getLocalizedDisclaimer(locale: Locale) {
  return locale === "zh-HK"
    ? "僅供娛樂用途，不保證中獎，並非財務建議。"
    : "For entertainment only. No guaranteed winnings. No financial advice.";
}

async function getMark6Suggestion(locale: Locale, targetDate: string) {
  if (!canUseDatabase()) {
    return getMark6SuggestionFallback(locale);
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
      return getMark6SuggestionFallback(locale);
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

    const topSix = [...scoreByNumber.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([number]) => number)
      .sort((a, b) => a - b)
      .slice(0, 6);

    return {
      suggestions: topSix.map((value) => value.toString()),
      confidenceBand: "Low" as ConfidenceBand,
      explanation:
        locale === "zh-HK"
          ? `已學習近${HISTORY_YEARS}年（${draws.rows.length}期）歷史結果，按號碼頻率與時間加權計分生成此組合；屬啟發式教學推薦，並非中獎概率預測。`
          : `Learned from the last ${HISTORY_YEARS} years of draws (${draws.rows.length} records), weighted by frequency and recency. This is a heuristic educational suggestion, not a true win-probability prediction.`,
    };
  } catch {
    return getMark6SuggestionFallback(locale);
  }
}

async function getHorseSuggestion(locale: Locale, targetDate: string) {
  if (!canUseDatabase()) {
    return getHorseSuggestionFallback(locale);
  }

  try {
    const { startDate, endDate, endDateObject } = getHistoryWindow(targetDate);
    const raceRows = await dbQuery<{
      race_date: string;
      horse_name: string;
      jockey: string;
      trainer: string;
      position: number;
    }>(
      `
        SELECT race_date, horse_name, jockey, trainer, position
        FROM race_results
        WHERE race_date BETWEEN $1::date AND $2::date
        ORDER BY race_date ASC
      `,
      [startDate, endDate],
    );

    if (raceRows.rows.length === 0) {
      return getHorseSuggestionFallback(locale);
    }

    const pairStats = new Map<string, { total: number; top3: number }>();
    for (const row of raceRows.rows) {
      const pairKey = `${row.jockey}|${row.trainer}`;
      const stats = pairStats.get(pairKey) ?? { total: 0, top3: 0 };
      stats.total += 1;
      if (row.position <= 3) {
        stats.top3 += 1;
      }
      pairStats.set(pairKey, stats);
    }

    const horseScore = new Map<string, number>();
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
    }

    const topPicks = [...horseScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([horseName]) => horseName);

    return {
      suggestions: topPicks,
      confidenceBand: "Medium" as ConfidenceBand,
      explanation:
        locale === "zh-HK"
          ? `已學習近${HISTORY_YEARS}年（${raceRows.rows.length}筆）賽果，按名次、時間權重及騎師/練馬師組合穩定性計分，得出前三匹推薦。`
          : `Learned from the last ${HISTORY_YEARS} years of race history (${raceRows.rows.length} records), scoring by placing, recency, and jockey-trainer consistency to rank the top three picks.`,
    };
  } catch {
    return getHorseSuggestionFallback(locale);
  }
}

function getMark6SuggestionFallback(locale: Locale) {
  const frequencies = new Map<number, number>();
  for (const draw of mark6FallbackRows) {
    for (const number of draw.numbers) {
      frequencies.set(number, (frequencies.get(number) ?? 0) + 1);
    }
  }

  const topSix = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([value]) => value)
    .sort((a, b) => a - b);

  return {
    suggestions: topSix.map((value) => value.toString()),
    confidenceBand: "Low" as ConfidenceBand,
    explanation:
      locale === "zh-HK"
        ? "此組合基於最近資料樣本的號碼頻率與分佈，屬啟發式教學推薦。"
        : "This set uses frequency and distribution patterns from recent sample draws as a heuristic educational suggestion.",
  };
}

function getHorseSuggestionFallback(locale: Locale) {
  const grouped = raceFallbackRows.reduce<Record<string, number>>((acc, row) => {
    const score = 4 - row.position;
    acc[row.horseName] = (acc[row.horseName] ?? 0) + score;
    return acc;
  }, {});

  const picks = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([horse]) => horse);

  return {
    suggestions: picks,
    confidenceBand: "Medium" as ConfidenceBand,
    explanation:
      locale === "zh-HK"
        ? "推薦按最近樣本賽果建立加權排序，幫助初學者理解基本賽馬評估方式。"
        : "Picks are weighted from recent sample race results to provide a beginner-friendly evaluation approach.",
  };
}

export async function getSuggestion({
  mode,
  targetDate,
  locale,
}: {
  mode: Mode;
  targetDate: string;
  locale: Locale;
}): Promise<SuggestionResponse> {
  const base =
    mode === "mark6"
      ? await getMark6Suggestion(locale, targetDate)
      : await getHorseSuggestion(locale, targetDate);

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
            JSON.stringify({ mode, targetDate, locale }),
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
    progress: ["fetching", "analyzing", "generating", "done"],
    suggestions: base.suggestions,
    confidenceBand: base.confidenceBand,
    explanation: base.explanation,
    disclaimer: getLocalizedDisclaimer(locale),
  };
}

export async function getHistory(mode: Mode, locale: Locale): Promise<HistoryEntry[]> {
  if (!canUseDatabase()) {
    return getHistoryFallback(mode, locale);
  }

  if (mode === "mark6") {
    try {
      const rows = await dbQuery<{ draw_date: Date; numbers: number[] }>(
        `
        SELECT draw_date, numbers
        FROM mark6_results
        ORDER BY draw_date DESC
        LIMIT 20
        `,
      );

      if (rows.rows.length > 0) {
        return rows.rows.map((row) => ({
          date: row.draw_date.toISOString().slice(0, 10),
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
    const raceRows = await dbQuery<{ race_date: Date; result: string }>(
      `
      SELECT race_date, STRING_AGG(position::text || '. ' || horse_name, ' | ' ORDER BY position) AS result
      FROM race_results
      WHERE position <= 3
      GROUP BY race_date, race_id
      ORDER BY race_date DESC
      LIMIT 20
      `,
    );

    if (raceRows.rows.length > 0) {
      return raceRows.rows.map((row) => ({
        date: row.race_date.toISOString().slice(0, 10),
        result: row.result,
        note:
          locale === "zh-HK"
            ? "頭三名按最近賽果整理。"
            : "Top three finishers from recent race results.",
      }));
    }
    return getHistoryFallback(mode, locale);
  } catch {
    return getHistoryFallback(mode, locale);
  }
}

export async function getAnalytics() {
  if (!canUseDatabase()) {
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
    result: entries
      .sort((a, b) => a.position - b.position)
      .map((item) => `${item.position}. ${item.horseName}`)
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
