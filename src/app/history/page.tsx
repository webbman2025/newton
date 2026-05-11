"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { HistoryRegular } from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Mode } from "@/lib/translations";

type HistoryRow = {
  date: string;
  raceId?: string;
  result: string;
  note: string;
};

function formatRaceLabel(raceId: string | undefined, locale: string): string {
  if (!raceId) {
    return "-";
  }
  const match = raceId.match(/-R(\d+)$/i);
  const raceNo = match?.[1];
  if (!raceNo) {
    return raceId;
  }
  return locale === "zh-HK" ? `第${raceNo}場` : `Race ${raceNo}`;
}

export default function HistoryPage() {
  const t = useCopy();
  const { locale } = useLocale();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [mode, setMode] = useState<Mode>("mark6");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      const response = await fetch(`/api/history?mode=${mode}&locale=${locale}`);
      if (!response.ok) {
        setError(t.staleDataFallback);
        return;
      }
      const payload = (await response.json()) as { rows: HistoryRow[] };
      setRows(payload.rows);
    };
    void load();
  }, [locale, mode, t.staleDataFallback]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <HistoryRegular fontSize={20} />
            {t.historyTitle}
          </Typography>
          <Select
            value={mode}
            onChange={(event) => setMode(event.target.value as Mode)}
            size="small"
            sx={{ maxWidth: 220, borderRadius: 2 }}
          >
            <MenuItem value="mark6">{t.mark6}</MenuItem>
            <MenuItem value="horse">{t.horse}</MenuItem>
          </Select>
        </Stack>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={mode === "mark6" ? t.mark6 : t.horse}
          sx={{ mt: 1, mb: 1 }}
        />
        {error ? <Alert severity="warning">{error}</Alert> : null}
        <Stack spacing={1.1}>
          {rows.map((row, index) => (
            <Card
              key={`${row.date}-${row.raceId ?? "draw"}-${index}`}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Chip size="small" variant="outlined" label={`${t.historyDate}: ${row.date}`} />
                    {mode === "horse" ? (
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={`${t.historyRace}: ${formatRaceLabel(row.raceId, locale)}`}
                      />
                    ) : null}
                  </Stack>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      {t.historyResult}
                    </Typography>
                    <Stack spacing={0.35}>
                      {renderHistoryResult(row.result).map((entry) => (
                        <Typography key={`${row.date}-${row.raceId ?? "draw"}-${entry}`} variant="body2">
                          {entry}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                      {t.historyNote}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.note}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t.staleDataFallback}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function renderHistoryResult(result: string): string[] {
  const entries = result
    .split(" | ")
    .map((item) => item.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : [result];
}
