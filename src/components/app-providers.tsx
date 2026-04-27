"use client";

import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { LocaleProvider } from "@/components/locale-provider";

const theme = createTheme({
  palette: {
    primary: { main: "#1f4fd6" },
    success: { main: "#137f3b" },
    background: { default: "#f5f6fa" },
  },
  shape: { borderRadius: 10 },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}
