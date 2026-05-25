'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Upload,
  X,
  ArrowRight,
  Clock,
  Shield,
  Trash2,
  ChevronRight,
  Copy,
  Check,
  Printer,
  ShoppingCart,
  Home,
  TrendingUp,
  Euro,
  ChevronDown,
  HelpCircle,
  Award,
  Filter,
  Lightbulb,
  CreditCard,
  MessageSquare,
  Library,
} from 'lucide-react';

import {
  runAudit,
  AuditFailure,
  type AuditResult,
  type AuditIssue,
  type Screenshot,
} from '@/lib/claude';
import { storage } from '@/lib/storage';
import {
  saveAudit as persistAudit,
  loadHistory as fetchHistory,
  deleteAudit as removeAudit,
  updateResolved as persistResolved,
  loadResolved as fetchResolved,
  type HistoryItem,
} from '@/lib/audit-store';
import { flowTypes, type FlowType } from '@/lib/data/flow-types';
import { productCategories } from '@/lib/data/categories';
import { severityConfig } from '@/lib/data/severity';
import { faqs } from '@/lib/data/faqs';
import { sampleAudit } from '@/lib/data/sample-audit';
import { buildAuditPrompt } from '@/lib/prompt';
import { exportAuditAsPdf } from '@/lib/pdf-export';
import { compressScreenshot } from '@/lib/image-compress';

// ---- Local types -----------------------------------------------------------

type View = 'landing' | 'audit' | 'history' | 'report';

type Toast = { message: string; type: 'success' | 'error' };

type SeverityFilter = AuditIssue['severity'] | 'all';

// ---- Toast ----------------------------------------------------------------
//
// Boven App gedefinieerd zodat React/Next niet bij elke render een nieuw
// component-type creëert (react-hooks/static-components rule).

function ToastNotification({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in-up">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {toast.type === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-600" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        )}
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
    </div>
  );
}

