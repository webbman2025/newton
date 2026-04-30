import { load } from "cheerio";
import { dbQuery } from "@/lib/db";

type MarkSixRow = {
  drawDate: string;
  numbers: number[];
};

type RaceRow = {
  raceDate: string;
  raceId: string;
  raceCourse: string;
  raceDistance?: number;
  horseNumber: number;
  horseName: string;
  horseProfile: string;
  position: number;
  jockey: string;
  trainer: string;
};

const LOTTOLYZER_URL = "https://en.lottolyzer.com/history/hong-kong/mark-six";
const HKJC_RESULTS_URL =
  "https://racing.hkjc.com/racing/information/English/Racing/LocalResults.aspx";

function parseDateYyyyMmDd(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function parseDateDdMmYyyy(raw: string) {
  const [day, month, year] = raw.split("/");
  if (!day || !month || !year) {
    return null;
  }
  const date = new Date(`${year}-${month}-${day}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function parseMarkSixRows(html: string, fromDate: string) {
  const $ = load(html);
  const rows: MarkSixRow[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((__, cell) => $(cell).text().trim())
      .get();

    if (cells.length < 3) {
      return;
    }
    const drawDate = parseDateYyyyMmDd(cells[1] ?? "");
    if (!drawDate || drawDate < fromDate) {
      return;
    }
    const numbers = (cells[2] ?? "")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isInteger(value) && value > 0 && value <= 49);

    if (numbers.length !== 6) {
      return;
    }
    rows.push({ drawDate, numbers });
  });

  return rows;
}

function extractMeetingDates(html: string, fromDate: string) {
  const dateMatches = html.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) ?? [];
  const unique = new Set<string>();
  for (const value of dateMatches) {
    const iso = parseDateDdMmYyyy(value);
    if (!iso || iso < fromDate) {
      continue;
    }
    unique.add(iso);
  }
  return [...unique].sort((a, b) => (a > b ? -1 : 1));
}

function parseRaceRows({
  html,
  raceDate,
  raceNo,
  raceCourse,
}: {
  html: string;
  raceDate: string;
  raceNo: number;
  raceCourse: string;
}) {
  const $ = load(html);
  const output: RaceRow[] = [];
  const compactText = $.root().text().replace(/\s+/g, " ");
  const distanceMatch = compactText.match(/(\d{3,4})\s*M\b/i);
  const raceDistance = distanceMatch ? Number(distanceMatch[1]) : undefined;

  $("table").each((_, table) => {
    const header = $(table).find("tr").first().text();
    if (!header.includes("Pla.") || !header.includes("Horse No.")) {
      return;
    }

    $(table)
      .find("tr")
      .each((__, tr) => {
        const cells = $(tr)
          .find("td")
          .map((___, td) => $(td).text().trim().replace(/\s+/g, " "))
          .get();

        if (cells.length < 5) {
          return;
        }
        const position = Number(cells[0]);
        const horseNumber = Number(cells[1]);
        if (!Number.isInteger(position) || !Number.isInteger(horseNumber)) {
          return;
        }

        const horseText = (cells[2] ?? "").replace(/\([^)]*\)/g, "").trim();
        const jockey = cells[3] ?? "";
        const trainer = cells[4] ?? "";
        if (!horseText || !jockey || !trainer) {
          return;
        }

        output.push({
          raceDate,
          raceId: `${raceDate}-${raceCourse}-R${raceNo}`,
          raceCourse,
          raceDistance: Number.isFinite(raceDistance) ? raceDistance : undefined,
          horseNumber,
          horseName: horseText,
          horseProfile: `Official HKJC result entry (${raceDate}, race ${raceNo}).`,
          position,
          jockey,
          trainer,
        });
      });
  });

  return output;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return response.text();
}

export async function ingestMarkSixFromWeb({
  fromDate,
}: {
  fromDate: string;
}) {
  const html = await fetchText(LOTTOLYZER_URL);
  const rows = parseMarkSixRows(html, fromDate);

  let inserted = 0;
  for (const row of rows) {
    const result = await dbQuery(
      `
      INSERT INTO mark6_results (draw_date, numbers, jackpot_amount, source)
      VALUES ($1::date, $2::int[], NULL, 'web-lottolyzer')
      ON CONFLICT (draw_date) DO NOTHING
      `,
      [row.drawDate, row.numbers],
    );
    inserted += result.rowCount ?? 0;
  }

  return { fetched: rows.length, inserted };
}

export async function ingestHorseRacingFromHkjc({
  fromDate,
  maxMeetingDates = 80,
}: {
  fromDate: string;
  maxMeetingDates?: number;
}) {
  const indexHtml = await fetchText(HKJC_RESULTS_URL);
  const meetingDates = extractMeetingDates(indexHtml, fromDate).slice(
    0,
    maxMeetingDates,
  );

  const courses = ["ST", "HV"];
  let fetched = 0;
  let inserted = 0;

  for (const meetingDate of meetingDates) {
    const ddmmyyyy = meetingDate.split("-").reverse().join("/");
    for (const course of courses) {
      for (let raceNo = 1; raceNo <= 12; raceNo += 1) {
        const url = `${HKJC_RESULTS_URL}?RaceDate=${ddmmyyyy}&Racecourse=${course}&RaceNo=${raceNo}`;
        let html = "";
        try {
          html = await fetchText(url);
        } catch {
          continue;
        }

        const parsedCourse = course;
        const rows = parseRaceRows({
          html,
          raceDate: meetingDate,
          raceNo,
          raceCourse: parsedCourse,
        });
        if (rows.length === 0) {
          if (raceNo === 1) {
            // No races for this course/date combination.
            break;
          }
          continue;
        }

        fetched += rows.length;
        for (const row of rows) {
          const result = await dbQuery(
            `
            INSERT INTO race_results (
              race_date, race_id, race_course, race_distance, horse_number, horse_name, horse_profile, position, jockey, trainer, source
            )
            VALUES ($1::date, $2, $3, $4::int, $5::int, $6, $7, $8::int, $9, $10, 'web-hkjc')
            ON CONFLICT (race_date, race_id, horse_number, horse_name, position) DO NOTHING
            `,
            [
              row.raceDate,
              row.raceId,
              row.raceCourse,
              row.raceDistance ?? null,
              row.horseNumber,
              row.horseName,
              row.horseProfile,
              row.position,
              row.jockey,
              row.trainer,
            ],
          );
          inserted += result.rowCount ?? 0;
        }
      }
    }
  }

  return {
    meetingDatesScanned: meetingDates.length,
    fetched,
    inserted,
  };
}
