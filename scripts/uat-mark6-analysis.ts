import assert from "node:assert/strict";
import {
  analyzeMark6Draws,
  getMark6PersonaGenerationConfig,
  scoreMark6CommonSelectionProxy,
  type Mark6Draw,
} from "../src/lib/mark6-analysis";

const draws: Mark6Draw[] = [
  { date: "2026-07-18", numbers: [1, 2, 7, 18, 32, 45] },
  { date: "2026-07-16", numbers: [1, 7, 18, 24, 32, 46] },
  { date: "2026-07-14", numbers: [1, 7, 14, 18, 33, 47] },
  { date: "2026-07-11", numbers: [3, 8, 16, 23, 36, 45] },
  { date: "2026-07-09", numbers: [5, 11, 17, 28, 32, 49] },
  { date: "2026-07-07", numbers: [1, 9, 15, 22, 35, 44] },
  { date: "2026-07-04", numbers: [4, 12, 19, 24, 33, 41] },
  { date: "2026-07-02", numbers: [2, 6, 13, 18, 31, 47] },
  { date: "2026-06-30", numbers: [7, 14, 21, 26, 38, 43] },
  { date: "2026-06-27", numbers: [6, 10, 20, 29, 34, 48] },
];

const analysis = analyzeMark6Draws(draws, {
  persona: "patternFinder",
  query: "repeatingPatterns",
  window: 10,
  dataSource: "database",
});

assert.equal(analysis.drawCount, 10);
assert.equal(analysis.numberStats.length, 49);
assert.equal(analysis.oddEven.reduce((sum, row) => sum + row.draws, 0), 10);
assert.equal(analysis.highLow.reduce((sum, row) => sum + row.draws, 0), 10);
assert.deepEqual(analysis.repeatingTriples[0]?.numbers, [1, 7, 18]);
assert.equal(analysis.repeatingTriples[0]?.count, 3);
assert.equal(analysis.dataSource, "database");

const commonPatternPenalty = scoreMark6CommonSelectionProxy([1, 2, 3, 4, 5, 6]);
const diversifiedPenalty = scoreMark6CommonSelectionProxy([3, 14, 25, 36, 42, 49]);
assert.ok(commonPatternPenalty > diversifiedPenalty);

assert.deepEqual(getMark6PersonaGenerationConfig("lotteryAnalyst"), {
  strategy: "single",
  primaryProfile: "frequencyHistorian",
  diversifyCommonSelectionPatterns: false,
});
assert.deepEqual(getMark6PersonaGenerationConfig("patternFinder"), {
  strategy: "single",
  primaryProfile: "drawPatternSpecialist",
  diversifyCommonSelectionPatterns: false,
});
assert.equal(
  getMark6PersonaGenerationConfig("gameTheorist").diversifyCommonSelectionPatterns,
  true,
);

console.log("Mark Six persona analysis UAT passed.");
