"use client";

import { useEffect, useState } from "react";
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
import { DataTrendingRegular, SparkleRegular, TrophyFilled } from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Mark6PredictiveDrawResult } from "@/lib/mark6-predictive-engine";
import type { Mark6Persona } from "@/lib/mark6-analysis";
import { formatConfidenceBandLabel } from "@/lib/translations";

type Mark6PredictiveDrawCardProps = {
  targetDate: string;
  persona: Mark6Persona;
};

const signalTagLabels: Record<
  Mark6PredictiveDrawResult["topSignals"][number]["tags"][number],
  { en: string; zh: string }
> = {
  historicalFrequency: { en: "History", zh: "歷史頻率" },
  trainedModel: { en: "Model", zh: "統計模型" },
  previousDrawPattern: { en: "Last draw", zh: "上期模式" },
  seasonalMatch: { en: "Seasonal", zh: "季節" },
  hotTrend: { en: "Hot", zh: "熱門" },
  coldRebound: { en: "Cold gap", zh: "冷門間隔" },
};

export function Mark6PredictiveDrawCard({ targetDate, persona }: Mark6PredictiveDrawCardProps) {
  const t = useCopy();
  const { locale } = useLocale();
  const [data, setData] = useState<Mark6PredictiveDrawResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          targetDate,
          locale,
          persona,
        });
        const response = await fetch(`/api/mark6-predictive-draw?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Predictive draw request failed.");
        }
        const payload = (await response.json()) as Mark6PredictiveDrawResult;
        if (active) {
          setData(payload);
        }
      } catch {
        if (active) {
          setError(true);
          setData(null);
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
  }, [locale, persona, targetDate]);

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ borderColor: "primary.main", borderRadius: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t.mark6PredictiveLoading}
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        {t.mark6PredictiveError}
      </Alert>
    );
  }

  const tagLabel = (tag: Mark6PredictiveDrawResult["topSignals"][number]["tags"][number]) =>
    locale === "zh-HK" ? signalTagLabels[tag].zh : signalTagLabels[tag].en;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "primary.main",
        borderRadius: 2,
        bgcolor: "rgba(15,108,189,0.05)",
        boxShadow: "0 8px 24px rgba(15,108,189,0.08)",
      }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.4}>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
            <SparkleRegular fontSize={20} style={{ color: "#0f6cbd" }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {t.mark6PredictiveTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.drawLabel} · {data.targetDate}
              </Typography>
            </Box>
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t.mark6PredictivePrimaryLabel}
            </Typography>
            <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap", mt: 0.6 }}>
              {data.primarySet.map((number) => (
                <Chip
                  key={`predictive-primary-${number}`}
                  icon={<TrophyFilled />}
                  label={number}
                  color="primary"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    height: 40,
                    minWidth: 44,
                  }}
                />
              ))}
            </Stack>
            {data.specialNumberPick ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.8 }}>
                {t.mark6PredictiveSpecialLabel}: {data.specialNumberPick}
              </Typography>
            ) : null}
          </Box>

          {data.alternativeSets.length > 0 ? (
            <Stack spacing={0.8}>
              <Typography variant="caption" color="text.secondary">
                {t.mark6PredictiveAlternatesLabel}
              </Typography>
              {data.alternativeSets.map((set) => (
                <Stack key={set.label} direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                  <Typography variant="caption" sx={{ width: "100%", fontWeight: 600 }}>
                    {set.label}
                  </Typography>
                  {set.numbers.map((number) => (
                    <Chip key={`${set.label}-${number}`} size="small" label={number} variant="outlined" />
                  ))}
                </Stack>
              ))}
            </Stack>
          ) : null}

          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 1,
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mb: 0.6 }}>
              <DataTrendingRegular fontSize={16} />
              <Typography variant="subtitle2">{t.mark6PredictiveEvidenceTitle}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {t.mark6PredictiveEvidenceDraws
                .replace("{count}", String(data.trainingDrawCount))
                .replace("{start}", data.historyRange.start)
                .replace("{end}", data.historyRange.end)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
              {data.backtest.note}
            </Typography>
            <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap", mt: 0.8 }}>
              <Chip
                size="small"
                label={`${t.confidenceTitle}: ${formatConfidenceBandLabel(data.confidenceBand, locale)}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${t.mark6PredictiveDataSourceLabel}: ${data.dataSource}`}
              />
              <Chip size="small" variant="outlined" label={data.modelVersion} />
            </Stack>
            {data.latestOfficialDraw ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.8 }}>
                {t.mark6PreviousDrawDateLabel}: {data.latestOfficialDraw.date} (
                {data.latestOfficialDraw.numbers.join(", ")})
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.6 }}>
              {t.mark6PredictiveHotColdLabel}: {data.analysisHighlights.hotNumbers.join(", ") || "-"} /{" "}
              {data.analysisHighlights.coldNumbers.join(", ") || "-"}
            </Typography>
          </Box>

          <Stack spacing={0.6}>
            <Typography variant="caption" color="text.secondary">
              {t.mark6PredictiveSignalsLabel}
            </Typography>
            {data.topSignals.slice(0, 6).map((row) => (
              <Stack
                key={`signal-${row.number}`}
                direction="row"
                spacing={0.6}
                useFlexGap
                sx={{ flexWrap: "wrap", alignItems: "center" }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 52 }}>
                  #{row.number}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.mark6PredictiveScoreLabel.replace("{score}", String(row.displayScore))}
                </Typography>
                {row.tags.map((tag) => (
                  <Chip key={`${row.number}-${tag}`} size="small" label={tagLabel(tag)} variant="outlined" />
                ))}
              </Stack>
            ))}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {data.methodology}
          </Typography>
          <Alert severity="info" sx={{ py: 0.3 }}>
            {data.disclaimer}
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}
