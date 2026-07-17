"use client";

import { useEffect } from "react";

/**
 * Adds a short-lived `is-scrolling` class to the body to pause heavy
 * animations and filters during active scroll, reducing flicker.
 */
export function ScrollStabilityManager() {
  useEffect(() => {
    let timeoutId: number | null = null;

    const handleScroll = () => {
      if (typeof document === "undefined") return;
      document.body.classList.add("is-scrolling");
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        document.body.classList.remove("is-scrolling");
      }, 140);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
