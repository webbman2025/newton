"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useCopy } from "@/components/locale-provider";

const SEEN_KEY = "mba-mark6-tutorial-seen-v1";

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TutorialStep = {
  target: string;
  title: string;
  body: string;
  optional?: boolean;
};

export function Mark6TutorialOverlay({ enabled }: { enabled: boolean }) {
  const t = useCopy();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);

  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        target: "generate-action",
        title: t.tutorialGenerateTitle,
        body: t.tutorialGenerateBody,
      },
      {
        target: "persona-selector",
        title: t.tutorialPersonaTitle,
        body: t.tutorialPersonaBody,
      },
      {
        target: "quick-analysis",
        title: t.tutorialQuickAnalysisTitle,
        body: t.tutorialQuickAnalysisBody,
      },
      {
        target: "results-card",
        title: t.tutorialResultsTitle,
        body: t.tutorialResultsBody,
      },
      {
        target: "probability-carousel",
        title: t.tutorialCarouselTitle,
        body: t.tutorialCarouselBody,
      },
      {
        target: "analysis-feed",
        title: t.tutorialFeedTitle,
        body: t.tutorialFeedBody,
        optional: true,
      },
      {
        target: "compliance-footer",
        title: t.tutorialComplianceTitle,
        body: t.tutorialComplianceBody,
      },
    ],
    [t],
  );

  const close = useCallback(() => {
    window.localStorage.setItem(SEEN_KEY, "1");
    setIsOpen(false);
    setHighlight(null);
    setIsSkipConfirmOpen(false);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const findNextStepIndex = useCallback(
    (fromIndex: number, direction: 1 | -1) => {
      let index = fromIndex + direction;
      while (index >= 0 && index < steps.length) {
        const step = steps[index];
        if (!step) {
          break;
        }
        if (step.optional) {
          const target = document.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`);
          if (!target) {
            index += direction;
            continue;
          }
        }
        return index;
      }
      return direction === 1 ? steps.length : -1;
    },
    [steps],
  );

  const positionStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) {
        return;
      }
      const target = document.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`);
      if (!target) {
        setHighlight(null);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const padding = 6;
        setHighlight({
          top: Math.max(4, rect.top - padding),
          left: Math.max(4, rect.left - padding),
          width: Math.min(window.innerWidth - 8, rect.width + padding * 2),
          height: Math.min(window.innerHeight - 8, rect.height + padding * 2),
        });
      }, 350);
    },
    [steps],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const forced = new URLSearchParams(window.location.search).get("tutorial") === "1";
    if (!forced) {
      return;
    }
    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setIsOpen(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(() => positionStep(stepIndex), 0);
    const reposition = () => positionStep(stepIndex);
    window.addEventListener("resize", reposition);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, positionStep, stepIndex]);

  if (!isOpen) {
    return null;
  }

  const step = steps[stepIndex];
  if (!step) {
    return null;
  }
  const isLast = findNextStepIndex(stepIndex, 1) >= steps.length;
  const calloutAtTop =
    highlight != null && highlight.top + highlight.height > window.innerHeight * 0.58;

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal + 20,
          bgcolor: highlight ? "transparent" : "rgba(0,0,0,0.68)",
        }}
      />
      {highlight ? (
        <Box
          sx={{
            position: "fixed",
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            zIndex: (theme) => theme.zIndex.modal + 21,
            border: "3px solid",
            borderColor: "primary.light",
            borderRadius: 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.68)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <Card
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        sx={{
          position: "fixed",
          zIndex: (theme) => theme.zIndex.modal + 22,
          left: 16,
          right: 16,
          maxWidth: 520,
          mx: "auto",
          ...(calloutAtTop ? { top: 16 } : { bottom: "calc(var(--app-content-bottom-inset) + 8px)" }),
          boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
        }}
      >
        <CardContent>
          <Stack spacing={1.2}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
              {stepIndex + 1} / {steps.length}
            </Typography>
            <Typography variant="h6">{step.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {step.body}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
              <Button onClick={() => setIsSkipConfirmOpen(true)} color="inherit">
                {t.tutorialSkip}
              </Button>
              <Stack direction="row" spacing={1}>
                {stepIndex > 0 ? (
                  <Button
                    onClick={() => {
                      const previous = findNextStepIndex(stepIndex, -1);
                      if (previous >= 0) {
                        setStepIndex(previous);
                      }
                    }}
                  >
                    {t.tutorialBack}
                  </Button>
                ) : null}
                <Button
                  variant="contained"
                  onClick={() => {
                    if (isLast) {
                      close();
                      return;
                    }
                    const next = findNextStepIndex(stepIndex, 1);
                    if (next >= steps.length || next < 0) {
                      close();
                      return;
                    }
                    setStepIndex(next);
                  }}
                >
                  {isLast ? t.tutorialDone : t.tutorialNext}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={isSkipConfirmOpen} onClose={() => setIsSkipConfirmOpen(false)}>
        <DialogTitle>{t.tutorialSkipConfirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t.tutorialSkipConfirmBody}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSkipConfirmOpen(false)}>{t.tutorialSkipCancel}</Button>
          <Button color="inherit" onClick={close}>
            {t.tutorialSkipConfirmAction}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
