// Herbruikbare empty-state component met SVG illustration-prop.
//
// Vervangt de saaie "icon + tekst + grijze achtergrond"-pattern op:
//   - /history view ("Nog geen audits")
//   - /admin/users ("Geen users gevonden")
//   - /admin/audits ("Geen audits gevonden")
//   - /admin/subscriptions ("Geen subscriptions")
//   - /admin dashboard ("Nog geen actieve abonnementen")
//
// Visueel verschil: oranje-gradient blob als achtergrond achter de
// illustration (subtiele diepte), kleurrijke SVG ipv platte Lucide-
// icoon, optionele dual CTAs.
//
// De illustrations zelf zijn aparte components in dezelfde file zodat
// callers ze als prop kunnen meegeven zonder cross-file dependency.

import React from 'react';
import { FileText, Users, CreditCard, Receipt, Search, Sparkles } from 'lucide-react';

// ============ Inline SVG illustrations ============
// Compact maar herkenbaar — niet gegenereerd vanuit een externe stock-
// library. Gebruiken onze brand-gradient + subtiele animatie.

export function IllustrationAudit() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="il-audit-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="il-audit-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Achtergrond pagina */}
      <rect x="42" y="14" width="116" height="138" rx="10" fill="url(#il-audit-page)" stroke="#e2e8f0" strokeWidth="1.5" />
      {/* Header-balk */}
      <rect x="56" y="28" width="66" height="6" rx="3" fill="url(#il-audit-accent)" />
      <rect x="56" y="42" width="40" height="4" rx="2" fill="#cbd5e1" />
      {/* Score-cirkel */}
      <circle cx="74" cy="82" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx="74" cy="82" r="22" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="138" strokeDashoffset="35" strokeLinecap="round" transform="rotate(-90 74 82)" />
      <text x="74" y="87" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">8</text>
      {/* Tekstregels */}
      <rect x="104" y="72" width="44" height="3.5" rx="1.5" fill="#e2e8f0" />
      <rect x="104" y="82" width="36" height="3.5" rx="1.5" fill="#e2e8f0" />
      <rect x="104" y="92" width="40" height="3.5" rx="1.5" fill="#e2e8f0" />
      {/* Issue rows */}
      <rect x="56" y="116" width="88" height="6" rx="3" fill="#fef3c7" />
      <rect x="56" y="128" width="74" height="6" rx="3" fill="#fee2e2" />
      {/* Decoratieve sparkles */}
      <g fill="#f97316" opacity="0.6">
        <circle cx="32" cy="44" r="2" />
        <circle cx="168" cy="58" r="2.5" />
        <circle cx="174" cy="120" r="2" />
      </g>
    </svg>
  );
}

export function IllustrationUsers() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="il-users-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Drie user-avatars */}
      <circle cx="60" cy="88" r="28" fill="url(#il-users-grad)" opacity="0.85" />
      <text x="60" y="96" textAnchor="middle" fontSize="22" fontWeight="700" fill="white">A</text>
      <circle cx="100" cy="76" r="34" fill="#0f172a" />
      <text x="100" y="86" textAnchor="middle" fontSize="26" fontWeight="700" fill="white">B</text>
      <circle cx="142" cy="88" r="28" fill="#3b82f6" opacity="0.85" />
      <text x="142" y="96" textAnchor="middle" fontSize="22" fontWeight="700" fill="white">C</text>
      {/* Decoratieve dots onderaan */}
      <g fill="#cbd5e1">
        <circle cx="76" cy="138" r="2" />
        <circle cx="100" cy="138" r="2" />
        <circle cx="124" cy="138" r="2" />
      </g>
    </svg>
  );
}

export function IllustrationSubscriptions() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="il-sub-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Credit card schuin */}
      <g transform="rotate(-8 100 80)">
        <rect x="44" y="44" width="112" height="72" rx="10" fill="url(#il-sub-card)" />
        <rect x="58" y="62" width="22" height="14" rx="2" fill="#fde68a" opacity="0.8" />
        <rect x="58" y="86" width="84" height="4" rx="2" fill="white" opacity="0.6" />
        <rect x="58" y="94" width="60" height="4" rx="2" fill="white" opacity="0.45" />
      </g>
      {/* € symbool */}
      <circle cx="160" cy="44" r="18" fill="#0f172a" />
      <text x="160" y="51" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fbbf24">€</text>
    </svg>
  );
}

export function IllustrationSearch() {
  return (
    <svg viewBox="0 0 200 160" className="w-40 h-32" xmlns="http://www.w3.org/2000/svg">
      {/* Vergrootglas */}
      <circle cx="80" cy="70" r="36" fill="none" stroke="#0f172a" strokeWidth="6" />
      <circle cx="80" cy="70" r="36" fill="#f97316" opacity="0.1" />
      <line x1="108" y1="98" x2="138" y2="128" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />
      {/* Vraagteken in vergrootglas */}
      <text x="80" y="82" textAnchor="middle" fontSize="40" fontWeight="700" fill="#f97316">?</text>
    </svg>
  );
}

// ============ EmptyState component ============

type ActionProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
};

type Props = {
  illustration: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: ActionProps;
  secondaryAction?: ActionProps;
};

function ActionButton({ action }: { action: ActionProps }) {
  const baseClass =
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition text-sm';
  const primaryClass =
    'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20';
  const secondaryClass =
    'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';

  const className = `${baseClass} ${action.primary ? primaryClass : secondaryClass}`;

  if (action.href) {
    return (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export default function EmptyState({
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center overflow-hidden">
      {/* Decoratieve blur-blob op de achtergrond */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-orange-200/40 via-amber-100/30 to-red-100/20 dark:from-orange-500/10 dark:via-amber-500/5 dark:to-red-500/5 rounded-full blur-3xl -z-0"
      />

      <div className="relative">
        <div className="flex justify-center mb-5">{illustration}</div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
          {description}
        </p>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {primaryAction && <ActionButton action={{ ...primaryAction, primary: true }} />}
            {secondaryAction && <ActionButton action={secondaryAction} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Lucide-fallback icon-arrangements (compactere variant) ============
// Voor admin-pages waar de grote SVG-illustration te zwaar voelt — een
// charmantere icon-arrangement met badge-decoratie.

type IconBadgeProps = {
  icon: typeof FileText;
  tone?: 'orange' | 'blue' | 'emerald' | 'amber';
};

const toneClasses: Record<NonNullable<IconBadgeProps['tone']>, string> = {
  orange: 'from-orange-400 to-red-500 text-white',
  blue: 'from-blue-400 to-indigo-500 text-white',
  emerald: 'from-emerald-400 to-teal-500 text-white',
  amber: 'from-amber-400 to-orange-500 text-white',
};

export function IconBadge({ icon: Icon, tone = 'orange' }: IconBadgeProps) {
  return (
    <div className="relative inline-block">
      <div
        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${toneClasses[tone]} flex items-center justify-center shadow-lg`}
      >
        <Icon className="w-9 h-9" strokeWidth={2} />
      </div>
      <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
      </div>
    </div>
  );
}

// Re-export voor caller-convenience
export { FileText, Users, CreditCard, Receipt, Search };
