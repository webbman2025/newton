"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { ArrowClockwiseRegular, PlayRegular } from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Mark6Persona } from "@/lib/mark6-analysis";
import {
  fetchMark6DrawSimulatorNumbers,
  type Mark6DrawSimulatorPayload,
} from "@/lib/mark6-draw-simulator";

type Mark6DrawSimulatorProps = {
  targetDate: string;
  persona: Mark6Persona;
};

type SimulatorController = {
  startDraw: (payload: Mark6DrawSimulatorPayload) => void;
  reset: () => void;
  destroy: () => void;
};

type DrawHistoryEntry = Mark6DrawSimulatorPayload & {
  id: string;
};

function DrawResultChips({
  payload,
  bonusLabel,
}: {
  payload: Mark6DrawSimulatorPayload;
  bonusLabel: string;
}) {
  return (
    <>
      {payload.mainNumbers.map((number) => (
        <Chip key={`sim-main-${number}`} label={number} color="primary" sx={{ fontWeight: 700 }} />
      ))}
      <Typography variant="body2" sx={{ color: "warning.main", fontWeight: 700, px: 0.2 }}>
        +
      </Typography>
      <Chip label={payload.bonusNumber} color="warning" sx={{ fontWeight: 700 }} />
      <Typography variant="caption" color="text.secondary">
        {bonusLabel}
      </Typography>
    </>
  );
}

export function Mark6DrawSimulator({ targetDate, persona }: Mark6DrawSimulatorProps) {
  const t = useCopy();
  const { locale } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SimulatorController | null>(null);
  const drawCounterRef = useRef(0);
  const [status, setStatus] = useState(t.mark6DrawSimulatorIdle);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Mark6DrawSimulatorPayload | null>(null);
  const [drawHistory, setDrawHistory] = useState<DrawHistoryEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const mount = async () => {
      if (!containerRef.current) {
        return;
      }
      const { createMark6DrawSimulatorGame } = await import("./mark6-draw-simulator-scene");
      if (!active || !containerRef.current) {
        return;
      }
      controllerRef.current?.destroy();
      controllerRef.current = createMark6DrawSimulatorGame(
        containerRef.current,
        {
          onStatus: setStatus,
          onComplete: (payload) => {
            setResults(payload);
            setRunning(false);
          },
        },
        {
          sectionRolling: t.mark6DrawSimulatorSectionRolling,
          mixing: t.mark6DrawSimulatorMixing,
          drawingMain: t.mark6DrawSimulatorDrawingMain,
          drawingBonus: t.mark6DrawSimulatorDrawingBonus,
          complete: t.mark6DrawSimulatorComplete,
        },
      );
    };
    void mount();
    return () => {
      active = false;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [
    t.mark6DrawSimulatorComplete,
    t.mark6DrawSimulatorDrawingBonus,
    t.mark6DrawSimulatorDrawingMain,
    t.mark6DrawSimulatorMixing,
    t.mark6DrawSimulatorSectionRolling,
  ]);

  const archiveCurrentResult = useCallback(() => {
    setResults((current) => {
      if (!current) {
        return null;
      }
      drawCounterRef.current += 1;
      setDrawHistory((history) => [
        { ...current, id: `${drawCounterRef.current}-${current.mainNumbers.join("-")}-${current.bonusNumber}` },
        ...history,
      ]);
      return null;
    });
  }, []);

  const handleStart = useCallback(async () => {
    setLoadError(null);
    archiveCurrentResult();
    setRunning(true);
    setStatus(t.mark6DrawSimulatorPreparing);
    controllerRef.current?.reset();
    if (!controllerRef.current) {
      setLoadError(t.mark6DrawSimulatorError);
      setRunning(false);
      setStatus(t.mark6DrawSimulatorIdle);
      return;
    }
    try {
      const payload = await fetchMark6DrawSimulatorNumbers(targetDate, persona, locale);
      controllerRef.current?.startDraw(payload);
    } catch {
      setLoadError(t.mark6DrawSimulatorError);
      setRunning(false);
      setStatus(t.mark6DrawSimulatorIdle);
    }
  }, [archiveCurrentResult, locale, persona, t, targetDate]);

  const handleReset = useCallback(() => {
    controllerRef.current?.reset();
    setResults(null);
    setRunning(false);
    setStatus(t.mark6DrawSimulatorIdle);
  }, [t.mark6DrawSimulatorIdle]);

  return (
    <Stack spacing={1.2}>
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: 520,
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "#07101f",
          touchAction: "none",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          "& canvas": {
            display: "block",
            margin: "0 auto",
          },
        }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 24 }}>
        {status}
      </Typography>
      {results ? (
        <Stack
          direction="row"
          spacing={0.8}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}
        >
          <DrawResultChips payload={results} bonusLabel={t.mark6DrawSimulatorBonusLabel} />
        </Stack>
      ) : null}
      {loadError ? (
        <Alert severity="warning" sx={{ py: 0.3 }}>
          {loadError}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          startIcon={<PlayRegular fontSize={18} />}
          onClick={() => void handleStart()}
          disabled={running}
          sx={{ minHeight: 44 }}
        >
          {running ? t.mark6DrawSimulatorRunning : t.mark6DrawSimulatorStart}
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowClockwiseRegular fontSize={18} />}
          onClick={handleReset}
          disabled={running}
          sx={{ minHeight: 44 }}
        >
          {t.mark6DrawSimulatorReset}
        </Button>
      </Stack>
      {drawHistory.length > 0 ? (
        <Stack
          spacing={1}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 1.2,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2">{t.mark6DrawSimulatorHistoryTitle}</Typography>
          <Stack spacing={1}>
            {drawHistory.map((entry, index) => (
              <Stack
                key={entry.id}
                direction="row"
                spacing={0.8}
                useFlexGap
                sx={{ flexWrap: "wrap", alignItems: "center" }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56 }}>
                  {t.mark6DrawSimulatorHistoryDrawLabel.replace(
                    "{index}",
                    String(drawHistory.length - index),
                  )}
                </Typography>
                <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <DrawResultChips payload={entry} bonusLabel={t.mark6DrawSimulatorBonusLabel} />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ) : null}
      <Alert severity="info" sx={{ py: 0.4 }}>
        {t.mark6DrawSimulatorDisclaimer}
      </Alert>
    </Stack>
  );
}
