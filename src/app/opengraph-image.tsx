// Dynamische Open Graph-image (1200x630). Next 16 conventie:
// bestand op /opengraph-image.tsx wordt automatisch geserveerd op
// /opengraph-image en meta-tags (via layout.tsx openGraph.images)
// verwijzen daar naar. Puur SVG-basis via ImageResponse — geen externe
// fonts of assets vereist zodat het altijd werkt en niet stukt bij
// een CDN-uitval.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Conversielek — Nederlandse Webshop UX Audit';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #fff7ed 0%, #fef2f2 50%, #fff1f2 100%)',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decoratieve accent-blobs */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -80,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
            opacity: 0.12,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -140,
            left: -100,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
            opacity: 0.1,
            display: 'flex',
          }}
        />

        {/* Brand-mark + naam */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            C
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
            Conversielek
          </div>
        </div>

        {/* Hoofdclaim */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: 900,
            }}
          >
            Ontdek waar je{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              conversie weglekt
            </span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#475569',
              marginTop: 24,
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            AI-audit voor Nederlandse webshops · iDEAL, AVG, microcopy — in 30 seconden
          </div>
        </div>

        {/* Bullet-row als proof-strip */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            alignItems: 'center',
            fontSize: 22,
            color: '#334155',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
              }}
            />
            30-50 issues per audit
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#f97316',
                display: 'flex',
              }}
            />
            Concrete NL microcopy
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#8b5cf6',
                display: 'flex',
              }}
            />
            Impact in euro&apos;s
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
