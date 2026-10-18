"use client";
import { AuthProvider } from "@/contexts/AuthContext";
import React, { useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Standard wallets (Phantom, Solflare, etc.) are auto-detected by Wallet Standard
  const wallets = useMemo(() => [], []);

  const onError = useCallback((error: WalletError) => {
    // Ignore intentional user cancellations to prevent noisy console/terminal errors
    if (
      error.name === "WalletConnectionError" ||
      error.name === "WalletWindowClosedError" ||
      error.message?.includes("User rejected the request")
    ) {
      return;
    }
    console.error("Wallet error:", error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
