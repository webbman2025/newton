"use client";

import { alpha, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { LocaleProvider } from "@/components/locale-provider";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f6cbd" },
    success: { main: "#107c10" },
    warning: { main: "#bc4b09" },
    background: { default: "#f3f2f1", paper: "#ffffff" },
    text: { primary: "#242424", secondary: "#616161" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-geist-sans), Segoe UI, system-ui, sans-serif",
    h6: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    subtitle2: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(1200px 300px at 50% -120px, rgba(15,108,189,0.12), transparent), #f3f2f1",
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          transition:
            "background-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 160ms cubic-bezier(0.1, 0.9, 0.2, 1), transform 120ms cubic-bezier(0.1, 0.9, 0.2, 1), border-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1)",
          "&:focus-visible": {
            outline: "none",
            boxShadow: `0 0 0 2px ${alpha("#ffffff", 0.95)}, 0 0 0 4px ${alpha("#0f6cbd", 0.72)}`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid #e1dfdd",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          textTransform: "none",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
          "&:hover": {
            boxShadow: "0 3px 10px rgba(0, 0, 0, 0.12)",
          },
          "&:active": {
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transform: "translateY(1px)",
          },
          "&.MuiButton-containedPrimary:hover": {
            backgroundColor: "#115ea3",
          },
          "&.MuiButton-containedPrimary:active": {
            backgroundColor: "#0f548c",
          },
          "&.MuiButton-text:hover": {
            backgroundColor: alpha("#0f6cbd", 0.08),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          transition: "background-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 160ms cubic-bezier(0.1, 0.9, 0.2, 1)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition:
            "box-shadow 160ms cubic-bezier(0.1, 0.9, 0.2, 1), border-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1), background-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1)",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#0f6cbd", 0.64),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#0f6cbd",
            borderWidth: 1.5,
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha("#0f6cbd", 0.2)}`,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "2px 6px",
          "&:hover": {
            backgroundColor: alpha("#0f6cbd", 0.09),
          },
          "&.Mui-selected": {
            backgroundColor: alpha("#0f6cbd", 0.16),
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha("#0f6cbd", 0.2),
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          borderColor: "#d2d0ce",
          "&:hover": {
            backgroundColor: alpha("#0f6cbd", 0.09),
            borderColor: alpha("#0f6cbd", 0.5),
          },
          "&.Mui-selected": {
            backgroundColor: alpha("#0f6cbd", 0.16),
            borderColor: "#0f6cbd",
            color: "#0f6cbd",
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha("#0f6cbd", 0.22),
          },
          "&:active": {
            transform: "translateY(1px)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#0f6cbd",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.14)",
        },
      },
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}
