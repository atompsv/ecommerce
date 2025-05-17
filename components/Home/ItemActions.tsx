import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { parseEther } from "viem";
import { monadTestnet } from "viem/chains";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";
import { useState, useEffect } from "react";
import { APP_URL } from "@/lib/constants";
import { encodeFunctionData } from "viem";

interface Gift {
  id: number;
  name: string;
  price: string;
  owner: string;
  description: string;
  recipientFid?: number;
}

interface Post {
  hash: string;
  author: string;
  authorFid: number;
  content: string;
}

export function ItemActions() {
  const { isWalletAvailable } = useMiniAppContext();
  const { isConnected, address, chainId } = useAccount();
  const { data: hash, sendTransaction } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Debug wallet connection
  useEffect(() => {
    console.log("Wallet Status:", {
      isConnected,
      address,
      chainId,
      isWalletAvailable
    });
  }, [isConnected, address, chainId, isWalletAvailable]);

  // Available gifts for purchase
  const availableGifts: Gift[] = [
    { 
      id: 0, 
      name: "Chog", 
      price: "0.01", 
      owner: "",
      description: "A special Chog gift"
    },
    { 
      id: 1, 
      name: "Moyaki", 
      price: "0.02", 
      owner: "",
      description: "A special Moyaki gift"
    }
  ];

  // Calculate balance
  const ownedGifts = gifts.filter(gift => gift.owner === address).length;

  if (!isConnected) {
    return (
      <div className="space-y-4 border border-[#333] rounded-md p-4 bg-[#111]">
        <p className="text-sm text-gray-400 text-left">
          Connect your MetaMask wallet to start using the gift marketplace
        </p>
      </div>
    );
  }

  if (!isRegistered) {
    return null;
  }

  return (
    <div className="space-y-4 border border-[#333] rounded-md p-4">
      <h2 className="text-xl font-bold text-left">Gift Marketplace</h2>
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {availableGifts.map((gift) => (
            <div
              key={gift.id}
              className="border border-[#333] rounded-md p-4 cursor-pointer hover:border-white"
              onClick={() => setSelectedGiftId(gift.id)}
            >
              <h3 className="text-lg font-semibold">{gift.name}</h3>
              <p className="text-sm text-gray-400">{gift.description}</p>
              <p className="text-sm mt-2">Price: {gift.price} ETH</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 