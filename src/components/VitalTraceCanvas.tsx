import React, { useEffect, useRef } from 'react';

interface VitalTraceCanvasProps {
  id: string;
  data: number[];
  color: string;
  unit: string;
  minRange?: number;
  hasAnomaly?: boolean;
  anomalyLabel?: string;
}

export const VitalTraceCanvas: React.FC<VitalTraceCanvasProps> = ({
  id,
  data,
  color,
  hasAnomaly,
  anomalyLabel
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, width, height);

      // Draw subtle background medical monitor grid on clean light canvas
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.lineWidth = 0.75;
      const gridSpacingX = 28;
      const gridSpacingY = 16;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSpacingX) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSpacingY) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (data.length < 2) return;

      const slice = data.slice(-70);
      const minVal = Math.min(...slice);
      const maxVal = Math.max(...slice);
      const range = Math.max(maxVal - minVal, 1.5);

      // Draw trace line
      ctx.beginPath();
      slice.forEach((val, i) => {
        const x = (i / (slice.length - 1)) * width;
        const normalized = (val - minVal) / range;
        const y = height - normalized * (height - 14) - 7;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw current leading pulse dot at latest point
      const lastX = width;
      const lastVal = slice[slice.length - 1];
      const lastNorm = (lastVal - minVal) / range;
      const lastY = height - lastNorm * (height - 14) - 7;

      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // If active anomaly, draw visual flag marker at the head
      if (hasAnomaly) {
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(`▲ ${anomalyLabel || 'ANOMALY'}`, width - 85, 14);
      }
    };

    render();

    const handleResize = () => {
      render();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [data, color, hasAnomaly, anomalyLabel]);

  return (
    <div className="relative w-full h-16 mt-2 rounded-md bg-[#ffffff] overflow-hidden border border-[#e2e8f0]">
      <canvas ref={canvasRef} id={id} className="w-full h-full block" />
    </div>
  );
};
