'use client';

// Sprint 10 — Client-side reminders-manager.
//
// Toont per reminder een card met:
//   - Webshop-naam + URL
//   - Interval-badge (30/60/90 dagen)
//   - Volgende reminder-datum
//   - Toggle active/pauze
//   - Delete-knop
//   - Status: alert_on_regression on/off

import { useEffect, useState, useTransition } from 'react';
import {
  Calendar, Bell, BellOff, Trash2, Loader2, AlertTriangle, Globe, Mail,
} from 'lucide-react';
import {
  toggleReminderActive,
  deleteReminder,
  type AuditReminder,
} from '@/lib/audit-reminders';

export default function SchedulesList({
  initialReminders,
}: {
  initialReminders: AuditReminder[];
}) {
  const [reminders, setReminders] = useState(initialReminders);
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // `nowMs` lazy in useEffect zodat we Date.now() niet tijdens render
  // aanroepen (react-hooks/components-must-be-pure). 0 als initial =
  // alle reminders renderen als "overdue" tot mount; verschil <1 frame.
  const [nowMs, setNowMs] = useState<number>(0);
  useEffect(() => {
    queueMicrotask(() => setNowMs(Date.now()));
  }, []);

  const handleToggle = (id: string, currentlyActive: boolean) => {
    setPending(id);
    startTransition(async () => {
      const r = await toggleReminderActive(id, !currentlyActive);
      if (r.ok) {
        setReminders((rs) =>
          rs.map((rem) => (rem.id === id ? { ...rem, active: !currentlyActive } : rem))
        );
      }
      setPending(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Reminder verwijderen?')) return;
    setPending(id);
    startTransition(async () => {
      const r = await deleteReminder(id);
      if (r.ok) {
        setReminders((rs) => rs.filter((rem) => rem.id !== id));
      }
      setPending(null);
    });
  };

  if (reminders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center shadow-sm">
        <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
          Nog geen reminders
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-4">
          Na je volgende audit krijg je de optie om een reminder in te stellen. Of voeg er
          handmatig één toe via de audit-flow.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((r) => {
        const isPending = pending === r.id;
        const nextDate = new Date(r.nextRemindAt);
        const daysFromNow = nowMs
          ? Math.ceil((nextDate.getTime() - nowMs) / (1000 * 60 * 60 * 24))
          : 0;
        const isOverdue = daysFromNow < 0;
        return (
          <div
            key={r.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition ${
              r.active
                ? 'border-slate-200 dark:border-slate-700'
                : 'border-slate-100 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="p-5 flex items-start gap-4">
              {/* Status indicator */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  r.active
                    ? 'bg-gradient-to-br from-orange-500 to-red-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {r.active ? (
                  <Bell className="w-5 h-5 text-white" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                )}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1 truncate">
                  {r.webshopDisplayName}
                </h3>
                {r.webshopUrl && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <Globe className="w-3 h-3" />
                    <span className="truncate">{r.webshopUrl}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-semibold">
                    <Calendar className="w-3 h-3" />
                    Elke {r.intervalDays} dagen
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                    <Mail className="w-3 h-3" />
                    {r.emailAddress}
                  </span>
                  {r.alertOnRegression && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Regressie-alerts aan
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                  {r.active ? (
                    <>
                      Volgende reminder:{' '}
                      <span
                        className={`font-semibold ${
                          isOverdue
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {nextDate.toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>{' '}
                      {isOverdue ? (
                        <span className="text-red-600 dark:text-red-400">(achterstallig — wordt vandaag verstuurd)</span>
                      ) : (
                        <span>(over {daysFromNow} {daysFromNow === 1 ? 'dag' : 'dagen'})</span>
                      )}
                    </>
                  ) : (
                    <span className="italic">Gepauzeerd</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggle(r.id, r.active)}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  title={r.active ? 'Pauzeer' : 'Activeer'}
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : r.active ? (
                    <BellOff className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  {r.active ? 'Pauzeer' : 'Activeer'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50"
                  title="Verwijder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Verwijder
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
