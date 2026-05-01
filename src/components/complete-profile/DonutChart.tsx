interface DonutChartProps {
  percent: number;
  size?: number;
  stroke?: number;
}

export function DonutChart({ percent, size = 96, stroke = 9 }: DonutChartProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id="onboardingDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
        <circle
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <circle
          r={r}
          fill="none"
          stroke="url(#onboardingDonutGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </g>
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#f8fafc"
        style={{ fontSize: size * 0.16, fontWeight: 600 }}
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
