import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.fullName} · ${BRAND.productName}`,
    template: `%s · ${BRAND.primaryName}`,
  },
  description: BRAND.description,
  applicationName: BRAND.fullName,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
