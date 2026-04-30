"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
        <Table size="small" sx={{ "& .MuiTableCell-head": { color: "text.secondary", fontWeight: 700 } }}>
          <TableHead>
            <TableRow>
              <TableCell>{t.historyDate}</TableCell>
              <TableCell>{t.historyRace}</TableCell>
              <TableCell>{t.historyResult}</TableCell>
              <TableCell>{t.historyNote}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.date}-${row.raceId ?? "draw"}-${index}`}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{mode === "horse" ? formatRaceLabel(row.raceId, locale) : "-"}</TableCell>
                <TableCell>{row.result}</TableCell>
                <TableCell>{row.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
