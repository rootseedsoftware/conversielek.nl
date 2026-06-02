// Circular progress-ring voor de UX-score. Vervangt het platte tekst-cijfer
// in de audit-resultaat-view met een visueel sterkere indicator.
//
// SVG met twee cirkels (rail + progress). Progress-color matched de
// severity-kleuren uit /lib/data/severity:
//   8-10 → groen   (goed)
//   6-7  → geel    (matig)
//   4-5  → oranje  (slecht)
//   0-3  → rood    (kritiek)
//
// Maatvoering: 160px default, schaalbaar via size-prop. Stroke 12px voor
// stevige aanwezigheid op de score-card. Animatie: 800ms ease-out bij
// mount via transition op stroke-dashoffset.

'use client';

import { useEffect, useState } from 'react';

type Props = {
  score: number; // 0-10
  size?: number; // pixels, default 160
  strokeWidth?: number; // default 12
};

function colorFor(score: number): { stroke: string; text: string } {
  if (score >= 8) return { stroke: '#059669', text: 'text-emerald-600' }; // emerald-600
  if (score >= 6) return { stroke: '#ca8a04', text: 'text-yellow-600' }; // yellow-600
  if (score >= 4) return { stroke: '#ea580c', text: 'text-orange-600' }; // orange-600
  return { stroke: '#dc2626', text: 'text-red-600' }; // red-600
}

export default function ScoreRing({ score, size = 160, strokeWidth = 12 }: Props) {
  const clamped = Math.max(0, Math.min(10, score));
  const colors = colorFor(clamped);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clamped / 10) * circumference;

  // Animate van leeg naar target — start op leeg (full offset) en
  // verschuif in een effect zodat CSS-transition triggert
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    // requestAnimationFrame zodat de eerste paint de start-state ziet
    // voordat we naar target gaan — anders geen animatie
    const raf = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(raf);
  }, [targetOffset]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Rail */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0" // slate-200
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      {/* Score in het midden */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-5xl font-bold leading-none ${colors.text}`}>
          {clamped.toFixed(1).replace('.0', '')}
        </div>
        <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">
          /10
        </div>
      </div>
    </div>
  );
}
