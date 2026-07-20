"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useCopy } from "@/components/locale-provider";

const SEEN_KEY = "mba-mark6-tutorial-seen-v1";

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function Mark6TutorialOverlay({ enabled }: { enabled: boolean }) {
  const t = useCopy();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const steps = useMemo(
    () => [
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
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const positionStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) {
        return;
      }
      const target = document.querySelector<HTMLElement>(
        `[data-tutorial="${step.target}"]`,
      );
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
    const timer = window.setTimeout(() => {
      const forced = new URLSearchParams(window.location.search).get("tutorial") === "1";
      if (forced || window.localStorage.getItem(SEEN_KEY) !== "1") {
        setStepIndex(0);
        setIsOpen(true);
      }
    }, 700);
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
  const isLast = stepIndex === steps.length - 1;
  const calloutAtTop =
    highlight != null && highlight.top + highlight.height > window.innerHeight * 0.58;

  return (
    <>
      <Box
        onClick={close}
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
          ...(calloutAtTop ? { top: 16 } : { bottom: 16 }),
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
              <Button onClick={close} color="inherit">
                {t.tutorialSkip}
              </Button>
              <Stack direction="row" spacing={1}>
                {stepIndex > 0 ? (
                  <Button onClick={() => setStepIndex((value) => value - 1)}>
                    {t.tutorialBack}
                  </Button>
                ) : null}
                <Button
                  variant="contained"
                  onClick={() => {
                    if (isLast) {
                      close();
                    } else {
                      setStepIndex((value) => value + 1);
                    }
                  }}
                >
                  {isLast ? t.tutorialDone : t.tutorialNext}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