// ---- Component -------------------------------------------------------------

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [flowType, setFlowType] = useState<FlowType['value']>('homepage');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [webshopUrl, setWebshopUrl] = useState('');
  const [webshopName, setWebshopName] = useState('');
  const [productCategory, setProductCategory] = useState('fashion');
  const [targetAudience, setTargetAudience] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [resolvedIssues, setResolvedIssues] = useState<Record<number, boolean>>({});
  const [auditCounter, setAuditCounter] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [currentAuditKey, setCurrentAuditKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') =>
    setToast({ message, type });

  const loadCounter = async () => {
    try {
      const result = await storage.get('audit-counter', true);
      if (result?.value) setAuditCounter(parseInt(result.value, 10) || 0);
    } catch {
      // Geen counter nog — start vanaf 0. Geen fake sociaal bewijs.
      setAuditCounter(0);
    }
  };

  const incrementCounter = async () => {
    try {
      const newCount = auditCounter + 1;
      setAuditCounter(newCount);
      await storage.set('audit-counter', newCount.toString(), true);
    } catch {
      /* silent */
    }
  };

  const loadHistory = async () => {
    try {
      const items = await fetchHistory();
      setHistory(items);
    } catch {
      /* no history yet */
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveAudit = async (auditData: AuditResult) => {
    try {
      const key = await persistAudit({
        flowType,
        webshopName: webshopName || webshopUrl || 'Onbekende webshop',
        webshopUrl,
        productCategory,
        email: email || null,
        audit: auditData,
      });
      setCurrentAuditKey(key);
      setResolvedIssues({});
      await loadHistory();
      await incrementCounter();
      return key;
    } catch (e) {
      console.error('Failed to save audit:', e);
    }
  };

  const toggleIssueResolved = async (issueIndex: number) => {
    const newResolved = { ...resolvedIssues, [issueIndex]: !resolvedIssues[issueIndex] };
    setResolvedIssues(newResolved);
    if (currentAuditKey && currentAuditKey !== 'demo') {
      try {
        await persistResolved(currentAuditKey, newResolved);
      } catch {
        /* silent */
      }
    }
  };

  const deleteAuditFromHistory = async (key: string) => {
    try {
      await removeAudit(key);
      await loadHistory();
      showToast('Audit verwijderd');
    } catch {
      /* silent */
    }
  };

  // ---- File upload --------------------------------------------------------

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    if (screenshots.length + fileArray.length > 5) {
      setError('Maximaal 5 screenshots per audit.');
      return;
    }
    const newScreenshots: Screenshot[] = [];
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        setError('Alleen afbeeldingen.');
        continue;
      }
      // Raw input mag tot 15 MB — daarna wordt 't browser-side gecomprimeerd
      // naar JPEG ~900 KB voordat 't naar de server gaat (Vercel Hobby
      // heeft een 4.5 MB body-limit). Geen waarschuwing voor de user.
      if (file.size > 15 * 1024 * 1024) {
        setError(`${file.name} is groter dan 15MB.`);
        continue;
      }
      try {
        const compressed = await compressScreenshot(file);
        newScreenshots.push({
          name: file.name,
          type: compressed.type,
          base64: compressed.base64,
          preview: `data:${compressed.type};base64,${compressed.base64}`,
        });
      } catch (e) {
        console.error('Compressie mislukt:', e);
        setError(`${file.name}: comprimeren mislukt. Probeer een ander bestand.`);
      }
    }
    setScreenshots([...screenshots, ...newScreenshots]);
    if (newScreenshots.length > 0) setError('');
  };

  const removeScreenshot = (index: number) =>
    setScreenshots(screenshots.filter((_, i) => i !== index));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  // ---- Audit run ---------------------------------------------------------

  const handleRunAudit = async () => {
    setError('');
    setAudit(null);

    if (screenshots.length === 0) {
      setError('Upload minimaal 1 screenshot van je webshop.');
      return;
    }

    setLoading(true);

    try {
      const prompt = buildAuditPrompt({
        flowType,
        webshopName,
        webshopUrl,
        productCategory,
        targetAudience,
        currentChallenge,
      });

      const parsed = await runAudit({ prompt, screenshots });

      setAudit(parsed);
      setSeverityFilter('all');
      setCategoryFilter('all');
      setView('report');
      await saveAudit(parsed);
      showToast('Audit succesvol gegenereerd');
    } catch (err) {
      console.error(err);
      if (err instanceof AuditFailure) {
        setError(err.message);
      } else {
        setError('Er ging iets mis. Probeer het opnieuw of upload kleinere screenshots.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDemoAudit = () => {
    setAudit(sampleAudit);
    setCurrentAuditKey('demo');
    setResolvedIssues({});
    setView('report');
  };

  // ---- Helpers -----------------------------------------------------------

  const downloadPDF = () => {
    if (!audit) return;
    exportAuditAsPdf({ audit, flowType, webshopName, productCategory });
    showToast('PDF wordt voorbereid');
  };

  const copyAuditAsText = async () => {
    if (!audit) return;
    let text = `CONVERSIELEK AUDIT — ${webshopName || 'Webshop'}\n${
      flowTypes.find((f) => f.value === flowType)?.label
    }\n\nScore: ${audit.overall_score}/10\n\n${audit.summary}\n\nCONVERSIE-IMPACT:\n${
      audit.conversion_impact_estimate
    }\n\nSTERKE PUNTEN:\n${audit.strengths.map((s) => `• ${s}`).join('\n')}\n\nISSUES (${
      audit.issues.length
    }):\n`;
    audit.issues.forEach((issue, i) => {
      text += `\n${i + 1}. ${issue.title} [${severityConfig[issue.severity]?.label}]\n   ${
        issue.description
      }\n   💶 ${issue.conversion_impact}\n   → ${issue.recommendation}\n`;
      if (issue.microcopy_suggestion) text += `   ✏️ ${issue.microcopy_suggestion}\n`;
    });
    text += `\nQUICK WINS:\n${audit.quick_wins.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Rapport gekopieerd');
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const resetForm = () => {
    setAudit(null);
    setScreenshots([]);
    setWebshopUrl('');
    setWebshopName('');
    setTargetAudience('');
    setCurrentChallenge('');
    setEmail('');
    setError('');
    setResolvedIssues({});
    setCurrentAuditKey(null);
    setView('audit');
  };

  const getFilteredIssues = () => {
    if (!audit) return [] as Array<AuditIssue & { originalIndex: number }>;
    return audit.issues
      .map((issue, originalIndex) => ({ ...issue, originalIndex }))
      .filter((issue) => severityFilter === 'all' || issue.severity === severityFilter)
      .filter((issue) => categoryFilter === 'all' || issue.category === categoryFilter)
      .sort((a, b) => severityConfig[a.severity].order - severityConfig[b.severity].order);
  };

  const getCategories = () =>
    audit ? Array.from(new Set(audit.issues.map((i) => i.category))) : [];
  const getResolvedCount = () => Object.values(resolvedIssues).filter(Boolean).length;

  // ---- Effects -----------------------------------------------------------
  // Onder de helpers gehouden zodat de "variable-before-declared" lint-rule
  // niet klaagt over loadHistory/loadCounter aanroepen.

  useEffect(() => {
    // Async IIFE: setState gebeurt in microtask, niet sync in effect body
    // (voldoet aan react-hooks/set-state-in-effect rule van Next 16).
    void (async () => {
      await loadHistory();
      await loadCounter();
    })();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ============================================================
  // LANDING
  // ============================================================
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <ToastNotification toast={toast} />
        <nav className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900 leading-tight">Conversielek</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  Voor Nederlandse webshops
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button
                  onClick={() => setView('history')}
                  className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  Mijn audits ({history.length})
                </button>
              )}
              <button
                onClick={() => setView('audit')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Start audit
              </button>
            </div>
          </div>
        </nav>

        <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="text-base">🇳🇱</span>
            Gemaakt voor Nederlandse webshops
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">
            Ontdek waar je
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              conversie weglekt
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload screenshots van je webshop en krijg een conversie-gerichte audit met concrete
            Nederlandse microcopy, vergeleken met bol.com, Coolblue en Wehkamp.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={() => setView('audit')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
            >
              Start gratis audit
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={loadDemoAudit}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 px-6 py-3.5 rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Bekijk voorbeeld-audit
            </button>
          </div>
          {auditCounter > 0 && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-slate-700">
                {auditCounter.toLocaleString('nl-NL')}
              </span>{' '}
              audits uitgevoerd
            </div>
          )}
        </section>

        <section className="border-y border-slate-100 bg-slate-50/50 py-6">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { icon: '🇳🇱', label: 'Nederlandse focus' },
                { icon: '💶', label: 'Conversie-impact in €' },
                { icon: '🏆', label: 'NL-benchmarks' },
                { icon: '🛡️', label: 'AVG-check inbegrepen' },
              ].map((u, i) => (
                <div key={i} className="text-sm">
                  <div className="text-2xl mb-1">{u.icon}</div>
                  <div className="font-medium text-slate-700">{u.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12 border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-center text-xs text-slate-500 mb-5 uppercase tracking-wider font-medium">
              Onze audits zijn gebaseerd op
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-slate-500">
              {[
                'Steve Krug',
                'Baymard Institute',
                'Nielsen Norman Group',
                'WCAG 2.1',
                'Thuiswinkel.org',
                'UX Magazine',
                'Autoriteit Persoonsgegevens',
              ].map((src, i, arr) => (
                <React.Fragment key={src}>
                  <span className="text-sm font-semibold">{src}</span>
                  {i < arr.length - 1 && (
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center text-xs text-slate-400 mt-4 italic">
              Elk advies in onze audits bevat traceerbare bronvermelding
            </p>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">
              Audit elke flow afzonderlijk
            </h2>
            <p className="text-center text-slate-600 mb-12">
              Elke flow heeft eigen heuristieken — focus op wat het meest kost
            </p>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {flowTypes.map((flow) => {
                const Icon = flow.icon;
                return (
                  <button
                    key={flow.value}
                    onClick={() => {
                      setFlowType(flow.value);
                      setView('audit');
                    }}
                    className="group p-6 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{flow.label}</h3>
                    <p className="text-xs text-slate-500 mb-3">{flow.desc}</p>
                    <div className="text-xs text-orange-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Start hier <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-20 border-y border-slate-100">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">
              Wat krijg je in het rapport?
            </h2>
            <p className="text-center text-slate-600 mb-12">
              Geen UX-jargon. Concrete acties die conversie verhogen.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: TrendingUp,
                  title: 'Conversie-impact in % en €',
                  desc: "Niet alleen 'verbeter dit', maar 'kost je naar schatting 12% conversie'. Webshop-taal.",
                },
                {
                  icon: MessageSquare,
                  title: 'Nederlandse microcopy-suggesties',
                  desc: "Concrete voorstellen: 'In winkelmandje' vs 'Add to cart'. Per issue waar relevant.",
                },
                {
                  icon: Award,
                  title: 'Vergelijking met NL-benchmarks',
                  desc: 'Wat doet bol.com, Coolblue of Wehkamp anders? Concrete voorbeelden uit jouw branche.',
                },
                {
                  icon: CreditCard,
                  title: 'iDEAL & achteraf betalen check',
                  desc: 'Zijn jouw betaalmethoden zichtbaar genoeg? Mist achteraf betalen via Klarna/Riverty?',
                },
                {
                  icon: Shield,
                  title: 'Vertrouwen & keurmerken',
                  desc: 'Thuiswinkel Waarborg, Kiyoh, Trustpilot — staan ze prominent? Bouwen ze conversie op?',
                },
                {
                  icon: Library,
                  title: 'Traceerbare bronvermelding',
                  desc: 'Elk advies onderbouwd met de bron: Baymard onderzoek, Krug-principes, Thuiswinkel statistieken, AP-richtlijnen.',
                },
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-orange-200 transition-colors"
                  >
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{feat.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">
              Waarom niet Baymard of Krux?
            </h2>
            <p className="text-center text-slate-600 mb-12">
              Internationale tools missen wat Nederlandse webshops nodig hebben
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">Feature</th>
                    <th className="text-center p-4 font-semibold text-orange-600">Conversielek</th>
                    <th className="text-center p-4 font-semibold text-slate-500">Baymard / Krux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(
                    [
                      { f: 'Volledig Nederlandstalig', us: true, them: false },
                      { f: 'iDEAL & Klarna/Riverty checks', us: true, them: false },
                      { f: 'Thuiswinkel Waarborg validatie', us: true, them: false },
                      { f: 'NL microcopy-suggesties', us: true, them: false },
                      { f: 'AVG cookie-banner check', us: true, them: false },
                      { f: 'Vergelijking met bol.com / Coolblue', us: true, them: false },
                      { f: 'Conversie-impact in EUR', us: true, them: 'partial' },
                      { f: 'Internationale benchmarks', us: false, them: true },
                    ] as Array<{ f: string; us: boolean; them: boolean | 'partial' }>
                  ).map((row, i) => (
                    <tr key={i}>
                      <td className="p-4 text-slate-700">{row.f}</td>
                      <td className="text-center p-4">
                        {row.us ? (
                          <Check className="w-5 h-5 text-emerald-600 inline" />
                        ) : (
                          <X className="w-5 h-5 text-slate-300 inline" />
                        )}
                      </td>
                      <td className="text-center p-4">
                        {row.them === true ? (
                          <Check className="w-5 h-5 text-emerald-600 inline" />
                        ) : row.them === 'partial' ? (
                          <span className="text-xs text-slate-500">deels</span>
                        ) : (
                          <X className="w-5 h-5 text-slate-300 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 border-t border-slate-100">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-50 rounded-xl mb-4">
                <HelpCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Veelgestelde vragen</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition text-left"
                  >
                    <span className="font-medium text-slate-900">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                        expandedFaq === i ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === i && (
                    <div className="px-5 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-orange-500 to-red-500 py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <Lightbulb className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Klaar om te ontdekken waar je conversie weglekt?
            </h2>
            <p className="text-orange-50 mb-8 text-lg">
              Geen account nodig. 30 seconden tot je eerste audit.
            </p>
            <button
              onClick={() => setView('audit')}
              className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-3.5 rounded-xl font-semibold transition inline-flex items-center gap-2 shadow-lg"
            >
              Start je gratis audit
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <footer className="border-t border-slate-100 py-8">
          <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
            Conversielek.nl · Nederlandse Webshop UX Audit · Gemaakt voor de NL-markt
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================
  // HISTORY
  // ============================================================
  if (view === 'history') {
    return (
      <div className="min-h-screen bg-slate-50">
        <ToastNotification toast={toast} />
        <nav className="border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <button onClick={() => setView('landing')} className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900">Conversielek</span>
            </button>
            <button
              onClick={() => setView('audit')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Nieuwe audit
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mijn audits</h1>
          <p className="text-slate-600 mb-8">
            Je eerder uitgevoerde audits — gegroepeerd per webshop voor vergelijking.
          </p>

          {historyLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nog geen audits</h3>
              <p className="text-slate-600 mb-6">
                Start je eerste audit en zie hier je geschiedenis.
              </p>
              <button
                onClick={() => setView('audit')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium"
              >
                Start eerste audit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const flow = flowTypes.find((f) => f.value === item.flowType);
                const FlowIcon = flow?.icon || Home;
                return (
                  <div
                    key={item.key}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:border-orange-300 transition group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={async () => {
                          setAudit(item.audit);
                          setCurrentAuditKey(item.key);
                          setFlowType(item.flowType);
                          setWebshopName(item.webshopName);
                          try {
                            const resolved = await fetchResolved(item.key);
                            setResolvedIssues(resolved);
                          } catch {
                            setResolvedIssues({});
                          }
                          setView('report');
                        }}
                        className="flex-1 text-left flex items-center gap-4"
                      >
                        <div className={`text-3xl font-bold ${getScoreColor(item.audit.overall_score)}`}>
                          {item.audit.overall_score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {item.webshopName}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <FlowIcon className="w-3 h-3" />
                            <span>{flow?.label}</span>
                            <span>·</span>
                            <span>
                              {new Date(item.timestamp).toLocaleString('nl-NL', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition" />
                      </button>
                      <button
                        onClick={() => deleteAuditFromHistory(item.key)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // AUDIT FORM
  // ============================================================
  if (view === 'audit') {
    const selectedFlow = flowTypes.find((f) => f.value === flowType);
    const FlowIcon = selectedFlow?.icon || Home;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
        <ToastNotification toast={toast} />
        <nav className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <button onClick={() => setView('landing')} className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900">Conversielek</span>
            </button>
            {history.length > 0 && (
              <button
                onClick={() => setView('history')}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                Mijn audits ({history.length})
              </button>
            )}
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Audit je webshop</h1>
            <p className="text-slate-600">
              Kies de flow die je wilt auditen — elke flow heeft eigen heuristieken.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                1. Welke flow wil je auditen?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {flowTypes.map((flow) => {
                  const Icon = flow.icon;
                  const isSelected = flowType === flow.value;
                  return (
                    <button
                      key={flow.value}
                      onClick={() => setFlowType(flow.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mb-1.5 ${
                          isSelected ? 'text-orange-600' : 'text-slate-500'
                        }`}
                      />
                      <div className="font-medium text-slate-900 text-sm">{flow.label}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                <div className="flex items-start gap-2 text-xs">
                  <FlowIcon className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-slate-700 mb-1">
                      Wat we checken voor {selectedFlow?.label}:
                    </div>
                    <div className="text-slate-600">{selectedFlow?.heuristics.join(' · ')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                2. Upload screenshots van je {selectedFlow?.label.toLowerCase()}{' '}
                <span className="text-slate-400 font-normal">— max 5</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-xl p-10 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-orange-50/50"
              >
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Upload className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Klik om te uploaden of sleep bestanden hier
                </p>
                <p className="text-xs text-slate-500">
                  Tip: upload zowel desktop als mobile views voor compleetste audit
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>
              {screenshots.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {screenshots.map((screenshot, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshot.preview}
                        alt={screenshot.name}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        onClick={() => removeScreenshot(i)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                3. Over je webshop
              </label>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1.5">Webshop-naam</label>
                  <input
                    type="text"
                    value={webshopName}
                    onChange={(e) => setWebshopName(e.target.value)}
                    placeholder="bv. Bloemen.nl"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1.5">
                    URL <span className="text-slate-400">(optioneel)</span>
                  </label>
                  <input
                    type="url"
                    value={webshopUrl}
                    onChange={(e) => setWebshopUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1.5">Productcategorie</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition bg-white text-sm"
                  >
                    {productCategories.map((pc) => (
                      <option key={pc.value} value={pc.value}>
                        {pc.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1.5">
                    Doelgroep <span className="text-slate-400">(optioneel)</span>
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="bv. vrouwen 25-45 jr"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">
                  Wat is je grootste uitdaging?{' '}
                  <span className="text-slate-400">(optioneel — helpt voor scherpere audit)</span>
                </label>
                <input
                  type="text"
                  value={currentChallenge}
                  onChange={(e) => setCurrentChallenge(e.target.value)}
                  placeholder="bv. veel cart abandonment, lage conversie op mobile..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                />
              </div>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
              <label className="flex items-start gap-2 text-sm font-medium text-slate-700 mb-2">
                <span className="text-base">📬</span>
                <div>
                  Ontvang rapport ook per e-mail
                  <span className="block text-xs text-slate-500 font-normal mt-0.5">
                    Optioneel — handig om later terug te kijken
                  </span>
                </div>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm bg-white"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleRunAudit}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Screenshots worden geanalyseerd...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Audit mijn {selectedFlow?.label.toLowerCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // REPORT
  // ============================================================
  if (!audit) return null;

  const filteredIssues = getFilteredIssues();
  const categories = getCategories();
  const resolvedCount = getResolvedCount();
  const totalIssues = audit.issues?.length || 0;
  const progressPercent = totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 0;
  const flow = flowTypes.find((f) => f.value === flowType);

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastNotification toast={toast} />
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center flex-wrap gap-2">
          <button onClick={() => setView('landing')} className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">Conversielek</span>
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copyAuditAsText}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Kopieer
                </>
              )}
            </button>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
            >
              <Printer className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={resetForm}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Nieuwe audit
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          {flow && <flow.icon className="w-4 h-4 text-orange-600" />}
          <span className="font-medium text-slate-900">{webshopName || 'Webshop'}</span>
          <span>·</span>
          <span>{flow?.label} audit</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-6">
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                UX Score
              </div>
              <div className={`text-7xl font-bold ${getScoreColor(audit.overall_score)} leading-none`}>
                {audit.overall_score}
                <span className="text-3xl text-slate-300 font-semibold">/10</span>
              </div>
            </div>
            <div className="flex-1 min-w-[300px]">
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-slate-700 leading-relaxed">{audit.summary}</p>
              </div>
            </div>
          </div>

          {totalIssues > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-900">Voortgang</span>
                  <span className="text-slate-500">
                    {resolvedCount} van {totalIssues} opgelost
                  </span>
                </div>
                <span
                  className={`text-sm font-bold ${
                    progressPercent === 100 ? 'text-emerald-600' : 'text-slate-700'
                  }`}
                >
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {audit.conversion_impact_estimate && (
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 p-8 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">
                  Geschatte conversie-impact
                </div>
                <p className="text-lg text-slate-800 font-medium leading-relaxed">
                  {audit.conversion_impact_estimate}
                </p>
              </div>
            </div>
          </div>
        )}

        {audit.trust_assessment && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Vertrouwen</h2>
                  <p className="text-xs text-slate-500">
                    Hoe goed bouwt deze webshop vertrouwen op?
                  </p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(audit.trust_score)}`}>
                {audit.trust_score}
                <span className="text-base text-slate-300">/10</span>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed">{audit.trust_assessment}</p>
          </div>
        )}

        {audit.nl_specific_checks && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">🇳🇱</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nederlandse webshop-checks</h2>
                <p className="text-xs text-slate-500">Specifiek voor de NL-markt</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(
                [
                  { key: 'ideal_visible', icon: '💳', label: 'iDEAL zichtbaarheid' },
                  { key: 'afterpay_klarna', icon: '🛍️', label: 'Achteraf betalen' },
                  { key: 'free_shipping_communication', icon: '🚚', label: 'Gratis verzending' },
                  { key: 'trust_badges', icon: '🛡️', label: 'Trust badges' },
                  { key: 'gdpr_cookies', icon: '🍪', label: 'AVG / Cookies' },
                ] as const
              ).map((check, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{check.icon}</span>
                    <span className="font-semibold text-slate-900 text-sm">{check.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {audit.nl_specific_checks[check.key]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {audit.dutch_benchmarks && audit.dutch_benchmarks.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Wat NL-benchmarks beter doen</h2>
                <p className="text-xs text-slate-500">
                  Concrete voorbeelden uit succesvolle Nederlandse webshops
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {audit.dutch_benchmarks.map((b, i) => (
                <div
                  key={i}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white"
                >
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="font-semibold text-slate-900 text-sm">{b.what}</div>
                    <div className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {b.example_shop}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{b.why}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {audit.strengths && audit.strengths.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Sterke punten</h2>
            </div>
            <ul className="space-y-2">
              {audit.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-lg border border-emerald-100"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />
                  <span className="text-slate-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gevonden issues</h2>
              <p className="text-xs text-slate-500">
                {filteredIssues.length === totalIssues
                  ? `${totalIssues} verbeterpunten`
                  : `${filteredIssues.length} van ${totalIssues} getoond`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">Alle severities</option>
              <option value="critical">Alleen Kritiek</option>
              <option value="high">Alleen Hoog</option>
              <option value="medium">Alleen Middel</option>
              <option value="low">Alleen Laag</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">Alle categorieën</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {(severityFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Wis filters
              </button>
            )}
          </div>

          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Geen issues met de huidige filters.
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const config = severityConfig[issue.severity] || severityConfig.medium;
                const Icon = config.icon;
                const isResolved = resolvedIssues[issue.originalIndex];
                return (
                  <div
                    key={issue.originalIndex}
                    className={`border rounded-xl p-5 transition-all ${
                      isResolved
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : `${config.bg} ${config.border}`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleIssueResolved(issue.originalIndex)}
                        className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                          isResolved
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-slate-300 hover:border-emerald-500 bg-white'
                        }`}
                      >
                        {isResolved && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
                          <div className="flex-1">
                            <h3
                              className={`font-semibold text-slate-900 mb-2 text-base leading-tight ${
                                isResolved ? 'line-through' : ''
                              }`}
                            >
                              {issue.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold text-white ${config.badge}`}
                              >
                                {config.label}
                              </span>
                              <span className="text-slate-600 font-medium">{issue.category}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm mb-3 leading-relaxed">
                          {issue.description}
                        </p>
                        {issue.conversion_impact && (
                          <div className="bg-orange-100/60 rounded-lg p-3 mb-2 border-l-2 border-orange-500">
                            <div className="text-xs font-bold text-orange-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                              <Euro className="w-3 h-3" /> Conversie-impact
                            </div>
                            <p className="text-slate-800 text-sm leading-relaxed">
                              {issue.conversion_impact}
                            </p>
                          </div>
                        )}
                        <div className="bg-white/80 rounded-lg p-3 mb-2 border border-slate-200">
                          <div className="text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                            Aanbeveling
                          </div>
                          <p className="text-slate-800 text-sm leading-relaxed">
                            {issue.recommendation}
                          </p>
                        </div>
                        {issue.microcopy_suggestion && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-2 border-l-2 border-blue-500">
                            <div className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider">
                              ✏️ Microcopy-suggestie
                            </div>
                            <p className="text-slate-800 text-sm leading-relaxed italic">
                              {issue.microcopy_suggestion}
                            </p>
                          </div>
                        )}
                        {issue.sources && issue.sources.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-3 mb-2 border border-slate-200">
                            <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-1">
                              <Library className="w-3 h-3" /> Bronvermelding
                            </div>
                            <div className="space-y-1.5">
                              {issue.sources.map((source, sIdx) => {
                                const typeConfig: Record<
                                  string,
                                  { label: string; color: string }
                                > = {
                                  research: {
                                    label: 'Onderzoek',
                                    color: 'bg-purple-100 text-purple-700',
                                  },
                                  book: { label: 'Boek', color: 'bg-amber-100 text-amber-700' },
                                  statistic: {
                                    label: 'Statistiek',
                                    color: 'bg-emerald-100 text-emerald-700',
                                  },
                                  guideline: {
                                    label: 'Richtlijn',
                                    color: 'bg-blue-100 text-blue-700',
                                  },
                                  nl_specific: {
                                    label: '🇳🇱 NL-specifiek',
                                    color: 'bg-orange-100 text-orange-700',
                                  },
                                };
                                const cfg = typeConfig[source.type] || typeConfig.research;
                                return (
                                  <div key={sIdx} className="text-xs">
                                    <div className="flex items-start gap-2 flex-wrap">
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md font-medium text-[10px] ${cfg.color} flex-shrink-0`}
                                      >
                                        {cfg.label}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800">
                                          {source.name}
                                        </div>
                                        {source.detail && (
                                          <div className="text-slate-600 mt-0.5 leading-relaxed">
                                            {source.detail}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-500 italic mt-3">
                          Principe: <span className="font-medium">{issue.principle}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {audit.quick_wins && audit.quick_wins.length > 0 && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Quick Wins</h2>
                <p className="text-xs text-slate-500">
                  Verbeteringen binnen 1 uur die direct conversie kunnen verhogen
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {audit.quick_wins.map((win, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </div>
                  <span className="text-slate-700 text-sm leading-relaxed mt-0.5">{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-slate-400">
          Conversielek.nl · Nederlandse Webshop UX Audit · Gegenereerd op{' '}
          {new Date().toLocaleString('nl-NL')}
        </footer>
      </div>
    </div>
  );
}
