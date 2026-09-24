"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { ArrowClockwiseRegular, PlayRegular } from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Mark6Persona } from "@/lib/mark6-analysis";
import {
  deriveSimulatorBankers,
  fetchMark6DrawSimulatorNumbers,
  type Mark6DrawSimulatorPayload,
} from "@/lib/mark6-draw-simulator";
import {
  formatMark6PrizeAmount,
  type Mark6DrawPrizePayload,
} from "@/lib/mark6-draw-prize";
import type { Mark6MajorJackpotHistory } from "@/lib/mark6-major-jackpot-history";

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
  bankers = [],
}: {
  payload: Mark6DrawSimulatorPayload;
  bonusLabel: string;
  bankers?: number[];
}) {
  const bankerSet = new Set(bankers);
  return (
    <>
      {payload.mainNumbers.map((number) => (
        <Chip
          key={`sim-main-${number}`}
          label={number}
          color={bankerSet.has(number) ? "success" : "primary"}
          sx={{ fontWeight: 700 }}
        />
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
  const [usedRandomFallback, setUsedRandomFallback] = useState(false);
  const [prizeInfo, setPrizeInfo] = useState<Mark6DrawPrizePayload | null>(null);
  const [majorHistory, setMajorHistory] = useState<(Mark6MajorJackpotHistory & { note?: string }) | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const loadContext = async () => {
      try {
        const params = new URLSearchParams({ targetDate, locale });
        const [prizeResponse, majorResponse] = await Promise.all([
          fetch(`/api/mark6-draw-prize?${params.toString()}`, { cache: "no-store" }),
          fetch(`/api/mark6-major-jackpot-history?${params.toString()}`, { cache: "no-store" }),
        ]);
        if (prizeResponse.ok && active) {
          setPrizeInfo((await prizeResponse.json()) as Mark6DrawPrizePayload);
        } else if (active) {
          setPrizeInfo(null);
        }
        if (majorResponse.ok && active) {
          setMajorHistory(
            (await majorResponse.json()) as Mark6MajorJackpotHistory & { note?: string },
          );
        } else if (active) {
          setMajorHistory(null);
        }
      } catch {
        if (active) {
          setPrizeInfo(null);
          setMajorHistory(null);
        }
      }
    };
    void loadContext();
    return () => {
      active = false;
    };
  }, [locale, targetDate]);

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

  const bankers = deriveSimulatorBankers(drawHistory, results);

  const handleStart = useCallback(async () => {
    const nextBankers = deriveSimulatorBankers(drawHistory, results);
    setLoadError(null);
    setUsedRandomFallback(false);
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
      const { payload, source } = await fetchMark6DrawSimulatorNumbers(
        targetDate,
        persona,
        locale,
        nextBankers,
      );
      setUsedRandomFallback(source === "random");
      controllerRef.current?.startDraw(payload);
    } catch {
      setLoadError(t.mark6DrawSimulatorError);
      setRunning(false);
      setStatus(t.mark6DrawSimulatorIdle);
    }
  }, [archiveCurrentResult, drawHistory, locale, persona, results, t, targetDate]);

  const handleReset = useCallback(() => {
    controllerRef.current?.reset();
    setResults(null);
    setRunning(false);
    setStatus(t.mark6DrawSimulatorIdle);
  }, [t.mark6DrawSimulatorIdle]);

  return (
    <Stack spacing={1.2}>
      {prizeInfo ? (
        <Box
          sx={{
            border: "1px solid",
            borderColor: prizeInfo.selected.tier === "major" ? "warning.main" : "divider",
            borderRadius: 2,
            p: 1.2,
            bgcolor:
              prizeInfo.selected.tier === "major"
                ? "rgba(255, 213, 79, 0.08)"
                : "rgba(15, 108, 189, 0.05)",
          }}
        >
          <Stack spacing={0.8}>
            <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {prizeInfo.selected.drawDate === prizeInfo.nextScheduled?.drawDate
                  ? t.mark6NextDrawPrizeLabel
                  : t.mark6SelectedDrawPrizeLabel}
              </Typography>
              <Chip
                size="small"
                color={prizeInfo.selected.tier === "major" ? "warning" : "primary"}
                label={formatMark6PrizeAmount(prizeInfo.selected.firstPrizeMax, locale)}
                sx={{ fontWeight: 700 }}
              />
              {prizeInfo.selected.tier === "major" ? (
                <Chip size="small" variant="outlined" color="warning" label={t.mark6DrawSimulatorPrizeMajorBadge} />
              ) : null}
              {prizeInfo.selected.snowballName ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${t.mark6DrawSimulatorPrizeSnowballLabel}: ${prizeInfo.selected.snowballName}`}
                />
              ) : null}
              <Typography variant="caption" color="text.secondary">
                {targetDate}
              </Typography>
            </Stack>
            {prizeInfo.latestResult ? (
              <Typography variant="caption" color="text.secondary">
                {t.mark6LatestDrawPrizeLabel} ({prizeInfo.latestResult.drawDate}):{" "}
                {prizeInfo.latestResult.firstPrizePaid
                  ? t.mark6LatestDrawPrizePaidLabel.replace(
                      "{amount}",
                      formatMark6PrizeAmount(prizeInfo.latestResult.firstPrizePaid, locale),
                    )
                  : formatMark6PrizeAmount(prizeInfo.latestResult.firstPrizeMax, locale)}
                {prizeInfo.latestResult.numbers?.length
                  ? ` · ${prizeInfo.latestResult.numbers.join(", ")}`
                  : ""}
              </Typography>
            ) : null}
            {prizeInfo.nextScheduled &&
            prizeInfo.nextScheduled.drawDate !== prizeInfo.selected.drawDate ? (
              <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  {t.mark6NextDrawPrizeLabel} ({prizeInfo.nextScheduled.drawDate})
                </Typography>
                <Chip
                  size="small"
                  color="warning"
                  label={formatMark6PrizeAmount(prizeInfo.nextScheduled.firstPrizeMax, locale)}
                  sx={{ fontWeight: 700 }}
                />
                {prizeInfo.nextScheduled.snowballName ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t.mark6DrawSimulatorPrizeSnowballLabel}: ${prizeInfo.nextScheduled.snowballName}`}
                  />
                ) : null}
              </Stack>
            ) : null}
            {prizeInfo.weekDraws.length > 1 ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.4 }}>
                  {t.mark6DrawSimulatorPrizeWeekLabel}
                </Typography>
                <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {prizeInfo.weekDraws.map((draw) => (
                    <Chip
                      key={`week-prize-${draw.drawDate}`}
                      size="small"
                      variant={draw.isSelected ? "filled" : "outlined"}
                      color={draw.tier === "major" ? "warning" : draw.isSelected ? "primary" : "default"}
                      label={`${draw.drawDate.slice(5)} · ${formatMark6PrizeAmount(draw.firstPrizeMax, locale)}`}
                    />
                  ))}
                </Stack>
              </Box>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              {t.mark6DrawSimulatorPrizeLogicNote}
            </Typography>
          </Stack>
        </Box>
      ) : null}
      {majorHistory && majorHistory.topNumbers.length > 0 ? (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 1.2,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.6 }}>
            {t.mark6DrawSimulatorMajorHistoryTitle}
          </Typography>
          <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap", mb: 0.8 }}>
            {majorHistory.topNumbers.slice(0, 8).map((row) => (
              <Chip
                key={`major-hit-${row.number}`}
                size="small"
                color="primary"
                variant="outlined"
                label={`${row.number} · ${t.mark6DrawSimulatorMajorHistoryHitLabel.replace("{hits}", String(row.majorDrawHits))}`}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {majorHistory.note}
          </Typography>
        </Box>
      ) : null}
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: { xs: 420, sm: 520 },
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "#07101f",
          touchAction: "pan-y",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          "& canvas": {
            display: "block",
            margin: "0 auto",
            pointerEvents: "none",
            touchAction: "pan-y",
          },
        }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 24 }}>
        {status}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t.mark6DrawSimulatorPoolHint}
      </Typography>
      {bankers.length > 0 ? (
        <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {t.mark6DrawSimulatorBankerLabel}
          </Typography>
          {bankers.map((number) => (
            <Chip key={`sim-banker-${number}`} label={number} color="success" size="small" sx={{ fontWeight: 700 }} />
          ))}
        </Stack>
      ) : null}
      {results ? (
        <Stack
          direction="row"
          spacing={0.8}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}
        >
          <DrawResultChips
            payload={results}
            bonusLabel={t.mark6DrawSimulatorBonusLabel}
            bankers={results.bankers ?? bankers}
          />
        </Stack>
      ) : null}
      {loadError ? (
        <Alert severity="warning" sx={{ py: 0.3 }}>
          {loadError}
        </Alert>
      ) : null}
      {usedRandomFallback && !loadError ? (
        <Alert severity="info" sx={{ py: 0.3 }}>
          {t.mark6DrawSimulatorFallbackNotice}
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
                  <DrawResultChips
                    payload={entry}
                    bonusLabel={t.mark6DrawSimulatorBonusLabel}
                    bankers={entry.bankers}
                  />
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
