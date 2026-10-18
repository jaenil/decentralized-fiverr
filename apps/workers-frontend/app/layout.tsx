import { WorkerAuthProvider } from "@/contexts/WorkerAuthContext";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "dFiverr — Worker Portal",
  description:
    "Earn SOL by labeling tasks on the decentralized Fiverr platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen flex flex-col bg-zinc-950 text-white antialiased">
        <WorkerAuthProvider>{children}</WorkerAuthProvider>
      </body>
    </html>
  );
}
