import { load } from "cheerio";

type UpcomingRaceDatesResponse = {
  dates: string[];
  source: "website" | "fallback";
};

const FIXTURE_BASE_URL = "https://racing.hkjc.com/en-us/local/information/fixture";

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
    cache: "no-store",
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
  const today = startOfDay(new Date());
  const collected = new Set<string>();

  for (let offset = 0; offset < monthsAhead; offset += 1) {
    const cursor = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    try {
      const html = await fetchFixtureMonth(year, month);
      const dates = parseFixtureCalendarDates(html);
      for (const dateText of dates) {
        if (dateText >= formatDateYYYYMMDD(today)) {
          collected.add(dateText);
        }
      }
    } catch {
      // Continue scanning later months if one month fetch fails.
    }
  }

  const sorted = [...collected].sort().slice(0, limit);
  if (sorted.length > 0) {
    return {
      dates: sorted,
      source: "website",
    };
  }

  return {
    dates: [],
    source: "fallback",
  };
}
