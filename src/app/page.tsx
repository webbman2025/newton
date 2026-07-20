"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { PickerDay } from "@mui/x-date-pickers/PickerDay";
import type { PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import dayjs, { type Dayjs } from "dayjs";
import {
  CalendarLtrRegular,
  DismissRegular,
  InfoRegular,
  NoteRegular,
  PeopleTeamRegular,
  PersonRegular,
  SparkleRegular,
  TrophyFilled,
} from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import { getMark6LeanProbabilitiesKey, Mark6NextDrawLeanSection } from "@/components/mark6-next-draw-lean";
import { Mark6PersonaAnalysis } from "@/components/mark6-persona-analysis";
import type { Mark6Persona } from "@/lib/mark6-analysis";
import {
  buildHorseDayRaceSlots,
  buildLegacyRaceId,
  buildStableRaceKey,
  findPredictionForSlot,
  loadStoredHorsePredictions,
  loadStoredHorseSeenRaces,
  mergeHorseSeenRacesFromUpcoming,
  normalizeHorsePredictions,
  saveStoredHorsePredictions,
  saveStoredHorseSeenRaces,
  type HorseRacePrediction,
  type HorseSeenRace,
} from "@/lib/horse-race-day";
import { formatConfidenceBandLabel, type Mode } from "@/lib/translations";

type SuggestionPayload = {
  status: "ok" | "stale";
  mode: Mode;
  targetDate: string;
  mark6PredictionType?: "single" | "multiple" | "banker";
  progress: string[];
  suggestions: string[];
  mark6Prediction?: {
    type: "single" | "multiple" | "banker";
    single?: number[];
    multiple?: number[][];
    banker?: {
      banker: number;
      selections: number[];
    };
  };
  mark6BatchSets?: number[][];
  mark6PreviousDraw?: Mark6PreviousDraw;
  mark6NumberProbabilities?: Array<{
    number: number;
    probability: number;
  }>;
  horseSuggestions?: {
    horseNumber: number;
    horseName: string;
    horseProfile: string;
    jockey: string;
    trainer: string;
    speedIndex?: number;
    modelProbability?: number;
    impliedProbability?: number;
    edgeScore?: number;
    marketOdds?: string;
    marketSignal?: "value" | "neutral" | "overbet";
    topFactors?: Array<{
      label: string;
      impactScore: number;
    }>;
  }[];
  modelVersion?: string;
  generatedAt?: string;
  dataFreshness?: {
    source: "database" | "fallback";
    historyRecordCount: number;
    historyWindowYears: number;
  };
  featureCoverage?: {
    probability: boolean;
    explainability: boolean;
    marketContext: boolean;
    paceProxy: boolean;
    breedingProxy: boolean;
  };
  horseAnalysis?: {
    strategy: "consensus" | "single";
    activeProfiles: Array<"paulJones" | "andyGibson" | "topHandicapper">;
  };
  confidenceBand: "Low" | "Medium" | "High";
  explanation: string;
  disclaimer: string;
};

type Mark6PreviousDraw = {
  date: string;
  numbers: number[];
  specialNumber?: number;
  source?: "hkjc" | "database" | "fallback";
};

type LatestMark6ResultPayload = {
  previousDraw?: Mark6PreviousDraw;
};

type UpcomingRacePayload = {
  races: {
    venueCode: "ST" | "HV";
    venueName: string;
    venueNameZh?: string;
    raceNo: number;
    raceName: string;
    raceNameZh?: string;
    postTime: string;
    distance: number;
    raceClass: string;
    raceClassZh?: string;
    runners: {
      horseNumber: string;
      horseName: string;
      horseNameZh?: string;
      jockey: string;
      jockeyZh?: string;
      trainer: string;
      trainerZh?: string;
      draw: string;
    winOdds?: string;
    }[];
  }[];
};

const progressMap = [25, 50, 75, 100];
const MARK6_BANKER_SELECTION_PREVIEW_COUNT = 8;

type UpcomingMark6DrawPayload = {
  dates: string[];
  source: "website" | "fallback";
};

type UpcomingRaceDatesPayload = {
  dates: string[];
  source: "website" | "fallback";
};

type HorseHistoryRow = {
  date: string;
  raceId?: string;
  result: string;
  note: string;
};

type ParsedHistoryRunner = {
  position: number;
  horseNumber: number;
  horseName: string;
};

type HorseComparisonRow = {
  position: number;
  predicted?: { horseNumber: number; horseName: string };
  actual?: { horseNumber: number; horseName: string };
  positionMatch: boolean;
};

function buildHorseComparisonRows(
  picks: HorseRacePrediction["picks"] | undefined,
  officialEntries: ParsedHistoryRunner[],
  maxRows = 3,
): HorseComparisonRow[] {
  const rows: HorseComparisonRow[] = [];
  for (let position = 1; position <= maxRows; position += 1) {
    const predicted = picks?.[position - 1];
    const actual = officialEntries.find((entry) => entry.position === position);
    rows.push({
      position,
      predicted: predicted
        ? { horseNumber: predicted.horseNumber, horseName: predicted.horseName }
        : undefined,
      actual: actual
        ? { horseNumber: actual.horseNumber, horseName: actual.horseName }
        : undefined,
      positionMatch:
        predicted != null &&
        actual != null &&
        predicted.horseNumber === actual.horseNumber,
    });
  }
  return rows;
}

function formatComparisonHorse(
  horse: { horseNumber: number; horseName: string } | undefined,
  emptyLabel: string,
): string {
  if (!horse) {
    return emptyLabel;
  }
  return `#${horse.horseNumber} ${horse.horseName}`;
}

type ParsedHorseWinner = {
  date: string;
  horseNumber: number;
  horseName: string;
};

type Mark6PreviousImpactRow = {
  setIndex: number;
  matchedNumbers: number[];
  matchCount: number;
  percentage: number;
};

type HorseBetType =
  | "win"
  | "place"
  | "quinella"
  | "quinellaPlace"
  | "exacta"
  | "trio"
  | "tierce";

const HORSE_BET_TYPES: HorseBetType[] = [
  "win",
  "place",
  "quinella",
  "quinellaPlace",
  "exacta",
  "trio",
  "tierce",
];

function toSafeText(value?: string): string {
  if (!value) {
    return "-";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

function toRaceDateKey(postTime: string): string {
  return dayjs(postTime).format("YYYY-MM-DD");
}

function formatRaceLabel(raceId: string | undefined, locale: string): string {
  if (!raceId) {
    return locale === "zh-HK" ? "場次" : "Race";
  }
  const match = raceId.match(/-R(\d+)$/i);
  const raceNo = match?.[1];
  if (!raceNo) {
    return raceId;
  }
  return locale === "zh-HK" ? `第${raceNo}場` : `Race ${raceNo}`;
}

export default function Home() {
  const theme = useTheme();
  const { locale } = useLocale();
  const t = useCopy();
  const [mode, setMode] = useState<Mode>("mark6");
  const [mark6Persona, setMark6Persona] = useState<Mark6Persona>("lotteryAnalyst");
  const [mark6PredictionType, setMark6PredictionType] = useState<
    "single" | "multiple" | "banker"
  >("single");
  const [mark6GenerateMode, setMark6GenerateMode] = useState<"auto" | "manual">("auto");
  const [mark6BatchCount, setMark6BatchCount] = useState<number>(3);
  const [mark6NumberMix, setMark6NumberMix] = useState<"mixed" | "smallOnly" | "bigOnly">(
    "mixed",
  );
  const [mark6ManualNumbers, setMark6ManualNumbers] = useState<number[]>([]);
  const [mark6ManualSets, setMark6ManualSets] = useState<number[][]>([]);
  const [mixedMark6Sets, setMixedMark6Sets] = useState<number[][]>([]);
  const [mark6CopyStatus, setMark6CopyStatus] = useState<"idle" | "ok" | "error">("idle");
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split("T")[0] ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const [progressValue, setProgressValue] = useState(0);
  const [result, setResult] = useState<SuggestionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upcomingRaces, setUpcomingRaces] = useState<UpcomingRacePayload["races"]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [upcomingMark6Dates, setUpcomingMark6Dates] = useState<string[]>([]);
  const [upcomingHorseRaceDates, setUpcomingHorseRaceDates] = useState<string[]>([]);
  const [mark6DateSource, setMark6DateSource] = useState<"website" | "fallback">("fallback");
  const [isMark6DatesLoading, setIsMark6DatesLoading] = useState(false);
  const [mark6PreviousDraw, setMark6PreviousDraw] = useState<Mark6PreviousDraw | null>(null);
  const [isMark6PreviousDrawLoading, setIsMark6PreviousDrawLoading] = useState(false);
  const [mark6OverviewLeanProbabilities, setMark6OverviewLeanProbabilities] = useState<
    Array<{ number: number; probability: number }> | null
  >(null);
  const [horseHistoryRows, setHorseHistoryRows] = useState<HorseHistoryRow[]>([]);
  const [selectedDateHorseRows, setSelectedDateHorseRows] = useState<HorseHistoryRow[]>([]);
  const [isSelectedDateHorseRowsLoading, setIsSelectedDateHorseRowsLoading] = useState(false);
  const [isHorseWinnerLoading, setIsHorseWinnerLoading] = useState(false);
  const [horseRacePredictions, setHorseRacePredictions] = useState<Record<string, HorseRacePrediction>>({});
  const [horseSeenRaces, setHorseSeenRaces] = useState<Record<string, HorseSeenRace>>({});
  const [isBetTypeInfoOpen, setIsBetTypeInfoOpen] = useState(false);
  const [horseStakeInput, setHorseStakeInput] = useState<string>("0");
  const predictionsRef = useRef<HTMLDivElement | null>(null);

  const handleModeChange = useCallback((next: Mode) => {
    setMode(next);
    if (next !== "horse") {
      setHorseHistoryRows([]);
      setSelectedDateHorseRows([]);
      setIsSelectedDateHorseRowsLoading(false);
    }
  }, []);

  const modeLabel = useMemo(
    () => (mode === "mark6" ? t.mark6 : t.horse),
    [mode, t.horse, t.mark6],
  );
  const filteredUpcomingRaces = useMemo(
    () => upcomingRaces.filter((race) => toRaceDateKey(race.postTime) === targetDate),
    [targetDate, upcomingRaces],
  );
  const highlightedMark6Days = useMemo(() => new Set(upcomingMark6Dates), [upcomingMark6Dates]);
  const highlightedHorseRaceDays = useMemo(
    () =>
      new Set([
        ...upcomingHorseRaceDates,
        ...upcomingRaces.map((race) => toRaceDateKey(race.postTime)),
      ]),
    [upcomingHorseRaceDates, upcomingRaces],
  );
  const allHorseWinners = useMemo(() => parseHorseWinners(horseHistoryRows), [horseHistoryRows]);
  const selectedDateHorseWinners = useMemo(
    () => parseHorseWinners(selectedDateHorseRows),
    [selectedDateHorseRows],
  );
  const isHorsePastDate = useMemo(() => {
    if (mode !== "horse") {
      return false;
    }
    const selectedDay = dayjs(targetDate);
    if (!selectedDay.isValid()) {
      return false;
    }
    return selectedDay.isBefore(dayjs().startOf("day"), "day");
  }, [mode, targetDate]);
  const isHorseRaceDay = useMemo(() => {
    if (mode !== "horse") {
      return false;
    }
    const selectedDay = dayjs(targetDate);
    return selectedDay.isValid() && selectedDay.isSame(dayjs(), "day");
  }, [mode, targetDate]);
  const horseRaceCardsForDate = useMemo(
    () => (isHorsePastDate ? [] : filteredUpcomingRaces),
    [filteredUpcomingRaces, isHorsePastDate],
  );
  const horseDayRaceSlots = useMemo(
    () =>
      mode !== "horse"
        ? []
        : buildHorseDayRaceSlots({
            targetDate,
            upcomingRaces: horseRaceCardsForDate,
            historyRows: selectedDateHorseRows,
            predictions: horseRacePredictions,
            seenRaces: horseSeenRaces,
          }),
    [horseRaceCardsForDate, horseRacePredictions, horseSeenRaces, mode, selectedDateHorseRows, targetDate],
  );
  const selectedRaceIdForDate = useMemo(() => {
    const upcomingSlots = horseDayRaceSlots.filter((slot) => slot.upcoming);
    const isSelectedRaceInDate = upcomingSlots.some(
      (slot) => slot.legacyRaceId === selectedRaceId,
    );
    if (isSelectedRaceInDate) {
      return selectedRaceId;
    }
    const firstRace = upcomingSlots[0];
    return firstRace ? firstRace.legacyRaceId : null;
  }, [horseDayRaceSlots, selectedRaceId]);
  const selectedRace = useMemo(
    () =>
      horseDayRaceSlots.find((slot) => slot.legacyRaceId === selectedRaceIdForDate)?.upcoming,
    [horseDayRaceSlots, selectedRaceIdForDate],
  );
  const isManualMark6 = mode === "mark6" && mark6GenerateMode === "manual";
  const baseMark6Sets = useMemo(() => getBaseMark6Sets(result), [result]);
  const displayMark6Sets = useMemo(
    () => (isManualMark6 ? mark6ManualSets : baseMark6Sets),
    [baseMark6Sets, isManualMark6, mark6ManualSets],
  );
  const canMixMark6Sets = useMemo(() => {
    if (displayMark6Sets.length < 2) {
      return false;
    }
    const unique = new Set(displayMark6Sets.flat());
    return unique.size >= 8;
  }, [displayMark6Sets]);
  const mark6GeneratedSetsForCopy = useMemo(
    () => (displayMark6Sets.length > 0 ? displayMark6Sets : []),
    [displayMark6Sets],
  );
  const mark6ProbabilityByNumber = useMemo(
    () =>
      new Map(
        (result?.mark6NumberProbabilities ?? []).map((item) => [
          item.number,
          item.probability,
        ]),
      ),
    [result?.mark6NumberProbabilities],
  );
  const displayedMark6PreviousDraw = useMemo(
    () =>
      result?.mode === "mark6" && result.mark6PreviousDraw
        ? result.mark6PreviousDraw
        : mark6PreviousDraw,
    [mark6PreviousDraw, result],
  );

  /** Same per-number scores shown in Overview; prefers live generate payload when dates match. */
  const mark6LeanProbabilitySource = useMemo(() => {
    if (mode !== "mark6") {
      return null;
    }
    if (
      result?.mode === "mark6" &&
      result.targetDate === targetDate &&
      result.mark6NumberProbabilities &&
      result.mark6NumberProbabilities.length > 0
    ) {
      return result.mark6NumberProbabilities;
    }
    return mark6OverviewLeanProbabilities;
  }, [mode, mark6OverviewLeanProbabilities, result, targetDate]);
  const mark6PreviousImpactRows = useMemo(
    () =>
      displayedMark6PreviousDraw
        ? buildMark6PreviousImpactRows(displayMark6Sets, displayedMark6PreviousDraw.numbers)
        : [],
    [displayMark6Sets, displayedMark6PreviousDraw],
  );
  const mark6BestPreviousImpact = useMemo(
    () =>
      mark6PreviousImpactRows.reduce<Mark6PreviousImpactRow | null>(
        (best, row) => (!best || row.matchCount > best.matchCount ? row : best),
        null,
      ),
    [mark6PreviousImpactRows],
  );
  const canCopyMark6Prediction = useMemo(
    () =>
      mode === "mark6" &&
      ((mark6GeneratedSetsForCopy.length > 0 || mixedMark6Sets.length > 0) ||
        (result?.suggestions?.length ?? 0) > 0),
    [mark6GeneratedSetsForCopy.length, mixedMark6Sets.length, mode, result?.suggestions],
  );
  const canAddManualMark6Set = useMemo(
    () =>
      isManualMark6 &&
      mark6ManualNumbers.length === 6 &&
      mark6ManualSets.length < mark6BatchCount,
    [isManualMark6, mark6BatchCount, mark6ManualNumbers.length, mark6ManualSets.length],
  );
  const isManualMark6Complete = useMemo(
    () => isManualMark6 && mark6ManualSets.length >= mark6BatchCount,
    [isManualMark6, mark6BatchCount, mark6ManualSets.length],
  );
  const canGenerateMark6Manual = useMemo(
    () => mark6GenerateMode !== "manual" || mark6ManualNumbers.length >= 6,
    [mark6GenerateMode, mark6ManualNumbers.length],
  );
  const toDisplayName = (english: string, chinese?: string) =>
    locale === "zh-HK" ? chinese || english : english;
  const horseBetTypeLabels: Record<HorseBetType, string> = {
    win: t.horseBetTypeWin,
    place: t.horseBetTypePlace,
    quinella: t.horseBetTypeQuinella,
    quinellaPlace: t.horseBetTypeQuinellaPlace,
    exacta: t.horseBetTypeExacta,
    trio: t.horseBetTypeTrio,
    tierce: t.horseBetTypeTierce,
  };

  useEffect(() => {
    if (mode !== "mark6") {
      return;
    }

    let active = true;
    const loadUpcomingDrawDates = async () => {
      setIsMark6DatesLoading(true);
      try {
        const response = await fetch("/api/upcoming-mark6-draws");
        if (!response.ok) {
          throw new Error("Upcoming Mark Six draw dates fetch failed.");
        }
        const payload = (await response.json()) as UpcomingMark6DrawPayload;
        if (active) {
          setUpcomingMark6Dates(payload.dates ?? []);
          setMark6DateSource(payload.source ?? "fallback");
          setTargetDate((currentDate) =>
            (payload.dates?.length ?? 0) > 0 && !(payload.dates ?? []).includes(currentDate)
              ? (payload.dates?.[0] ?? currentDate)
              : currentDate,
          );
        }
      } catch {
        if (active) {
          setUpcomingMark6Dates([]);
          setMark6DateSource("fallback");
        }
      } finally {
        if (active) {
          setIsMark6DatesLoading(false);
        }
      }
    };

    void loadUpcomingDrawDates();
    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "mark6") {
      return;
    }

    let active = true;
    const loadPreviousDraw = async () => {
      setIsMark6PreviousDrawLoading(true);
      try {
        const response = await fetch(`/api/latest-mark6-result?targetDate=${targetDate}`);
        if (!response.ok) {
          throw new Error("Latest Mark Six result fetch failed.");
        }
        const payload = (await response.json()) as LatestMark6ResultPayload;
        if (active) {
          setMark6PreviousDraw(payload.previousDraw ?? null);
        }
      } catch {
        if (active) {
          setMark6PreviousDraw(null);
        }
      } finally {
        if (active) {
          setIsMark6PreviousDrawLoading(false);
        }
      }
    };

    void loadPreviousDraw();
    return () => {
      active = false;
    };
  }, [mode, targetDate]);

  useEffect(() => {
    if (mode !== "mark6") {
      return;
    }

    const useGenerated =
      result?.mode === "mark6" &&
      result.targetDate === targetDate &&
      (result.mark6NumberProbabilities?.length ?? 0) > 0;

    if (useGenerated) {
      return;
    }

    let active = true;
    const loadOverviewLean = async () => {
      try {
        const response = await fetch(
          `/api/mark6-overview?locale=${locale}&targetDate=${encodeURIComponent(targetDate)}`,
        );
        if (!active || !response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          probabilities?: Array<{ number: number; probability: number }>;
        };
        if (payload.probabilities?.length) {
          setMark6OverviewLeanProbabilities(payload.probabilities);
        } else if (active) {
          setMark6OverviewLeanProbabilities(null);
        }
      } catch {
        if (active) {
          setMark6OverviewLeanProbabilities(null);
        }
      }
    };

    void loadOverviewLean();
    return () => {
      active = false;
    };
  }, [locale, mode, targetDate, result]);

  useEffect(() => {
    if (mode !== "horse") {
      return;
    }

    let active = true;
    const loadUpcoming = async () => {
      if (active) {
        setIsHorseWinnerLoading(true);
      }
      try {
        const upcomingResponse = await fetch("/api/upcoming-races?limit=40");
        if (!upcomingResponse.ok) {
          throw new Error("Upcoming races fetch failed.");
        }
        const payload = (await upcomingResponse.json()) as UpcomingRacePayload;
        if (active) {
          setUpcomingRaces(payload.races ?? []);
          const firstRace = payload.races?.[0];
          if (firstRace) {
            setSelectedRaceId(
              buildLegacyRaceId(firstRace.venueCode, firstRace.raceNo, firstRace.postTime),
            );
          } else {
            setSelectedRaceId(null);
          }
        }
      } catch {
        if (active) {
          setUpcomingRaces([]);
          setSelectedRaceId(null);
        }
      } finally {
        if (active) {
          setIsHorseWinnerLoading(false);
        }
      }
    };

    const loadHistoryAndDates = async () => {
      try {
        const [historyResponse, raceDatesResponse] = await Promise.all([
          fetch(`/api/history?mode=horse&locale=${locale}`),
          fetch("/api/upcoming-race-dates?limit=60&monthsAhead=6"),
        ]);
        if (historyResponse.ok && active) {
          const historyPayload = (await historyResponse.json()) as { rows: HorseHistoryRow[] };
          setHorseHistoryRows(historyPayload.rows ?? []);
        } else if (active) {
          setHorseHistoryRows([]);
        }

        if (raceDatesResponse.ok && active) {
          const raceDatesPayload = (await raceDatesResponse.json()) as UpcomingRaceDatesPayload;
          setUpcomingHorseRaceDates(raceDatesPayload.dates ?? []);
        } else if (active) {
          setUpcomingHorseRaceDates([]);
        }
      } catch {
        if (active) {
          setHorseHistoryRows([]);
          setUpcomingHorseRaceDates([]);
        }
      }
    };
    void loadUpcoming();
    void loadHistoryAndDates();

    return () => {
      active = false;
    };
  }, [locale, mode]);

  useEffect(() => {
    if (mode !== "horse") {
      return;
    }
    const timer = window.setTimeout(() => {
      setHorseRacePredictions(
        normalizeHorsePredictions(loadStoredHorsePredictions(targetDate), targetDate),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode, targetDate]);

  useEffect(() => {
    if (mode !== "horse") {
      return;
    }
    const timer = window.setTimeout(() => {
      const stored = loadStoredHorseSeenRaces(targetDate);
      const merged = mergeHorseSeenRacesFromUpcoming(stored, targetDate, upcomingRaces);
      setHorseSeenRaces(merged);
      saveStoredHorseSeenRaces(targetDate, merged);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode, targetDate, upcomingRaces]);

  useEffect(() => {
    if (mode !== "horse" || Object.keys(horseRacePredictions).length === 0) {
      return;
    }
    saveStoredHorsePredictions(targetDate, horseRacePredictions);
  }, [horseRacePredictions, mode, targetDate]);

  const refreshSelectedDateHorseHistory = useCallback(async () => {
    setIsSelectedDateHorseRowsLoading(true);
    try {
      const response = await fetch(
        `/api/history/horse-date?date=${targetDate}&locale=${locale}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Selected date horse history fetch failed.");
      }
      const payload = (await response.json()) as { rows: HorseHistoryRow[] };
      setSelectedDateHorseRows(payload.rows ?? []);
    } catch {
      setSelectedDateHorseRows([]);
    } finally {
      setIsSelectedDateHorseRowsLoading(false);
    }
  }, [locale, targetDate]);

  useEffect(() => {
    if (mode !== "horse") {
      return;
    }
    let active = true;
    const loadSelectedDateHistory = async () => {
      if (!active) {
        return;
      }
      await refreshSelectedDateHorseHistory();
    };

    void loadSelectedDateHistory();
    return () => {
      active = false;
    };
  }, [mode, refreshSelectedDateHorseHistory]);

  useEffect(() => {
    if (mode !== "horse" || !isHorseRaceDay) {
      return;
    }
    const interval = window.setInterval(() => {
      void refreshSelectedDateHorseHistory();
      void fetch("/api/upcoming-races?limit=40")
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: UpcomingRacePayload | null) => {
          if (payload?.races) {
            setUpcomingRaces(payload.races);
          }
        })
        .catch(() => undefined);
    }, 90_000);
    return () => window.clearInterval(interval);
  }, [isHorseRaceDay, mode, refreshSelectedDateHorseHistory]);

  const previousUpcomingCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode !== "horse" || !isHorseRaceDay) {
      previousUpcomingCountRef.current = null;
      return;
    }
    const currentCount = horseRaceCardsForDate.length;
    const previousCount = previousUpcomingCountRef.current;
    if (previousCount != null && currentCount < previousCount) {
      void refreshSelectedDateHorseHistory();
    }
    previousUpcomingCountRef.current = currentCount;
  }, [horseRaceCardsForDate.length, isHorseRaceDay, mode, refreshSelectedDateHorseHistory]);

  const generateSuggestions = async () => {
    if (mode === "horse" && isHorsePastDate) {
      return;
    }
    if (mode === "mark6" && !canGenerateMark6Manual) {
      setError(t.mark6ManualNeedAtLeastLabel);
      return;
    }
    setError(null);
    setIsLoading(true);
    setResult(null);
    setMark6CopyStatus("idle");
    setMixedMark6Sets([]);
    setProgressValue(0);

    let step = 0;
    setProgressText(t.progressSteps[step]);
    const timer = window.setInterval(() => {
      step = Math.min(step + 1, 3);
      setProgressText(t.progressSteps[step]);
      setProgressValue(progressMap[step] ?? 100);
    }, 450);

    try {
      if (mode === "horse") {
        const nextPredictions: Record<string, HorseRacePrediction> = {};
        for (const race of horseRaceCardsForDate) {
          const raceId = buildLegacyRaceId(race.venueCode, race.raceNo, race.postTime);
          const stableKey = buildStableRaceKey(targetDate, race.venueCode, race.raceNo);
          try {
            const response = await fetch("/api/suggestions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mode: "horse",
                targetDate,
                locale,
                selectedRace: {
                  venueCode: race.venueCode,
                  venueName: race.venueName,
                  raceNo: race.raceNo,
                  raceName: race.raceName,
                  postTime: race.postTime,
                  distance: race.distance,
                  runners: race.runners.map((runner) => ({
                    horseNumber: Number(runner.horseNumber) || 0,
                    horseName: toSafeText(runner.horseName),
                    jockey: toSafeText(runner.jockey),
                    trainer: toSafeText(runner.trainer),
                    draw: toSafeText(runner.draw),
                    winOdds: runner.winOdds ? toSafeText(runner.winOdds) : undefined,
                  })),
                },
              }),
            });
            if (!response.ok) {
              nextPredictions[raceId] = {
                raceId,
                stableKey,
                venueCode: race.venueCode,
                raceNo: race.raceNo,
                postTime: race.postTime,
                picks: [],
                confidenceBand: "Low",
                generatedAt: new Date().toISOString(),
              };
              continue;
            }
            const payload = (await response.json()) as SuggestionPayload;
            nextPredictions[raceId] = {
              raceId,
              stableKey,
              venueCode: race.venueCode,
              raceNo: race.raceNo,
              postTime: race.postTime,
              picks: (payload.horseSuggestions ?? []).slice(0, 3).map((horse) => ({
                horseNumber: horse.horseNumber,
                horseName: horse.horseName,
                speedIndex: horse.speedIndex,
                modelProbability: horse.modelProbability,
                impliedProbability: horse.impliedProbability,
                edgeScore: horse.edgeScore,
                marketOdds: horse.marketOdds,
                marketSignal: horse.marketSignal,
                topFactors: horse.topFactors,
              })),
              confidenceBand: payload.confidenceBand,
              generatedAt: payload.generatedAt ?? new Date().toISOString(),
              predictionMargin: calculatePredictionMargin(payload.horseSuggestions ?? []),
              dataFreshnessSource: payload.dataFreshness?.source,
            };
          } catch {
            nextPredictions[raceId] = {
              raceId,
              stableKey,
              venueCode: race.venueCode,
              raceNo: race.raceNo,
              postTime: race.postTime,
              picks: [],
              confidenceBand: "Low",
              generatedAt: new Date().toISOString(),
              predictionMargin: undefined,
            };
          }
        }
        setHorseRacePredictions((previous) => ({ ...previous, ...nextPredictions }));
        void refreshSelectedDateHorseHistory();
        setProgressValue(100);
        setProgressText(t.progressSteps[3]);
        return;
      }

      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          targetDate,
          locale,
          mark6PredictionType,
          mark6BatchCount,
          mark6NumberMix,
          mark6GenerateMode,
          mark6ManualNumbers,
          mark6Persona,
        }),
      });
      if (!response.ok) {
        setError(t.errorGenerateSuggestionsFailed);
        return;
      }

      const payload = (await response.json()) as SuggestionPayload;
      setResult(payload);
      if (payload.mode === "mark6" && payload.mark6PreviousDraw) {
        setMark6PreviousDraw(payload.mark6PreviousDraw);
      }
      setProgressValue(100);
      setProgressText(t.progressSteps[3]);
      window.requestAnimationFrame(() => {
        predictionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError(t.errorGenerateSuggestionsFailed);
    } finally {
      window.clearInterval(timer);
      setIsLoading(false);
    }
  };

  const handleAddManualMark6Set = () => {
    setError(null);
    if (mark6ManualNumbers.length !== 6) {
      setError(t.mark6ManualNeedExactlyLabel);
      return;
    }
    if (mark6ManualSets.length >= mark6BatchCount) {
      setError(t.mark6ManualAllSetsAddedLabel);
      return;
    }
    setResult(null);
    setMixedMark6Sets([]);
    setMark6ManualSets((current) => [
      ...current,
      [...mark6ManualNumbers].sort((a, b) => a - b),
    ]);
    setMark6ManualNumbers([]);
  };

  const resetManualMark6Builder = () => {
    setError(null);
    setResult(null);
    setMixedMark6Sets([]);
    setMark6ManualSets([]);
    setMark6ManualNumbers([]);
  };

  const handleMixGeneratedMark6Sets = () => {
    if (!canMixMark6Sets) {
      setMixedMark6Sets([]);
      return;
    }
    setMixedMark6Sets(buildMixedMark6Sets(displayMark6Sets, displayMark6Sets.length));
  };

  const handleCopyMark6Prediction = async () => {
    try {
      const text = buildMark6CopyText({
        generatedSets: mark6GeneratedSetsForCopy,
        mixedSets: mixedMark6Sets,
        fallbackSuggestions: result?.suggestions ?? [],
      });
      if (!text) {
        return;
      }
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setMark6CopyStatus("ok");
    } catch {
      setMark6CopyStatus("error");
    }
  };

  return (
    <Stack spacing={2.2}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography
              id="home-game-mode-heading"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
            >
              <CalendarLtrRegular fontSize={20} />
              {modeLabel}
            </Typography>
            <Select
              value={mode}
              onChange={(event) => handleModeChange(event.target.value as Mode)}
              fullWidth
              sx={{ borderRadius: 2 }}
              inputProps={{ "aria-labelledby": "home-game-mode-heading" }}
            >
              <MenuItem value="mark6">{t.mark6}</MenuItem>
              <MenuItem value="horse">{t.horse}</MenuItem>
            </Select>
            {mode === "mark6" ? (
              <Mark6PersonaAnalysis
                targetDate={targetDate}
                persona={mark6Persona}
                onPersonaChange={setMark6Persona}
              />
            ) : null}
            {mode === "mark6" ? (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t.selectDate}
                  </Typography>
                  <DateCalendar
                    value={dayjs(targetDate)}
                    onChange={(nextValue) => {
                      if (nextValue?.isValid()) {
                        setTargetDate(nextValue.format("YYYY-MM-DD"));
                      }
                    }}
                    slots={{ day: HighlightedDay }}
                    slotProps={{
                      day: {
                        highlightedDays: highlightedMark6Days,
                      } as HighlightedDayProps,
                    }}
                  />
                  {isMark6DatesLoading ? (
                    <Typography variant="caption" color="text.secondary">
                      {t.mark6UpcomingDrawDatesLoading}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {t.mark6UpcomingDrawDatesLabel}:{" "}
                      {upcomingMark6Dates.slice(0, 4).join(", ") || "-"}
                      {mark6DateSource === "fallback" ? ` (${t.mark6UpcomingDrawDatesFallback})` : ""}
                    </Typography>
                  )}
                </Box>
              </LocalizationProvider>
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t.selectDate}
                  </Typography>
                  <DateCalendar
                    value={dayjs(targetDate)}
                    onChange={(nextValue) => {
                      if (nextValue?.isValid()) {
                        setTargetDate(nextValue.format("YYYY-MM-DD"));
                      }
                    }}
                    slots={{ day: HighlightedDay }}
                    slotProps={{
                      day: {
                        highlightedDays: highlightedHorseRaceDays,
                      } as HighlightedDayProps,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t.horseCalendarDatesLabel}: {[...highlightedHorseRaceDays].slice(0, 6).join(", ") || "-"}
                  </Typography>
                </Box>
              </LocalizationProvider>
            )}
            {mode === "mark6" ? (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.8 }}>
                    {t.mark6GenerateModeLabel}
                  </Typography>
                  <ToggleButtonGroup
                    color="primary"
                    exclusive
                    size="small"
                    value={mark6GenerateMode}
                    onChange={(_event, value) => {
                      if (value) {
                        setMark6GenerateMode(value);
                        if (value === "manual") {
                          setMark6BatchCount(1);
                        }
                      }
                    }}
                    fullWidth
                  >
                    <ToggleButton value="auto">{t.mark6GenerateModeAuto}</ToggleButton>
                    <ToggleButton value="manual">{t.mark6GenerateModeManual}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography variant="body2">{t.mark6PredictionTypeLabel}</Typography>
                  {mark6PredictionType === "banker" ? (
                    <Typography variant="caption" color="text.secondary">
                      {t.mark6EstimatedCombinationsLabel}:{" "}
                      {getBankerCombinationCount(MARK6_BANKER_SELECTION_PREVIEW_COUNT)}
                    </Typography>
                  ) : null}
                </Box>
                <ToggleButtonGroup
                  color="primary"
                  exclusive
                  size="small"
                  value={mark6PredictionType}
                  onChange={(_event, value) => {
                    if (value) {
                      setMark6PredictionType(value);
                    }
                  }}
                  fullWidth
                >
                  <ToggleButton value="single">{t.mark6PredictionSingle}</ToggleButton>
                  <ToggleButton value="multiple">{t.mark6PredictionMultiple}</ToggleButton>
                  <ToggleButton value="banker">{t.mark6PredictionBanker}</ToggleButton>
                </ToggleButtonGroup>
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    size="small"
                    label={t.mark6GenerateCountLabel}
                    value={mark6BatchCount}
                    onChange={(event) => {
                      const nextCount = Number.parseInt(event.target.value, 10);
                      if (Number.isFinite(nextCount)) {
                        setMark6BatchCount(nextCount);
                        setMark6ManualSets((current) =>
                          current.length > nextCount ? current.slice(0, nextCount) : current,
                        );
                        setMixedMark6Sets([]);
                      }
                    }}
                    fullWidth
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
                      <MenuItem key={`mark6-count-${count}`} value={count}>
                        {count} {t.mark6GenerateCountOptionSets}
                      </MenuItem>
                    ))}
                  </TextField>
                  {mark6GenerateMode === "auto" ? (
                    <TextField
                      select
                      size="small"
                      label={t.mark6NumberMixLabel}
                      value={mark6NumberMix}
                      onChange={(event) =>
                        setMark6NumberMix(
                          event.target.value as "mixed" | "smallOnly" | "bigOnly",
                        )
                      }
                      fullWidth
                    >
                      <MenuItem value="mixed">{t.mark6NumberMixMixed}</MenuItem>
                      <MenuItem value="smallOnly">{t.mark6NumberMixSmallOnly}</MenuItem>
                      <MenuItem value="bigOnly">{t.mark6NumberMixBigOnly}</MenuItem>
                    </TextField>
                  ) : null}
                </Stack>
                {mark6GenerateMode === "manual" ? (
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.8 }}
                    >
                      <Typography variant="body2">{t.mark6ManualPickLabel}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.mark6ManualPickedCountLabel}: {mark6ManualNumbers.length}/6
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.6 }}>
                      {t.mark6ManualSetProgressLabel}: {mark6ManualSets.length}/{mark6BatchCount}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: 0.6,
                        justifyItems: "center",
                      }}
                    >
                      {Array.from({ length: 49 }, (_value, index) => index + 1).map((number) => {
                        const selected = mark6ManualNumbers.includes(number);
                        return (
                          <Chip
                            key={`mark6-manual-${number}`}
                            label={number}
                            size="small"
                            clickable
                            aria-pressed={selected}
                            aria-label={t.mark6ManualChipAriaLabel.replace("{number}", String(number))}
                            onClick={() => {
                              setMark6ManualNumbers((current) =>
                                current.includes(number)
                                  ? current.filter((item) => item !== number)
                                  : current.length >= 6
                                    ? current
                                    : [...current, number].sort((a, b) => a - b),
                              );
                            }}
                            color={selected ? "primary" : "default"}
                            variant={selected ? "filled" : "outlined"}
                            sx={{
                              width: 44,
                              height: 44,
                              minWidth: 44,
                              borderRadius: "50%",
                              "& .MuiChip-label": {
                                px: 0,
                                fontSize: "0.79rem",
                                fontWeight: 600,
                              },
                            }}
                          />
                        );
                      })}
                    </Box>
                    {!canGenerateMark6Manual ? (
                      <Typography variant="caption" color="warning.main" sx={{ display: "block" }}>
                        {t.mark6ManualNeedExactlyLabel}
                      </Typography>
                    ) : null}
                    {isManualMark6Complete ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={resetManualMark6Builder}
                      >
                        {t.mark6ManualStartNewAction}
                      </Button>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            ) : null}
            {mode !== "horse" || !isHorsePastDate ? (
              isManualMark6 ? (
                <Stack spacing={0.8}>
                  <Button
                    onClick={handleAddManualMark6Set}
                    variant="contained"
                    disabled={isLoading || !canAddManualMark6Set}
                  >
                    <SparkleRegular fontSize={18} style={{ marginRight: 6 }} />
                    {isLoading ? t.generating : t.mark6AddAction}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setMark6ManualNumbers([])}
                    disabled={mark6ManualNumbers.length === 0}
                  >
                    {t.mark6ManualClearAction}
                  </Button>
                </Stack>
              ) : (
                <Button
                  onClick={generateSuggestions}
                  variant="contained"
                  disabled={isLoading || (mode === "mark6" && !canGenerateMark6Manual)}
                >
                  <SparkleRegular fontSize={18} style={{ marginRight: 6 }} />
                  {isLoading ? t.generating : t.generate}
                </Button>
              )
            ) : (
              <Alert severity="info" sx={{ py: 0.2 }}>
                {t.horsePastDateResultsMode}
              </Alert>
            )}
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

      {mode === "mark6" ? (
        <Mark6PreviousDrawSection
          previousDraw={displayedMark6PreviousDraw}
          isLoading={isMark6PreviousDrawLoading}
          bestImpact={mark6BestPreviousImpact}
          t={t}
        />
      ) : null}

      {mode === "mark6" ? (
        <Mark6NextDrawLeanSection
          key={getMark6LeanProbabilitiesKey(mark6LeanProbabilitySource ?? undefined)}
          probabilities={mark6LeanProbabilitySource}
          previousDrawDate={displayedMark6PreviousDraw?.date}
          t={t}
        />
      ) : null}

      {mode === "mark6" ? (
      <Box ref={predictionsRef}>
        <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography variant="h6">{t.suggestionsTitle}</Typography>
              <Stack direction="row" spacing={0.8}>
                <Button
                  component={Link}
                  href="/mark6-overview"
                  variant="outlined"
                  size="small"
                >
                  {t.mark6OverviewAction}
                </Button>
                {canCopyMark6Prediction ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCopyMark6Prediction}
                  >
                    {t.mark6CopyAction}
                  </Button>
                ) : null}
              </Stack>
            </Box>
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${t.mark6ActivePersonaLabel}: ${
                mark6Persona === "lotteryAnalyst"
                  ? t.mark6PersonaLotteryAnalyst
                  : mark6Persona === "gameTheorist"
                    ? t.mark6PersonaGameTheorist
                    : t.mark6PersonaPatternFinder
              }`}
              sx={{ alignSelf: "flex-start" }}
            />
            {mark6CopyStatus !== "idle" ? (
              <Typography
                variant="caption"
                color={mark6CopyStatus === "ok" ? "success.main" : "warning.main"}
              >
                {mark6CopyStatus === "ok" ? t.mark6CopySuccess : t.mark6CopyFailed}
              </Typography>
            ) : null}
            {result && !isManualMark6 ? (
              <>
                {result.mode === "horse" && result.horseSuggestions?.length ? (
                  <Stack spacing={1.4}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderColor: "rgba(15,108,189,0.35)",
                        borderRadius: 2,
                        bgcolor: "rgba(15,108,189,0.04)",
                      }}
                    >
                      <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
                        <Stack spacing={0.8}>
                          <Typography variant="caption" color="text.secondary">
                            {t.horseWinningHorseLabel}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
                            <TrophyFilled fontSize={18} />
                            #{result.horseSuggestions[0]?.horseNumber}{" "}
                            {result.horseSuggestions[0]?.horseName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {t.horsePreviousWinnerLabel}
                          </Typography>
                          {isHorseWinnerLoading ? (
                            <Typography variant="body2" color="text.secondary">
                              {t.horsePreviousWinnerLoading}
                            </Typography>
                          ) : selectedDateHorseWinners[0] ? (
                            <>
                              <Typography variant="body2">
                                #{selectedDateHorseWinners[0].horseNumber}{" "}
                                {selectedDateHorseWinners[0].horseName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t.horsePreviousWinnerDateLabel}: {selectedDateHorseWinners[0].date}
                              </Typography>
                            </>
                          ) : allHorseWinners[0] ? (
                            <>
                              <Typography variant="body2">
                                #{allHorseWinners[0].horseNumber} {allHorseWinners[0].horseName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t.horsePreviousWinnerDateLabel}: {allHorseWinners[0].date}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {t.horsePreviousWinnerUnavailable}
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                    {result.horseSuggestions.map((horse, index) => (
                      <Card
                        key={`${horse.horseNumber}-${horse.horseName}`}
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(25, 118, 210, 0.35)",
                          borderRadius: 2,
                          boxShadow: "0 2px 8px rgba(20,20,20,0.04)",
                        }}
                      >
                        <CardContent sx={{ p: 1.6, "&:last-child": { pb: 1.6 } }}>
                          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.8 }}>
                            <Box sx={getRankRibbonStyle(index)}>
                              {t.horseSuggestionRankLabel.replace("{rank}", String(index + 1))}
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: 12,
                                bgcolor: "primary.main",
                              }}
                            >
                              {horse.horseNumber}
                            </Avatar>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {horse.horseName}
                            </Typography>
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={0.8}
                            sx={{ mt: 1, alignItems: "flex-start" }}
                          >
                            <NoteRegular
                              fontSize={16}
                              style={{ marginTop: 2, color: theme.palette.text.secondary }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {horse.horseProfile}
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={1.5} sx={{ mt: 1.2 }}>
                            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                              <PersonRegular fontSize={16} style={{ color: theme.palette.text.secondary }} />
                              <Typography variant="caption" color="text.secondary">
                                {horse.jockey}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                              <PeopleTeamRegular fontSize={16} style={{ color: theme.palette.text.secondary }} />
                              <Typography variant="caption" color="text.secondary">
                                {horse.trainer}
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Box>
                    {result.mode === "mark6" && result.mark6Prediction?.type === "multiple" ? (
                      <Stack spacing={2}>
                        {(result.mark6NumberProbabilities?.length ?? 0) > 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            {t.mark6NumberProbabilityLabel}
                          </Typography>
                        ) : null}
                        {(result.mark6Prediction.multiple ?? []).map((set, index) => (
                          <Box key={`set-${index}`}>
                            <Typography variant="caption" sx={{ display: "block", mb: 0.8 }}>
                              {t.mark6SetLabel} {index + 1}
                            </Typography>
                            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                              {set.map((item) => (
                                <Chip
                                  key={`set-${index}-${item}`}
                                  label={formatMark6NumberLabel(item, mark6ProbabilityByNumber)}
                                  color="primary"
                                  icon={<TrophyFilled />}
                                  sx={{ fontWeight: 600 }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ) : null}

                    {result.mode === "mark6" && result.mark6Prediction?.type === "banker" ? (
                      <Stack spacing={2}>
                        <Typography variant="caption" sx={{ display: "block" }}>
                          {t.mark6BankerLabel}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={
                              typeof result.mark6Prediction.banker?.banker === "number"
                                ? formatMark6NumberLabel(
                                    result.mark6Prediction.banker.banker,
                                    mark6ProbabilityByNumber,
                                  )
                                : "-"
                            }
                            color="warning"
                            sx={{ fontWeight: 700 }}
                          />
                        </Stack>
                        <Typography variant="caption" sx={{ display: "block" }}>
                          {t.mark6SelectionsLabel}
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                          {(result.mark6Prediction.banker?.selections ?? []).map((item) => (
                            <Chip
                              key={`banker-${item}`}
                              label={formatMark6NumberLabel(item, mark6ProbabilityByNumber)}
                              color="primary"
                              icon={<TrophyFilled />}
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {t.mark6EstimatedCombinationsLabel}:{" "}
                          {getBankerCombinationCount(
                            result.mark6Prediction.banker?.selections.length ?? 0,
                          )}
                        </Typography>
                      </Stack>
                    ) : null}

                    {(result.mode !== "mark6" ||
                      result.mark6Prediction?.type === "single" ||
                      !result.mark6Prediction) ? (
                      result.mode === "mark6" && (result.mark6BatchSets?.length ?? 0) > 0 ? (
                        <Stack spacing={2}>
                          <Typography variant="caption" color="text.secondary">
                            {t.mark6GeneratedSetsLabel}
                          </Typography>
                          {(result.mark6NumberProbabilities?.length ?? 0) > 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              {t.mark6NumberProbabilityLabel}
                            </Typography>
                          ) : null}
                          {result.mark6BatchSets?.map((set, index) => (
                            <Box key={`mark6-batch-${index}`}>
                              <Typography variant="caption" sx={{ display: "block", mb: 0.8 }}>
                                {t.mark6SetLabel} {index + 1}
                              </Typography>
                              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                                {set.map((item) => (
                                  <Chip
                                    key={`mark6-batch-${index}-${item}`}
                                    label={formatMark6NumberLabel(item, mark6ProbabilityByNumber)}
                                    color="primary"
                                    icon={<TrophyFilled />}
                                    sx={{ fontWeight: 600 }}
                                  />
                                ))}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                          {result.suggestions.map((item) => (
                            <Chip
                              key={item}
                              label={formatMark6NumberLabel(item, mark6ProbabilityByNumber)}
                              color="primary"
                              icon={<TrophyFilled />}
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Stack>
                      )
                    ) : null}
                    {result.mode === "mark6" && baseMark6Sets.length > 0 ? (
                      <Stack spacing={0.8} sx={{ mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleMixGeneratedMark6Sets}
                          disabled={!canMixMark6Sets}
                        >
                          {t.mark6MixGeneratedSetsAction}
                        </Button>
                        {!canMixMark6Sets ? (
                          <Typography variant="caption" color="text.secondary">
                            {t.mark6MixNotEnoughNumbers}
                          </Typography>
                        ) : null}
                        {mixedMark6Sets.length > 0 ? (
                          <Stack spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                              {t.mark6MixedSetsLabel}
                            </Typography>
                            {mixedMark6Sets.map((set, index) => (
                              <Box key={`mark6-mixed-${index}`}>
                                <Typography variant="caption" sx={{ display: "block", mb: 0.4 }}>
                                  {t.mark6SetLabel} {index + 1}
                                </Typography>
                                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                                  {set.map((item) => (
                                    <Chip
                                      key={`mark6-mixed-${index}-${item}`}
                                      label={item}
                                      color="secondary"
                                      icon={<TrophyFilled />}
                                      sx={{ fontWeight: 600 }}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Box>
                )}
                <Typography variant="subtitle2">
                  {t.confidenceTitle}: {formatConfidenceBandLabel(result.confidenceBand, locale)}
                </Typography>
                <Typography variant="body2">
                  {t.explanationTitle}: {result.explanation}
                </Typography>
                <Alert severity="info">{result.disclaimer}</Alert>
              </>
            ) : isManualMark6 && mark6ManualSets.length > 0 ? (
                      <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  {t.mark6GeneratedSetsLabel}
                </Typography>
                {mark6ManualSets.map((set, index) => (
                  <Box key={`mark6-manual-set-${index}`}>
                            <Typography variant="caption" sx={{ display: "block", mb: 0.8 }}>
                      {t.mark6SetLabel} {index + 1}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                      {set.map((item) => (
                        <Chip
                          key={`mark6-manual-${index}-${item}`}
                          label={item}
                          color="primary"
                          icon={<TrophyFilled />}
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleMixGeneratedMark6Sets}
                    disabled={!isManualMark6Complete || !canMixMark6Sets}
                  >
                    {t.mark6MixGeneratedSetsAction}
                  </Button>
                  {(!isManualMark6Complete || !canMixMark6Sets) ? (
                    <Typography variant="caption" color="text.secondary">
                      {!isManualMark6Complete
                        ? `${t.mark6ManualSetProgressLabel}: ${mark6ManualSets.length}/${mark6BatchCount}`
                        : t.mark6MixNotEnoughNumbers}
                    </Typography>
                  ) : null}
                  {mixedMark6Sets.length > 0 ? (
                    <Stack spacing={2}>
                      <Typography variant="caption" color="text.secondary">
                        {t.mark6MixedSetsLabel}
                      </Typography>
                      {mixedMark6Sets.map((set, index) => (
                        <Box key={`mark6-mixed-manual-${index}`}>
                          <Typography variant="caption" sx={{ display: "block", mb: 0.8 }}>
                            {t.mark6SetLabel} {index + 1}
                          </Typography>
                          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                            {set.map((item) => (
                              <Chip
                                key={`mark6-mixed-manual-${index}-${item}`}
                                label={item}
                                color="secondary"
                                icon={<TrophyFilled />}
                                sx={{ fontWeight: 600 }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t.noSuggestionYet}
              </Typography>
            )}
          </Stack>
        </CardContent>
        </Card>
      </Box>
      ) : null}

      {mode === "horse" ? (
        <Card>
          <CardContent>
            <Stack spacing={1.2}>
              <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <TrophyFilled fontSize={20} />
                {t.upcomingRacesTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.upcomingRaceFocusHint}
              </Typography>
              {selectedRace ? (
                <Typography variant="caption" color="primary">
                  {t.selectedRaceLabel}: {selectedRace.venueName} - Race {selectedRace.raceNo}
                </Typography>
              ) : null}
              {horseDayRaceSlots.length === 0 &&
              !isHorseWinnerLoading &&
              !isSelectedDateHorseRowsLoading ? (
                <Typography variant="body2" color="text.secondary">
                  {isHorsePastDate ? t.horseResultsOnDateEmpty : t.horseCalendarNoRacesForDate}
                </Typography>
              ) : null}
              {isHorseRaceDay ? (
                <Typography variant="caption" color="text.secondary">
                  {t.horseRaceDayRefreshHint}
                </Typography>
              ) : null}
              {isHorseWinnerLoading || isSelectedDateHorseRowsLoading ? (
                <Typography variant="body2" color="text.secondary">
                  {t.horsePreviousWinnerLoading}
                </Typography>
              ) : null}
              {horseDayRaceSlots.length > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t.horseRaceDayListLabel}: {targetDate}
                </Typography>
              ) : null}
              {horseDayRaceSlots.map((slot) => {
                const prediction = findPredictionForSlot(slot, horseRacePredictions);
                const race = slot.upcoming;
                const raceId = slot.legacyRaceId;
                const isFinished = slot.status !== "upcoming" || !race;

                if (isFinished) {
                  const parsedEntries = slot.resultRow
                    ? parseHistoryResultEntries(slot.resultRow.result)
                    : [];
                  const officialWinner = parsedEntries.find((entry) => entry.position === 1);
                  const predictedTop = prediction?.picks?.[0];
                  const predictionHit =
                    officialWinner != null &&
                    predictedTop != null &&
                    predictedTop.horseNumber === officialWinner.horseNumber;
                  const comparisonRows = buildHorseComparisonRows(
                    prediction?.picks,
                    parsedEntries,
                    Math.max(3, prediction?.picks?.length ?? 0),
                  );
                  const hasComparison = comparisonRows.some(
                    (row) => row.predicted != null || row.actual != null,
                  );
                  return (
                    <Card
                      key={slot.stableKey}
                      variant="outlined"
                      sx={{
                        borderColor: "primary.main",
                        boxShadow: "0 0 0 1px rgba(15,108,189,0.38)",
                      }}
                    >
                      <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", mb: 0.6, flexWrap: "wrap", rowGap: 0.6 }} useFlexGap>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatRaceLabel(
                              slot.resultRow?.raceId ?? `${slot.venueCode}-R${slot.raceNo}`,
                              locale,
                            )}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={officialWinner ? "primary" : "default"}
                            label={
                              officialWinner ? t.horseRaceStatusResult : t.horseRaceStatusAwaiting
                            }
                          />
                          {officialWinner && predictedTop ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              color={predictionHit ? "success" : "warning"}
                              label={predictionHit ? t.horsePredictionHitLabel : t.horsePredictionMissLabel}
                            />
                          ) : null}
                        </Stack>
                        {hasComparison ? (
                          <Box sx={{ overflowX: "auto" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.6 }}>
                              {t.horseResultComparisonTitle}
                            </Typography>
                            <Table
                              size="small"
                              sx={{
                                minWidth: 320,
                                "& .MuiTableCell-root": {
                                  py: 0.75,
                                  px: 1,
                                  verticalAlign: "top",
                                },
                              }}
                            >
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ width: 44, fontWeight: 700 }}>
                                    {t.horseResultComparisonPosition}
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700, bgcolor: alpha("#0f6cbd", 0.06) }}>
                                    {t.horseResultComparisonPredicted}
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700, bgcolor: alpha("#107c10", 0.08) }}>
                                    {t.horseResultComparisonActual}
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {comparisonRows.map((row) => (
                                  <TableRow
                                    key={`${slot.stableKey}-compare-${row.position}`}
                                    sx={{
                                      bgcolor: row.positionMatch
                                        ? alpha("#107c10", 0.1)
                                        : undefined,
                                    }}
                                  >
                                    <TableCell sx={{ fontWeight: 700 }}>{row.position}</TableCell>
                                    <TableCell
                                      sx={{
                                        color: row.predicted ? "text.primary" : "text.secondary",
                                        fontWeight: row.position === 1 && row.predicted ? 700 : 400,
                                      }}
                                    >
                                      {formatComparisonHorse(row.predicted, t.horseResultComparisonNoData)}
                                    </TableCell>
                                    <TableCell
                                      sx={{
                                        color: row.actual ? "text.primary" : "text.secondary",
                                        fontWeight: row.position === 1 && row.actual ? 700 : 400,
                                      }}
                                    >
                                      {row.actual
                                        ? formatComparisonHorse(row.actual, t.horseResultComparisonNoData)
                                        : t.horseRaceStatusAwaiting}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {prediction?.picks?.length
                              ? t.horseRaceStatusAwaiting
                              : t.horsePredictionHint}
                          </Typography>
                        )}
                        {parsedEntries.length > 3 ? (
                          <Stack spacing={0.35} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {t.horseOfficialTopFinishersLabel}
                            </Typography>
                            {parsedEntries.slice(3).map((entry) => (
                              <Typography
                                key={`${slot.stableKey}-result-${entry.position}-${entry.horseNumber}`}
                                variant="caption"
                                color="text.secondary"
                              >
                                {entry.position}. #{entry.horseNumber} {entry.horseName}
                              </Typography>
                            ))}
                          </Stack>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                }

                const isSelected = raceId === selectedRaceIdForDate;
                return (
                <Card
                  key={raceId}
                  variant="outlined"
                  onClick={() => setSelectedRaceId(raceId)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRaceId(raceId);
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    borderColor: isSelected ? "primary.main" : "divider",
                    boxShadow: isSelected ? "0 0 0 1px rgba(15,108,189,0.38)" : "none",
                    transition:
                      "background-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 160ms cubic-bezier(0.1, 0.9, 0.2, 1), border-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1), transform 120ms cubic-bezier(0.1, 0.9, 0.2, 1)",
                    "&:hover": {
                      borderColor: "primary.main",
                      backgroundColor: alpha("#0f6cbd", 0.04),
                      boxShadow: "0 4px 14px rgba(0,0,0,0.09)",
                    },
                    "&:focus-visible": {
                      outline: "none",
                      boxShadow: `0 0 0 2px ${alpha("#ffffff", 0.96)}, 0 0 0 4px ${alpha("#0f6cbd", 0.72)}`,
                    },
                    "&:active": {
                      transform: "translateY(1px)",
                      backgroundColor: alpha("#0f6cbd", 0.08),
                    },
                  }}
                >
                  <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", mb: 0.4 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {toDisplayName(race.venueName, race.venueNameZh)} -{" "}
                        {locale === "zh-HK" ? `第${race.raceNo}場` : `Race ${race.raceNo}`}
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        color="info"
                        label={t.horseRaceStatusUpcoming}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
                      {toDisplayName(race.raceName, race.raceNameZh)}
                    </Typography>
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<TrophyFilled />}
                      label={
                        prediction?.picks?.[0]
                          ? `${t.horsePredictedWinnerLabel}: #${prediction.picks[0].horseNumber} ${toDisplayName(
                              prediction.picks[0].horseName,
                              race.runners.find(
                                (runner) =>
                                  Number(runner.horseNumber) === prediction.picks[0].horseNumber,
                              )?.horseNameZh,
                            )}`
                          : t.horsePredictedWinnerUnavailable
                      }
                      sx={{
                        mb: 0.8,
                        maxWidth: "100%",
                        height: "auto",
                        "& .MuiChip-label": {
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: 1.25,
                          py: 0.4,
                        },
                      }}
                    />
                    {prediction ? (
                      <Stack
                        direction="row"
                        spacing={0.8}
                        sx={{ mb: 0.8, flexWrap: "wrap", rowGap: 0.8 }}
                        useFlexGap
                      >
                        <Chip
                          size="small"
                          variant="outlined"
                          color={
                            prediction.confidenceBand === "High"
                              ? "success"
                              : prediction.confidenceBand === "Medium"
                                ? "primary"
                                : "warning"
                          }
                          label={`${t.confidenceTitle}: ${formatConfidenceBandLabel(prediction.confidenceBand, locale)}`}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${t.horseGeneratedAtLabel}: ${new Date(
                            prediction.generatedAt,
                          ).toLocaleTimeString(locale === "zh-HK" ? "zh-HK" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${t.horsePredictionMarginLabel}: ${
                            prediction.predictionMargin?.toFixed(1) ?? "-"
                          }`}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${t.horseDataFreshnessLabel}: ${
                            prediction.dataFreshnessSource === "database"
                              ? t.horseDataFreshnessLive
                              : t.horseDataFreshnessFallback
                          }`}
                        />
                      </Stack>
                    ) : null}
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {t.upcomingRacePostTime}: {new Date(race.postTime).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                      {t.upcomingRaceDistance}: {race.distance}m | {t.upcomingRaceClass}:{" "}
                      {toDisplayName(race.raceClass, race.raceClassZh)}
                    </Typography>
                    <Stack spacing={0.5}>
                      {race.runners.map((runner) => (
                        <Typography
                          key={`${race.raceNo}-${runner.horseNumber}-${runner.horseName}`}
                          variant="caption"
                          color="text.secondary"
                        >
                          {locale === "zh-HK"
                            ? `#${runner.horseNumber} ${toDisplayName(runner.horseName, runner.horseNameZh)}（騎師：${toDisplayName(runner.jockey, runner.jockeyZh)}，練馬師：${toDisplayName(runner.trainer, runner.trainerZh)}，檔位：${runner.draw}）`
                            : `#${runner.horseNumber} ${runner.horseName} (J: ${runner.jockey}, T: ${runner.trainer}, Draw: ${runner.draw})`}
                        </Typography>
                      ))}
                    </Stack>
                    <Box sx={{ mt: 1.1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t.horsePredictedPositionsLabel}
                      </Typography>
                      {prediction?.picks?.length ? (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.6 }}>
                            {t.horseTop3PredictionsLabel}
                          </Typography>
                          <Box sx={{ mt: 0.2, overflowX: "auto" }}>
                            <Table size="small" sx={{ minWidth: 620 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnNumber}
                                </TableCell>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnHorse}
                                </TableCell>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnPosition}
                                </TableCell>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnSpeed}
                                </TableCell>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnModelProb}
                                </TableCell>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnOdds}
                                </TableCell>
                                <TableCell sx={{ py: 0.6, px: 0.8 }}>
                                  {t.horsePredictionColumnEdge}
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {prediction.picks.map((pick, idx) => (
                                <TableRow key={`${raceId}-top-${pick.horseNumber}-${pick.horseName}`}>
                                  <TableCell sx={{ py: 0.5, px: 0.8 }}>#{pick.horseNumber}</TableCell>
                                  <TableCell sx={{ py: 0.5, px: 0.8, whiteSpace: "normal", wordBreak: "break-word" }}>
                                    {(() => {
                                      const localizedRunner = race.runners.find(
                                        (runner) =>
                                          Number(runner.horseNumber) === pick.horseNumber ||
                                          runner.horseName === pick.horseName,
                                      );
                                      return toDisplayName(
                                        pick.horseName,
                                        localizedRunner?.horseNameZh,
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.5, px: 0.8 }}>{idx + 1}</TableCell>
                                  <TableCell sx={{ py: 0.5, px: 0.8 }}>
                                    {pick.speedIndex?.toFixed(1) ?? "-"}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.5, px: 0.8 }}>
                                    {typeof pick.modelProbability === "number"
                                      ? `${pick.modelProbability.toFixed(1)}%`
                                      : "-"}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.5, px: 0.8 }}>
                                    {pick.marketOdds ?? "-"}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.5, px: 0.8 }}>
                                    {typeof pick.edgeScore === "number"
                                      ? `${pick.edgeScore > 0 ? "+" : ""}${pick.edgeScore.toFixed(1)}%`
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            </Table>
                          </Box>
                          <Stack spacing={0.6} sx={{ mt: 0.8 }}>
                            <Typography variant="caption" color="text.secondary">
                              {t.horseTopDriversLabel}
                            </Typography>
                            {prediction.picks.map((pick) => (
                              <Typography
                                key={`${raceId}-drivers-${pick.horseNumber}`}
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block" }}
                              >
                                #{pick.horseNumber} {pick.horseName}:{" "}
                                {(pick.topFactors ?? []).map((factor) => factor.label).join(" / ") || "-"}
                              </Typography>
                            ))}
                          </Stack>
                        </>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.4 }}
                        >
                          {t.horsePredictionHint}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ mt: 1.1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t.horseBetTypesLabel}
                        </Typography>
                        <IconButton
                          size="small"
                          aria-label={t.horseBetTypeInfoTitle}
                          onClick={() => setIsBetTypeInfoOpen(true)}
                          sx={{ p: 0.25 }}
                        >
                          <InfoRegular fontSize={15} />
                        </IconButton>
                      </Box>
                      <TextField
                        size="small"
                        type="number"
                        label={t.horseStakeLabel}
                        value={horseStakeInput}
                        onChange={(event) => {
                          setHorseStakeInput(event.target.value);
                        }}
                        sx={{ mt: 0.8, maxWidth: 180 }}
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            step: 10,
                            inputMode: "numeric",
                          },
                          input: {
                            endAdornment: horseStakeInput.length > 0 ? (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  aria-label={t.horseStakeClearAriaLabel}
                                  onClick={() => setHorseStakeInput("")}
                                  edge="end"
                                >
                                  <DismissRegular fontSize={14} />
                                </IconButton>
                              </InputAdornment>
                            ) : null,
                          },
                        }}
                      />
                      <Stack direction="row" spacing={0.8} useFlexGap sx={{ mt: 0.6, flexWrap: "wrap" }}>
                        {HORSE_BET_TYPES.map((betType) => {
                          const recommended = getRecommendedHorseBetTypes(prediction);
                          const isRecommended = recommended.includes(betType);
                          return (
                            <Chip
                              key={`${raceId}-bet-${betType}`}
                              size="small"
                              variant={isRecommended ? "filled" : "outlined"}
                              color={isRecommended ? "primary" : "default"}
                              label={horseBetTypeLabels[betType]}
                            />
                          );
                        })}
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.55 }}
                      >
                        {prediction
                          ? `${t.horseRecommendedBetLabel}: ${getRecommendedHorseBetTypes(prediction)
                              .map((betType) => horseBetTypeLabels[betType])
                              .join(" / ")}`
                          : t.horseRecommendedBetHintNoPrediction}
                      </Typography>
                      <Box sx={{ mt: 0.6 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t.horseEstimatedPayoutTitle}
                        </Typography>
                        <Stack spacing={0.45} sx={{ mt: 0.35 }}>
                          {getEstimatedPayoutRows(
                            getRecommendedHorseBetTypes(prediction),
                            prediction,
                            parseStakeAmount(horseStakeInput),
                          ).map((estimate) => (
                            <Typography
                              key={`${raceId}-estimate-${estimate.betType}`}
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block" }}
                            >
                              {horseBetTypeLabels[estimate.betType]}: {t.horseEstimatedReturnLabel}{" "}
                              {formatHkdRange(estimate.returnLow, estimate.returnHigh, locale)} |{" "}
                              {t.horseEstimatedProfitLabel}{" "}
                              {formatHkdRange(estimate.profitLow, estimate.profitHigh, locale)} |{" "}
                              {t.horseEstimatedRoiLabel} {formatPercentRange(estimate.roiLow, estimate.roiHigh)}
                            </Typography>
                          ))}
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.45 }}
                        >
                          {t.horseEstimatedRoiDisclaimer}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.25 }}
                        >
                          {t.horseEstimatedPayoutDisclaimer}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
      <Dialog
        open={isBetTypeInfoOpen}
        onClose={() => setIsBetTypeInfoOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t.horseBetTypeInfoTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2">{t.horseBetTypeInfoWin}</Typography>
            <Typography variant="body2">{t.horseBetTypeInfoPlace}</Typography>
            <Typography variant="body2">{t.horseBetTypeInfoQuinella}</Typography>
            <Typography variant="body2">{t.horseBetTypeInfoQuinellaPlace}</Typography>
            <Typography variant="body2">{t.horseBetTypeInfoExacta}</Typography>
            <Typography variant="body2">{t.horseBetTypeInfoTrio}</Typography>
            <Typography variant="body2">{t.horseBetTypeInfoTierce}</Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function parseHorseWinners(rows: HorseHistoryRow[]): ParsedHorseWinner[] {
  return rows
    .map((row) => {
      const match = row.result.match(/1\.\s*#(\d+)\s+([^|]+)/);
      if (!match) {
        return null;
      }
      return {
        date: row.date,
        horseNumber: Number(match[1]),
        horseName: (match[2] ?? "").trim(),
      };
    })
    .filter((item): item is ParsedHorseWinner => Boolean(item));
}

function parseHistoryResultEntries(result: string): ParsedHistoryRunner[] {
  return result
    .split(" | ")
    .map((entry) => {
      const match = entry.match(/^\s*(\d+)\.\s*#(\d+)\s+(.+?)\s*$/);
      if (!match) {
        return null;
      }
      return {
        position: Number(match[1]),
        horseNumber: Number(match[2]),
        horseName: (match[3] ?? "").trim(),
      };
    })
    .filter((item): item is ParsedHistoryRunner => Boolean(item))
    .sort((a, b) => a.position - b.position);
}

function calculatePredictionMargin(
  horses: Array<{ speedIndex?: number }>,
): number | undefined {
  const first = horses[0]?.speedIndex;
  const second = horses[1]?.speedIndex;
  if (typeof first !== "number" || typeof second !== "number") {
    return undefined;
  }
  return Math.max(0, first - second);
}

function getRecommendedHorseBetTypes(prediction?: HorseRacePrediction): HorseBetType[] {
  if (!prediction?.picks?.length) {
    return ["place", "quinellaPlace"];
  }
  const margin = prediction.predictionMargin ?? 0;
  if (prediction.confidenceBand === "High" && margin >= 8) {
    return ["win", "quinella", "exacta", "trio", "tierce"];
  }
  if (prediction.confidenceBand === "Medium" || margin >= 4) {
    return ["place", "win", "quinella", "quinellaPlace"];
  }
  return ["place", "quinellaPlace"];
}

const BET_TYPE_DIVIDEND_RANGE_PER_10: Record<HorseBetType, { low: number; high: number }> = {
  win: { low: 20, high: 55 },
  place: { low: 12, high: 22 },
  quinella: { low: 40, high: 95 },
  quinellaPlace: { low: 18, high: 35 },
  exacta: { low: 70, high: 180 },
  trio: { low: 150, high: 420 },
  tierce: { low: 400, high: 1800 },
};

function getEstimatedDividendRangePer10(
  betType: HorseBetType,
  prediction?: HorseRacePrediction,
): { low: number; high: number } {
  const base = BET_TYPE_DIVIDEND_RANGE_PER_10[betType];
  if (!base) {
    return { low: 0, high: 0 };
  }

  const confidenceFactor =
    prediction?.confidenceBand === "High"
      ? 0.86
      : prediction?.confidenceBand === "Medium"
        ? 1
        : 1.16;
  const margin = prediction?.predictionMargin ?? 0;
  const marginFactor = margin >= 8 ? 0.9 : margin >= 4 ? 0.97 : 1.05;
  const factor = confidenceFactor * marginFactor;

  const low = Math.max(2, base.low * factor);
  const high = Math.max(low + 1, base.high * factor);
  return { low, high };
}

function getEstimatedPayoutRows(
  betTypes: HorseBetType[],
  prediction: HorseRacePrediction | undefined,
  stakeAmount: number,
): Array<{
  betType: HorseBetType;
  returnLow: number;
  returnHigh: number;
  profitLow: number;
  profitHigh: number;
  roiLow: number;
  roiHigh: number;
}> {
  const safeStake = Number.isFinite(stakeAmount) ? Math.max(0, stakeAmount) : 0;
  const units = safeStake / 10;
  const totalStake = safeStake;

  return betTypes.map((betType) => {
    const dividend = getEstimatedDividendRangePer10(betType, prediction);
    const returnLow = dividend.low * units;
    const returnHigh = dividend.high * units;
    return {
      betType,
      returnLow,
      returnHigh,
      profitLow: returnLow - totalStake,
      profitHigh: returnHigh - totalStake,
      roiLow: totalStake > 0 ? (returnLow / totalStake) * 100 : 0,
      roiHigh: totalStake > 0 ? (returnHigh / totalStake) * 100 : 0,
    };
  });
}

function parseStakeAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function formatHkdRange(low: number, high: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale === "zh-HK" ? "zh-HK" : "en-HK", {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(Math.round(low))} - ${formatter.format(Math.round(high))}`;
}

function formatPercentRange(low: number, high: number): string {
  const roundedLow = Math.round(low);
  const roundedHigh = Math.round(high);
  return `${roundedLow}% - ${roundedHigh}%`;
}

function getRankRibbonStyle(index: number): SxProps<Theme> {
  const palettes = [
    { bg: "#fbe5a3", text: "#4a3800" }, // gold
    { bg: "#e9eef5", text: "#2f3743" }, // silver
    { bg: "#f0d3bf", text: "#4a2f1f" }, // bronze
  ];

  const selected = palettes[index] ?? palettes[2];
  return {
    px: 0.9,
    py: 0.2,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    backgroundColor: selected.bg,
    color: selected.text,
  };
}

type HighlightedDayProps = PickerDayProps & {
  highlightedDays?: Set<string>;
};

function HighlightedDay(props: HighlightedDayProps) {
  const { day, highlightedDays, ...rest } = props;
  const dayKey = dayjs(day as Dayjs).format("YYYY-MM-DD");
  const isHighlighted = highlightedDays?.has(dayKey);

  return (
    <PickerDay
      day={day}
      {...rest}
      sx={
        isHighlighted
          ? {
              // Keep highlight styling stable while preserving selected-day color states.
              "&:not(.Mui-selected)": {
                border: "1px solid",
                borderColor: "primary.main",
                bgcolor: "rgba(25, 118, 210, 0.08)",
              },
              "&:not(.Mui-selected):hover": {
                bgcolor: "rgba(25, 118, 210, 0.16)",
              },
              "&.Mui-selected": {
                border: "1px solid",
                borderColor: "primary.dark",
                bgcolor: "primary.main",
                color: "primary.contrastText",
              },
              "&.Mui-selected:hover": {
                bgcolor: "primary.dark",
              },
            }
          : undefined
      }
    />
  );
}

function getBankerCombinationCount(selectionCount: number): number {
  // Mark Six banker ticket has 1 fixed banker plus 5 picks from selections.
  if (selectionCount < 5) {
    return 0;
  }
  return nChooseK(selectionCount, 5);
}

function nChooseK(n: number, k: number): number {
  if (k < 0 || k > n) {
    return 0;
  }
  if (k === 0 || k === n) {
    return 1;
  }
  const m = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= m; i += 1) {
    result = (result * (n - m + i)) / i;
  }
  return Math.round(result);
}

function Mark6PreviousDrawSection({
  previousDraw,
  isLoading,
  bestImpact,
  t,
}: {
  previousDraw: Mark6PreviousDraw | null;
  isLoading: boolean;
  bestImpact: Mark6PreviousImpactRow | null;
  t: ReturnType<typeof useCopy>;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: alpha("#0f6cbd", 0.24),
        borderRadius: 2,
        bgcolor: alpha("#0f6cbd", 0.04),
      }}
    >
      <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
        <Stack spacing={1}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography variant="subtitle2">{t.mark6PreviousDrawTitle}</Typography>
              {previousDraw ? (
                <Typography variant="caption" color="text.secondary">
                  {t.mark6PreviousDrawDateLabel}: {previousDraw.date}
                  {previousDraw.source === "hkjc" ? ` · ${t.mark6PreviousDrawLiveSource}` : ""}
                </Typography>
              ) : null}
            </Box>
            {bestImpact ? (
              <Chip
                size="small"
                color={bestImpact.matchCount >= 3 ? "success" : "warning"}
                label={`${bestImpact.percentage}%`}
                sx={{ fontWeight: 700 }}
              />
            ) : null}
          </Box>

          {isLoading ? (
            <Typography variant="body2" color="text.secondary">
              {t.mark6PreviousDrawLoading}
            </Typography>
          ) : previousDraw ? (
            <>
              <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap" }}>
                {previousDraw.numbers.map((item) => (
                  <Chip
                    key={`mark6-previous-${item}`}
                    label={item}
                    size="small"
                    color="secondary"
                    sx={{ fontWeight: 600 }}
                  />
                ))}
                {previousDraw.specialNumber ? (
                  <Chip
                    key={`mark6-previous-special-${previousDraw.specialNumber}`}
                    label={`${t.mark6PreviousDrawSpecialLabel}: ${previousDraw.specialNumber}`}
                    size="small"
                    color="warning"
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
              </Stack>
              {bestImpact ? (
                <Stack spacing={0.4}>
                  <Typography variant="body2">
                    {t.mark6ImpactBestLabel}: {t.mark6SetLabel} {bestImpact.setIndex + 1} ·{" "}
                    {bestImpact.matchCount}/6 ({bestImpact.percentage}%)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getMark6ImpactVerdict(bestImpact.matchCount, t)}
                  </Typography>
                  {bestImpact.matchedNumbers.length > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      {t.mark6MatchedNumbersLabel}: {bestImpact.matchedNumbers.join(", ")}
                    </Typography>
                  ) : null}
                </Stack>
              ) : null}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t.mark6PreviousDrawUnavailable}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function getBaseMark6Sets(result: SuggestionPayload | null): number[][] {
  if (!result || result.mode !== "mark6") {
    return [];
  }
  if ((result.mark6BatchSets?.length ?? 0) > 0) {
    return (result.mark6BatchSets ?? []).map((set) => [...set].sort((a, b) => a - b));
  }
  if (result.mark6Prediction?.type === "multiple") {
    return (result.mark6Prediction.multiple ?? []).map((set) => [...set].sort((a, b) => a - b));
  }
  if (result.mark6Prediction?.type === "single" && (result.mark6Prediction.single?.length ?? 0) > 0) {
    return [[...(result.mark6Prediction.single ?? [])].sort((a, b) => a - b)];
  }
  const parsed = result.suggestions
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 49);
  if (parsed.length >= 6) {
    return [parsed.slice(0, 6).sort((a, b) => a - b)];
  }
  return [];
}

function buildMark6PreviousImpactRows(
  sets: number[][],
  previousDrawNumbers: number[],
): Mark6PreviousImpactRow[] {
  const previousDrawSet = new Set(previousDrawNumbers);
  return sets
    .filter((set) => set.length > 0)
    .map((set, setIndex) => {
      const matchedNumbers = [...new Set(set)]
        .filter((number) => previousDrawSet.has(number))
        .sort((a, b) => a - b);
      return {
        setIndex,
        matchedNumbers,
        matchCount: matchedNumbers.length,
        percentage: Math.round((matchedNumbers.length / 6) * 100),
      };
    });
}

function formatMark6NumberLabel(
  value: string | number,
  probabilityByNumber: Map<number, number>,
): string {
  const number = typeof value === "number" ? value : Number.parseInt(value, 10);
  const probability = probabilityByNumber.get(number);
  if (!Number.isFinite(number) || typeof probability !== "number") {
    return value.toString();
  }
  return `${number} (${probability}%)`;
}

function getMark6ImpactVerdict(
  matchCount: number,
  t: ReturnType<typeof useCopy>,
): string {
  if (matchCount >= 3) {
    return t.mark6ImpactNearWinning;
  }
  if (matchCount >= 2) {
    return t.mark6ImpactSomeImpact;
  }
  return t.mark6ImpactOffMark;
}

function weightedPickDistinctNumbers(
  entries: Array<{ number: number; score: number }>,
  count: number,
): number[] {
  const pool = [...entries];
  const picked: number[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, item) => sum + Math.max(0.001, item.score), 0);
    let cursor = Math.random() * total;
    let selectedIndex = 0;
    for (let i = 0; i < pool.length; i += 1) {
      cursor -= Math.max(0.001, pool[i]?.score ?? 0);
      if (cursor <= 0) {
        selectedIndex = i;
        break;
      }
    }
    const selected = pool.splice(selectedIndex, 1)[0];
    if (selected) {
      picked.push(selected.number);
    }
  }
  return picked.sort((a, b) => a - b);
}

function buildMixedMark6Sets(baseSets: number[][], desiredCount: number): number[][] {
  const validSets = baseSets.filter((set) => set.length >= 6);
  if (validSets.length < 2) {
    return [];
  }

  const frequency = new Map<number, number>();
  for (const set of validSets) {
    for (const num of set) {
      frequency.set(num, (frequency.get(num) ?? 0) + 1);
    }
  }
  const entries = [...frequency.entries()].map(([number, count]) => ({
    number,
    score: count,
  }));
  if (entries.length < 8) {
    return [];
  }

  const targetCount = Math.max(1, Math.min(desiredCount, 12));
  const results: number[][] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (results.length < targetCount && attempts < targetCount * 10) {
    attempts += 1;
    const smallEntries = entries.filter((entry) => entry.number <= 24);
    const bigEntries = entries.filter((entry) => entry.number >= 25);
    let candidate: number[];
    if (smallEntries.length >= 3 && bigEntries.length >= 3) {
      const small = weightedPickDistinctNumbers(smallEntries, 3);
      const big = weightedPickDistinctNumbers(bigEntries, 3);
      candidate = [...small, ...big].sort((a, b) => a - b);
    } else {
      candidate = weightedPickDistinctNumbers(entries, 6);
    }
    if (candidate.length < 6) {
      continue;
    }
    const key = candidate.join("-");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(candidate);
  }

  return results;
}

function buildMark6CopyText({
  generatedSets,
  mixedSets,
  fallbackSuggestions,
}: {
  generatedSets: number[][];
  mixedSets: number[][];
  fallbackSuggestions: string[];
}): string {
  const rows: string[] = [];
  for (const set of generatedSets) {
    rows.push(set.map((value) => value.toString()).join(", "));
  }
  for (const set of mixedSets) {
    rows.push(set.map((value) => value.toString()).join(", "));
  }
  if (rows.length > 0) {
    return rows.join("\n");
  }
  if (fallbackSuggestions.length > 0) {
    return fallbackSuggestions.join(", ");
  }
  return "";
}
