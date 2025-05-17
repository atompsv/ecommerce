import { useWallet } from "../components/farcaster-provider";

export interface ContextResult {
  isWalletAvailable: boolean;
  isFrameAvailable: boolean;
  error: string | null;
  actions: {
    close?: () => void;
  };
}

export const useMiniAppContext = (): ContextResult => {
  try {
    const walletContext = useWallet();
    return {
      isWalletAvailable: walletContext.isWalletAvailable,
      isFrameAvailable: walletContext.isFrameAvailable,
      error: walletContext.error,
      actions: walletContext.actions
    };
  } catch (error) {
    // Return default values if the hook is called outside of the provider
    return {
      isWalletAvailable: false,
      isFrameAvailable: false,
      error: "Wallet context not available",
      actions: {}
    };
  }
};
