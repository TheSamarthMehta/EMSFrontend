import { useMemo } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  delay: number;
  duration: number;
}

const COLORS = ["#6366f1", "#14b8a6", "#f472b6", "#fbbf24", "#38bdf8", "#a78bfa", "#34d399"];

interface ConfettiBurstProps {
  active: boolean;
}

export function ConfettiBurst({ active }: ConfettiBurstProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 72 }, (_, id) => ({
      id,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      rotate: Math.random() * 720 - 360,
      color: COLORS[id % COLORS.length] ?? "#6366f1",
      delay: Math.random() * 0.15,
      duration: 1.8 + Math.random() * 0.7,
    }));
  }, []);

  if (!active) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: p.x * 8,
            y: p.y * 6 + 120,
            rotate: p.rotate,
            scale: 0.4,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
          className="absolute h-2 w-3 rounded-[2px]"
          style={{ backgroundColor: p.color, left: "50%", top: "42%" }}
        />
      ))}
    </div>
  );
}
