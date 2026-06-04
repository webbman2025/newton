/**
 * Landing URL decoded from the default bundled QR (`public/alipayhk-qr.png`).
 * Set NEXT_PUBLIC_ALIPAY_HK_LANDING_URL when you ship a replacement QR image.
 */
export const DEFAULT_ALIPAY_HK_QR_LANDING_URL =
  "https://render.alipay.com/p/yuyan/180020010001270667/landing/income.html?qrcode=https://qr.alipay.hk/2810040101hzuneghsbpyfwu74";

export function getAlipayHkQrLandingUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ALIPAY_HK_LANDING_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ALIPAY_HK_QR_LANDING_URL;
}
