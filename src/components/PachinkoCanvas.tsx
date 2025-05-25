import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";

const gradients = {
  neon: ["#00ffe5", "#ff00ff", "#ffff00", "#00ff00"],
  sunset: ["#ff7e5f", "#feb47b", "#ff6e7f", "#bfe9ff"],
  cyberpunk: ["#ff00c8", "#00f0ff", "#faff00", "#ff6f00"],
};

const tintOptions = [
  { left: "rgba(0,255,255,0.25)", right: "rgba(255,0,255,0.25)" },
  { left: "rgba(255,0,0,0.25)", right: "rgba(0,255,0,0.25)" },
  { left: "rgba(0,128,255,0.25)", right: "rgba(255,255,0,0.25)" },
];

const backgroundOptions = ["#0d0221", "#ffffff"];

function interpolateColor(gradient, ratio) {
  const n = gradient.length - 1;
  const scaled = ratio * n;
  const i = Math.floor(scaled);
  const t = scaled - i;

  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  const rgbToHex = (r, g, b) =>
    `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

  const [r1, g1, b1] = hexToRgb(gradient[i]);
  const [r2, g2, b2] = hexToRgb(gradient[i + 1]);

  const r = r1 + (r2 - r1) * t;
  const g = g1 + (g2 - g1) * t;
  const b = b1 + (b2 - b1) * t;

  return rgbToHex(r, g, b);
}

const PachinkoCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const [visiblePaths, setVisiblePaths] = useState([]);
  const [selectedGradient, setSelectedGradient] = useState(gradients.neon);
  const [tints, setTints] = useState(tintOptions[0]);
  const [bgColor, setBgColor] = useState(backgroundOptions[0]);

  const numRows = 40;
  const numBalls = 200;
  const stepSize = 30;
  const totalCols = 40;
  const visibleCols = 30;
  const canvasWidth = 900;
  const canvasHeight = 1200;
  const startColRange = [-totalCols / 2, totalCols / 2];

  const simulateBall = (startX) => {
    const path = [{ x: startX, y: 0, direction: 0 }];
    for (let row = 1; row <= numRows; row++) {
      const last = path[path.length - 1];
      const direction = Math.random() < 0.5 ? -1 : 1;
      const newX = last.x + direction * stepSize;
      const newY = last.y + stepSize;
      path.push({ x: newX, y: newY, direction });
    }
    return path;
  };

  const regenerate = () => {
    // Notify parent that animation is starting
    props.onAnimationStart?.();
    
    const gradientNames = Object.keys(gradients);
    const randomGradient = gradients[gradientNames[Math.floor(Math.random() * gradientNames.length)]];
    const randomTints = tintOptions[Math.floor(Math.random() * tintOptions.length)];
    const randomBackground = backgroundOptions[Math.floor(Math.random() * backgroundOptions.length)];

    setSelectedGradient(randomGradient);
    setTints(randomTints);
    setBgColor(randomBackground);

    const allPaths = Array.from({ length: numBalls }, () => {
      const startX =
        (Math.floor(Math.random() * (startColRange[1] - startColRange[0] + 1)) + startColRange[0]) * stepSize;
      return simulateBall(startX);
    });

    const centerOffset = ((totalCols - visibleCols) / 2) * stepSize;
    const paths = allPaths.map((path) =>
      path.map((p) => ({ x: p.x - centerOffset + canvasWidth / 2, y: p.y, direction: p.direction }))
    );

    let index = 0;
    setVisiblePaths([]);
    const interval = setInterval(() => {
      setVisiblePaths((prev) => {
        if (index < paths.length) {
          const next = [...prev, paths[index]];
          index++;
          return next;
        } else {
          clearInterval(interval);
          props.onAnimationEnd?.();  // Notify parent when done
          return prev;
        }
      });
    }, 200);
  };

  useEffect(() => {
    regenerate();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    visiblePaths.forEach((path) => {
      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const avgY = (p1.y + p2.y) / 2;
        const baseRatio = avgY / canvasHeight;
        const baseColor = interpolateColor(selectedGradient, baseRatio);

        const tint = p2.direction === -1 ? tints.left : tints.right;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = tint;
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 10;
        ctx.shadowColor = tint;
        ctx.stroke();
      }
    });
  }, [visiblePaths, selectedGradient, tints]);

  useImperativeHandle(ref, () => ({
    regenerate,
    getVisibleCanvasWidth: () => canvasWidth * 0.4,
  }));

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{ 
        backgroundColor: bgColor, 
        borderRadius: "12px", 
        width: canvasWidth*0.4, 
        height: canvasHeight*0.4 
        }}
    />
  );
});

export default PachinkoCanvas;
