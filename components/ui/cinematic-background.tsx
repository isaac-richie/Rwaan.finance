"use client";

import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { motion } from "framer-motion";

export function CinematicBackground() {
    const isMobile = useIsMobile();

    // On mobile, we use a static or very simple gradient to ensure 0 lag.
    // On desktop, we can use slightly more complex moving gradients.

    if (isMobile) {
        return (
            <div className="fixed inset-0 -z-50 h-full w-full bg-[#020617]">
                {/* Static Gold/Onyx Ambient Glow for Mobile */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#F3BA2F]/10 via-[#0a0e1a]/50 to-transparent" />
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-[#F3BA2F]/5 to-transparent" />
                <FloatingBubbles isMobile={true} />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 -z-50 h-full w-full bg-[#020617] overflow-hidden">
            <FloatingBubbles isMobile={false} />
            {/* Animated Mesh Gradient for Desktop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage: `
            radial-gradient(circle at 15% 50%, rgba(243, 186, 47, 0.08), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(124, 58, 237, 0.05), transparent 25%)
          `
                }}
            />

            {/* Slow moving orb 1 */}
            <motion.div
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#F3BA2F]/10 blur-[100px]"
            />

            {/* Slow moving orb 2 */}
            <motion.div
                animate={{
                    x: [0, -30, 0],
                    y: [0, 50, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 5
                }}
                className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[#7c3aed]/10 blur-[100px]"
            />

            <FloatingBubbles isMobile={isMobile} />

            {/* Noise Texture Overlay (Optional, adds texture) */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
        </div>
    );
}

function FloatingBubbles({ isMobile }: { isMobile: boolean }) {
    // Mobile: 3 bubbles, CSS animation (lightweight)
    if (isMobile) {
        return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-32 h-32 rounded-full bg-[#F3BA2F]/5 blur-3xl animate-float-slow" />
                <div className="absolute top-[60%] right-[10%] w-24 h-24 rounded-full bg-[#7c3aed]/5 blur-xl animate-float-slower" />
                <div className="absolute bottom-[10%] left-[30%] w-40 h-40 rounded-full bg-[#10B981]/5 blur-3xl animate-float-slow" />
            </div>
        );
    }

    // Desktop: More bubbles, Framer Motion (richer)
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                        scale: 0.5 + Math.random() * 0.5,
                    }}
                    animate={{
                        y: [null, Math.random() * -100],
                        x: [null, (Math.random() - 0.5) * 50],
                    }}
                    transition={{
                        duration: 10 + Math.random() * 20,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                    }}
                    className={cn(
                        "absolute rounded-full blur-2xl opacity-20",
                        i % 2 === 0 ? "bg-[#F3BA2F]/10" : "bg-[#7c3aed]/10",
                        i % 3 === 0 ? "w-64 h-64" : "w-32 h-32"
                    )}
                />
            ))}
        </div>
    );
}
