"use client";

import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { ArrowClockwiseRegular, SparkleRegular } from "@fluentui/react-icons";
import { copy, type Locale } from "@/lib/translations";

export type Mark6LeanProbabilityRow = {
  number: number;
  probability: number;
};

function normalizeRankedProbabilities(
  probabilities: Mark6LeanProbabilityRow[] | null | undefined,
): Mark6LeanProbabilityRow[] {
  const list = [...(probabilities ?? [])].filter(
    (row) =>
      Number.isFinite(row.number) &&
      row.number >= 1 &&
      row.number <= 49 &&
      Number.isFinite(row.probability),
  );
  list.sort((a, b) => b.probability - a.probability || a.number - b.number);
  const seen = new Set<number>();
  const out: Mark6LeanProbabilityRow[] = [];
  for (const row of list) {
    if (seen.has(row.number)) {
      continue;
    }
    seen.add(row.number);
    out.push(row);
  }
  return out;
}

/** Stable key for resetting picker state when the probabilities payload changes (pass as React `key`). */
export function getMark6LeanProbabilitiesKey(
  probabilities: Mark6LeanProbabilityRow[] | null | undefined,
): string {
  return [...(probabilities ?? [])]
    .map((r) => `${r.number}:${r.probability}`)
    .sort()
    .join("|");
}

export function Mark6NextDrawLeanSection({
  probabilities,
  t,
  previousDrawDate,
}: {
  probabilities: Mark6LeanProbabilityRow[] | null | undefined;
  t: (typeof copy)[Locale];
  /** Shown when present; reinforces “after last night’s result” framing. */
  previousDrawDate?: string;
}) {
  const [sliceIndex, setSliceIndex] = useState(0);

  const rankedUnique = useMemo(() => normalizeRankedProbabilities(probabilities), [probabilities]);

  const bucketStartIdx = sliceIndex * 6;
  const activeRows = rankedUnique.slice(bucketStartIdx, bucketStartIdx + 6);

  const canAdvance = rankedUnique.slice(bucketStartIdx + 6).length > 0;

  const sortedDisplay = useMemo(
    () => [...activeRows].sort((a, b) => a.number - b.number),
    [activeRows],
  );

  const rankStart = bucketStartIdx + 1;
  const rankEnd = bucketStartIdx + activeRows.length;

  if (activeRows.length === 0 || rankedUnique.length === 0) {
    return null;
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "rgba(15,108,189,0.28)",
        borderRadius: 2,
        bgcolor: "rgba(15,108,189,0.06)",
      }}
    >
      <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
            <SparkleRegular fontSize={18} style={{ flexShrink: 0, opacity: 0.9, color: "#0f6cbd" }} />
            <Typography variant="subtitle2">{t.mark6NextDrawLeanTitle}</Typography>
          </Stack>
          {previousDrawDate ? (
            <Typography variant="caption" color="text.secondary">
              {t.mark6PreviousDrawDateLabel}: {previousDrawDate}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {t.mark6NextDrawLeanSubtitle}
          </Typography>

          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
            {t.mark6NextDrawLeanRankBandLabel
              .replace(/\{start\}/g, String(rankStart))
              .replace(/\{end\}/g, String(rankEnd))}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={0.85}
            useFlexGap
            sx={{ alignItems: { xs: "stretch", sm: "center" } }}
          >
            <Button
              variant="outlined"
              size="small"
              disabled={!canAdvance}
              onClick={() => setSliceIndex((prev) => prev + 1)}
              sx={{ borderRadius: 2, textTransform: "none", alignSelf: { xs: "stretch", sm: "auto" } }}
            >
              {t.mark6NextDrawLeanMoreSetsAction}
            </Button>
            <Button
              variant="text"
              size="small"
              disabled={sliceIndex === 0}
              onClick={() => setSliceIndex(0)}
              startIcon={<ArrowClockwiseRegular fontSize={18} />}
              sx={{ borderRadius: 2, textTransform: "none", alignSelf: { xs: "stretch", sm: "auto" } }}
            >
              {t.mark6NextDrawLeanResetSetsAction}
            </Button>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
              gap: 0.8,
            }}
          >
            {sortedDisplay.map((row) => (
              <Box
                key={`lean-${bucketStartIdx}-${row.number}`}
                sx={{
                  border: "1px solid",
                  borderColor: sliceIndex === 0 ? "primary.main" : "primary.light",
                  borderRadius: 2,
                  p: 0.9,
                  textAlign: "center",
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  {row.number}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                  {t.mark6NextDrawLeanScoreLabel.replace(/\{score\}/g, String(row.probability))}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t.mark6NextDrawLeanDisclaimer}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
