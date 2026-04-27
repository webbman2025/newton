"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Mode } from "@/lib/translations";

type SuggestionPayload = {
  status: "ok" | "stale";
  mode: Mode;
  targetDate: string;
  progress: string[];
  suggestions: string[];
  confidenceBand: "Low" | "Medium" | "High";
  explanation: string;
  disclaimer: string;
};

const progressMap = [25, 50, 75, 100];

export default function Home() {
  const { locale } = useLocale();
  const t = useCopy();
  const [mode, setMode] = useState<Mode>("mark6");
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split("T")[0] ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const [progressValue, setProgressValue] = useState(0);
  const [result, setResult] = useState<SuggestionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modeLabel = useMemo(
    () => (mode === "mark6" ? t.mark6 : t.horse),
    [mode, t.horse, t.mark6],
  );

  const generateSuggestions = async () => {
    setError(null);
    setIsLoading(true);
    setResult(null);
    setProgressValue(0);

    let step = 0;
    setProgressText(t.progressSteps[step]);
    const timer = window.setInterval(() => {
      step = Math.min(step + 1, 3);
      setProgressText(t.progressSteps[step]);
      setProgressValue(progressMap[step] ?? 100);
    }, 450);

    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, targetDate, locale }),
      });

      if (!response.ok) {
        throw new Error("Unable to generate suggestions.");
      }

      const payload = (await response.json()) as SuggestionPayload;
      setResult(payload);
      setProgressValue(100);
      setProgressText(t.progressSteps[3]);
    } catch {
      setError(t.staleDataFallback);
    } finally {
      window.clearInterval(timer);
      setIsLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{modeLabel}</Typography>
            <Select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              fullWidth
            >
              <MenuItem value="mark6">{t.mark6}</MenuItem>
              <MenuItem value="horse">{t.horse}</MenuItem>
            </Select>
            <TextField
              label={t.selectDate}
              type="date"
              fullWidth
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button onClick={generateSuggestions} variant="contained" disabled={isLoading}>
              {isLoading ? t.generating : t.generate}
            </Button>
            {isLoading ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {progressText}
                </Typography>
                <LinearProgress variant="determinate" value={progressValue} />
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Typography variant="h6">{t.suggestionsTitle}</Typography>
            {result ? (
              <>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {result.suggestions.map((item) => (
                    <Chip key={item} label={item} color="primary" />
                  ))}
                </Stack>
                <Typography variant="subtitle2">
                  {t.confidenceTitle}: {result.confidenceBand}
                </Typography>
                <Typography variant="body2">
                  {t.explanationTitle}: {result.explanation}
                </Typography>
                <Alert severity="info">{result.disclaimer}</Alert>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t.noSuggestionYet}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
