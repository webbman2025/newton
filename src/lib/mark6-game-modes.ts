import type { Mark6Persona } from "@/lib/mark6-analysis";

export const mark6GameModeIds = [
  "quickPick",
  "luckyPack",
  "bankerStar",
  "manualPick",
  "patternHunter",
  "smartDiversify",
  "drawPredictor",
  "drawSimulator",
] as const;

export type Mark6GameModeId = (typeof mark6GameModeIds)[number];

export type Mark6GameModePreset = {
  id: Mark6GameModeId;
  persona: Mark6Persona;
  generateMode: "auto" | "manual";
  predictionType: "single" | "multiple" | "banker";
  batchCount: number;
  numberMix: "mixed" | "smallOnly" | "bigOnly";
  showPredictiveCard: boolean;
  showManualGrid: boolean;
  showBatchControl: boolean;
  showPredictionTypeControl: boolean;
  showDrawSimulator: boolean;
};

export const MARK6_GAME_MODE_PRESETS: Record<Mark6GameModeId, Mark6GameModePreset> = {
  quickPick: {
    id: "quickPick",
    persona: "lotteryAnalyst",
    generateMode: "auto",
    predictionType: "single",
    batchCount: 1,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: false,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  luckyPack: {
    id: "luckyPack",
    persona: "lotteryAnalyst",
    generateMode: "auto",
    predictionType: "single",
    batchCount: 5,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: false,
    showBatchControl: true,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  bankerStar: {
    id: "bankerStar",
    persona: "lotteryAnalyst",
    generateMode: "auto",
    predictionType: "banker",
    batchCount: 1,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: false,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  manualPick: {
    id: "manualPick",
    persona: "lotteryAnalyst",
    generateMode: "manual",
    predictionType: "single",
    batchCount: 1,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: true,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  patternHunter: {
    id: "patternHunter",
    persona: "patternFinder",
    generateMode: "auto",
    predictionType: "single",
    batchCount: 3,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: false,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  smartDiversify: {
    id: "smartDiversify",
    persona: "gameTheorist",
    generateMode: "auto",
    predictionType: "single",
    batchCount: 3,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: false,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  drawPredictor: {
    id: "drawPredictor",
    persona: "lotteryAnalyst",
    generateMode: "auto",
    predictionType: "single",
    batchCount: 3,
    numberMix: "mixed",
    showPredictiveCard: true,
    showManualGrid: false,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: false,
  },
  drawSimulator: {
    id: "drawSimulator",
    persona: "lotteryAnalyst",
    generateMode: "auto",
    predictionType: "single",
    batchCount: 1,
    numberMix: "mixed",
    showPredictiveCard: false,
    showManualGrid: false,
    showBatchControl: false,
    showPredictionTypeControl: false,
    showDrawSimulator: true,
  },
};

export function applyMark6GameModePreset(
  modeId: Mark6GameModeId,
): Mark6GameModePreset {
  return MARK6_GAME_MODE_PRESETS[modeId];
}

export function isMark6GameModeId(value: string | null | undefined): value is Mark6GameModeId {
  if (!value) {
    return false;
  }
  return (mark6GameModeIds as readonly string[]).includes(value);
}
