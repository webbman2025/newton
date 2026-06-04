"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronDownRegular, HistoryRegular } from "@fluentui/react-icons";
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

function splitResultPipeSegments(result: string): string[] {
  const entries = result
    .split(" | ")
    .map((item) => item.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : [result];
}

function horseRaceSortKey(row: HistoryRow): number {
  const m = row.raceId?.match(/-R(\d+)$/i);
  const n = m?.[1] ? Number.parseInt(m[1], 10) : Number.NaN;
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function venueCourseFromRaceId(raceId: string | undefined): "ST" | "HV" | null {
  if (!raceId) {
    return null;
  }
  const match = raceId.match(/(?:^|[-])(ST|HV)-R\d+$/i);
  const code = match?.[1]?.toUpperCase();
  if (code === "ST" || code === "HV") {
    return code;
  }
  return null;
}

type CopyBundle = ReturnType<typeof useCopy>;

function HorseHistoryRaceCard(props: {
  row: HistoryRow;
  locale: string;
  t: CopyBundle;
  showDateChip: boolean;
}) {
  const { row, locale, t, showDateChip } = props;
  const lines = splitResultPipeSegments(row.result);
  const expandForLongList = lines.length > 3;

  const course = venueCourseFromRaceId(row.raceId);
  const venueLabel =
    course === "ST" ? t.historyHorseVenueSt : course === "HV" ? t.historyHorseVenueHv : null;

  const summaryText = lines.slice(0, 3).join(" | ");
  const remaining = Math.max(lines.length - 3, 0);

  const headerChips = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      {showDateChip ? (
        <Chip size="small" variant="outlined" label={`${t.historyDate}: ${row.date}`} />
      ) : null}
      {venueLabel ? (
        <Chip size="small" variant="filled" color="default" sx={{ bgcolor: "action.hover" }} label={venueLabel} />
      ) : null}
      <Chip
        size="small"
        color="primary"
        variant="outlined"
        label={`${t.historyRace}: ${formatRaceLabel(row.raceId, locale)}`}
      />
    </Stack>
  );

  if (!expandForLongList) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
          <Stack spacing={1}>
            {headerChips}
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                {t.historyResult}
              </Typography>
              <Stack spacing={0.35}>
                {lines.map((entry, i) => (
                  <Typography key={`${row.raceId}-${i}`} variant="body2">
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
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 1.4, pb: "12px!important", "&:last-child": { pb: "12px!important" } }}>
        <Stack spacing={1}>
          {headerChips}
          <Divider />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {t.historyResult}
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {summaryText}
          </Typography>
          {remaining > 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t.historyHorseMoreLines.replace(/\{count\}/g, String(remaining))}
            </Typography>
          ) : null}
          <Accordion
            elevation={0}
            disableGutters
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px!important",
              "&::before": { display: "none" },
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDownRegular fontSize={18} />}
              aria-controls={`history-horse-place-${row.raceId}`}
              id={`history-horse-hdr-${row.raceId}`}
              sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.6 } }}
            >
              <Typography variant="caption" color="text.secondary">
                {t.historyHorseAccordionSummary.replace(/\{count\}/g, String(lines.length))}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={1}>
                <Stack spacing={0.35}>
                  {lines.map((entry, i) => (
                    <Typography key={`${row.raceId}-full-${i}`} variant="body2">
                      {entry}
                    </Typography>
                  ))}
                </Stack>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.3 }}>
                    {t.historyNote}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.note}
                  </Typography>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const t = useCopy();
  const { locale } = useLocale();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [mode, setMode] = useState<Mode>("mark6");
  /** Horse racing only: tighter default window reduces payload vs “all races”. */
  const [horseDateRange, setHorseDateRange] = useState<"week" | "all">("week");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const requestedMode = mode;

    const load = async () => {
      setError(null);
      setRows([]);
      setIsLoading(true);
      try {
        const horseQuery =
          requestedMode === "horse" && horseDateRange === "week" ? "&pastDays=7" : "";
        const response = await fetch(
          `/api/history?mode=${requestedMode}&locale=${locale}${horseQuery}`,
          {
            cache: "no-store",
          },
        );
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(t.staleDataFallback);
          setRows([]);
          return;
        }
        const payload = (await response.json()) as { rows: HistoryRow[] };
        if (cancelled) {
          return;
        }
        setRows(payload.rows);
      } catch {
        if (!cancelled) {
          setError(t.staleDataFallback);
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, mode, horseDateRange, t.staleDataFallback]);

  const groupedHorseByDate = useMemo(() => {
    if (mode !== "horse") {
      return [] as Array<[string, HistoryRow[]]>;
    }
    const map = new Map<string, HistoryRow[]>();
    for (const row of rows) {
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => horseRaceSortKey(a) - horseRaceSortKey(b));
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows, mode]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <HistoryRegular fontSize={20} />
            {t.historyTitle}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            useFlexGap
            sx={{ alignItems: { sm: "center" }, flexWrap: "wrap" }}
          >
            <Select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              size="small"
              sx={{ minWidth: 160, borderRadius: 2 }}
              inputProps={{ "aria-label": `${t.historyTitle} — mode` }}
            >
              <MenuItem value="mark6">{t.mark6}</MenuItem>
              <MenuItem value="horse">{t.horse}</MenuItem>
            </Select>
            {mode === "horse" ? (
              <Select
                value={horseDateRange}
                onChange={(event) => setHorseDateRange(event.target.value as "week" | "all")}
                size="small"
                sx={{ minWidth: 180, borderRadius: 2 }}
                inputProps={{ "aria-label": t.historyHorseRangeLabel }}
              >
                <MenuItem value="week">{t.historyHorseRangeWeek}</MenuItem>
                <MenuItem value="all">{t.historyHorseRangeAll}</MenuItem>
              </Select>
            ) : null}
          </Stack>
        </Stack>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={mode === "mark6" ? t.mark6 : t.horse}
          sx={{ mt: 1, mb: 1 }}
        />
        {error ? <Alert severity="warning">{error}</Alert> : null}
        {isLoading ? (
          <Box sx={{ width: "100%", mt: 1 }}>
            <LinearProgress aria-label={t.historyTitle} />
          </Box>
        ) : null}
        <Stack spacing={mode === "horse" ? 2 : 1.1}>
          {mode === "mark6"
            ? rows.map((row, index) => (
                <Card
                  key={`${row.date}-${row.raceId ?? "draw"}-${index}`}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
                    <Stack spacing={1}>
                      <Chip size="small" variant="outlined" label={`${t.historyDate}: ${row.date}`} />
                      <Divider />
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 0.5 }}
                        >
                          {t.historyResult}
                        </Typography>
                        <Stack spacing={0.35}>
                          {splitResultPipeSegments(row.result).map((entry) => (
                            <Typography key={`${row.date}-${entry}`} variant="body2">
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
              ))
            : groupedHorseByDate.map(([dateLabel, races]) => (
                <Stack key={dateLabel} spacing={1.1}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ px: 0.2 }}>
                    {t.historyHorseMeetingsHeading}: {dateLabel}
                  </Typography>
                  <Stack spacing={1.1}>
                    {races.map((row, index) => (
                      <HorseHistoryRaceCard
                        key={`${row.date}-${row.raceId ?? "race"}-${index}`}
                        row={row}
                        locale={locale}
                        t={t}
                        showDateChip={false}
                      />
                    ))}
                  </Stack>
                </Stack>
              ))}
          {!isLoading && rows.length === 0 && !error ? (
            <Typography variant="body2" color="text.secondary">
              {t.historyNoRowsMessage}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
