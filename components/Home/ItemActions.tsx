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
  const { isEthProviderAvailable, actions, context } = useMiniAppContext();
  const { isConnected, address, chainId } = useAccount();
  const { data: hash, sendTransaction } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [myFid, setMyFid] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Get current user's FID when component mounts
  useEffect(() => {
    if (context?.user?.fid) {
      setMyFid(context.user.fid);
      console.log("User FID:", context.user.fid);
    }
  }, [context]);

  // Debug wallet connection
  useEffect(() => {
    console.log("Wallet Status:", {
      isConnected,
      address,
      chainId,
      isEthProviderAvailable
    });
  }, [isConnected, address, chainId, isEthProviderAvailable]);

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
  const redeemableGifts = gifts.filter(gift => gift.recipientFid === myFid).length;

  async function buyGift(gift: Gift) {
    if (!address || !myFid) {
      console.error("Cannot buy gift: Missing address or FID", { address, myFid });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Buying gift:", gift);
      
      // Encode the buyGift function call
      const data = encodeFunctionData({
        abi: [
          {
            name: "buyGift",
            type: "function",
            inputs: [
              { name: "giftId", type: "uint256" },
              { name: "amount", type: "uint256" }
            ],
            outputs: [],
            stateMutability: "payable"
          }
        ],
        functionName: "buyGift",
        args: [BigInt(gift.id), BigInt(1)]
      });

      await sendTransaction({
        to: "0xa44CD9E31A04B263980932670D1Fe1065a6e4c30",
        value: parseEther(gift.price),
        data
      });
      
      // Add gift to user's collection
      setGifts(prevGifts => [...prevGifts, { ...gift, owner: address, recipientFid: myFid }]);
      console.log("Gift purchased successfully");
    } catch (error) {
      console.error("Error buying gift:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendGift(giftId: number, post: Post) {
    if (!address || !actions || !myFid) return;
    
    try {
      // Encode the sendGift function call
      const data = encodeFunctionData({
        abi: [
          {
            name: "sendGift",
            type: "function",
            inputs: [
              { name: "receiver", type: "address" },
              { name: "giftId", type: "uint256" },
              { name: "amount", type: "uint256" }
            ],
            outputs: [],
            stateMutability: "nonpayable"
          }
        ],
        functionName: "sendGift",
        args: [post.author as `0x${string}`, BigInt(giftId), BigInt(1)]
      });

      // Send the gift using the contract
      await sendTransaction({
        to: "0xa44CD9E31A04B263980932670D1Fe1065a6e4c30",
        value: parseEther("0"),
        data
      });

      // Create a cast mentioning the gift
      await actions.composeCast({
        text: `🎁 Just sent a ${availableGifts.find(g => g.id === giftId)?.name} gift to @${post.author}! They can redeem it anytime!`,
        embeds: [`${APP_URL}/cast/${post.hash}`],
      });

      // Update local state
      setGifts(gifts.map(gift => 
        gift.id === giftId ? { ...gift, owner: post.author, recipientFid: post.authorFid } : gift
      ));
      setSelectedGiftId(null);
      setSelectedPost(null);
    } catch (error) {
      console.error("Error sending gift:", error);
    }
  }

  // Add function to check if user is registered
  async function checkUserRegistration() {
    if (!address) return false;
    
    try {
      const data = encodeFunctionData({
        abi: [
          {
            name: "users",
            type: "function",
            inputs: [{ name: "wallet", type: "address" }],
            outputs: [
              { name: "userId", type: "string" },
              { name: "walletAddress", type: "address" }
            ],
            stateMutability: "view"
          }
        ],
        functionName: "users",
        args: [address]
      });

      // Call the contract to check registration
      const result = await sendTransaction({
        to: "0xa44CD9E31A04B263980932670D1Fe1065a6e4c30",
        data
      });

      return result !== null;
    } catch (error) {
      console.error("Error checking user registration:", error);
      return false;
    }
  }

  // Check registration status when component mounts
  useEffect(() => {
    if (address) {
      checkUserRegistration().then(isRegistered => {
        setIsRegistered(isRegistered);
      });
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="space-y-4 border border-[#333] rounded-md p-4 bg-[#111]">
        <p className="text-sm text-gray-400 text-left">
          Connect your wallet to start using the gift marketplace
        </p>
      </div>
    );
  }

  if (!isRegistered) {
    return null;
  }

  return (
    <div className="space-y-4 border border-[#333] rounded-md p-4 bg-[#111]">
      <h2 className="text-xl font-bold text-left text-white">Gift Marketplace</h2>
      
      {/* Balance Display */}
      <div className="flex justify-between items-center p-4 bg-[#222] rounded-md">
        <div className="text-center">
          <p className="text-sm text-gray-400">Gifts to Send</p>
          <p className="text-2xl font-bold text-white">{ownedGifts}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400">Gifts to Redeem</p>
          <p className="text-2xl font-bold text-white">{redeemableGifts}</p>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        {/* Your Gifts section */}
        <div className="flex flex-col space-y-2">
          <h3 className="text-lg font-semibold text-white">Your Gifts</h3>
          <div className="flex flex-col space-y-2">
            {gifts.filter(gift => gift.recipientFid === myFid).map((gift) => (
              <div key={gift.id} className="flex items-center justify-between border border-[#333] p-3 rounded-md hover:border-white transition-colors bg-[#222]">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-white">{gift.name}</h4>
                  <p className="text-xs text-gray-400">{gift.description}</p>
                  <p className="text-xs mt-1 text-gray-300">From: {gift.owner.slice(0, 4)}...{gift.owner.slice(-4)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Gifts section */}
        <div className="flex flex-col space-y-2">
          <h3 className="text-lg font-semibold text-white">Available Gifts</h3>
          <div className="flex flex-col space-y-2">
            {availableGifts.length > 0 ? (
              availableGifts.map((gift) => (
                <div key={gift.id} className="flex items-center justify-between border border-[#333] p-3 rounded-md hover:border-white transition-colors bg-[#222]">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-white">{gift.name}</h4>
                    <p className="text-xs text-gray-400">{gift.description}</p>
                    <p className="text-xs mt-1 text-gray-300">Price: {gift.price} MON</p>
                  </div>
                  <button
                    className={`ml-4 bg-white text-black rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => buyGift(gift)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 p-3 border border-[#333] rounded-md bg-[#222]">
                No gifts available for purchase at the moment
              </p>
            )}
          </div>
        </div>

        {/* Gifts to Send section */}
        <div className="flex flex-col space-y-2">
          <h3 className="text-lg font-semibold text-white">Gifts to Send</h3>
          <div className="flex flex-col space-y-2">
            {gifts.filter(gift => gift.owner === address).map((gift) => (
              <div key={gift.id} className="flex items-center justify-between border border-[#333] p-3 rounded-md hover:border-white transition-colors bg-[#222]">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-white">{gift.name}</h4>
                  <p className="text-xs text-gray-400">{gift.description}</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    className="bg-white text-black rounded-md px-4 py-2 text-xs hover:bg-gray-200 transition-colors whitespace-nowrap"
                    onClick={() => {
                      setSelectedGiftId(gift.id);
                      actions?.viewProfile({ fid: 17979 });
                    }}
                  >
                    Find Post
                  </button>
                  {selectedGiftId === gift.id && (
                    <button
                      className="bg-white text-black rounded-md px-4 py-2 text-xs hover:bg-gray-200 transition-colors whitespace-nowrap"
                      onClick={() => {
                        if (selectedPost) {
                          sendGift(gift.id, selectedPost);
                        }
                      }}
                      disabled={!selectedPost}
                    >
                      Send
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 