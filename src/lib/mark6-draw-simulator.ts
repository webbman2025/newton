export const MARK6_BALL_SECTIONS = [
  { min: 1, max: 10 },
  { min: 11, max: 20 },
  { min: 21, max: 30 },
  { min: 31, max: 49 },
] as const;

export const MARK6_DRAW_SIMULATOR_BATCH_DELAY_MS = 1_000;
export const MARK6_DRAW_SIMULATOR_MIX_MS = 5_000;

export type Mark6DrawSimulatorPayload = {
  mainNumbers: number[];
  bonusNumber: number;
};

export type Mark6DrawSimulatorLabels = {
  sectionRolling: string;
  mixing: string;
  drawingMain: string;
  drawingBonus: string;
  complete: string;
};

export function getMark6BallColor(number: number): number {
  if (number <= 10) {
    return 0xc62828;
  }
  if (number <= 20) {
    return 0x1565c0;
  }
  if (number <= 30) {
    return 0x2e7d32;
  }
  return 0xf9a825;
}

export function formatMark6SectionRange(min: number, max: number): string {
  return `${min}–${max}`;
}

function shuffleInPlace(values: number[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

export function pickRandomMark6Draw(): Mark6DrawSimulatorPayload {
  const pool = Array.from({ length: 49 }, (_value, index) => index + 1);
  shuffleInPlace(pool);
  return {
    mainNumbers: pool.slice(0, 6).sort((a, b) => a - b),
    bonusNumber: pool[6] ?? 49,
  };
}

export async function fetchMark6DrawSimulatorNumbers(
  targetDate: string,
  persona: string,
  locale: string,
): Promise<Mark6DrawSimulatorPayload> {
  try {
    const params = new URLSearchParams({
      targetDate,
      persona,
      locale,
    });
    const response = await fetch(`/api/mark6-predictive-draw?${params.toString()}`);
    if (!response.ok) {
      return pickRandomMark6Draw();
    }
    const payload = (await response.json()) as {
      primarySet?: number[];
      specialNumberPick?: number;
    };
    const mainNumbers = (payload.primarySet ?? []).filter(
      (value) => Number.isInteger(value) && value >= 1 && value <= 49,
    );
    if (mainNumbers.length !== 6) {
      return pickRandomMark6Draw();
    }
    let bonusNumber = payload.specialNumberPick;
    if (!bonusNumber || mainNumbers.includes(bonusNumber)) {
      const remaining = Array.from({ length: 49 }, (_value, index) => index + 1).filter(
        (value) => !mainNumbers.includes(value),
      );
      bonusNumber = remaining[Math.floor(Math.random() * remaining.length)] ?? 1;
    }
    return {
      mainNumbers: [...mainNumbers].sort((a, b) => a - b),
      bonusNumber,
    };
  } catch {
    return pickRandomMark6Draw();
  }
}
