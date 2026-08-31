"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { BarChart, LineChart } from "@mui/x-charts";
import {
  ChevronDownRegular,
  ChevronUpRegular,
  DataTrendingRegular,
  LightbulbRegular,
} from "@fluentui/react-icons";
import { useCopy } from "@/components/locale-provider";
import type {
  Mark6AnalysisInsight,
  Mark6AnalysisQuery,
  Mark6AnalysisResult,
  Mark6Persona,
} from "@/lib/mark6-analysis";

type PersonaAnalysisProps = {
  targetDate: string;
  persona: Mark6Persona;
  onPersonaChange: (persona: Mark6Persona) => void;
  showPersonaSelector?: boolean;
};

const PERSONAS: Mark6Persona[] = ["lotteryAnalyst", "gameTheorist", "patternFinder"];
const QUERIES: Mark6AnalysisQuery[] = ["hotCold", "oddEven", "repeatingPatterns", "recentTrends"];

export function Mark6PersonaAnalysis({
  targetDate,
  persona,
  onPersonaChange,
  showPersonaSelector = true,
}: PersonaAnalysisProps) {
  const t = useCopy();
  const [query, setQuery] = useState<Mark6AnalysisQuery>("hotCold");
  const [windowSize, setWindowSize] = useState(50);
  const [result, setResult] = useState<Mark6AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          persona,
          query,
          window: String(windowSize),
          targetDate,
        });
        const response = await fetch(`/api/mark6-analysis?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Mark Six analysis request failed.");
        }
        const payload = (await response.json()) as Mark6AnalysisResult;
        if (active) {
          setResult(payload);
        }
      } catch {
        if (active) {
          setError(true);
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
  }, [persona, query, targetDate, windowSize]);

  const personaCopy = {
    lotteryAnalyst: {
      name: t.mark6PersonaLotteryAnalyst,
      description: t.mark6PersonaLotteryAnalystDescription,
    },
    gameTheorist: {
      name: t.mark6PersonaGameTheorist,
      description: t.mark6PersonaGameTheoristDescription,
    },
    patternFinder: {
      name: t.mark6PersonaPatternFinder,
      description: t.mark6PersonaPatternFinderDescription,
    },
  };
  const queryCopy: Record<Mark6AnalysisQuery, string> = {
    hotCold: t.mark6QueryHotCold,
    oddEven: t.mark6QueryOddEven,
    repeatingPatterns: t.mark6QueryRepeatingPatterns,
    recentTrends: t.mark6QueryRecentTrends,
  };

  const visibleInsights = useMemo(() => {
    if (!result) {
      return [];
    }
    const preferredCodes: Record<Mark6AnalysisQuery, Mark6AnalysisInsight["code"][]> = {
      hotCold: ["hotLeaders", "coldLeaders", "recentMomentum"],
      oddEven: ["oddEvenBalance", "highLowBalance"],
      repeatingPatterns: ["repeatingPairs", "repeatingTriples", "commonSelectionProxy"],
      recentTrends: ["recentMomentum", "hotLeaders", "oddEvenBalance"],
    };
    return preferredCodes[query]
      .map((code) => result.insights.find((insight) => insight.code === code))
      .filter((insight): insight is Mark6AnalysisInsight => Boolean(insight));
  }, [query, result]);

  return (
    <Stack spacing={1.5}>
      {showPersonaSelector ? (
        <>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t.mark6PersonaSectionTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.mark6PersonaSectionSubtitle}
            </Typography>
          </Box>

          <Box
            data-tutorial="persona-selector"
            sx={{
              display: "flex",
              gap: 0.8,
              overflowX: "auto",
              pb: 0.5,
              scrollbarWidth: "thin",
            }}
          >
            {PERSONAS.map((item) => (
              <Chip
                key={item}
                clickable
                color={persona === item ? "primary" : "default"}
                variant={persona === item ? "filled" : "outlined"}
                label={personaCopy[item].name}
                onClick={() => onPersonaChange(item)}
                aria-pressed={persona === item}
                sx={{ flexShrink: 0, minHeight: 40 }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {personaCopy[persona].description}
          </Typography>
          {persona === "gameTheorist" ? (
            <Alert severity="info" sx={{ py: 0.2 }}>
              {t.mark6AnalysisProxyNote}
            </Alert>
          ) : null}
        </>
      ) : null}

      <Box
        data-tutorial="quick-analysis"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1,
        }}
      >
        {QUERIES.map((item) => (
          <Button
            key={item}
            variant={query === item ? "contained" : "outlined"}
            onClick={() => setQuery(item)}
            sx={{ minHeight: 52, textTransform: "none", lineHeight: 1.2 }}
          >
            {queryCopy[item]}
          </Button>
        ))}
      </Box>

      <Stack direction="row" spacing={0.8} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">
          {t.mark6AnalysisDrawWindow}:
        </Typography>
        {[20, 50, 100].map((value) => (
          <Chip
            key={value}
            label={`${value} ${t.mark6AnalysisDraws}`}
            size="small"
            clickable
            color={windowSize === value ? "primary" : "default"}
            variant={windowSize === value ? "filled" : "outlined"}
            onClick={() => setWindowSize(value)}
          />
        ))}
      </Stack>

      <Card variant="outlined" data-tutorial="results-card">
        <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
          <Stack spacing={1.2}>
            <Button
              color="inherit"
              onClick={() => setIsExpanded((value) => !value)}
              endIcon={isExpanded ? <ChevronUpRegular /> : <ChevronDownRegular />}
              sx={{ justifyContent: "space-between", textTransform: "none", px: 0 }}
              aria-expanded={isExpanded}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t.mark6AnalysisTitle}: {queryCopy[query]}
              </Typography>
            </Button>
            {isLoading ? (
              <Stack spacing={0.8}>
                <Typography variant="body2" color="text.secondary">
                  {t.mark6AnalysisLoading}
                </Typography>
                <LinearProgress />
              </Stack>
            ) : null}
            {error ? <Alert severity="warning">{t.mark6AnalysisError}</Alert> : null}

            <Collapse in={isExpanded && Boolean(result) && !isLoading}>
              {result ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={0.7} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${result.drawCount} ${t.mark6AnalysisDraws}`}
                    />
                    <Chip
                      size="small"
                      color={result.dataSource === "database" ? "success" : "warning"}
                      variant="outlined"
                      label={
                        result.dataSource === "database"
                          ? t.mark6AnalysisSourceLive
                          : t.mark6AnalysisSourceFallback
                      }
                    />
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                      {t.mark6AnalysisHeatmap}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: 0.55,
                      }}
                    >
                      {result.numberStats.map((row) => (
                        <Box
                          key={row.number}
                          title={`#${row.number}: ${row.count}`}
                          aria-label={`#${row.number}: ${row.count}`}
                          sx={{
                            aspectRatio: "1",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "50%",
                            border: "1px solid",
                            borderColor: row.heat >= 70 ? "primary.main" : "divider",
                            bgcolor: `rgba(15,108,189,${0.05 + row.heat * 0.0035})`,
                            fontSize: "0.75rem",
                            fontWeight: row.heat >= 70 ? 800 : 500,
                          }}
                        >
                          {row.number}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2">{t.mark6AnalysisFrequency}</Typography>
                    <BarChart
                      height={220}
                      xAxis={[
                        {
                          scaleType: "band",
                          data: result.topFrequency.map((row) => String(row.number)),
                        },
                      ]}
                      series={[
                        {
                          data: result.topFrequency.map((row) => row.count),
                          label: t.mark6AnalysisDraws,
                          color: "#0f6cbd",
                        },
                      ]}
                      margin={{ left: 32, right: 8, top: 24, bottom: 28 }}
                    />
                  </Box>

                  {query === "recentTrends" && result.recentTrend.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2">{t.mark6QueryRecentTrends}</Typography>
                      <LineChart
                        height={220}
                        xAxis={[{ scaleType: "point", data: result.recentTrend.map((row) => row.label) }]}
                        series={[
                          {
                            data: result.recentTrend.map((row) => row.average),
                            label: t.mark6QueryRecentTrends,
                            color: "#0f6cbd",
                          },
                        ]}
                        margin={{ left: 36, right: 8, top: 24, bottom: 28 }}
                      />
                    </Box>
                  ) : null}

                  {query === "repeatingPatterns" ? (
                    <Stack spacing={0.8}>
                      <PatternRows
                        title={t.mark6InsightPair}
                        rows={result.repeatingPairs.map((row) => ({
                          key: row.numbers.join("-"),
                          label: row.numbers.join(" + "),
                          count: row.count,
                        }))}
                      />
                      <PatternRows
                        title={t.mark6InsightTriple}
                        rows={result.repeatingTriples.map((row) => ({
                          key: row.numbers.join("-"),
                          label: row.numbers.join(" + "),
                          count: row.count,
                        }))}
                      />
                    </Stack>
                  ) : null}

                  <Stack
                    data-tutorial="probability-carousel"
                    direction="row"
                    spacing={1}
                    sx={{
                      overflowX: "auto",
                      scrollSnapType: "x mandatory",
                      pb: 0.5,
                    }}
                  >
                    <DistributionCard
                      title={t.mark6AnalysisOddEven}
                      firstLabel={t.mark6AnalysisOdd}
                      secondLabel={t.mark6AnalysisEven}
                      firstValue={aggregateDistribution(result.oddEven, "odd")}
                    />
                    <DistributionCard
                      title={t.mark6AnalysisHighLow}
                      firstLabel={t.mark6AnalysisLow}
                      secondLabel={t.mark6AnalysisHigh}
                      firstValue={aggregateDistribution(result.highLow, "low")}
                    />
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.7 }}>
                      {t.mark6AnalysisInsights}
                    </Typography>
                    <Stack spacing={0.7}>
                      {visibleInsights.map((insight) => (
                        <Alert key={insight.code} severity="info" icon={<DataTrendingRegular />}>
                          {formatInsight(insight, t)}
                        </Alert>
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t.mark6AnalysisSuggested}
                    </Typography>
                    <Stack direction="row" spacing={0.7} useFlexGap sx={{ mt: 0.6, flexWrap: "wrap" }}>
                      {result.suggestedQueries.map((item) => (
                        <Chip
                          key={item}
                          clickable
                          variant="outlined"
                          label={queryCopy[item]}
                          onClick={() => setQuery(item)}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              ) : null}
            </Collapse>
          </Stack>
        </CardContent>
      </Card>

      {result && !isLoading ? (
        <Card variant="outlined" data-tutorial="analysis-feed">
          <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ display: "flex", gap: 0.7, alignItems: "center" }}>
                <LightbulbRegular />
                {t.mark6AnalysisFeedTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t.mark6AnalysisFeedSubtitle}
              </Typography>
              {result.insights.slice(0, 4).map((insight) => (
                <Box
                  key={`feed-${insight.code}`}
                  sx={{ p: 1, borderRadius: 2, bgcolor: "action.hover" }}
                >
                  <Typography variant="body2">{formatInsight(insight, t)}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

function aggregateDistribution(
  rows: Array<Record<string, number>>,
  key: "odd" | "low",
): number {
  const totalDraws = rows.reduce((sum, row) => sum + (row.draws ?? 0), 0);
  const firstTotal = rows.reduce(
    (sum, row) => sum + (row[key] ?? 0) * (row.draws ?? 0),
    0,
  );
  return totalDraws > 0 ? Number(((firstTotal / (totalDraws * 6)) * 100).toFixed(1)) : 0;
}

function DistributionCard({
  title,
  firstLabel,
  secondLabel,
  firstValue,
}: {
  title: string;
  firstLabel: string;
  secondLabel: string;
  firstValue: number;
}) {
  const secondValue = Number((100 - firstValue).toFixed(1));
  return (
    <Box
      sx={{
        minWidth: "88%",
        scrollSnapAlign: "start",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.2,
      }}
    >
      <Typography variant="subtitle2">{title}</Typography>
      <Stack direction="row" sx={{ mt: 1, height: 14, borderRadius: 7, overflow: "hidden" }}>
        <Box sx={{ width: `${firstValue}%`, bgcolor: "primary.main" }} />
        <Box sx={{ width: `${secondValue}%`, bgcolor: "secondary.main" }} />
      </Stack>
      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.8 }}>
        <Typography variant="body2">{firstLabel}: {firstValue}%</Typography>
        <Typography variant="body2">{secondLabel}: {secondValue}%</Typography>
      </Stack>
    </Box>
  );
}

function PatternRows({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title.replace(/:.*$/, "")}
      </Typography>
      <Stack direction="row" spacing={0.7} useFlexGap sx={{ mt: 0.5, flexWrap: "wrap" }}>
        {rows.slice(0, 6).map((row) => (
          <Chip key={row.key} size="small" label={`${row.label} × ${row.count}`} />
        ))}
      </Stack>
    </Box>
  );
}

function formatInsight(
  insight: Mark6AnalysisInsight,
  t: ReturnType<typeof useCopy>,
): string {
  const numbers = insight.numbers?.join(", ") || "—";
  const value = String(insight.value ?? 0);
  const secondary = String(insight.secondaryValue ?? 0);
  const templates: Record<Mark6AnalysisInsight["code"], string> = {
    hotLeaders: t.mark6InsightHot,
    coldLeaders: t.mark6InsightCold,
    oddEvenBalance: t.mark6InsightOddEven,
    highLowBalance: t.mark6InsightHighLow,
    repeatingPairs: t.mark6InsightPair,
    repeatingTriples: t.mark6InsightTriple,
    recentMomentum: t.mark6InsightMomentum,
    commonSelectionProxy: t.mark6InsightProxy,
  };
  return templates[insight.code]
    .replace("{numbers}", numbers)
    .replace("{value}", value)
    .replace("{secondary}", secondary);
}
