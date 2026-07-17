"use client";

import { useEffect } from "react";

/**
 * Pauses expensive animations during scroll for better performance
 * Adds/removes 'is-scrolling' class to document.documentElement
 */
export function ScrollPerformanceOptimizer() {
    useEffect(() => {
        let scrollTimer: NodeJS.Timeout | null = null;
        let rafId: number | null = null;
        let isScrolling = false;

        const handleScroll = () => {
            if (rafId) return;

            rafId = requestAnimationFrame(() => {
                if (!isScrolling) {
                    isScrolling = true;
                    document.documentElement.classList.add("is-scrolling");
                }

                if (scrollTimer) {
                    clearTimeout(scrollTimer);
                }

                scrollTimer = setTimeout(() => {
                    isScrolling = false;
                    document.documentElement.classList.remove("is-scrolling");
                }, 100);

                rafId = null;
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimer) clearTimeout(scrollTimer);
            if (rafId) cancelAnimationFrame(rafId);
            document.documentElement.classList.remove("is-scrolling");
        };
    }, []);

    return null;
}
