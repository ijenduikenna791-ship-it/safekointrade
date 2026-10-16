"use client";

import { createContext, useContext, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit, useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrum, base, bsc, mainnet, polygon } from "@reown/appkit/networks";

/**
 * WalletConnect (Reown AppKit), read-only by design: customers can connect a
 * wallet so we can show its address and pre-fill withdrawal destinations.
 * We never ask for seed phrases, signatures, token approvals or transfers.
 */
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";
const networks = [mainnet, polygon, bsc, arbitrum, base];

let adapter = null;
if (projectId) {
  adapter = new WagmiAdapter({ networks, projectId, ssr: true });
  createAppKit({
    adapters: [adapter],
    networks,
    projectId,
    metadata: {
      name: "SafeKoinTrade",
      description: "Connect your wallet to SafeKoinTrade",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://safekointrade.vercel.app",
      icons: [`${process.env.NEXT_PUBLIC_APP_URL || "https://safekointrade.vercel.app"}/favicon.ico`],
    },
    themeMode: "dark",
    themeVariables: { "--w3m-accent": "#4f8cff", "--w3m-border-radius-master": "2px", "--w3m-font-family": "\"IBM Plex Sans\", system-ui, sans-serif" },
    // Connect only: no swaps, buying, sending, email or social logins.
    features: { analytics: false, email: false, socials: false, swaps: false, onramp: false, send: false, history: false },
  });
}

const WalletContext = createContext({ enabled: false, isConnected: false, address: null, chainName: null, open: () => {} });
export const useWallet = () => useContext(WalletContext);

function Bridge({ children }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const value = useMemo(
    () => ({ enabled: true, isConnected: Boolean(isConnected && address), address: address || null, chainName: caipNetwork?.name || null, open }),
    [address, isConnected, caipNetwork, open]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

const queryClient = new QueryClient();

export function WalletProvider({ children }) {
  if (!adapter) return children;
  return (
    <WagmiProvider config={adapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Bridge>{children}</Bridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
