"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  DataTrendingFilled,
  DataTrendingRegular,
  HistoryFilled,
  HistoryRegular,
  HomeFilled,
  HomeRegular,
  InfoRegular,
} from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/translations";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const t = useCopy();

  return (
    <Box sx={{ minHeight: "100vh", pb: 8 }}>
      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ gap: 1.5, justifyContent: "space-between", minHeight: 64 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: 0.8 }}>
            <HomeFilled fontSize={20} />
            {t.appTitle}
          </Typography>
          <Select
            size="small"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            sx={{
              minWidth: 90,
              color: "#fff",
              borderRadius: 2,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#fff" },
              "& .MuiSvgIcon-root": { color: "#fff" },
            }}
          >
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="zh-HK">中文</MenuItem>
          </Select>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2, p: 0.6, bgcolor: "background.paper", borderRadius: 3, border: "1px solid #e1dfdd" }}>
          <NavButton href="/" active={pathname === "/"} icon={{ active: <HomeFilled fontSize={18} />, inactive: <HomeRegular fontSize={18} /> }}>
            {t.navHome}
          </NavButton>
          <NavButton href="/history" active={pathname === "/history"} icon={{ active: <HistoryFilled fontSize={18} />, inactive: <HistoryRegular fontSize={18} /> }}>
            {t.navHistory}
          </NavButton>
          <NavButton href="/analytics" active={pathname === "/analytics"} icon={{ active: <DataTrendingFilled fontSize={18} />, inactive: <DataTrendingRegular fontSize={18} /> }}>
            {t.navAnalytics}
          </NavButton>
        </Stack>
        {children}
      </Container>

      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          bgcolor: "background.paper",
          borderTop: "1px solid #e1dfdd",
          p: 1,
        }}
      >
        <Container maxWidth="sm">
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" sx={{ display: "flex", color: "text.secondary", gap: 0.8, alignItems: "center" }}>
            <InfoRegular fontSize={14} />
            {t.footerDisclaimer}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

function NavButton({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: { active: React.ReactNode; inactive: React.ReactNode };
  children: React.ReactNode;
}) {
  return (
    <Button
      component={Link}
      href={href}
      variant={active ? "contained" : "text"}
      size="small"
      startIcon={active ? icon.active : icon.inactive}
      sx={{
        flex: 1,
        borderRadius: 2,
        color: active ? "primary.contrastText" : "text.primary",
        bgcolor: active ? "primary.main" : "transparent",
        boxShadow: active ? "0 1px 5px rgba(15,108,189,0.25)" : "none",
        transition:
          "background-color 120ms cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 160ms cubic-bezier(0.1, 0.9, 0.2, 1), transform 120ms cubic-bezier(0.1, 0.9, 0.2, 1)",
        "&:hover": {
          bgcolor: active ? "#115ea3" : "rgba(15,108,189,0.1)",
          boxShadow: active ? "0 3px 10px rgba(15,108,189,0.28)" : "none",
        },
        "&:active": {
          transform: "translateY(1px)",
          bgcolor: active ? "#0f548c" : "rgba(15,108,189,0.16)",
        },
      }}
    >
      {children}
    </Button>
  );
}
