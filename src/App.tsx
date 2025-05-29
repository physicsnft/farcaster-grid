import { useState, useEffect, useRef } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { CollectButton } from "./components/CollectButton";
import { Button } from "./components/Button";
import GridCanvas from "./components/GridCanvas";

// interface
type GridCanvasHandle = {
  regenerate: () => void;
  getVisibleCanvasWidth?: () => number;
};

const App = () => {
  const [hasMintedCurrentArtwork, setHasMintedCurrentArtwork] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleCanvasWidth, setVisibleCanvasWidth] = useState(450);
  const canvasRef = useRef<GridCanvasHandle>(null); 

  const handleGenerate = () => {
    canvasRef.current?.regenerate();
    setHasMintedCurrentArtwork(false); // reset mint state on new generation
  };

  // move width logic out of render phase
  useEffect(() => {
    if (canvasRef.current?.getVisibleCanvasWidth) {
      setVisibleCanvasWidth(canvasRef.current.getVisibleCanvasWidth());
    }
  }, []);

  useEffect(() => {
    (async () => {
      await sdk.actions.ready();
    })();
  }, []);

  return (
    <main className="p-4">
      <div className="w-full min-h-screen flex flex-col items-center justify-center">
        <GridCanvas
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
            isAnimating={isAnimating}
          />
        </div>
      </div>
    </main>
  );
};

export default App;
