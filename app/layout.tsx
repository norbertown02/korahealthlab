import type { Metadata } from "next";
import "./globals.css";
import "./dashboard-enhancements.css";
import "./revenue-retention.css";
import "./management-simplification.css";

export const metadata: Metadata = {
  title: "Kora Health Lab BI",
  description: "Dashboard operacional e comercial para o Kora Health Lab."
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