"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FrameWalletProvider } from './frame-wallet-provider';

type EthereumProvider = {
  isMetaMask: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
};

type FarcasterProvider = {
  close: () => void;
};

// Use type augmentation instead of interface extension
type WindowWithProviders = Window & {
  ethereum?: EthereumProvider;
  farcaster?: FarcasterProvider;
};

interface WalletContextValue {
  isWalletAvailable: boolean;
  isFrameAvailable: boolean;
  error: string | null;
  actions: {
    close?: () => void;
  };
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// Export the hook as a named export
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  const [isWalletAvailable, setIsWalletAvailable] = useState(false);
  const [isFrameAvailable, setIsFrameAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<{ close?: () => void }>({});

  useEffect(() => {
    const checkWallets = async () => {
      try {
        // Check for MetaMask
        const hasMetaMask = typeof window !== 'undefined' && (window as WindowWithProviders).ethereum?.isMetaMask;
        setIsWalletAvailable(!!hasMetaMask);

        // Check for Farcaster Frame
        const hasFrame = typeof window !== 'undefined' && (window as WindowWithProviders).farcaster;
        setIsFrameAvailable(!!hasFrame);

        if (!hasMetaMask && !hasFrame) {
          setError('No wallet detected. Please install MetaMask or use Farcaster Frame.');
        }

        // Set up Farcaster Frame actions if available
        if (hasFrame) {
          setActions({
            close: () => (window as WindowWithProviders).farcaster?.close(),
          });
        }
      } catch (err) {
        setError('Error checking wallet availability');
        console.error('Wallet check error:', err);
      }
    };

    checkWallets();
  }, []);

  return (
    <FrameWalletProvider>
      <WalletContext.Provider
        value={{
          isWalletAvailable,
          isFrameAvailable,
          error,
          actions,
        }}
      >
        {children}
      </WalletContext.Provider>
    </FrameWalletProvider>
  );
}
