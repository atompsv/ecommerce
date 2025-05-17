import type { Metadata } from "next";
import { WalletProviderWrapper } from "@/components/farcaster-provider";
import { FrameWalletProvider } from "@/components/frame-wallet-provider";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "E-commerce DApp",
  description: "A decentralized e-commerce application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProviderWrapper>
          {children}
        </WalletProviderWrapper>
      </body>
    </html>
  );
}
