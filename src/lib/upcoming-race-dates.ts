import { load } from "cheerio";

type UpcomingRaceDatesResponse = {
  dates: string[];
  source: "website" | "fallback";
};

const FIXTURE_BASE_URL = "https://racing.hkjc.com/en-us/local/information/fixture";
const RACE_DATES_CACHE_TTL_MS = 10 * 60 * 1000;
const raceDatesCache = new Map<
  string,
  {
    value: UpcomingRaceDatesResponse;
    expiresAt: number;
  }
>();

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatDateYYYYMMDD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseFixtureCalendarDates(html: string) {
  const $ = load(html);
  const monthText = $("table.table_bd thead tr td[colspan='7']").first().text().trim();
  const monthMatch = monthText.match(/^(\d{1,2})\/(\d{4})$/);
  if (!monthMatch) {
    return [];
  }

  const month = Number.parseInt(monthMatch[1] ?? "", 10);
  const year = Number.parseInt(monthMatch[2] ?? "", 10);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return [];
  }

  const dates: string[] = [];
  $("table.table_bd tbody td.calendar").each((_, cell) => {
    const dayText = $(cell).find("span.f_fs14").first().text().trim();
    const day = Number.parseInt(dayText, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      return;
    }
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return;
    }
    dates.push(formatDateYYYYMMDD(date));
  });

  return dates;
}

async function fetchFixtureMonth(year: number, month: number) {
  const monthParam = String(month).padStart(2, "0");
  const url = `${FIXTURE_BASE_URL}?calyear=${year}&calmonth=${monthParam}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MobileBettingAssistant/1.0)",
    },
    next: { revalidate: 1800 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch fixture month ${year}-${monthParam}`);
  }
  return response.text();
}

export async function getUpcomingHorseRaceDates(
  limit = 30,
  monthsAhead = 6,
): Promise<UpcomingRaceDatesResponse> {
  const normalizedLimit = Math.max(1, Math.min(limit, 120));
  const normalizedMonthsAhead = Math.max(1, Math.min(monthsAhead, 12));
  const cacheKey = `${normalizedLimit}-${normalizedMonthsAhead}`;
  const nowMs = Date.now();
  const cached = raceDatesCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) {
    return cached.value;
  }

  const today = startOfDay(new Date());
  const collected = new Set<string>();

  const monthTasks: Array<Promise<string[]>> = [];
  for (let offset = 0; offset < normalizedMonthsAhead; offset += 1) {
    const cursor = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    monthTasks.push(
      fetchFixtureMonth(year, month).then((html) => parseFixtureCalendarDates(html)),
    );
  }

  const monthResults = await Promise.allSettled(monthTasks);
  for (const monthResult of monthResults) {
    if (monthResult.status !== "fulfilled") {
      continue;
    }
    for (const dateText of monthResult.value) {
      if (dateText >= formatDateYYYYMMDD(today)) {
        collected.add(dateText);
      }
    }
  }

  const sorted = [...collected].sort().slice(0, normalizedLimit);
  if (sorted.length > 0) {
    const value: UpcomingRaceDatesResponse = {
      dates: sorted,
      source: "website",
    };
    raceDatesCache.set(cacheKey, {
      value,
      expiresAt: nowMs + RACE_DATES_CACHE_TTL_MS,
    });
    return value;
  }

  const fallbackValue: UpcomingRaceDatesResponse = {
    dates: [] as string[],
    source: "fallback",
  };
  raceDatesCache.set(cacheKey, {
    value: fallbackValue,
    expiresAt: nowMs + Math.min(RACE_DATES_CACHE_TTL_MS, 2 * 60 * 1000),
  });
  return fallbackValue;
}
