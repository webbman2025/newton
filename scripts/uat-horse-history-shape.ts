/**
 * UAT: rejects Mark Six-shaped history strings vs horse finishing-order aggregates.
 * Run: npx --yes tsx scripts/uat-horse-history-shape.ts
 */

import assert from "node:assert/strict";

import {
  isHorseHistoryEntryShape,
  isHorseRaceResultAggregate,
} from "../src/lib/horse-history-shape";

function expect(name: string, condition: boolean) {
  assert.ok(condition, name);
}

expect("comma numbers look like lottery, not placings", !isHorseRaceResultAggregate("1, 7, 12, 19, 25, 40"));
expect("mark six with specials segment", !isHorseRaceResultAggregate("1, 7, 12, 19, 25, 40 | Special: 42"));
expect("horse aggregate first pipe segment", isHorseRaceResultAggregate("1. #3 Sample Horse | 2. #7 Other"));
expect(
  "full horse-shaped row passes",
  isHorseHistoryEntryShape({
    raceId: "ST-R5",
    result: "1. #12 Golden Harbour | 2. #4 Sky Rocket",
  }),
);
expect(
  "wrong race id rejects",
  !isHorseHistoryEntryShape({
    raceId: "draw-001",
    result: "1. #12 Golden Harbour",
  }),
);
expect(
  "mark six-shaped result rejects even if race id spoofed",
  !isHorseHistoryEntryShape({
    raceId: "ST-R5",
    result: "2, 6, 13, 18, 31, 47",
  }),
);

console.log("UAT OK: scripts/uat-horse-history-shape.ts");
