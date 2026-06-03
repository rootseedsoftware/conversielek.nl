// Sprint 7 — Inline SVG sparkline van score-tijdreeks.
//
// Pure SVG: geen Chart.js / Recharts dependency, geen runtime-overhead,
// crisp op alle resoluties. Toont:
//   - lijn-pad door de score-punten
//   - dot per audit-moment
//   - gradient-fill onder de lijn voor diepte
//
// Schaalt automatisch op basis van min/max score in de reeks +
// padding. Bij 1 datapunt wordt alleen de dot getoond.
//
// Coördinaten-stelsel: viewBox 100×40 zodat de SVG schaalt zonder
// distortion. Geen units in styles — alles relatief.

import { useId } from 'react';

export default function ScoreSparkline({
  series,
  width = 120,
  height = 40,
  stroke = 'currentColor',
  fillOpacity = 0.15,
}: {
  series: { score: number; timestamp: number }[];
  width?: number;
  height?: number;
  stroke?: string;
  fillOpacity?: number;
}) {
  const gradientId = useId();

  if (series.length === 0) return null;

  // Single point — toon alleen een dot
  if (series.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 40"
        aria-label="Eén audit — geen trend"
        className="overflow-visible"
      >
        <circle cx="50" cy="20" r="3" fill={stroke} />
      </svg>
    );
  }

  // Bereken viewBox-coördinaten. y wordt omgekeerd (SVG y groeit naar beneden).
  const scores = series.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  // Padding zodat lijn nooit tegen rand kleeft, en bij flat-line nog steeds visueel midden
  const range = Math.max(0.5, maxScore - minScore);
  const yPad = 4; // px in viewBox-eenheden
  const xPad = 2;
  const innerW = 100 - 2 * xPad;
  const innerH = 40 - 2 * yPad;

  const points = series.map((p, i) => {
    const x = xPad + (i / (series.length - 1)) * innerW;
    const y = yPad + (1 - (p.score - minScore) / range) * innerH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  // Area pad onder lijn: dezelfde punten + sluit af naar baseline
  const lastX = points[points.length - 1].x.toFixed(2);
  const firstX = points[0].x.toFixed(2);
  const baseY = (40 - yPad).toFixed(2);
  const areaPath = `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-label={`Score-trend over ${series.length} audits`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={fillOpacity * 2} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={stroke} />
      ))}
    </svg>
  );
}
