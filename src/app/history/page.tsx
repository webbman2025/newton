"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  CardContent,
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
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Mode } from "@/lib/translations";

type HistoryRow = {
  date: string;
  result: string;
  note: string;
};

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
          <Typography variant="h6">{t.historyTitle}</Typography>
          <Select
            value={mode}
            onChange={(event) => setMode(event.target.value as Mode)}
            size="small"
          >
            <MenuItem value="mark6">{t.mark6}</MenuItem>
            <MenuItem value="horse">{t.horse}</MenuItem>
          </Select>
        </Stack>
        <Typography variant="caption" sx={{ display: "block", mt: 1, mb: 1 }}>
          {mode === "mark6" ? t.mark6 : t.horse}
        </Typography>
        {error ? <Alert severity="warning">{error}</Alert> : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t.historyDate}</TableCell>
              <TableCell>{t.historyResult}</TableCell>
              <TableCell>{t.historyNote}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.date}-${row.result}`}>
                <TableCell>{row.date}</TableCell>
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
