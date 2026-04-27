"use client";

import { useEffect, useState } from "react";
import { Alert, Card, CardContent, Stack, Typography } from "@mui/material";
import {
  BarChart,
  LineChart,
  axisClasses,
  legendClasses,
} from "@mui/x-charts";
import { useCopy } from "@/components/locale-provider";

type AnalyticsPayload = {
  confidenceDistribution: { band: string; value: number }[];
  trend: { label: string; value: number }[];
};

export default function AnalyticsPage() {
  const t = useCopy();
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

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.analyticsTitle}
          </Typography>
          {error ? <Alert severity="warning">{error}</Alert> : null}
          {data ? (
            <BarChart
              height={240}
              xAxis={[
                {
                  id: "confidence",
                  data: data.confidenceDistribution.map((item) => item.band),
                  scaleType: "band",
                  label: t.analyticsConfidence,
                },
              ]}
              series={[
                {
                  data: data.confidenceDistribution.map((item) => item.value),
                  color: "#1f4fd6",
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

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.analyticsTrend}
          </Typography>
          {data ? (
            <LineChart
              height={240}
              xAxis={[{ data: data.trend.map((item) => item.label), scaleType: "point" }]}
              series={[{ data: data.trend.map((item) => item.value), color: "#137f3b" }]}
            />
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}
