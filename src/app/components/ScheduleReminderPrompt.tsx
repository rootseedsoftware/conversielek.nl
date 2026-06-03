'use client';

// Sprint 10 — Inline prompt na het opslaan van een nieuwe audit.
//
// Verschijnt onderaan het rapport bij ingelogde users. Klik op een van
// de drie interval-knoppen (30/60/90 dagen) → reminder wordt aangemaakt.
// Bij success: prompt vervangen door confirmatie-bericht.
//
// Niet getoond als:
//   - user uitgelogd is (geen email om naar te sturen)
//   - er al een reminder voor deze webshop_key bestaat (zou upsert worden,
//     niet schadelijk maar UX-onhandig). Voor MVP altijd renderen — upsert
//     overschrijft prima.

import { useState, useTransition } from 'react';
import { Bell, Check, X, AlertTriangle } from 'lucide-react';
import { createReminder } from '@/lib/audit-reminders';

type Props = {
  webshopKey: string;
  webshopDisplayName: string;
  webshopUrl?: string;
};

const intervals = [
  { days: 30, label: 'Elke maand' },
  { days: 60, label: 'Elke 2 maanden' },
  { days: 90, label: 'Elk kwartaal' },
];

export default function ScheduleReminderPrompt({
  webshopKey,
  webshopDisplayName,
  webshopUrl,
}: Props) {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading'; days: number }
    | { status: 'success'; days: number }
    | { status: 'error'; message: string }
    | { status: 'dismissed' }
  >({ status: 'idle' });
  const [, startTransition] = useTransition();

  if (state.status === 'dismissed') return null;

  const handleClick = (days: number) => {
    setState({ status: 'loading', days });
    startTransition(async () => {
      const r = await createReminder({
        webshopKey,
        webshopDisplayName,
        webshopUrl,
        intervalDays: days,
        alertOnRegression: true,
      });
      if (r.ok) setState({ status: 'success', days });
      else setState({ status: 'error', message: r.error });
    });
  };

  if (state.status === 'success') {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-500/10 dark:to-amber-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
            Reminder ingesteld
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Over {state.days} dagen krijg je een email om opnieuw te auditen. Plus
            automatische waarschuwingen wanneer je score zakt. Beheer via{' '}
            <a
              href="/account/schedules"
              className="text-orange-600 dark:text-orange-400 font-semibold hover:underline"
            >
              /account/schedules
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
              Wil je over een tijdje een reminder?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Doe periodieke audits om verbeteringen te zien en regressie te
              betrappen. We sturen een vriendelijke email.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setState({ status: 'dismissed' })}
          aria-label="Sluit"
          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {intervals.map((iv) => {
          const isLoading = state.status === 'loading' && state.days === iv.days;
          const isDisabled = state.status === 'loading';
          return (
            <button
              key={iv.days}
              type="button"
              onClick={() => handleClick(iv.days)}
              disabled={isDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold transition"
            >
              {isLoading && (
                <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              )}
              {iv.label}
            </button>
          );
        })}
      </div>

      {state.status === 'error' && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-md text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {state.message}
        </div>
      )}
    </div>
  );
}
