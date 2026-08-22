import type { Metadata } from "next";
import "./globals.css";

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
