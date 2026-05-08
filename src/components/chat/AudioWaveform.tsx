"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

type AudioWaveformProps = {
  isPlaying?: boolean;
  className?: string;
};

export function AudioWaveform({ className, isPlaying = false }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    let frame = 0;
    let animationFrame = 0;

    function draw() {
      if (!context || !canvas) {
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = isPlaying ? "rgba(0, 229, 255, 0.9)" : "rgba(148, 163, 184, 0.45)";
      context.lineWidth = 2;
      context.beginPath();

      for (let x = 0; x < width; x += 4) {
        const amplitude = isPlaying
          ? Math.sin((x + frame) * 0.08) * 12 + Math.sin((x + frame) * 0.17) * 6
          : 0;
        const y = height / 2 + amplitude;

        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
      frame += 2;
      animationFrame = window.requestAnimationFrame(draw);
    }

    draw();

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  return (
    <canvas
      aria-hidden="true"
      className={cn("h-8 w-28 rounded-full bg-white/5", className)}
      height={36}
      ref={canvasRef}
      width={132}
    />
  );
}
