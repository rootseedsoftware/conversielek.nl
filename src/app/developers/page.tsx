// M7 — /developers: publieke API-docs pagina.
//
// Server Component, simpel Markdown-achtige structuur. Geen versionering
// nodig voor MVP (één endpoint). Voorbeelden gerendered als <pre><code>.

import Link from 'next/link';
import { ShoppingCart, Code, Zap, Key, Shield, AlertCircle } from 'lucide-react';
import { company } from '@/lib/data/company';
import { flowTypes } from '@/lib/data/flow-types';

export const metadata = {
  title: 'API-docs — Conversielek',
  description: 'Trigger audits programmatisch via REST API. Bearer-auth met API-keys.',
};

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {company.tradeName}
            </span>
          </Link>
          <Link
            href="/account/api-keys"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition"
          >
            <Key className="w-3.5 h-3.5" />
            Beheer keys
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            <Code className="w-3.5 h-3.5" />
            REST API v1
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight">
            {company.tradeName} API
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-2xl">
            Trigger audits vanuit je eigen tooling, CI/CD-pipeline of dashboard.
            Bearer-token auth, JSON in/uit. Eén endpoint.
          </p>
        </header>

        {/* Quick start */}
        <Section icon={<Zap className="w-5 h-5 text-orange-500" />} title="Quick start">
          <p className="mb-4">
            Drie stappen om je eerste programmatic audit te triggeren:
          </p>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span>
                Maak een API-key aan op{' '}
                <Link
                  href="/account/api-keys"
                  className="text-orange-600 dark:text-orange-400 underline font-semibold"
                >
                  /account/api-keys
                </Link>
                . Bewaar de plain key — wordt éénmaal getoond.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span>
                Base64-encode 1-5 screenshots van je webshop (PNG/JPG/WebP).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span>
                POST naar <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/api/v1/audits</code> met Bearer-header en JSON-payload.
              </span>
            </li>
          </ol>
        </Section>

        {/* Auth */}
        <Section icon={<Shield className="w-5 h-5 text-orange-500" />} title="Authenticatie">
          <p className="mb-3">
            Alle requests vereisen een Bearer-token in de Authorization-header.
            Plain keys hebben format <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">cl_&lt;32 hex chars&gt;</code>.
          </p>
          <CodeBlock language="http">{`Authorization: Bearer cl_a1b2c3d4e5f6...`}</CodeBlock>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <li>· Keys zijn revocable via{' '}
              <Link
                href="/account/api-keys"
                className="text-orange-600 dark:text-orange-400 underline"
              >
                /account/api-keys
              </Link>
              .
            </li>
            <li>· Hashing: SHA-256 server-side. Plain key wordt nooit opgeslagen.</li>
            <li>· Per-key usage-tracking (last_used_at + count).</li>
          </ul>
        </Section>

        {/* Endpoint */}
        <Section icon={<Code className="w-5 h-5 text-orange-500" />} title="POST /api/v1/audits">
          <p className="mb-3">
            Triggert een nieuwe audit. Synchroon: response na succesvolle AI-call
            (kan 30-90s duren). Output wordt opgeslagen in je account.
          </p>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Request body
          </h3>
          <CodeBlock language="json">{`{
  "flowType": "checkout",
  "webshopName": "Mijn Webshop",
  "webshopUrl": "https://mijnwebshop.nl",
  "productCategory": "fashion",
  "targetAudience": "vrouwen 25-45 jaar",
  "currentChallenge": "hoge cart abandonment in checkout",
  "screenshots": [
    {
      "name": "step1.png",
      "type": "image/png",
      "base64": "iVBORw0KGgoAAAANS..."
    }
  ]
}`}</CodeBlock>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Veld-beschrijvingen
          </h3>
          <FieldTable>
            <Field name="flowType" type="string" required>
              Welke flow. Eén van: <code className="font-mono text-xs">{flowTypes.map((f) => f.value).join(', ')}</code>
            </Field>
            <Field name="webshopName" type="string" required>
              Naam van de webshop (zichtbaar in rapport).
            </Field>
            <Field name="webshopUrl" type="string" optional>
              Volledige URL inclusief https://.
            </Field>
            <Field name="productCategory" type="string" required>
              Productcategorie (bv. &quot;fashion&quot;, &quot;electronics&quot;).
            </Field>
            <Field name="targetAudience" type="string" optional>
              Korte beschrijving doelgroep. Maakt audit relevanter.
            </Field>
            <Field name="currentChallenge" type="string" optional>
              Wat probeert je shop op te lossen? (1-2 zinnen).
            </Field>
            <Field name="screenshots" type="array" required>
              1-5 screenshots als base64. Elke item: <code>{`{ name?, type, base64 }`}</code>.
            </Field>
          </FieldTable>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Response (200 OK)
          </h3>
          <CodeBlock language="json">{`{
  "ok": true,
  "auditId": "550e8400-e29b-41d4-a716-446655440000",
  "result": {
    "overall_score": 6.8,
    "summary": "Sterke productpagina's, maar checkout verliest vertrouwen...",
    "trust_score": 7.2,
    "issues": [...],
    "quick_wins": [...],
    "nl_specific_checks": {...},
    "nl_deep_checks": [...],
    "avg_deep_checks": [...]
  }
}`}</CodeBlock>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Foutcodes
          </h3>
          <FieldTable>
            <Field name="401" type="AUTH_MISSING / AUTH_INVALID">
              Bearer-header ontbreekt of key ongeldig/ingetrokken.
            </Field>
            <Field name="400" type="BAD_FLOW / BAD_INPUT / NO_SCREENSHOTS">
              Validation. Zie <code>error</code>-veld voor detail.
            </Field>
            <Field name="413" type="BODY_TOO_LARGE">
              Request body &gt;25 MB. Comprimeer screenshots.
            </Field>
            <Field name="502" type="AI_ERROR / AI_PARSE_FAIL">
              AI-provider down of returnde non-JSON. Retry na 30s.
            </Field>
            <Field name="500" type="NO_AI_KEY">
              Server-misconfiguratie. Mail support.
            </Field>
          </FieldTable>
        </Section>

        {/* Code voorbeelden */}
        <Section icon={<Code className="w-5 h-5 text-orange-500" />} title="Voorbeelden">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
            cURL
          </h3>
          <CodeBlock language="bash">{`curl -X POST https://${company.domain}/api/v1/audits \\
  -H "Authorization: Bearer cl_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "flowType": "checkout",
    "webshopName": "Mijn Shop",
    "productCategory": "fashion",
    "screenshots": [
      { "type": "image/png", "base64": "'"$(base64 -i screenshot.png)"'" }
    ]
  }'`}</CodeBlock>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Node.js (fetch)
          </h3>
          <CodeBlock language="javascript">{`import fs from 'node:fs/promises';

const screenshot = await fs.readFile('screenshot.png');
const base64 = screenshot.toString('base64');

const res = await fetch('https://${company.domain}/api/v1/audits', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer cl_YOUR_KEY_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    flowType: 'checkout',
    webshopName: 'Mijn Shop',
    productCategory: 'fashion',
    screenshots: [{ type: 'image/png', base64 }],
  }),
});

const { ok, auditId, result } = await res.json();
console.log('Score:', result.overall_score);`}</CodeBlock>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Python (requests)
          </h3>
          <CodeBlock language="python">{`import base64
import requests

with open('screenshot.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

r = requests.post(
    'https://${company.domain}/api/v1/audits',
    headers={'Authorization': 'Bearer cl_YOUR_KEY_HERE'},
    json={
        'flowType': 'checkout',
        'webshopName': 'Mijn Shop',
        'productCategory': 'fashion',
        'screenshots': [{'type': 'image/png', 'base64': b64}],
    },
)
data = r.json()
print('Score:', data['result']['overall_score'])`}</CodeBlock>
        </Section>

        {/* Notes */}
        <Section icon={<AlertCircle className="w-5 h-5 text-orange-500" />} title="Belangrijk om te weten">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Audits zijn synchroon</strong> — verwacht 30-90s response-tijd. Configureer
              je client-side timeout op minstens 120s.
            </li>
            <li>
              <strong>Rate-limit</strong>: gedeelde Anthropic-quota geldt. Bij 429-responses:
              exponential backoff.
            </li>
            <li>
              <strong>Output</strong> wordt opgeslagen in je account en is zichtbaar via{' '}
              <Link href="/" className="text-orange-600 dark:text-orange-400 underline">
                de webapp
              </Link>
              . Goed voor team-collab en historie-tracking.
            </li>
            <li>
              <strong>API-versionering</strong>: huidig: v1. Breaking changes krijgen v2 op aparte
              path. Geen sunset-policy voor v1 voorlopig.
            </li>
            <li>
              <strong>Support</strong>: mail{' '}
              <a
                href={`mailto:${company.email.support}`}
                className="text-orange-600 dark:text-orange-400 underline"
              >
                {company.email.support}
              </a>{' '}
              voor bugs of feature-requests.
            </li>
          </ul>
        </Section>
      </article>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 text-slate-700 dark:text-slate-300 leading-relaxed">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function CodeBlock({ children, language }: { children: string; language: string }) {
  return (
    <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-xl p-4 overflow-x-auto text-xs font-mono leading-relaxed border border-slate-800">
      <code aria-label={`${language} voorbeeld`}>{children}</code>
    </pre>
  );
}

function FieldTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
      {children}
    </div>
  );
}

function Field({
  name,
  type,
  required,
  optional,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 flex flex-wrap items-start gap-3">
      <div className="flex flex-col gap-1 min-w-[140px] flex-shrink-0">
        <code className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          {name}
        </code>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {type}
          </span>
          {required && (
            <span className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-bold">
              required
            </span>
          )}
          {optional && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              optional
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
        {children}
      </div>
    </div>
  );
}
