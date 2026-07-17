"use client";

import { useEffect } from "react";

export function PerformanceMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let frameCount = 0;
    let lastTime = performance.now();
    let slowFrames = 0;

    const measure = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      frameCount++;

      if (delta > 16.67) {
        slowFrames++;
        if (slowFrames % 10 === 0) {
          console.warn(`Performance: ${slowFrames} slow frames (${delta.toFixed(2)}ms)`);
        }
      }

      if (frameCount >= 300) {
        const fps = (frameCount / ((currentTime - lastTime) / 1000)).toFixed(1);
        console.log(`FPS: ${fps} | Slow frames: ${slowFrames}`);
        frameCount = 0;
        slowFrames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measure);
    };

    const rafId = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return null;
}
