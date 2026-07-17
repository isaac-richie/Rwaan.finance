"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/hooks/use-is-mobile";

export function Section({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const isMobile = useIsMobile();
  return (
    <motion.section
      id={id}
      initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-col gap-5 sm:gap-6", className)}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="text-[13px] leading-relaxed text-white/35 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </motion.section>
  );
}
