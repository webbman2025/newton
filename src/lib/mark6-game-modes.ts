import type { Mark6Persona } from "@/lib/mark6-analysis";

export const mark6GameModeIds = [
  "quickPick",
  "luckyPack",
  "bankerStar",
  "manualPick",
  "patternHunter",
  "smartDiversify",
  "drawPredictor",
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
  },
};

export function applyMark6GameModePreset(
  modeId: Mark6GameModeId,
): Mark6GameModePreset {
  return MARK6_GAME_MODE_PRESETS[modeId];
}
