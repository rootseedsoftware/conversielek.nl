// Apple touch-icon voor iOS-homescreen (180x180). Next 16 conventie:
// bestand op /apple-icon.tsx wordt automatisch als apple-touch-icon
// gelinkt in <head>. Krijgt op iOS afgeronde hoeken vanzelf; we
// vullen wel de volledige tegel zodat er geen rand-artefacten
// verschijnen bij toevoegen aan het beginscherm.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 180, height: 180 };

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 120,
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
