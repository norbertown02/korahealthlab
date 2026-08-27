import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./dashboard-enhancements.css";
import "./revenue-retention.css";
import "./commercial-chart-refinement.css";
import "./management-simplification.css";
import "./period-filter.css";
import "./experience-polish.css";
import "./weekday-response.css";
import "./standalone-app.css";

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
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
