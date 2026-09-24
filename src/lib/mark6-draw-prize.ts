import type { Locale } from "@/lib/translations";
import { getUpcomingMark6DrawDates } from "@/lib/upcoming-mark6";
import {
  formatMark6PrizeAmount,
  getMark6HkjcScheduleSnapshot,
  type Mark6HkjcDrawPrize,
  type Mark6PrizeTier,
} from "@/lib/hkjc-mark6-schedule";

export { formatMark6PrizeAmount, formatMark6PrizeAmountFull } from "@/lib/hkjc-mark6-schedule";
export type { Mark6PrizeTier };

export type Mark6DrawDayPrize = Omit<Mark6HkjcDrawPrize, "source"> & {
  source: "hkjc" | "estimate";
};

export type Mark6DrawPrizePayload = {
  selected: Mark6DrawDayPrize;
  weekDraws: Array<Mark6DrawDayPrize & { isSelected: boolean }>;
  latestResult?: Mark6HkjcDrawPrize;
  nextScheduled?: Mark6HkjcDrawPrize;
  syncedAt?: string;
  prizesByDate?: Record<string, Mark6HkjcDrawPrize>;
  logicAppliesEqually: true;
  scheduleSource: "hkjc" | "mixed";
};

const STANDARD_FIRST_PRIZE_ESTIMATE = 8_000_000;

function estimateDrawDayPrize(drawDate: string): Mark6DrawDayPrize {
  return {
    drawDate,
    firstPrizeMax: STANDARD_FIRST_PRIZE_ESTIMATE,
    jackpotCarry: 0,
    tier: "standard",
    source: "estimate",
  };
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
  hkjcByDate: Record<string, Mark6HkjcDrawPrize>,
): Mark6DrawDayPrize {
  const live = hkjcByDate[drawDate];
  if (live) {
    return { ...live, source: "hkjc" };
  }
  return estimateDrawDayPrize(drawDate);
}

export async function getMark6DrawPrizePayload(
  targetDate: string,
  locale: Locale,
): Promise<Mark6DrawPrizePayload> {
  const normalizedTarget = /^\d{4}-\d{2}-\d{2}$/.test(targetDate)
    ? targetDate
    : new Date().toISOString().slice(0, 10);

  let hkjcByDate: Record<string, Mark6HkjcDrawPrize> = {};
  let scheduleSource: Mark6DrawPrizePayload["scheduleSource"] = "mixed";
  let latestResult: Mark6HkjcDrawPrize | undefined;
  let nextScheduled: Mark6HkjcDrawPrize | undefined;
  let syncedAt: string | undefined;

  try {
    const snapshot = await getMark6HkjcScheduleSnapshot(locale);
    hkjcByDate = snapshot.byDate;
    latestResult = snapshot.latestResult;
    nextScheduled = snapshot.nextDraw;
    syncedAt = snapshot.syncedAt;
    scheduleSource = Object.keys(hkjcByDate).length > 0 ? "hkjc" : "mixed";
  } catch {
    scheduleSource = "mixed";
  }

  const upcoming = await getUpcomingMark6DrawDates(12).catch(() => ({
    dates: [] as string[],
    source: "fallback" as const,
  }));

  const { start, end } = getWeekBounds(normalizedTarget);
  const hkjcWeekDates = Object.keys(hkjcByDate)
    .filter((date) => date >= start && date <= end)
    .sort();
  const weekDates =
    hkjcWeekDates.length > 0
      ? hkjcWeekDates
      : upcoming.dates.filter((date) => date >= start && date <= end);
  const weekDrawList =
    weekDates.length > 0
      ? weekDates
      : [normalizedTarget].filter((date) => date >= start && date <= end);

  const weekPrizes = (weekDrawList.length > 0 ? weekDrawList : [normalizedTarget]).map((drawDate) => {
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
    latestResult,
    nextScheduled,
    syncedAt,
    prizesByDate: Object.keys(hkjcByDate).length > 0 ? hkjcByDate : undefined,
    logicAppliesEqually: true,
    scheduleSource,
  };
}
