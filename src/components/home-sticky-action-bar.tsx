"use client";

import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { SparkleRegular } from "@fluentui/react-icons";

type HomeStickyActionBarProps = {
  visible: boolean;
  primaryLabel: string;
  loadingLabel: string;
  isLoading: boolean;
  disabled: boolean;
  progressText?: string;
  progressValue?: number;
  onPrimaryClick: () => void;
  dataTutorial?: string;
};

export function HomeStickyActionBar({
  visible,
  primaryLabel,
  loadingLabel,
  isLoading,
  disabled,
  progressText,
  progressValue = 0,
  onPrimaryClick,
  dataTutorial = "generate-action",
}: HomeStickyActionBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <Box
      data-tutorial={dataTutorial}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "var(--app-footer-height)",
        zIndex: (theme) => theme.zIndex.appBar + 1,
        bgcolor: "background.paper",
        borderTop: "1px solid #e1dfdd",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
        px: 2,
        pt: 1,
        pb: "calc(8px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        <Stack spacing={0.8}>
          {isLoading && progressText ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.4 }}>
                {progressText}
              </Typography>
              <LinearProgress
                variant={progressValue > 0 ? "determinate" : "indeterminate"}
                value={progressValue}
              />
            </Box>
          ) : null}
          <Button
            onClick={onPrimaryClick}
            variant="contained"
            fullWidth
            disabled={disabled}
            sx={{ minHeight: 48, borderRadius: 2, fontWeight: 700 }}
          >
            <SparkleRegular fontSize={18} style={{ marginRight: 6 }} />
            {isLoading ? loadingLabel : primaryLabel}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
