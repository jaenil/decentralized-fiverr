import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decentralized Fiverr",
  description: "Crowdsource thumbnail testing on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
