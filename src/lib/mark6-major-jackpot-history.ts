import type { Locale } from "@/lib/translations";

const HKJC_MARK6_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HISTORY_YEARS = 5;
const MAJOR_FIRST_PRIZE_THRESHOLD = 30_000_000;
const HKJC_HISTORY_LAST_N = 1200;

const HKJC_MARK6_HISTORY_QUERY = `
fragment lotteryDrawsFragment on LotteryDraw {
    drawDate
    status
    snowballCode
    snowballName_en
    snowballName_ch
    lotteryPool {
      jackpot
      derivedFirstPrizeDiv
    }
    drawResult {
      drawnNo
      xDrawnNo
    }
  }
query marksixResult($lastNDraw: Int, $startDate: String, $endDate: String, $drawType: LotteryDrawType) {
            lotteryDraws(lastNDraw: $lastNDraw, startDate: $startDate, endDate: $endDate, drawType: $drawType) {
              ...lotteryDrawsFragment
            }
        }`;

type HkjcHistoryDraw = {
  drawDate?: string;
  status?: string;
  snowballCode?: string;
  snowballName_en?: string;
  snowballName_ch?: string;
  lotteryPool?: {
    jackpot?: string;
    derivedFirstPrizeDiv?: string;
  };
  drawResult?: {
    drawnNo?: number[];
    xDrawnNo?: number;
  };
};

export type MajorJackpotDrawRow = {
  drawDate: string;
  firstPrizeMax: number;
  snowballName?: string;
  numbers: number[];
  specialNumber?: number;
};

export type MajorJackpotNumberRow = {
  number: number;
  majorDrawHits: number;
  sharePct: number;
  footprint: number;
};

export type Mark6MajorJackpotHistory = {
  windowYears: number;
  windowStart: string;
  windowEnd: string;
  majorDrawCount: number;
  sampledResultDraws: number;
  topNumbers: MajorJackpotNumberRow[];
  recentMajorDraws: MajorJackpotDrawRow[];
  numberWeights: Record<string, number>;
  source: "hkjc";
};

function parseAmount(raw?: string) {
  if (!raw) {
    return 0;
  }
  const value = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function getHistoryWindow(targetDate: string) {
  const end = new Date(`${targetDate}T00:00:00`);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - HISTORY_YEARS);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function fetchHkjcMark6History(): Promise<HkjcHistoryDraw[]> {
  const response = await fetch(HKJC_MARK6_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; MobileBettingAssistant/1.0)",
      Origin: "https://bet.hkjc.com",
      Referer: "https://bet.hkjc.com/marksix/Results.aspx?lang=en",
    },
    body: JSON.stringify({
      query: HKJC_MARK6_HISTORY_QUERY,
      variables: {
        lastNDraw: HKJC_HISTORY_LAST_N,
        drawType: "All",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HKJC Mark Six history failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { lotteryDraws?: HkjcHistoryDraw[] | null };
    errors?: unknown;
  };

  if (payload.errors) {
    throw new Error("HKJC Mark Six history returned errors.");
  }

  return payload.data?.lotteryDraws ?? [];
}

function snowballLabel(draw: HkjcHistoryDraw, locale: Locale) {
  if (locale === "zh-HK") {
    return draw.snowballName_ch || draw.snowballName_en || undefined;
  }
  return draw.snowballName_en || draw.snowballName_ch || undefined;
}

export function getMajorJackpotNumberWeightMap(history: Mark6MajorJackpotHistory): Map<number, number> {
  return new Map(history.topNumbers.map((row) => [row.number, row.footprint]));
}

export async function getMark6MajorJackpotHistory(
  targetDate: string,
  locale: Locale,
): Promise<Mark6MajorJackpotHistory> {
  const normalizedTarget = /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
    ? targetDate
    : new Date().toISOString().slice(0, 10);
  const { startDate, endDate } = getHistoryWindow(normalizedTarget);
  const rows = await fetchHkjcMark6History();

  const resultDraws = rows.filter((draw) => {
    const drawDate = draw.drawDate?.slice(0, 10);
    return (
      draw.status === "Result" &&
      drawDate &&
      drawDate >= startDate &&
      drawDate <= endDate &&
      (draw.drawResult?.drawnNo?.length ?? 0) >= 6
    );
  });

  const majorDraws: MajorJackpotDrawRow[] = [];
  for (const draw of resultDraws) {
    const drawDate = draw.drawDate!.slice(0, 10);
    const firstPrizeMax = parseAmount(draw.lotteryPool?.derivedFirstPrizeDiv);
    if (firstPrizeMax < MAJOR_FIRST_PRIZE_THRESHOLD) {
      continue;
    }
    const numbers = (draw.drawResult?.drawnNo ?? [])
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 49)
      .slice(0, 6);
    if (numbers.length !== 6) {
      continue;
    }
    majorDraws.push({
      drawDate,
      firstPrizeMax,
      snowballName: snowballLabel(draw, locale),
      numbers: [...numbers].sort((a, b) => a - b),
      specialNumber:
        Number.isInteger(draw.drawResult?.xDrawnNo) &&
        (draw.drawResult?.xDrawnNo ?? 0) >= 1 &&
        (draw.drawResult?.xDrawnNo ?? 0) <= 49
          ? draw.drawResult?.xDrawnNo
          : undefined,
    });
  }

  majorDraws.sort((a, b) => b.drawDate.localeCompare(a.drawDate));

  const hitCounts = new Map<number, number>();
  for (const draw of majorDraws) {
    for (const number of draw.numbers) {
      hitCounts.set(number, (hitCounts.get(number) ?? 0) + 1);
    }
  }

  const maxHits = Math.max(1, ...hitCounts.values());
  const topNumbers = [...hitCounts.entries()]
    .map(([number, majorDrawHits]) => ({
      number,
      majorDrawHits,
      sharePct: Number(((majorDrawHits / Math.max(1, majorDraws.length)) * 100).toFixed(1)),
      footprint: Number((majorDrawHits / maxHits).toFixed(3)),
    }))
    .sort((a, b) => b.majorDrawHits - a.majorDrawHits || a.number - b.number)
    .slice(0, 12);

  const numberWeights = Object.fromEntries(
    topNumbers.map((row) => [String(row.number), row.footprint]),
  );

  return {
    windowYears: HISTORY_YEARS,
    windowStart: startDate,
    windowEnd: endDate,
    majorDrawCount: majorDraws.length,
    sampledResultDraws: resultDraws.length,
    topNumbers,
    recentMajorDraws: majorDraws.slice(0, 6),
    numberWeights,
    source: "hkjc",
  };
}

export function formatMajorJackpotHistoryNote(
  history: Mark6MajorJackpotHistory,
  locale: Locale,
): string {
  const top = history.topNumbers
    .slice(0, 6)
    .map((row) => row.number)
    .join(locale === "zh-HK" ? "、" : ", ");

  if (locale === "zh-HK") {
    return `過去 ${history.windowYears} 年內 ${history.majorDrawCount} 期頭獎達 3,000 萬港元以上的開彩中，主號出現次數最多的是：${top || "—"}。這只反映歷史紀錄，不代表下一期機率較高；每個號碼被抽中的機會仍然相同。`;
  }

  return `Across ${history.majorDrawCount} major draws (HK$30M+ 1st division) in the last ${history.windowYears} years, the most repeated main numbers were: ${top || "—"}. That is historical co-occurrence only — it does not raise official odds; every ball still has the same chance.`;
}
