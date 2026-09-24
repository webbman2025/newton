import type { Locale } from "@/lib/translations";

export const HKJC_MARK6_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";

const HKJC_MARK6_SCHEDULE_QUERY = `
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

type HkjcRawDraw = {
  id?: string;
  year?: string;
  no?: number;
  closeDate?: string;
  drawDate?: string;
  status?: string;
  snowballCode?: string;
  snowballName_en?: string;
  snowballName_ch?: string;
  lotteryPool?: {
    jackpot?: string;
    estimatedPrize?: string;
    derivedFirstPrizeDiv?: string;
    lotteryPrizes?: Array<{ type?: number; dividend?: string }>;
  };
  drawResult?: {
    drawnNo?: number[];
    xDrawnNo?: number;
  };
};

export type Mark6PrizeTier = "standard" | "major";

export type Mark6HkjcDrawPrize = {
  drawDate: string;
  drawNo?: string;
  status?: string;
  firstPrizeMax: number;
  firstPrizePaid?: number;
  jackpotCarry: number;
  tier: Mark6PrizeTier;
  snowballCode?: string;
  snowballName?: string;
  numbers?: number[];
  specialNumber?: number;
  closeDate?: string;
  source: "hkjc";
};

export type Mark6HkjcScheduleSnapshot = {
  syncedAt: string;
  latestResult?: Mark6HkjcDrawPrize;
  nextDraw?: Mark6HkjcDrawPrize;
  byDate: Record<string, Mark6HkjcDrawPrize>;
};

const MAJOR_PRIZE_THRESHOLD = 30_000_000;

export function parseHkjcMoney(raw?: string | number) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (!raw || raw === "") {
    return 0;
  }
  const value = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function parseDrawDateKey(raw?: string) {
  return raw?.slice(0, 10) ?? "";
}

function getPrizeTier(amount: number): Mark6PrizeTier {
  return amount >= MAJOR_PRIZE_THRESHOLD ? "major" : "standard";
}

function snowballLabel(draw: HkjcRawDraw, locale: Locale) {
  if (locale === "zh-HK") {
    return draw.snowballName_ch || draw.snowballName_en || undefined;
  }
  return draw.snowballName_en || draw.snowballName_ch || undefined;
}

function firstDivisionPaid(pool?: HkjcRawDraw["lotteryPool"]) {
  const row = pool?.lotteryPrizes?.find((prize) => prize.type === 1);
  return parseHkjcMoney(row?.dividend);
}

export function toMark6HkjcDrawPrize(draw: HkjcRawDraw, locale: Locale): Mark6HkjcDrawPrize | null {
  const drawDate = parseDrawDateKey(draw.drawDate);
  if (!drawDate) {
    return null;
  }

  const pool = draw.lotteryPool;
  const derived = parseHkjcMoney(pool?.derivedFirstPrizeDiv);
  const jackpot = parseHkjcMoney(pool?.jackpot);
  const estimated = parseHkjcMoney(pool?.estimatedPrize);
  const paid = firstDivisionPaid(pool);
  const firstPrizeMax = derived || estimated || jackpot || paid;
  if (firstPrizeMax <= 0 && paid <= 0) {
    return null;
  }

  const numbers = (draw.drawResult?.drawnNo ?? [])
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 49)
    .slice(0, 6);
  const special = draw.drawResult?.xDrawnNo;
  const drawNo =
    draw.year && draw.no != null ? `${draw.year}/${String(draw.no).padStart(3, "0")}` : draw.id;

  return {
    drawDate,
    drawNo,
    status: draw.status,
    firstPrizeMax: firstPrizeMax || paid,
    firstPrizePaid: paid > 0 ? paid : undefined,
    jackpotCarry: jackpot,
    tier: getPrizeTier(Math.max(firstPrizeMax, paid)),
    snowballCode: draw.snowballCode || undefined,
    snowballName: snowballLabel(draw, locale),
    numbers: numbers.length === 6 ? [...numbers].sort((a, b) => a - b) : undefined,
    specialNumber:
      Number.isInteger(special) && (special ?? 0) >= 1 && (special ?? 0) <= 49 ? special : undefined,
    closeDate: draw.closeDate?.slice(0, 19),
    source: "hkjc",
  };
}

export async function fetchHkjcMark6ScheduleDraws(): Promise<HkjcRawDraw[]> {
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
    throw new Error(`HKJC Mark Six schedule failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { lotteryDraws?: HkjcRawDraw[] | null };
    errors?: unknown;
  };

  if (payload.errors) {
    throw new Error("HKJC Mark Six schedule returned errors.");
  }

  return payload.data?.lotteryDraws ?? [];
}

export async function getMark6HkjcScheduleSnapshot(locale: Locale): Promise<Mark6HkjcScheduleSnapshot> {
  const rows = await fetchHkjcMark6ScheduleDraws();
  const today = new Date().toISOString().slice(0, 10);
  const byDate: Record<string, Mark6HkjcDrawPrize> = {};

  for (const row of rows) {
    const parsed = toMark6HkjcDrawPrize(row, locale);
    if (parsed) {
      byDate[parsed.drawDate] = parsed;
    }
  }

  const latestResult = rows
    .filter((row) => row.status === "Result")
    .map((row) => toMark6HkjcDrawPrize(row, locale))
    .filter((row): row is Mark6HkjcDrawPrize => Boolean(row))
    .sort((a, b) => b.drawDate.localeCompare(a.drawDate))[0];

  const nextDraw = rows
    .filter((row) => row.status !== "Result" && parseDrawDateKey(row.drawDate) >= today)
    .map((row) => toMark6HkjcDrawPrize(row, locale))
    .filter((row): row is Mark6HkjcDrawPrize => Boolean(row))
    .sort((a, b) => a.drawDate.localeCompare(b.drawDate))[0];

  return {
    syncedAt: new Date().toISOString(),
    latestResult,
    nextDraw,
    byDate,
  };
}

export function getTodayDateKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Upcoming Mark Six draw dates from HKJC only (no Tue/Thu/Sat estimates). */
export function getHkjcSelectableDrawDates(snapshot: Mark6HkjcScheduleSnapshot): string[] {
  const today = getTodayDateKeyUtc();
  const fromByDate = Object.values(snapshot.byDate)
    .filter((row) => row.status !== "Result" && row.drawDate >= today)
    .map((row) => row.drawDate);
  const unique = [...new Set(fromByDate)].sort();
  if (unique.length > 0) {
    return unique;
  }
  if (snapshot.nextDraw?.drawDate) {
    return [snapshot.nextDraw.drawDate];
  }
  return [];
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
    return `HK$${amount.toLocaleString("en-HK")}`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const rounded =
      millions >= 10 ? Math.round(millions).toString() : millions.toFixed(1).replace(/\.0$/, "");
    return `HK$${rounded}M`;
  }
  return `HK$${amount.toLocaleString("en-HK")}`;
}

/** Full figure for hero display (e.g. HK$68,000,000). */
export function formatMark6PrizeAmountFull(amount: number, locale: Locale): string {
  if (amount <= 0) {
    return locale === "zh-HK" ? "待定" : "TBC";
  }
  if (locale === "zh-HK") {
    return `HK$${amount.toLocaleString("en-HK")}（估計最高頭獎）`;
  }
  return `HK$${amount.toLocaleString("en-HK")} est. max 1st division`;
}
