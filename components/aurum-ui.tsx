"use client";

/**
 * AURUM UI — bespoke motion + interaction primitives for the RWAAN landing page.
 * Everything here is GPU-cheap (transform/opacity only) and respects
 * prefers-reduced-motion. No layout thrash on scroll.
 */

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  type HTMLMotionProps,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/* ------------------------------------------------------------------ *
 * Grain — a single fixed film-grain overlay. Static SVG noise, cheap. *
 * ------------------------------------------------------------------ */
export function Grain() {
  return <div className="au-grain" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ *
 * Spotlight — a warm glow that trails the cursor. One rAF-throttled   *
 * transform update on a fixed layer. Hidden on touch / reduced-motion.*
 * ------------------------------------------------------------------ */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.2;
    let cx = tx;
    let cy = ty;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = `translate3d(${cx - 300}px, ${cy - 300}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    el.style.opacity = "1";

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="au-spotlight" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ *
 * Reveal — scroll-into-view entrance with optional stagger delay.     *
 * ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = "div",
  id,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  id?: string;
}) {
  const MotionTag = motion[as] as typeof motion.div;

  // Reduced-motion users get static, always-visible content — no entrance,
  // no inline opacity:0 that could leave anything stranded.
  const [reduced, setReduced] = useState(false);
  useEffect(() => { setReduced(prefersReducedMotion()); }, []);

  if (reduced) {
    const Tag = as;
    return <Tag id={id} className={className}>{children}</Tag>;
  }

  // Single driver: whileInView with once:true. No competing `animate` prop —
  // mixing the two makes framer re-target mid-flight and flickers every
  // revealed element at once. IntersectionObserver is universally supported,
  // so no timeout fallback is needed.
  return (
    <MotionTag
      id={id}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/* ------------------------------------------------------------------ *
 * Magnetic — element drifts toward the cursor, springs back on leave. *
 * ------------------------------------------------------------------ */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 180, damping: 14, mass: 0.4 });
  const y = useSpring(0, { stiffness: 180, damping: 14, mass: 0.4 });

  // On touch devices the effect is invisible and wastes spring computation
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => { setIsTouch(isTouchDevice()); }, []);
  if (isTouch) return <div className={className} style={{ display: "inline-flex" }}>{children}</div>;

  const onMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: "inline-flex" }}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Tilt — 3D pointer tilt with a moving sheen. For the hero card.      *
 * ------------------------------------------------------------------ */
export function Tilt({
  children,
  className,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 150, damping: 18 });
  const ry = useSpring(0, { stiffness: 150, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  // 3-D tilt causes compositing artifacts on mobile and wastes battery
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => { setIsTouch(isTouchDevice()); }, []);
  if (isTouch) return <div className={className}>{children}</div>;

  const onMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rx.set((0.5 - py) * max * 2);
    ry.set((px - 0.5) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const reset = () => {
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * CountUp — animates a number when it scrolls into view.              *
 * ------------------------------------------------------------------ */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 1.6,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  // Track the last number we animated to, so periodic data refreshes tween
  // from the previous figure instead of snapping back to 0 and counting up
  // again — that reset-to-zero is a visible flicker on every refetch.
  const fromRef = useRef(0);
  const [display, setDisplay] = useState(() =>
    (0).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplay(
        value.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      );
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: [...EASE],
      onUpdate: (latest) => {
        fromRef.current = latest;
        setDisplay(
          latest.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
        );
      },
    });
    return () => controls.stop();
  }, [inView, value, decimals, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Marquee — seamless looping ticker. Pauses on hover.                 *
 * ------------------------------------------------------------------ */
export function Marquee({
  items,
  className,
}: {
  items: ReactNode[];
  className?: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div className={`au-marquee ${className ?? ""}`}>
      <div className="au-marquee-track">
        {doubled.map((item, i) => (
          <span className="au-marquee-item" key={i}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export type MotionDivProps = HTMLMotionProps<"div">;
