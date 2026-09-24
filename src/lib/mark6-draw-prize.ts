import type { Locale } from "@/lib/translations";
import { getUpcomingMark6DrawDates } from "@/lib/upcoming-mark6";

const HKJC_MARK6_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";

const HKJC_MARK6_SCHEDULE_QUERY = `
fragment lotteryDrawsFragment on LotteryDraw {
    id
    drawDate
    status
    snowballCode
    snowballName_en
    snowballName_ch
    lotteryPool {
      jackpot
      estimatedPrize
      derivedFirstPrizeDiv
    }
  }
query marksixDraw {
            lotteryDraws {
                ...lotteryDrawsFragment
            }
        }`;

type HkjcScheduleDraw = {
  drawDate?: string;
  status?: string;
  snowballCode?: string;
  snowballName_en?: string;
  snowballName_ch?: string;
  lotteryPool?: {
    jackpot?: string;
    estimatedPrize?: string;
    derivedFirstPrizeDiv?: string;
  };
};

export type Mark6PrizeTier = "standard" | "major";

export type Mark6DrawDayPrize = {
  drawDate: string;
  firstPrizeMax: number;
  jackpotCarry: number;
  tier: Mark6PrizeTier;
  snowballCode?: string;
  snowballName?: string;
  status?: string;
  source: "hkjc" | "estimate";
};

export type Mark6DrawPrizePayload = {
  selected: Mark6DrawDayPrize;
  weekDraws: Array<Mark6DrawDayPrize & { isSelected: boolean }>;
  logicAppliesEqually: true;
  scheduleSource: "hkjc" | "mixed";
};

const MAJOR_PRIZE_THRESHOLD = 30_000_000;
const STANDARD_FIRST_PRIZE_ESTIMATE = 8_000_000;

function parseDrawDateKey(raw?: string) {
  if (!raw) {
    return "";
  }
  return raw.slice(0, 10);
}

function parseHkjcAmount(raw?: string | number) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (!raw || raw === "") {
    return 0;
  }
  const value = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function getPrizeTier(firstPrizeMax: number): Mark6PrizeTier {
  return firstPrizeMax >= MAJOR_PRIZE_THRESHOLD ? "major" : "standard";
}

function toDrawDayPrize(
  draw: HkjcScheduleDraw,
  locale: Locale,
  source: "hkjc",
): Mark6DrawDayPrize | null {
  const drawDate = parseDrawDateKey(draw.drawDate);
  if (!drawDate) {
    return null;
  }
  const pool = draw.lotteryPool;
  const derived = parseHkjcAmount(pool?.derivedFirstPrizeDiv);
  const jackpot = parseHkjcAmount(pool?.jackpot);
  const estimated = parseHkjcAmount(pool?.estimatedPrize);
  const firstPrizeMax = derived || estimated || jackpot;
  if (firstPrizeMax <= 0) {
    return null;
  }
  const snowballName =
    locale === "zh-HK"
      ? draw.snowballName_ch || draw.snowballName_en || undefined
      : draw.snowballName_en || draw.snowballName_ch || undefined;

  return {
    drawDate,
    firstPrizeMax,
    jackpotCarry: jackpot,
    tier: getPrizeTier(firstPrizeMax),
    snowballCode: draw.snowballCode || undefined,
    snowballName: snowballName || undefined,
    status: draw.status,
    source,
  };
}

function estimateDrawDayPrize(drawDate: string): Mark6DrawDayPrize {
  return {
    drawDate,
    firstPrizeMax: STANDARD_FIRST_PRIZE_ESTIMATE,
    jackpotCarry: 0,
    tier: "standard",
    source: "estimate",
  };
}

async function fetchHkjcScheduleDraws(): Promise<HkjcScheduleDraw[]> {
  const response = await fetch(HKJC_MARK6_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; MobileBettingAssistant/1.0)",
      Origin: "https://bet.hkjc.com",
      Referer: "https://bet.hkjc.com/marksix/Results.aspx?lang=en",
    },
    body: JSON.stringify({
      query: HKJC_MARK6_SCHEDULE_QUERY,
      variables: {},
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HKJC schedule fetch failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { lotteryDraws?: HkjcScheduleDraw[] | null };
  };
  return payload.data?.lotteryDraws ?? [];
}

function getWeekBounds(targetDate: string) {
  const anchor = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) {
    const today = new Date().toISOString().slice(0, 10);
    return getWeekBounds(today);
  }
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function resolvePrizeForDate(
  drawDate: string,
  hkjcByDate: Map<string, Mark6DrawDayPrize>,
): Mark6DrawDayPrize {
  return hkjcByDate.get(drawDate) ?? estimateDrawDayPrize(drawDate);
}

export function formatMark6PrizeAmount(amount: number, locale: Locale): string {
  if (amount <= 0) {
    return locale === "zh-HK" ? "待定" : "TBC";
  }
  if (locale === "zh-HK") {
    if (amount >= 100_000_000) {
      const yi = amount / 100_000_000;
      return `約 ${yi % 1 === 0 ? yi.toFixed(0) : yi.toFixed(1)} 億港元`;
    }
    if (amount >= 10_000) {
      return `約 ${Math.round(amount / 10_000).toLocaleString("en-HK")} 萬港元`;
    }
    return `約 HK$${amount.toLocaleString("en-HK")}`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const rounded =
      millions >= 10 ? Math.round(millions).toString() : millions.toFixed(1).replace(/\.0$/, "");
    return `HK$${rounded}M est.`;
  }
  return `HK$${amount.toLocaleString("en-HK")} est.`;
}

export async function getMark6DrawPrizePayload(
  targetDate: string,
  locale: Locale,
): Promise<Mark6DrawPrizePayload> {
  const normalizedTarget = /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
    ? targetDate
    : new Date().toISOString().slice(0, 10);

  const hkjcByDate = new Map<string, Mark6DrawDayPrize>();
  let scheduleSource: Mark6DrawPrizePayload["scheduleSource"] = "mixed";

  try {
    const schedule = await fetchHkjcScheduleDraws();
    for (const draw of schedule) {
      const parsed = toDrawDayPrize(draw, locale, "hkjc");
      if (parsed) {
        hkjcByDate.set(parsed.drawDate, parsed);
      }
    }
    scheduleSource = hkjcByDate.size > 0 ? "hkjc" : "mixed";
  } catch {
    scheduleSource = "mixed";
  }

  const upcoming = await getUpcomingMark6DrawDates(12).catch(() => ({
    dates: [] as string[],
    source: "fallback" as const,
  }));

  const { start, end } = getWeekBounds(normalizedTarget);
  const weekDates = upcoming.dates.filter((date) => date >= start && date <= end);
  const weekDraws =
    weekDates.length > 0
      ? weekDates
      : [normalizedTarget].filter((date) => date >= start && date <= end);

  const weekPrizes = (weekDraws.length > 0 ? weekDraws : [normalizedTarget]).map((drawDate) => {
    const prize = resolvePrizeForDate(drawDate, hkjcByDate);
    return {
      ...prize,
      isSelected: drawDate === normalizedTarget,
    };
  });

  const selected = resolvePrizeForDate(normalizedTarget, hkjcByDate);

  return {
    selected,
    weekDraws: weekPrizes.sort((a, b) => a.drawDate.localeCompare(b.drawDate)),
    logicAppliesEqually: true,
    scheduleSource,
  };
}
