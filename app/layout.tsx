import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./dashboard-enhancements.css";
import "./revenue-retention.css";
import "./commercial-chart-refinement.css";
import "./management-simplification.css";
import "./period-filter.css";
import "./experience-polish.css";

export const metadata: Metadata = {
  title: "Kora Health Lab",
  description: "Painel operacional e comercial do Kora Health Lab.",
  applicationName: "Kora Health Lab",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon",
    apple: "/apple-icon"
  },
  appleWebApp: {
    capable: true,
    title: "Kora",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#3c4536"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
