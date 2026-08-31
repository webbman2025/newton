"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import { ChevronDownRegular } from "@fluentui/react-icons";

type Mark6CollapsibleSectionProps = {
  id: string;
  title: string;
  hint?: string;
  expanded: boolean;
  onChange: (expanded: boolean) => void;
  children: React.ReactNode;
};

export function Mark6CollapsibleSection({
  id,
  title,
  hint,
  expanded,
  onChange,
  children,
}: Mark6CollapsibleSectionProps) {
  return (
    <Accordion
      expanded={expanded}
      onChange={(_event, nextExpanded) => onChange(nextExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px !important",
        "&:before": { display: "none" },
        overflow: "hidden",
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDownRegular fontSize={18} />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
        sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 0.8 } }}
      >
        <div>
          <Typography variant="subtitle2">{title}</Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </div>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
