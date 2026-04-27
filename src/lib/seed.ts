import type { PoolClient } from "pg";

const mark6SeedRows = [
  { drawDate: "2026-04-10", numbers: [2, 6, 13, 18, 31, 47], jackpotAmount: 18000000 },
  { drawDate: "2026-04-14", numbers: [4, 12, 19, 24, 33, 41], jackpotAmount: 19500000 },
  { drawDate: "2026-04-17", numbers: [1, 9, 15, 22, 35, 44], jackpotAmount: 17200000 },
  { drawDate: "2026-04-21", numbers: [5, 11, 17, 28, 32, 49], jackpotAmount: 20100000 },
  { drawDate: "2026-04-24", numbers: [3, 8, 16, 23, 36, 45], jackpotAmount: 18800000 },
];

const raceSeedRows = [
  {
    raceDate: "2026-04-20",
    raceId: "ST-R3",
    horseName: "Golden Harbor",
    position: 1,
    jockey: "K. Teetan",
    trainer: "A. Cruz",
  },
  {
    raceDate: "2026-04-20",
    raceId: "ST-R3",
    horseName: "Sky Rocket",
    position: 2,
    jockey: "H. Bowman",
    trainer: "F. Lor",
  },
  {
    raceDate: "2026-04-20",
    raceId: "ST-R3",
    horseName: "Night Storm",
    position: 3,
    jockey: "Z. Purton",
    trainer: "D. Hayes",
  },
  {
    raceDate: "2026-04-24",
    raceId: "HV-R5",
    horseName: "Silver Arrow",
    position: 1,
    jockey: "B. Avdulla",
    trainer: "J. Size",
  },
  {
    raceDate: "2026-04-24",
    raceId: "HV-R5",
    horseName: "Rapid Crest",
    position: 2,
    jockey: "L. Ferraris",
    trainer: "C. Fownes",
  },
  {
    raceDate: "2026-04-24",
    raceId: "HV-R5",
    horseName: "Ocean Gift",
    position: 3,
    jockey: "M. Chadwick",
    trainer: "P. O'Sullivan",
  },
];

export async function seedDatabase(client: PoolClient) {
  let mark6Inserted = 0;
  let raceInserted = 0;

  for (const row of mark6SeedRows) {
    const result = await client.query<{ inserted: number }>(
      `
      INSERT INTO mark6_results (draw_date, numbers, jackpot_amount, source)
      VALUES ($1::date, $2::int[], $3::numeric, 'seed-api')
      ON CONFLICT (draw_date) DO NOTHING
      RETURNING 1 AS inserted
      `,
      [row.drawDate, row.numbers, row.jackpotAmount],
    );
    mark6Inserted += result.rowCount ?? 0;
  }

  for (const row of raceSeedRows) {
    const result = await client.query<{ inserted: number }>(
      `
      INSERT INTO race_results (
        race_date, race_id, horse_name, position, jockey, trainer, source
      )
      VALUES ($1::date, $2, $3, $4::int, $5, $6, 'seed-api')
      ON CONFLICT (race_date, race_id, horse_name, position) DO NOTHING
      RETURNING 1 AS inserted
      `,
      [row.raceDate, row.raceId, row.horseName, row.position, row.jockey, row.trainer],
    );
    raceInserted += result.rowCount ?? 0;
  }

  return {
    mark6Inserted,
    raceInserted,
    alreadyPresent:
      mark6SeedRows.length + raceSeedRows.length - (mark6Inserted + raceInserted),
  };
}
