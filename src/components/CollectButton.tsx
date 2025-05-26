import { useState } from "react";
import {
  useAccount,
  useConnect,
  useWalletClient,
  useWriteContract,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { parseEther } from "viem";

import { contractConfig } from "../config";
import { uploadImageAndMetadata, exportCanvasAsBlob } from "../utils/uploadToIPFS";
import { Button } from "./Button";
import { AnimatedBorder } from "./AnimatedBorder";
import { isUserRejectionError } from "../lib/errors";
import { injected } from "wagmi/connectors";

type Address = `0x${string}`;

interface CollectButtonProps {
  onCollect: () => void;
  onError: (error: string | undefined) => void;
  isMinting: boolean;
  hasMintedCurrentArtwork: boolean;
  setHasMintedCurrentArtwork: (value: boolean) => void;
}

export function CollectButton({
  onCollect,
  onError,
  isMinting,
  hasMintedCurrentArtwork,
  setHasMintedCurrentArtwork,
}: CollectButtonProps) {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoadingTxData, setIsLoadingTxData] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const isPending = isLoadingTxData;

  const contractAddress: Address = contractConfig.address as Address;

  const {
    data: totalMinted,
    refetch: refetchTotal,
  } = useReadContract({
    address: contractAddress,
    abi: contractConfig.abi,
    functionName: "totalSupply",
  });

  const {
    data: mintedByMe,
    refetch: refetchMine,
  } = useReadContract({
    address: contractAddress,
    abi: contractConfig.abi,
    functionName: "mintedPerAddress",
    args: address ? [address as Address] : [],
  });

  const total = typeof totalMinted === "bigint" ? Number(totalMinted) : 0;
  const mine = typeof mintedByMe === "bigint" ? Number(mintedByMe) : 0;
  const mintProgress = Math.min(100, Math.floor((total / 1000) * 100));
  const mintLimitReached = total >= 1000 || mine >= 10;

  const handleClick = async () => {
    try {
      if (!isMinting) return;

      if (!isConnected || !address) {
        connect({ connector: injected() });
        return;
      }

      if (!walletClient) {
        onError("Wallet client not available.");
        return;
      }

      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        onError("Canvas not found.");
        return;
      }

      setIsLoadingTxData(true);

      try {
        const blob = await exportCanvasAsBlob(canvas);
        const metadataUrl = await uploadImageAndMetadata(blob);
        console.log("✅ Metadata uploaded:", metadataUrl);

        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: contractConfig.abi,
          functionName: "safeMint",
          args: [address as Address, metadataUrl],
          value: parseEther("0.001"),
          chainId: contractConfig.chain.id,
        });

        const waitWithRetry = async (txHash: string) => {
          const maxRetries = 10;
          const delay = 1500;
          for (let i = 1; i <= maxRetries; i++) {
            try {
              return await publicClient.getTransactionReceipt({ hash: txHash });
            } catch {
              if (i === maxRetries) throw new Error("Transaction confirmation timeout");
              await new Promise((res) => setTimeout(res, delay));
            }
          }
        };

        setIsConfirming(true);
        console.log("✅ Mint sent. Waiting for confirmation...");
        const receipt = await waitWithRetry(txHash);
        console.log("✅ Transaction confirmed:", receipt);
        setHasMintedCurrentArtwork(true);

        await refetchTotal();
        await refetchMine();

        const explorer = `https://base.testnet.thesuperscan.io/tx/${txHash}`;
        console.log(`✅ View NFT: ${explorer}`);

        onCollect();
      } catch (err) {
        console.error("❌ Mint failed:", err);
        const msg = err instanceof Error ? err.message : "Transaction failed";
        if (!isUserRejectionError(err)) onError(msg);
      } finally {
        setIsConfirming(false);
        setIsLoadingTxData(false);
      }
    } catch (err) {
      onError("Something unexpected went wrong.");
      setIsLoadingTxData(false);
    }
  };

  return (
    <div className="bg-card p-2">
      <div className="w-full max-w-md mx-auto">
        {mintLimitReached && (
          <p className="text-sm text-center text-red-500 mb-2">
            Minting limit reached
          </p>
        )}

        {isPending ? (
          <AnimatedBorder>
            <Button className="w-full" disabled>
              {isMinting ? "Collecting..." : "Processing..."}
            </Button>
          </AnimatedBorder>
        ) : (
          <Button
            className="w-full"
            onClick={handleClick}
            disabled={isPending || mintLimitReached || hasMintedCurrentArtwork}
          >
            {mintLimitReached
              ? "Limit Reached"
              : hasMintedCurrentArtwork
              ? "Already Minted"
              : !isConnected && isMinting
              ? "Connect Wallet"
              : isMinting
              ? "Collect"
              : "Unavailable"}
          </Button>
        )}

        {isConnected && isMinting && (
          <p className="text-sm text-center text-muted-foreground mb-2">
            This wallet minted {mine} of 10 artworks
          </p>
        )}

        {/* Mint Progress Bar */}
        <div className="mt-4 mb-3">
          <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-600 h-full transition-all duration-300"
              style={{ width: `${mintProgress}%` }}
            />
          </div>
          <p className="text-xs text-center mt-1 text-gray-600">
            Total: {total} of 1000 artworks minted
          </p>
        </div>
      </div>
    </div>
  );
}
