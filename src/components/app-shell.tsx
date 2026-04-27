"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Container,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useCopy, useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/translations";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const t = useCopy();

  return (
    <Box sx={{ bgcolor: "#f5f6fa", minHeight: "100vh", pb: 12 }}>
      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ gap: 1.5, justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
            {t.appTitle}
          </Typography>
          <Select
            size="small"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            sx={{
              minWidth: 90,
              color: "#fff",
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
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <NavButton href="/" active={pathname === "/"}>
            {t.navHome}
          </NavButton>
          <NavButton href="/history" active={pathname === "/history"}>
            {t.navHistory}
          </NavButton>
          <NavButton href="/analytics" active={pathname === "/analytics"}>
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
          bgcolor: "#fff",
          borderTop: "1px solid #ddd",
          p: 1.5,
        }}
      >
        <Container maxWidth="sm">
          <Button
            fullWidth
            variant="contained"
            color="success"
            component={Link}
            href="https://bet.hkjc.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.goToHkjc}
          </Button>
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "text.secondary" }}
          >
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
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      component={Link}
      href={href}
      variant={active ? "contained" : "outlined"}
      size="small"
      sx={{ textTransform: "none" }}
    >
      {children}
    </Button>
  );
}
