"use client";

import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useCopy } from "@/components/locale-provider";

export type HorsePredictionPick = {
  horseNumber: number;
  horseName: string;
  horseNameZh?: string;
  speedIndex?: number;
  modelProbability?: number;
  marketOdds?: string | number;
  edgeScore?: number;
};

type HorsePredictionPicksProps = {
  picks: HorsePredictionPick[];
  toDisplayName: (english: string, chinese?: string) => string;
};

export function HorsePredictionPicks({ picks, toDisplayName }: HorsePredictionPicksProps) {
  const t = useCopy();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));

  if (isCompact) {
    return (
      <Stack spacing={0.8} sx={{ mt: 0.4 }}>
        {picks.map((pick, idx) => (
          <Box
            key={`${pick.horseNumber}-${pick.horseName}`}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 1,
              bgcolor: idx === 0 ? "rgba(15,108,189,0.04)" : "transparent",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>
              #{pick.horseNumber} {toDisplayName(pick.horseName, pick.horseNameZh)} ·{" "}
              {t.horsePredictionColumnPosition} {idx + 1}
            </Typography>
            <Stack direction="row" spacing={1.2} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary">
                {t.horsePredictionColumnSpeed}: {pick.speedIndex?.toFixed(1) ?? "-"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t.horsePredictionColumnModelProb}:{" "}
                {typeof pick.modelProbability === "number"
                  ? `${pick.modelProbability.toFixed(1)}%`
                  : "-"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t.horsePredictionColumnOdds}: {pick.marketOdds ?? "-"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t.horsePredictionColumnEdge}:{" "}
                {typeof pick.edgeScore === "number"
                  ? `${pick.edgeScore > 0 ? "+" : ""}${pick.edgeScore.toFixed(1)}%`
                  : "-"}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Box sx={{ mt: 0.2, overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 520 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnNumber}</TableCell>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnHorse}</TableCell>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnPosition}</TableCell>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnSpeed}</TableCell>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnModelProb}</TableCell>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnOdds}</TableCell>
            <TableCell sx={{ py: 0.6, px: 0.8 }}>{t.horsePredictionColumnEdge}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {picks.map((pick, idx) => (
            <TableRow key={`${pick.horseNumber}-${pick.horseName}`}>
              <TableCell sx={{ py: 0.5, px: 0.8 }}>#{pick.horseNumber}</TableCell>
              <TableCell sx={{ py: 0.5, px: 0.8, whiteSpace: "normal", wordBreak: "break-word" }}>
                {toDisplayName(pick.horseName, pick.horseNameZh)}
              </TableCell>
              <TableCell sx={{ py: 0.5, px: 0.8 }}>{idx + 1}</TableCell>
              <TableCell sx={{ py: 0.5, px: 0.8 }}>{pick.speedIndex?.toFixed(1) ?? "-"}</TableCell>
              <TableCell sx={{ py: 0.5, px: 0.8 }}>
                {typeof pick.modelProbability === "number"
                  ? `${pick.modelProbability.toFixed(1)}%`
                  : "-"}
              </TableCell>
              <TableCell sx={{ py: 0.5, px: 0.8 }}>{pick.marketOdds ?? "-"}</TableCell>
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
  );
}
