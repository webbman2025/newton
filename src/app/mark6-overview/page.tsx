"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { DataTrendingRegular } from "@fluentui/react-icons";
import { getMark6LeanProbabilitiesKey, Mark6NextDrawLeanSection } from "@/components/mark6-next-draw-lean";
import { useCopy, useLocale } from "@/components/locale-provider";

type Mark6OverviewPayload = {
  targetDate: string;
  previousDraw?: {
    date: string;
    numbers: number[];
    specialNumber?: number;
    source?: "hkjc" | "database" | "fallback";
  };
  probabilities: Array<{
    number: number;
    probability: number;
    fiveYearAppearances: number;
  }>;
  modelVersion?: string;
  explanation?: string;
};

export default function Mark6OverviewPage() {
  const t = useCopy();
  const { locale } = useLocale();
  const [payload, setPayload] = useState<Mark6OverviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/mark6-overview?locale=${locale}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          if (active) {
            setError(t.errorMark6OverviewFailed);
          }
          return;
        }
        const nextPayload = (await response.json()) as Mark6OverviewPayload;
        if (active) {
          setPayload(nextPayload);
        }
      } catch {
        if (active) {
          setError(t.errorMark6OverviewFailed);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [locale, t.errorMark6OverviewFailed]);

  const rankedProbabilities = useMemo(
    () =>
      [...(payload?.probabilities ?? [])].sort(
        (a, b) => b.probability - a.probability || a.number - b.number,
      ),
    [payload?.probabilities],
  );

  const probabilityByNumber = useMemo(
    () =>
      new Map(
        (payload?.probabilities ?? []).map((item) => [
          item.number,
          item.probability,
        ]),
      ),
    [payload?.probabilities],
  );
  const fiveYearAppearancesByNumber = useMemo(
    () =>
      new Map(
        (payload?.probabilities ?? []).map((item) => [
          item.number,
          item.fiveYearAppearances,
        ]),
      ),
    [payload?.probabilities],
  );

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <DataTrendingRegular fontSize={20} />
              {t.mark6OverviewTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.mark6OverviewSubtitle}
            </Typography>
            {payload?.previousDraw ? (
              <Stack spacing={0.9}>
              <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${t.mark6PreviousDrawDateLabel}: ${payload.previousDraw.date}`}
                />
                {payload.previousDraw.source === "hkjc" ? (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={t.mark6PreviousDrawLiveSource}
                  />
                ) : null}
              </Stack>
                <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {payload.previousDraw.numbers.map((n) => (
                    <Chip key={`overview-prev-${n}`} label={n} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                  ))}
                  {payload.previousDraw.specialNumber ? (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={`${t.mark6PreviousDrawSpecialLabel}: ${payload.previousDraw.specialNumber}`}
                      sx={{ fontWeight: 700 }}
                    />
                  ) : null}
                </Stack>
              </Stack>
            ) : null}
            {payload?.explanation ? (
              <Typography variant="caption" color="text.secondary">
                {payload.explanation}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {payload && !isLoading ? (
        <Mark6NextDrawLeanSection
          key={getMark6LeanProbabilitiesKey(payload.probabilities)}
          probabilities={payload.probabilities}
          previousDrawDate={payload.previousDraw?.date}
          t={t}
        />
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t.mark6OverviewLoading}
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      ) : null}

      {error ? <Alert severity="warning">{error}</Alert> : null}

      {payload ? (
        <Card>
          <CardContent>
            <Stack spacing={1.2}>
              <Typography variant="subtitle2">{t.mark6OverviewProbabilityLabel}</Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
                  gap: 1,
                }}
              >
                {Array.from({ length: 49 }, (_value, index) => {
                  const number = index + 1;
                  const probability = probabilityByNumber.get(number) ?? 0;
                  const rank =
                    rankedProbabilities.findIndex((item) => item.number === number) + 1;
                  return (
                    <Box
                      key={`mark6-overview-${number}`}
                      sx={{
                        border: "1px solid",
                        borderColor: rank <= 6 ? "primary.main" : "divider",
                        borderRadius: 2,
                        p: 1,
                        bgcolor: rank <= 6 ? "rgba(15,108,189,0.07)" : "background.paper",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {number}
                      </Typography>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                        {probability}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.mark6OverviewRankLabel} #{rank}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {t.mark6OverviewFiveYearCountLabel}:{" "}
                        {fiveYearAppearancesByNumber.get(number) ?? 0}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
