import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface MagneticCardProps {
    children: ReactNode;
    className?: string;
    intensity?: number;
}

/**
 * Premium magnetic card effect - tilts toward mouse on hover
 * GPU-accelerated with perspective transform
 * Desktop only - no effect on mobile
 */
export function MagneticCard({
    children,
    className,
    intensity = 15
}: MagneticCardProps) {
    const isMobile = useIsMobile();
    const cardRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState("");

    // Mobile optimization: Return static container without event listeners
    if (isMobile) {
        return (
            <div className={className}>
                {children}
            </div>
        );
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation based on mouse position
        const rotateX = -((y - centerY) / centerY) * intensity;
        const rotateY = ((x - centerX) / centerX) * intensity;

        setTransform(
            `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
        );
    };

    const handleMouseLeave = () => {
        setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn("transition-transform duration-200 ease-out", className)}
            style={{
                transform,
                transformStyle: "preserve-3d",
            }}
        >
            {children}
        </div>
    );
}
