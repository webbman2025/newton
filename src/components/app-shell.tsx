"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  Divider,
  Fab,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  BookOpenRegular,
  DataTrendingFilled,
  DataTrendingRegular,
  HeartFilled,
  HistoryFilled,
  HistoryRegular,
  HomeFilled,
  HomeRegular,
  InfoRegular,
} from "@fluentui/react-icons";
import { useCopy, useLocale } from "@/components/locale-provider";
import { getAlipayHkQrLandingUrl } from "@/lib/alipayhk-donation";
import type { Locale } from "@/lib/translations";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const t = useCopy();
  const donationUrl = process.env.NEXT_PUBLIC_ALIPAY_HK_DONATION_URL?.trim();
  const donationQrImageUrl =
    process.env.NEXT_PUBLIC_ALIPAY_HK_QR_IMAGE_URL?.trim() || "/alipayhk-qr.png";
  const alipayHkQrLandingUrl = donationQrImageUrl ? getAlipayHkQrLandingUrl() : "";
  const hasDonationSupport = Boolean(donationUrl || donationQrImageUrl);
  const [isDonationQrFullscreenOpen, setIsDonationQrFullscreenOpen] = useState(false);
  const isHome = pathname === "/";

  const donationFabSx = {
    position: "fixed" as const,
    right: "calc(16px + env(safe-area-inset-right, 0px))",
    bottom: isHome
      ? "var(--app-donation-fab-bottom)"
      : "calc(var(--app-footer-height) + 12px + env(safe-area-inset-bottom, 0px))",
    zIndex: (theme: { zIndex: { appBar: number } }) => theme.zIndex.appBar + 2,
    width: 52,
    height: 52,
    minHeight: 52,
    boxShadow: "0 4px 14px rgba(15,108,189,0.35)",
    "&:hover": {
      boxShadow: "0 6px 18px rgba(15,108,189,0.42)",
    },
  };

  const donationFab = hasDonationSupport ? (
    <Tooltip title={t.donationHint} placement="left" enterTouchDelay={0}>
      <Fab
        color="primary"
        aria-label={t.donationButton}
        sx={donationFabSx}
        {...(donationQrImageUrl
          ? {
              type: "button" as const,
              onClick: () => setIsDonationQrFullscreenOpen(true),
            }
          : {
              component: "a" as const,
              href: donationUrl,
              target: "_blank",
              rel: "noopener noreferrer",
            })}
      >
        <HeartFilled fontSize={22} />
      </Fab>
    </Tooltip>
  ) : null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: isHome ? "var(--app-content-bottom-inset)" : "var(--app-footer-height)",
      }}
    >
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
        data-tutorial="compliance-footer"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          width: "100%",
          bgcolor: "background.paper",
          borderTop: "1px solid #e1dfdd",
          px: 1,
          pt: 1,
          pb: "calc(8px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Container maxWidth="sm">
          <Divider sx={{ mb: 1 }} />
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="caption" sx={{ display: "flex", color: "text.secondary", gap: 0.8, alignItems: "center" }}>
              <InfoRegular fontSize={14} />
              {t.footerCompliance}
            </Typography>
            <Stack direction="row" spacing={0.4} sx={{ flexShrink: 0 }}>
              <Button
                component={Link}
                href="/tutorial"
                size="small"
                variant="text"
                startIcon={<BookOpenRegular />}
                sx={{ minWidth: "auto", textTransform: "none" }}
              >
                {t.tutorialFooterLink}
              </Button>
              <Button
                component="a"
                href="https://bet.hkjc.com/en/marksix/index"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="text"
                sx={{ minWidth: "auto", textTransform: "none" }}
              >
                {t.footerHkjcLink}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {donationFab}

      {donationQrImageUrl ? (
        <Dialog
          fullScreen
          open={isDonationQrFullscreenOpen}
          onClose={() => setIsDonationQrFullscreenOpen(false)}
          aria-label={t.donationQrTitle}
          slotProps={{
            root: {
              sx: {
                zIndex: (theme) => theme.zIndex.modal + 200,
              },
            },
            paper: {
              elevation: 0,
              sx: {
                bgcolor: "background.default",
                display: "flex",
                flexDirection: "column",
                backgroundImage:
                  "radial-gradient(1200px 300px at 50% -120px, rgba(15,108,189,0.12), transparent)",
              },
            },
          }}
        >
          <DialogContent
            sx={{
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              px: 2,
              py: 3,
              pt: "calc(12px + env(safe-area-inset-top, 0px))",
              pb: "calc(24px + env(safe-area-inset-bottom, 0px))",
              overflow: "auto",
            }}
          >
            <Box
              component="a"
              href={alipayHkQrLandingUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.donationQrTitle}
              sx={{
                display: "block",
                width: "min(92vw, 360px)",
                maxWidth: "100%",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                lineHeight: 0,
                textDecoration: "none",
                "&:focus-visible": {
                  outline: "3px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 4,
                },
              }}
            >
              <Box
                component="img"
                src={donationQrImageUrl}
                alt=""
                sx={{
                  width: "100%",
                  maxHeight: "min(52vh, 380px)",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  verticalAlign: "bottom",
                }}
              />
            </Box>
            <Button
              type="button"
              variant="contained"
              fullWidth
              onClick={() => setIsDonationQrFullscreenOpen(false)}
              sx={{
                maxWidth: 360,
                minHeight: 48,
                borderRadius: 2,
                fontWeight: 700,
              }}
            >
              {t.donationQrBack}
            </Button>
          </DialogContent>
        </Dialog>
      ) : null}
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
        minHeight: 44,
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
