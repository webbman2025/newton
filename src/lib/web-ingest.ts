import { load } from "cheerio";
import { dbQuery, withTransaction } from "@/lib/db";

type MarkSixRow = {
  drawDate: string;
  numbers: number[];
  specialNumber?: number;
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
const HKJC_MARK6_GRAPHQL_URL = "https://info.cld.hkjc.com/graphql/base/";
const HKJC_RESULTS_URL =
  "https://racing.hkjc.com/racing/information/English/Racing/LocalResults.aspx";
const HKJC_MARK6_HISTORY_QUERY = `
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
query marksixResult($lastNDraw: Int, $startDate: String, $endDate: String, $drawType: LotteryDrawType) {
            lotteryDraws(lastNDraw: $lastNDraw, startDate: $startDate, endDate: $endDate, drawType: $drawType) {
              ...lotteryDrawsFragment
            }
        }`;

type HkjcMarkSixDraw = {
  drawDate?: string;
  status?: string;
  drawResult?: {
    drawnNo?: number[];
    xDrawnNo?: number;
  };
};

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

function getActualRaceCourse(html: string): "ST" | "HV" | null {
  const text = load(html).root().text().replace(/\s+/g, " ");
  if (text.includes("Happy Valley:")) {
    return "HV";
  }
  if (text.includes("Sha Tin:")) {
    return "ST";
  }
  return null;
}

function getActualRaceNo(html: string): number | null {
  const text = load(html).root().text().replace(/\s+/g, " ");
  const match = text.match(/\bRace\s+(\d+)\b/i);
  if (!match?.[1]) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function getActualRaceDate(html: string): string | null {
  const text = load(html).root().text().replace(/\s+/g, " ");
  const match = text.match(/\bRace Meeting:\s*(\d{2}\/\d{2}\/\d{4})\b/i);
  return match?.[1] ? parseDateDdMmYyyy(match[1]) : null;
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

async function fetchMarkSixRowsFromHkjc(fromDate: string, lastNDraw = 220) {
  const response = await fetch(HKJC_MARK6_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Origin: "https://bet.hkjc.com",
      Referer: "https://bet.hkjc.com/marksix/Results.aspx?lang=en",
    },
    body: JSON.stringify({
      query: HKJC_MARK6_HISTORY_QUERY,
      variables: {
        lastNDraw,
        drawType: "All",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HKJC Mark Six history (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: { lotteryDraws?: HkjcMarkSixDraw[] | null };
  };

  return (payload.data?.lotteryDraws ?? [])
    .map((draw): MarkSixRow | null => {
      const drawDate = draw.drawDate?.slice(0, 10);
      const numbers = (draw.drawResult?.drawnNo ?? []).filter(
        (value) => Number.isInteger(value) && value > 0 && value <= 49,
      );
      if (draw.status !== "Result" || !drawDate || drawDate < fromDate || numbers.length !== 6) {
        return null;
      }
      return {
        drawDate,
        numbers,
        specialNumber:
          Number.isInteger(draw.drawResult?.xDrawnNo) &&
          (draw.drawResult?.xDrawnNo ?? 0) > 0 &&
          (draw.drawResult?.xDrawnNo ?? 0) <= 49
            ? draw.drawResult?.xDrawnNo
            : undefined,
      };
    })
    .filter((row): row is MarkSixRow => Boolean(row));
}

export async function ingestMarkSixFromWeb({
  fromDate,
}: {
  fromDate: string;
}) {
  const fromTime = new Date(fromDate).getTime();
  const ageDays = Number.isFinite(fromTime)
    ? Math.max(1, Math.ceil((Date.now() - fromTime) / (24 * 60 * 60 * 1000)))
    : 365;
  const lastNDraw = Math.max(80, Math.min(1200, Math.ceil((ageDays / 7) * 4)));
  let source = "hkjc-live";
  let rows = await fetchMarkSixRowsFromHkjc(fromDate, lastNDraw).catch(() => []);
  if (rows.length === 0) {
    source = "web-lottolyzer";
    const html = await fetchText(LOTTOLYZER_URL);
    rows = parseMarkSixRows(html, fromDate);
  }

  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const result = await dbQuery(
      `
      INSERT INTO mark6_results (draw_date, numbers, special_number, jackpot_amount, source)
      VALUES ($1::date, $2::int[], $3, NULL, $4)
      ON CONFLICT (draw_date)
      DO UPDATE SET
        numbers = EXCLUDED.numbers,
        special_number = EXCLUDED.special_number,
        source = EXCLUDED.source,
        ingested_at = NOW()
      `,
      [row.drawDate, row.numbers, row.specialNumber ?? null, source],
    );
    if ((result.rowCount ?? 0) > 0) {
      inserted += 1;
      updated += 1;
    }
  }

  return { fetched: rows.length, inserted, updated, source };
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
    /**
     * HV and Sha Tin scrape independently (different race IDs). Parallel halves wall time vs
     * sequential courses and helps `/api/history` stay inside serverless limits.
     * Races remain sequential inside a course — Race 1 heuristics wipe the whole course/date if empty.
     */
    await Promise.all(
      courses.map(async (course) => {
        for (let raceNo = 1; raceNo <= 12; raceNo += 1) {
          const requestedRaceId = `${meetingDate}-${course}-R${raceNo}`;
          const url = `${HKJC_RESULTS_URL}?RaceDate=${ddmmyyyy}&Racecourse=${course}&RaceNo=${raceNo}`;
          let html = "";
          try {
            html = await fetchText(url);
          } catch {
            continue;
          }

          const actualCourse = getActualRaceCourse(html);
          const actualRaceNo = getActualRaceNo(html);
          const actualRaceDate = getActualRaceDate(html);
          if (
            (actualRaceDate && actualRaceDate !== meetingDate) ||
            (actualCourse && actualCourse !== course) ||
            (actualRaceNo && actualRaceNo !== raceNo)
          ) {
            if (raceNo === 1) {
              await dbQuery(
                "DELETE FROM race_results WHERE race_date = $1::date AND race_id LIKE $2",
                [meetingDate, `${meetingDate}-${course}-R%`],
              );
              break;
            }
            await dbQuery("DELETE FROM race_results WHERE race_date = $1::date AND race_id = $2", [
              meetingDate,
              requestedRaceId,
            ]);
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
              await dbQuery(
                "DELETE FROM race_results WHERE race_date = $1::date AND race_id LIKE $2",
                [meetingDate, `${meetingDate}-${course}-R%`],
              );
              // No races for this course/date combination.
              break;
            }
            await dbQuery("DELETE FROM race_results WHERE race_date = $1::date AND race_id = $2", [
              meetingDate,
              requestedRaceId,
            ]);
            continue;
          }

          fetched += rows.length;
          await withTransaction(async (client) => {
            await client.query("DELETE FROM race_results WHERE race_date = $1::date AND race_id = $2", [
              meetingDate,
              requestedRaceId,
            ]);

            for (const row of rows) {
              const result = await client.query(
                `
              INSERT INTO race_results (
                race_date, race_id, race_course, race_distance, horse_number, horse_name, horse_profile, position, jockey, trainer, source
              )
              VALUES ($1::date, $2, $3, $4::int, $5::int, $6, $7, $8::int, $9, $10, 'web-hkjc')
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
          });
        }
      }),
    );
  }

  return {
    meetingDatesScanned: meetingDates.length,
    fetched,
    inserted,
  };
}
