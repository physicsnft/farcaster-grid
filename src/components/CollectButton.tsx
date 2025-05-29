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
import { Interface } from "ethers";

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
  isAnimating: boolean;
}

export function CollectButton({
  onCollect,
  onError,
  isMinting,
  hasMintedCurrentArtwork,
  setHasMintedCurrentArtwork,
  isAnimating,
}: CollectButtonProps) {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoadingTxData, setIsLoadingTxData] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
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
              return await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
            } catch {
              if (i === maxRetries) throw new Error("Transaction confirmation timeout");
              await new Promise((res) => setTimeout(res, delay));
            }
          }
        };

        console.log("✅ Mint sent. Waiting for confirmation...");
        const receipt = await waitWithRetry(txHash);

        if (!receipt) throw new Error("Transaction receipt not found");

        setHasMintedCurrentArtwork(true);
        await refetchTotal();
        await refetchMine();

        const iface = new Interface(contractConfig.abi);

        for (const log of receipt.logs) {
          try {
            const parsedLog = iface.parseLog(log);
            if (parsedLog?.name === "Transfer") {
              const tokenId = parsedLog.args?.tokenId?.toString();
              if (tokenId) {
                setMintedTokenId(tokenId); // ✅ Trigger success popup
              }
              break;
            }
          } catch (e) {
            // skip unparseable logs
          }
        }

        onCollect();
      } catch (err: any) {
        console.error("❌ Mint failed:", err);
        const msg = err instanceof Error ? err.message : "Transaction failed";
        if (!isUserRejectionError(err)) onError(msg);
      } finally {
        setIsLoadingTxData(false);
      }
    } catch (err) {
      onError("Something unexpected went wrong.");
      setIsLoadingTxData(false);
    }
  };

  return (
    <div className="bg-card p-2 relative">
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
            disabled={isPending || mintLimitReached || hasMintedCurrentArtwork || isAnimating}
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

        {/* ✅ Success Popup */}
        {mintedTokenId && (
          <div className="mt-4 p-4 border rounded bg-green-100 text-green-800 text-center relative">
            <button
              onClick={() => setMintedTokenId(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <p className="mb-2 font-semibold">
              GRID #{mintedTokenId} successfully minted 🎉
            </p>
            <a
              href={`https://sepolia.basescan.org/nft/${contractAddress}/${mintedTokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Show NFT
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
