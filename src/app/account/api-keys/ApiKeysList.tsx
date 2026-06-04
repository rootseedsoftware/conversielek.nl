'use client';

// M7 — API-keys management: lijst + create + revoke.
//
// Create-modal toont de plain key EENMALIG. Daarna alleen prefix in de
// lijst. Copy-to-clipboard knop bij creatie. Bij sluiten van modal: key
// is verloren — user moet revoken + nieuwe maken als ze 'm kwijt zijn.

import { useState, useTransition } from 'react';
import {
  Copy, CheckCircle2, X, Trash2, AlertTriangle, Plus, Loader2, Key,
  EyeOff, Activity,
} from 'lucide-react';
import { createApiKey, revokeApiKey, type ApiKey } from '@/lib/api-keys';

type CreatedKey = { plainKey: string; meta: ApiKey };

export default function ApiKeysList({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      setError('Vul een naam in.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createApiKey(newKeyName);
      if (r.ok) {
        setKeys((ks) => [r.keyMeta, ...ks]);
        setCreatedKey({ plainKey: r.plainKey, meta: r.keyMeta });
        setNewKeyName('');
        setCreating(false);
      } else {
        setError(r.error);
      }
    });
  };

  const handleRevoke = (id: string) => {
    if (!confirm('Deze key intrekken? Bestaande calls met deze key zullen direct falen.')) return;
    setPendingId(id);
    startTransition(async () => {
      const r = await revokeApiKey(id);
      if (r.ok) {
        setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
      }
      setPendingId(null);
    });
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard niet beschikbaar */
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {/* Header met "Nieuwe key" knop */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {keys.length} {keys.length === 1 ? 'key' : 'keys'}
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Nieuwe key
          </button>
        )}
      </div>

      {/* Inline create form */}
      {creating && (
        <div className="bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
            Nieuwe API-key aanmaken
          </h3>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="bv. Production server / Local dev / CI runner"
            maxLength={80}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            className="w-full px-3 py-2 mb-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Gebruik een herkenbare naam zodat je weet waar de key gebruikt wordt. De plain key
            wordt éénmalig getoond na aanmaak.
          </p>
          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-md text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition"
            >
              <Key className="w-4 h-4" />
              Genereer
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewKeyName('');
                setError(null);
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm transition"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Lijst van keys */}
      {keys.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center shadow-sm">
          <Key className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
            Nog geen API-keys
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Maak er een aan om audits programmatisch te triggeren vanuit je eigen tooling.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const isPending = pendingId === k.id;
            return (
              <div
                key={k.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm transition ${
                  k.revoked
                    ? 'border-slate-100 dark:border-slate-800 opacity-60'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {k.name}
                      </h3>
                      {k.revoked && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded text-[10px] font-bold uppercase tracking-wider">
                          <EyeOff className="w-2.5 h-2.5" />
                          Ingetrokken
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-slate-600 dark:text-slate-400 mb-2 break-all">
                      {k.prefix}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {k.usageCount} {k.usageCount === 1 ? 'call' : 'calls'}
                      </span>
                      {k.lastUsedAt ? (
                        <span>
                          Laatst gebruikt:{' '}
                          {new Date(k.lastUsedAt).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="italic">Nog niet gebruikt</span>
                      )}
                      <span>
                        Aangemaakt:{' '}
                        {new Date(k.createdAt).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {!k.revoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(k.id)}
                      disabled={isPending}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Intrekken
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plain key one-time modal */}
      {createdKey && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border-2 border-emerald-300 dark:border-emerald-500/40 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Key aangemaakt
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreatedKey(null);
                  setCopied(false);
                }}
                aria-label="Sluit"
                className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                <strong>Belangrijk:</strong> kopieer deze key nu. Hij wordt slechts één keer
                getoond. Als je &apos;m kwijt bent, moet je intrekken + nieuwe maken.
              </div>

              <div className="font-mono text-xs text-slate-900 dark:text-slate-100 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg break-all select-all">
                {createdKey.plainKey}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg font-semibold text-sm transition"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Gekopieerd!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopieer naar klembord
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Gebruik in header: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Authorization: Bearer {createdKey.plainKey.slice(0, 11)}...</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
