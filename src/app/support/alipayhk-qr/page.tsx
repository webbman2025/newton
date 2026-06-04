"use client";

import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useCopy } from "@/components/locale-provider";
import { getAlipayHkQrLandingUrl } from "@/lib/alipayhk-donation";

export default function AlipayHkQrPage() {
  const router = useRouter();
  const t = useCopy();
  const donationQrImageUrl =
    process.env.NEXT_PUBLIC_ALIPAY_HK_QR_IMAGE_URL?.trim() || "/alipayhk-qr.png";
  const alipayHkQrLandingUrl = getAlipayHkQrLandingUrl();

  return (
    <Card>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="h6" sx={{ alignSelf: "stretch" }}>
            {t.donationQrTitle}
          </Typography>
          <Box
            component="a"
            href={alipayHkQrLandingUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.donationQrTitle}
            sx={{
              display: "block",
              width: "100%",
              maxWidth: 420,
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid #e1dfdd",
              lineHeight: 0,
              textDecoration: "none",
              "&:focus-visible": {
                outline: "3px solid #0f6cbd",
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
                height: "auto",
                display: "block",
                verticalAlign: "bottom",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t.donationQrMobileHint}
          </Typography>
          <Button
            type="button"
            variant="contained"
            fullWidth
            onClick={() => router.back()}
            sx={{ minHeight: 44 }}
          >
            {t.donationQrBack}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
