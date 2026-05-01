import { useEffect, useRef } from "react";

interface BlobLayer {
  xRatio: number;
  yRatio: number;
  radiusX: number;
  radiusY: number;
  driftX: number;
  driftY: number;
  pulseSpeed: number;
  pulsePhase: number;
  alpha: number;
  color: string;
}

interface GeometricShape {
  xRatio: number;
  yRatio: number;
  size: number;
  sides: 3 | 4 | 6;
  rotation: number;
  rotationSpeed: number;
  driftX: number;
  driftY: number;
}

interface ConstellationDot {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

interface ConnectionLine {
  from: number;
  to: number;
  bornAt: number;
}

interface AnimatedBar {
  ratioX: number;
  width: number;
  minHeight: number;
  maxHeight: number;
  phase: number;
  speed: number;
}

const AURORA_COLORS = ["#6366f1", "#7c3aed", "#4f46e5", "#818cf8", "#a78bfa"] as const;
const SHAPE_STROKE = "rgba(99,102,241,0.12)";
const DOT_COLOR = "rgba(165,180,252,0.25)";
const LINE_COLOR = "rgba(165,180,252,0.45)";
const BAR_COLOR = "rgba(99,102,241,0.08)";

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createPoints(sides: 3 | 4 | 6, size: number): Array<[number, number]> {
  if (sides === 4) {
    return [
      [0, -size],
      [size, 0],
      [0, size],
      [-size, 0],
    ];
  }

  const points: Array<[number, number]> = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    points.push([Math.cos(angle) * size, Math.sin(angle) * size]);
  }
  return points;
}

export default function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let lastConnectionTs = 0;
    const activeLines: ConnectionLine[] = [];

    const blobs: BlobLayer[] = AURORA_COLORS.map((color) => ({
      xRatio: randomInRange(0.15, 0.85),
      yRatio: randomInRange(0.1, 0.8),
      radiusX: randomInRange(220, 360),
      radiusY: randomInRange(180, 320),
      driftX: randomInRange(-22, 22),
      driftY: randomInRange(-20, 20),
      pulseSpeed: randomInRange(0.16, 0.42),
      pulsePhase: randomInRange(0, Math.PI * 2),
      alpha: randomInRange(0.06, 0.12),
      color,
    }));

    const shapes: GeometricShape[] = Array.from({ length: 8 }, () => {
      const sidesList: Array<3 | 4 | 6> = [3, 4, 6];
      return {
        xRatio: randomInRange(0.1, 0.9),
        yRatio: randomInRange(0.08, 0.85),
        size: randomInRange(22, 52),
        sides: sidesList[Math.floor(Math.random() * sidesList.length)] ?? 3,
        rotation: randomInRange(0, Math.PI * 2),
        rotationSpeed: randomInRange(-0.2, 0.2),
        driftX: randomInRange(-16, 16),
        driftY: randomInRange(-14, 14),
      };
    });

    const dots: ConstellationDot[] = Array.from({ length: 60 }, () => ({
      x: randomInRange(0, 1),
      y: randomInRange(0, 1),
      radius: randomInRange(1, 2),
      vx: randomInRange(-0.00004, 0.00004),
      vy: randomInRange(-0.00004, 0.00004),
    }));

    const bars: AnimatedBar[] = Array.from({ length: 16 }, (_, index) => ({
      ratioX: (index + 0.5) / 16,
      width: 26,
      minHeight: randomInRange(28, 48),
      maxHeight: randomInRange(80, 180),
      phase: randomInRange(0, Math.PI * 2),
      speed: randomInRange(0.4, 1.05),
    }));

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const connectNearbyDots = (nowMs: number): void => {
      const maxAttempts = 28;
      for (let i = 0; i < maxAttempts; i += 1) {
        const a = Math.floor(Math.random() * dots.length);
        const b = Math.floor(Math.random() * dots.length);
        if (a === b) {
          continue;
        }
        const dotA = dots[a];
        const dotB = dots[b];
        if (!dotA || !dotB) {
          continue;
        }
        const dx = (dotA.x - dotB.x) * width;
        const dy = (dotA.y - dotB.y) * height;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          activeLines.push({ from: a, to: b, bornAt: nowMs });
          return;
        }
      }
    };

    const draw = (timestamp: number): void => {
      const time = timestamp * 0.001;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#07070f";
      ctx.fillRect(0, 0, width, height);

      blobs.forEach((blob, index) => {
        const pulse = 1 + Math.sin(time * blob.pulseSpeed + blob.pulsePhase) * 0.1;
        const x = width * blob.xRatio + Math.sin(time * 0.12 + index) * blob.driftX;
        const y = height * blob.yRatio + Math.cos(time * 0.11 + index) * blob.driftY;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
        ctx.beginPath();
        ctx.fillStyle = blob.color;
        ctx.globalAlpha = blob.alpha;
        ctx.ellipse(0, 0, blob.radiusX, blob.radiusY, time * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      shapes.forEach((shape, index) => {
        const cx = width * shape.xRatio + Math.sin(time * 0.14 + index) * shape.driftX;
        const cy = height * shape.yRatio + Math.cos(time * 0.13 + index) * shape.driftY;
        const rotation = shape.rotation + time * shape.rotationSpeed;
        const points = createPoints(shape.sides, shape.size);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.beginPath();
        points.forEach(([px, py], pointIndex) => {
          if (pointIndex === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.closePath();
        ctx.strokeStyle = SHAPE_STROKE;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.restore();
      });

      dots.forEach((dot) => {
        dot.x += dot.vx;
        dot.y += dot.vy;

        if (dot.x < 0 || dot.x > 1) {
          dot.vx *= -1;
          dot.x = Math.max(0, Math.min(1, dot.x));
        }
        if (dot.y < 0 || dot.y > 1) {
          dot.vy *= -1;
          dot.y = Math.max(0, Math.min(1, dot.y));
        }

        ctx.beginPath();
        ctx.fillStyle = DOT_COLOR;
        ctx.arc(dot.x * width, dot.y * height, dot.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if (timestamp - lastConnectionTs >= 3000) {
        lastConnectionTs = timestamp;
        connectNearbyDots(timestamp);
      }

      for (let i = activeLines.length - 1; i >= 0; i -= 1) {
        const line = activeLines[i];
        if (!line) {
          continue;
        }
        const life = 1300;
        const age = timestamp - line.bornAt;
        if (age > life) {
          activeLines.splice(i, 1);
          continue;
        }
        const a = dots[line.from];
        const b = dots[line.to];
        if (!a || !b) {
          activeLines.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, 1 - age / life);
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.strokeStyle = LINE_COLOR;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const baseline = height;
      bars.forEach((bar) => {
        const wave = (Math.sin(time * bar.speed + bar.phase) + 1) / 2;
        const h = bar.minHeight + wave * (bar.maxHeight - bar.minHeight);
        const barWidth = Math.max(12, width / 24);
        const x = width * bar.ratioX - barWidth / 2;
        const y = baseline - h;
        const radius = Math.min(10, barWidth / 2, h / 2);
        ctx.beginPath();
        ctx.fillStyle = BAR_COLOR;
        ctx.moveTo(x, baseline);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, baseline);
        ctx.closePath();
        ctx.fill();
      });

      rafId = window.requestAnimationFrame(draw);
    };

    resize();
    rafId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
