"use client";

import React, { useSyncExternalStore } from "react";
import { WalletMultiButton as SolanaWalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * A client-only wrapper for WalletMultiButton to prevent Next.js SSR hydration mismatches.
 */
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function WalletMultiButton(
  props: React.ComponentProps<typeof SolanaWalletMultiButton>,
) {
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );

  if (!mounted) {
    return null;
  }

  return <SolanaWalletMultiButton {...props} />;
}
