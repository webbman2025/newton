"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  BookOpenRegular,
  QuestionCircleRegular,
  SparkleRegular,
} from "@fluentui/react-icons";
import { useCopy } from "@/components/locale-provider";

export default function TutorialPage() {
  const t = useCopy();
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const steps = [
    [t.tutorialPersonaTitle, t.tutorialPersonaBody],
    [t.tutorialQuickAnalysisTitle, t.tutorialQuickAnalysisBody],
    [t.tutorialResultsTitle, t.tutorialResultsBody],
    [t.tutorialCarouselTitle, t.tutorialCarouselBody],
    [t.tutorialFeedTitle, t.tutorialFeedBody],
    [t.tutorialComplianceTitle, t.tutorialComplianceBody],
  ];
  const faq = [
    [t.tutorialFaqAnalysisQuestion, t.tutorialFaqAnalysisAnswer],
    [t.tutorialFaqProbabilityQuestion, t.tutorialFaqProbabilityAnswer],
    [t.tutorialFaqGameTheoryQuestion, t.tutorialFaqGameTheoryAnswer],
    [t.tutorialFaqComplianceQuestion, t.tutorialFaqComplianceAnswer],
  ];

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <BookOpenRegular />
              {t.tutorialTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.tutorialSubtitle}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                component={Link}
                href="/?tutorial=1"
                variant="contained"
                startIcon={<SparkleRegular />}
              >
                {t.tutorialStart}
              </Button>
              <Button
                variant="outlined"
                startIcon={<QuestionCircleRegular />}
                onClick={() => setIsFaqOpen(true)}
              >
                {t.tutorialFaqOpen}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 1.2,
        }}
      >
        {steps.map(([title, body], index) => (
          <Card key={title} variant="outlined">
            <CardContent>
              <Stack spacing={0.8}>
                <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                  {index + 1}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {body}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog
        open={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t.tutorialFaqTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {faq.map(([question, answer]) => (
              <Box key={question}>
                <Typography variant="subtitle2">{question}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {answer}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
