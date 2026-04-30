type UpcomingMark6Response = {
  dates: string[];
  source: "website" | "fallback";
};

const MARK6_SOURCE_URLS = [
  "https://bet.hkjc.com/marksix/Results.aspx?lang=en",
  "https://www.lottolyzer.com/hong-kong/mark-six/results",
];

const DATE_PATTERN = /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g;

export async function getUpcomingMark6DrawDates(limit = 12): Promise<UpcomingMark6Response> {
  const fromDate = new Date();

  for (const url of MARK6_SOURCE_URLS) {
    try {
      const html = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MobileBettingAssistant/1.0)",
        },
        cache: "no-store",
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch schedule from ${url}`);
        }
        return response.text();
      });

      const parsed = parseUpcomingDatesFromHtml(html, fromDate, limit);
      if (parsed.length > 0) {
        return { dates: parsed, source: "website" };
      }
    } catch {
      // Try next source and only fallback if all sources fail.
    }
  }

  return {
    dates: buildFallbackDrawDates(fromDate, limit),
    source: "fallback",
  };
}

function parseUpcomingDatesFromHtml(html: string, fromDate: Date, limit: number) {
  const matches = html.match(DATE_PATTERN) ?? [];
  const normalized = new Set<string>();
  const minTime = startOfDay(fromDate).getTime();
  const maxTime = minTime + 1000 * 60 * 60 * 24 * 180;

  for (const raw of matches) {
    const date = parseFlexibleDate(raw);
    if (!date) {
      continue;
    }
    const ts = startOfDay(date).getTime();
    if (ts < minTime || ts > maxTime) {
      continue;
    }
    normalized.add(formatDateYYYYMMDD(date));
  }

  return [...normalized].sort().slice(0, limit);
}

function parseFlexibleDate(raw: string): Date | null {
  const clean = raw.replace(/\//g, "-");
  const parts = clean.split("-").map((value) => Number(value));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [a, b, c] = parts;
  let year: number;
  let month: number;
  let day: number;

  if (a > 1900) {
    year = a;
    month = b;
    day = c;
  } else {
    day = a;
    month = b;
    year = c;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
}

function buildFallbackDrawDates(fromDate: Date, limit: number) {
  const result: string[] = [];
  const cursor = startOfDay(fromDate);

  while (result.length < limit) {
    const day = cursor.getDay();
    if (day === 2 || day === 4 || day === 6) {
      result.push(formatDateYYYYMMDD(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

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
