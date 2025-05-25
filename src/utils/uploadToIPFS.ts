// src/utils/uploadToIPFS.ts
import { ThirdwebStorage } from "@thirdweb-dev/storage";

const storage = new ThirdwebStorage({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  secretKey: import.meta.env.VITE_THIRDWEB_SECRET_KEY,
});

export function exportCanvasAsBlob(canvas: HTMLCanvasElement, scale = 1): Promise<Blob> {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width * scale;
  exportCanvas.height = canvas.height * scale;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // Upscale and draw
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  return new Promise((resolve, reject) => {
    exportCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert canvas to blob"));
    }, "image/png");
  });
}

export async function uploadImageAndMetadata(blob: Blob): Promise<string> {
  try {
    // Use a File directly instead of Buffer
    const file = new File([blob], "walk.png", { type: "image/png" });

    // Upload image to IPFS
    const imageUri = await storage.upload(file, {
      uploadWithGatewayUrl: true,
      uploadWithoutDirectory: true,
    });

    // Create metadata
    const metadata = {
      name: "Random Walk NFT",
      description: "A unique generative art piece.",
      image: imageUri,
    };

    const metadataUri = await storage.upload(metadata);
    console.log("Uploaded metadata:", metadataUri);

    return metadataUri;
  } catch (err) {
    console.error("Failed to upload to Thirdweb storage:", err);
    throw err;
  }
}
