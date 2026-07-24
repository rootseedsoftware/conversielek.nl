// Dynamische favicon voor Conversielek. Next 16 conventie: icon.tsx
// wordt automatisch geserveerd op /icon en gelinkt in <head>. Vervangt
// de fallback favicon.ico voor moderne browsers.
//
// Design: brand-gradient (oranje → rood) met "C" letter. Passt bij de
// hero-mockup en logo op de site zelf.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 32, height: 32 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 22,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
