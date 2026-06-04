"use client";

import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  BarChart,
  LineChart,
  axisClasses,
  legendClasses,
} from "@mui/x-charts";
import {
  CalendarLtrRegular,
  ChevronDownRegular,
  DataTrendingRegular,
} from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import { formatConfidenceBandLabel } from "@/lib/translations";

type AnalyticsPayload = {
  confidenceDistribution: { band: string; value: number }[];
  trend: { label: string; value: number }[];
  horseBacktest?: {
    sampleSize: number;
    top1AccuracyPct: number;
    byBand: Array<{
      band: "Low" | "Medium" | "High";
      sampleSize: number;
      hitRatePct: number;
    }>;
  };
};

export default function AnalyticsPage() {
  const t = useCopy();
  const { locale } = useLocale();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/analytics");
      if (!response.ok) {
        setError(t.staleDataFallback);
        return;
      }
      setData((await response.json()) as AnalyticsPayload);
    };
    void load();
  }, [t.staleDataFallback]);

  const confidenceDistribution = data?.confidenceDistribution ?? [];
  const totalConfidenceEvents = confidenceDistribution.reduce((sum, item) => sum + item.value, 0);
  const dominantConfidence =
    confidenceDistribution.length > 0
      ? [...confidenceDistribution].sort((a, b) => b.value - a.value)[0]?.band ?? "Low"
      : "Low";
  const recentAccuracy = data?.horseBacktest?.top1AccuracyPct ?? 0;
  const isLiveData = (data?.horseBacktest?.sampleSize ?? 0) > 0;

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.8, display: "flex", alignItems: "center", gap: 0.8 }}>
            <DataTrendingRegular fontSize={20} />
            {t.analyticsTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.6 }}>
            {t.analyticsQuickReadSubtitle}
          </Typography>
          {error ? <Alert severity="warning">{error}</Alert> : null}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t.analyticsQuickReadTitle}
          </Typography>
          <Stack spacing={1}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">
                  {t.analyticsMetricRecentAccuracy}
                </Typography>
                <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                  {recentAccuracy}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.analyticsMetricRecentAccuracyHint}
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">
                  {t.analyticsMetricConfidenceNow}
                </Typography>
                <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                  {formatConfidenceBandLabel(dominantConfidence, locale)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.analyticsMetricConfidenceNowHint} ({totalConfidenceEvents})
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">
                  {t.analyticsMetricDataStatus}
                </Typography>
                <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                  {isLiveData ? t.analyticsDataStatusLive : t.analyticsDataStatusLimited}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.analyticsMetricDataStatusHint}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </CardContent>
      </Card>

      <Accordion disableGutters sx={{ borderRadius: 2, overflow: "hidden" }}>
        <AccordionSummary expandIcon={<ChevronDownRegular />}>
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{t.analyticsAdvancedDetails}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t.analyticsAdvancedDetailsHint}
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <DataTrendingRegular fontSize={18} />
                  {t.analyticsConfidence}
                </Typography>
                {data ? (
                  <BarChart
                    height={230}
                    xAxis={[
                      {
                        id: "confidence",
                        data: data.confidenceDistribution.map((item) =>
                          formatConfidenceBandLabel(item.band, locale),
                        ),
                        scaleType: "band",
                        label: t.analyticsConfidence,
                      },
                    ]}
                    series={[
                      {
                        data: data.confidenceDistribution.map((item) => item.value),
                        color: "#0f6cbd",
                      },
                    ]}
                    sx={{
                      [`.${axisClasses.left} .${axisClasses.label}`]: {
                        transform: "translate(-15px, 0)",
                      },
                      [`.${legendClasses.root}`]: {
                        display: "none",
                      },
                    }}
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <CalendarLtrRegular fontSize={18} />
                  {t.analyticsTrend}
                </Typography>
                {data ? (
                  <LineChart
                    height={230}
                    xAxis={[{ data: data.trend.map((item) => item.label), scaleType: "point" }]}
                    series={[{ data: data.trend.map((item) => item.value), color: "#107c10" }]}
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.8 }}>
                  <DataTrendingRegular fontSize={18} />
                  {t.analyticsHorseBacktestTitle}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mb: 1.2 }}>
                  <Chip
                    variant="outlined"
                    label={`${t.analyticsHorseBacktestTop1}: ${data?.horseBacktest?.top1AccuracyPct ?? 0}%`}
                  />
                  <Chip
                    variant="outlined"
                    label={`${t.analyticsHorseBacktestSamples}: ${data?.horseBacktest?.sampleSize ?? 0}`}
                  />
                </Stack>
                <Divider sx={{ mb: 1.2 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                  {t.analyticsHorseCalibrationTitle}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t.analyticsHorseCalibrationBand}</TableCell>
                      <TableCell>{t.analyticsHorseCalibrationHitRate}</TableCell>
                      <TableCell>{t.analyticsHorseCalibrationSample}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.horseBacktest?.byBand ?? []).map((item) => (
                      <TableRow key={`calib-${item.band}`}>
                        <TableCell>{formatConfidenceBandLabel(item.band, locale)}</TableCell>
                        <TableCell>{item.hitRatePct}%</TableCell>
                        <TableCell>{item.sampleSize}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
