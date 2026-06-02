// Visuele mockup van een audit-rapport voor de landing-hero. Niet
// gebaseerd op een echte screenshot — pure HTML+CSS zodat het scherp
// rendert op elke resolutie, geen image-asset hoeft te worden gehost,
// en automatisch ons design-systeem volgt.
//
// Layout: één score-ring + summary, drie issue-pills, één impact-balk.
// Compact zodat het naast de hero-copy past op desktop, en alleen
// ter visueel houvast — geen interactiviteit.
//
// Decoratieve "browser frame" (dots + adresbalk) maakt direct duidelijk
// dat het een product-preview is.

import { AlertTriangle, AlertCircle, Info, Euro } from 'lucide-react';
import ScoreRing from './ScoreRing';

export default function HeroMockup() {
  return (
    <div className="relative">
      {/* Decoratieve glow achter de card voor extra diepte */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 bg-gradient-to-br from-orange-200/40 via-red-200/30 to-amber-200/40 rounded-3xl blur-2xl"
      />

      <div className="relative bg-white rounded-2xl shadow-2xl shadow-orange-500/10 border border-slate-200 overflow-hidden">
        {/* Browser-frame chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 mx-2 px-3 py-1 bg-white rounded-md border border-slate-200 text-[10px] text-slate-400 font-mono truncate">
            conversielek.nl/audit
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Score-blok */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <ScoreRing score={6.4} size={96} strokeWidth={9} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                UX Score
              </div>
              <div className="text-sm font-bold text-slate-900 mb-1">Voldoende</div>
              <div className="text-xs text-slate-600 leading-snug">
                Sterke productpagina&apos;s, maar checkout verliest vertrouwen door
                weggestopte iDEAL-knop.
              </div>
            </div>
          </div>

          {/* Impact-balk */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <Euro className="w-3 h-3 text-white" />
            </div>
            <div className="text-[11px] text-orange-900 font-medium leading-tight">
              <span className="font-bold">~12% conversie-verlies</span> door
              checkout-frictie
            </div>
          </div>

          {/* 3 issue-pills */}
          <div className="space-y-1.5">
            {[
              {
                Icon: AlertCircle,
                color: 'bg-red-50 text-red-700 border-red-200',
                iconColor: 'text-red-600',
                title: 'iDEAL-knop verstopt op step 2',
                tag: 'Kritiek',
                tagColor: 'bg-red-600',
              },
              {
                Icon: AlertTriangle,
                color: 'bg-orange-50 text-orange-700 border-orange-200',
                iconColor: 'text-orange-600',
                title: 'Verzendkosten pas zichtbaar bij betalen',
                tag: 'Hoog',
                tagColor: 'bg-orange-500',
              },
              {
                Icon: Info,
                color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                iconColor: 'text-yellow-600',
                title: 'CTA "Volgende stap" niet contrasterend',
                tag: 'Middel',
                tagColor: 'bg-yellow-500',
              },
            ].map((issue, i) => {
              const Icon = issue.Icon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${issue.color}`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${issue.iconColor}`} />
                  <span className="text-[11px] font-medium flex-1 truncate">
                    {issue.title}
                  </span>
                  <span
                    className={`text-[9px] text-white font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${issue.tagColor}`}
                  >
                    {issue.tag}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Voettekst van de mockup */}
          <div className="text-[10px] text-slate-400 text-center mt-3 pt-3 border-t border-slate-100">
            Voorbeeld-rapport · echte audits zijn 30-50 issues
          </div>
        </div>
      </div>
    </div>
  );
}
