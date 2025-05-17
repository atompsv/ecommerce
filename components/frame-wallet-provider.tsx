import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { type ReactNode } from 'react';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [
    {
      id: 1337,
      name: 'Monad Testnet',
      network: 'monad',
      nativeCurrency: {
        name: 'Monad',
        symbol: 'MONAD',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: ['https://rpc.testnet.monad.xyz'] },
        public: { http: ['https://rpc.testnet.monad.xyz'] },
      },
      blockExplorers: {
        default: { name: 'Monad Explorer', url: 'https://explorer.testnet.monad.xyz' },
      },
      testnet: true,
    },
  ],
  connectors: [
    injected(),
    farcasterFrame(),
  ],
  transports: {
    [1337]: http('https://rpc.testnet.monad.xyz'),
  },
});

export function FrameWalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
