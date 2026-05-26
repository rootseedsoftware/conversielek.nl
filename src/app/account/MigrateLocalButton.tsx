'use client';

// Toont alleen iets als er audits in localStorage staan (oude flow van vóór
// account-tijd). Bij klik: migreer naar Supabase via lib/audit-store, en
// verwijder uit localStorage zodat er nooit duplicaten ontstaan.

import { useEffect, useState } from 'react';
import { Loader2, Upload, Check } from 'lucide-react';
import {
  getLocalAuditsCount,
  migrateLocalAuditsToSupabase,
} from '@/lib/audit-store';

export default function MigrateLocalButton() {
  const [count, setCount] = useState<number | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{ migrated: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocalAuditsCount().then(setCount).catch(() => setCount(0));
  }, []);

  // Niets te tonen tijdens initial check of als geen lokale audits
  if (count === null || count === 0) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);
    try {
      const r = await migrateLocalAuditsToSupabase();
      setResult(r);
      setCount(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setMigrating(false);
    }
  };

  if (result) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-emerald-900">
          <div className="font-medium">
            {result.migrated} {result.migrated === 1 ? 'audit' : 'audits'} geïmporteerd
          </div>
          {result.failed > 0 && (
            <div className="mt-1 text-emerald-700">
              {result.failed} mislukt — die staan nog in deze browser.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <Upload className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <div className="font-medium text-slate-900">
            {count} {count === 1 ? 'audit' : 'audits'} in deze browser gevonden
          </div>
          <div className="text-slate-600 mt-1">
            Importeer ze naar je account zodat je ze ook op andere apparaten kunt zien.
          </div>
        </div>
      </div>
      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </div>
      )}
      <button
        onClick={handleMigrate}
        disabled={migrating}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm"
      >
        {migrating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Bezig met importeren…
          </>
        ) : (
          <>Importeer {count} {count === 1 ? 'audit' : 'audits'}</>
        )}
      </button>
    </div>
  );
}
