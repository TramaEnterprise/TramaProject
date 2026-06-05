import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import "./ConfettiBurst.scss";

type ConfettiBurstProps = {
  /** Número de partículas. Por defecto 28 (sutil pero notable). */
  count?: number;
  /** Se llama una vez al terminar la animación, para que el padre lo desmonte. */
  onComplete?: () => void;
};

type Corner = { x: number; y: number; dx: number; dy: number };

// Cuatro esquinas; dx/dy apuntan hacia el interior de la pantalla.
const CORNERS: Corner[] = [
  { x: 0, y: 0, dx: 1, dy: 1 },
  { x: 100, y: 0, dx: -1, dy: 1 },
  { x: 0, y: 100, dx: 1, dy: -1 },
  { x: 100, y: 100, dx: -1, dy: -1 },
];

const GOLD_COLORS = [
  "var(--color-confetti-gold)",
  "var(--color-confetti-gold-deep)",
  "var(--color-confetti-gold-pale)",
];

const DURATION = 1.1;

export default function ConfettiBurst({ count = 28, onComplete }: ConfettiBurstProps) {
  const reduce = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const corner = CORNERS[i % CORNERS.length];
        const spread = 18 + Math.random() * 32;
        return {
          id: i,
          corner,
          color: GOLD_COLORS[i % GOLD_COLORS.length],
          travelX: corner.dx * spread,
          travelY: corner.dy * spread * 0.6 + 35,
          rotate: (Math.random() - 0.5) * 720,
          delay: Math.random() * 0.15,
          width: 6 + Math.random() * 6,
        };
      }),
    [count]
  );

  // Fallback de desmontaje (y caso reduced-motion).
  useEffect(() => {
    if (reduce) {
      onComplete?.();
      return;
    }
    const t = window.setTimeout(() => onComplete?.(), (DURATION + 0.3) * 1000);
    return () => window.clearTimeout(t);
  }, [reduce, onComplete]);

  if (reduce) return null;

  return createPortal(
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="confetti-burst__piece"
          style={{
            left: `${p.corner.x}vw`,
            top: `${p.corner.y}vh`,
            width: p.width,
            height: p.width * 0.4,
            backgroundColor: p.color,
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: `${p.travelX}vw`,
            y: `${p.travelY}vh`,
            rotate: p.rotate,
          }}
          transition={{ duration: DURATION, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>,
    document.body
  );
}
