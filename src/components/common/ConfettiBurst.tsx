import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import "./ConfettiBurst.scss";

type CornerId = "tl" | "tr" | "bl" | "br";

type ConfettiBurstProps = {
  corners?: CornerId[];
  direction?: "inward" | "outward";
  count?: number;
  sizeMin?: number;
  sizeMax?: number;
  distMin?: number;
  distMax?: number;
  onComplete?: () => void;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  travelX: number;
  travelY: number;
  color: string;
  rotate: number;
  delay: number;
  width: number;
};

const CORNER_MAP: Record<CornerId, { x: number; y: number; dx: number; dy: number }> = {
  tl: { x: 0, y: 0, dx: 1, dy: 1 },
  tr: { x: 100, y: 0, dx: -1, dy: 1 },
  bl: { x: 0, y: 100, dx: 1, dy: -1 },
  br: { x: 100, y: 100, dx: -1, dy: -1 },
};

const GOLD_COLORS = [
  "var(--color-confetti-gold, #f6c945)",
  "var(--color-confetti-gold-deep, #d4a017)",
  "var(--color-confetti-gold-pale, #fbe7a1)",
];

const DURATION = 1.2;

function createParticles(
  corners: CornerId[],
  direction: "inward" | "outward",
  count: number,
  sizeMin: number,
  sizeMax: number,
  distMin: number,
  distMax: number
): Particle[] {
  const sign = direction === "outward" ? -1 : 1;
  return Array.from({ length: count }, (_, i) => {
    const corner = CORNER_MAP[corners[i % corners.length]];
    const distX = distMin + Math.random() * (distMax - distMin);
    const distY = distMin + Math.random() * (distMax - distMin);
    return {
      id: i,
      x: corner.x,
      y: corner.y,
      travelX: sign * corner.dx * distX,
      travelY: sign * corner.dy * distY,
      color: GOLD_COLORS[i % GOLD_COLORS.length],
      rotate: (Math.random() - 0.5) * 720,
      delay: Math.random() * 0.15,
      width: sizeMin + Math.random() * (sizeMax - sizeMin),
    };
  });
}

export default function ConfettiBurst({
  corners = ["tl", "tr", "bl", "br"],
  direction = "inward",
  count = 60,
  sizeMin = 14,
  sizeMax = 26,
  distMin = 120,
  distMax = 260,
  onComplete,
}: ConfettiBurstProps) {
  const reduce = useReducedMotion();
  const [particles] = useState(() =>
    createParticles(corners, direction, count, sizeMin, sizeMax, distMin, distMax)
  );

  useEffect(() => {
    if (reduce) {
      onComplete?.();
      return;
    }
    const t = window.setTimeout(() => onComplete?.(), (DURATION + 0.3) * 1000);
    return () => window.clearTimeout(t);
  }, [reduce, onComplete]);

  if (reduce) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="confetti-burst__piece"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.width,
            height: p.width * 0.4,
            backgroundColor: p.color,
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [1, 1, 0], x: p.travelX, y: p.travelY, rotate: p.rotate }}
          transition={{ duration: DURATION, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
