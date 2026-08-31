"use client";

import { Box, Stack, Typography } from "@mui/material";
import {
  ArrowTrendingLinesRegular,
  BrainCircuitRegular,
  ChevronRightRegular,
  CursorClickRegular,
  GridRegular,
  PlayCircleRegular,
  SearchRegular,
  SparkleRegular,
  StarRegular,
  StackRegular,
} from "@fluentui/react-icons";
import { useCopy } from "@/components/locale-provider";
import type { Mark6GameModeId } from "@/lib/mark6-game-modes";

const MODE_ICONS: Record<Mark6GameModeId, React.ReactNode> = {
  quickPick: <SparkleRegular fontSize={28} />,
  luckyPack: <StackRegular fontSize={28} />,
  bankerStar: <StarRegular fontSize={28} />,
  manualPick: <CursorClickRegular fontSize={28} />,
  patternHunter: <SearchRegular fontSize={28} />,
  smartDiversify: <BrainCircuitRegular fontSize={28} />,
  drawPredictor: <ArrowTrendingLinesRegular fontSize={28} />,
  drawSimulator: <PlayCircleRegular fontSize={28} />,
};

const MODE_ORDER: Mark6GameModeId[] = [
  "drawSimulator",
  "drawPredictor",
  "quickPick",
  "luckyPack",
  "bankerStar",
  "manualPick",
  "patternHunter",
  "smartDiversify",
];

type Mark6GameModeHubProps = {
  onSelect: (modeId: Mark6GameModeId) => void;
};

export function Mark6GameModeHub({ onSelect }: Mark6GameModeHubProps) {
  const t = useCopy();

  const modes: Array<{
    id: Mark6GameModeId;
    title: string;
    description: string;
    howToPlay: string;
  }> = [
    {
      id: "drawPredictor",
      title: t.mark6ModeDrawPredictorTitle,
      description: t.mark6ModeDrawPredictorDescription,
      howToPlay: t.mark6ModeDrawPredictorHowToPlay,
    },
    {
      id: "quickPick",
      title: t.mark6ModeQuickPickTitle,
      description: t.mark6ModeQuickPickDescription,
      howToPlay: t.mark6ModeQuickPickHowToPlay,
    },
    {
      id: "luckyPack",
      title: t.mark6ModeLuckyPackTitle,
      description: t.mark6ModeLuckyPackDescription,
      howToPlay: t.mark6ModeLuckyPackHowToPlay,
    },
    {
      id: "bankerStar",
      title: t.mark6ModeBankerStarTitle,
      description: t.mark6ModeBankerStarDescription,
      howToPlay: t.mark6ModeBankerStarHowToPlay,
    },
    {
      id: "manualPick",
      title: t.mark6ModeManualPickTitle,
      description: t.mark6ModeManualPickDescription,
      howToPlay: t.mark6ModeManualPickHowToPlay,
    },
    {
      id: "patternHunter",
      title: t.mark6ModePatternHunterTitle,
      description: t.mark6ModePatternHunterDescription,
      howToPlay: t.mark6ModePatternHunterHowToPlay,
    },
    {
      id: "smartDiversify",
      title: t.mark6ModeSmartDiversifyTitle,
      description: t.mark6ModeSmartDiversifyDescription,
      howToPlay: t.mark6ModeSmartDiversifyHowToPlay,
    },
    {
      id: "drawSimulator",
      title: t.mark6ModeDrawSimulatorTitle,
      description: t.mark6ModeDrawSimulatorDescription,
      howToPlay: t.mark6ModeDrawSimulatorHowToPlay,
    },
  ];

  const orderedModes = MODE_ORDER.map((id) => modes.find((mode) => mode.id === id)).filter(
    (mode): mode is (typeof modes)[number] => Boolean(mode),
  );

  return (
    <Stack spacing={1.2}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.4 }}>
          {t.mark6ModeHubTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t.mark6ModeHubSubtitle}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.2,
        }}
      >
        {orderedModes.map((mode) => {
          const highlighted = mode.id === "drawSimulator";
          return (
            <button
              key={mode.id}
              type="button"
              aria-label={mode.title}
              onClick={() => onSelect(mode.id)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                display: "block",
                width: "100%",
                margin: 0,
                padding: 16,
                minHeight: 120,
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                borderRadius: 16,
                border: highlighted ? "1px solid #0f6cbd" : "1px solid #e1dfdd",
                backgroundColor: highlighted ? "rgba(15,108,189,0.05)" : "#ffffff",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "rgba(15,108,189,0.2)",
                WebkitTouchCallout: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              <div style={{ pointerEvents: "none" }}>
                <Stack spacing={0.8}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(15,108,189,0.1)",
                        color: "primary.main",
                        flexShrink: 0,
                      }}
                    >
                      {MODE_ICONS[mode.id] ?? <GridRegular fontSize={28} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, lineHeight: 1.25, flex: 1 }}
                        >
                          {mode.title}
                        </Typography>
                        <ChevronRightRegular fontSize={18} style={{ opacity: 0.55, flexShrink: 0 }} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {mode.description}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                    {t.mark6ModeHowToPlayLabel}: {mode.howToPlay}
                  </Typography>
                </Stack>
              </div>
            </button>
          );
        })}
      </Box>
    </Stack>
  );
}
