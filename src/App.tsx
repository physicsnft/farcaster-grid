import { useState, useEffect, useRef } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { CollectButton, setHasMintedCurrentArtwork } from "./components/CollectButton";
import { Button } from "./components/Button";
import { AnimatedBorder } from "./components/AnimatedBorder";
import PachinkoCanvas from "./components/PachinkoCanvas";

const App = () => {
  const [hasMintedCurrentArtwork, setHasMintedCurrentArtwork] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef(null);

  const handleGenerate = () => {
    canvasRef.current?.regenerate();
  };
  
  const visibleCanvasWidth = canvasRef.current?.getVisibleCanvasWidth?.() ?? 450;

  useEffect(() => {
    (async () => {
      await sdk.actions.ready();
    })();
  }, []);

  return (
    <main className="p-4">
      <div className="w-full min-h-screen flex flex-col items-center justify-center">
        {/* render the canvas*/}
        <PachinkoCanvas
          ref={canvasRef}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationEnd={() => setIsAnimating(false)}
        />

        <div className="bg-card p-4">
          <div className="bg-card p-2">
            <div className="w-full max-w-md mx-auto" style={{ width: `${visibleCanvasWidth}px` }}>
              <Button
                onClick={handleGenerate}
                className="w-full"
                disabled={isAnimating}
              >
                {isAnimating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          <CollectButton
            isMinting={true}
            onCollect={() => {
              console.log("Mint successful");
              setHasMintedCurrentArtwork(true);
            }}
            onError={(err) => console.error("Mint failed", err)}
            hasMintedCurrentArtwork={hasMintedCurrentArtwork}
            setHasMintedCurrentArtwork={setHasMintedCurrentArtwork}
          />
        </div>
      </div>
    </main>
  );
};

export default App;
