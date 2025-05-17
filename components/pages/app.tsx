import { SafeAreaContainer } from "@/components/safe-area-container";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import dynamic from "next/dynamic";
import { CartProvider } from "@/context/CartContext";

const Demo = dynamic(() => import("@/components/Home"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function Home() {
  const { isWalletAvailable, isFrameAvailable, error } = useMiniAppContext();
  return (
    <SafeAreaContainer>
      <CartProvider>
        <Demo />
      </CartProvider>
    </SafeAreaContainer>
  );
}
