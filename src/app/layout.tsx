import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance",
  description:
    "Gestao financeira privada para vinculos, despesas compartilhadas e repasses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
