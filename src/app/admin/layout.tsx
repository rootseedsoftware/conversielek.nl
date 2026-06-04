// /admin layout — shared nav voor dashboard, users, audits.
//
// Toegangscheck zit in requireAdmin() die elke admin-page bovenaan zelf
// aanroept. Layout zelf is "domme" shell; alles wat data ophaalt heeft
// een eigen requireAdmin-gate. Reden: layouts in Next 16 worden gecached
// op een andere manier dan pages — we willen niet dat een stale layout-
// render iemand het bestaan van /admin verraadt.

import Link from 'next/link';
import {
  ShoppingCart,
  LayoutDashboard,
  Users,
  FileSearch,
  CreditCard,
  Receipt,
  AlertOctagon,
  ArrowLeft,
} from 'lucide-react';

export const metadata = {
  title: 'Admin — Conversielek',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Conversielek <span className="text-orange-600 font-mono text-xs ml-1">admin</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-3.5 h-3.5" />}>
                Dashboard
              </AdminNavLink>
              <AdminNavLink href="/admin/users" icon={<Users className="w-3.5 h-3.5" />}>
                Users
              </AdminNavLink>
              <AdminNavLink href="/admin/audits" icon={<FileSearch className="w-3.5 h-3.5" />}>
                Audits
              </AdminNavLink>
              <AdminNavLink
                href="/admin/subscriptions"
                icon={<CreditCard className="w-3.5 h-3.5" />}
              >
                Subscriptions
              </AdminNavLink>
              <AdminNavLink
                href="/admin/payment-events"
                icon={<Receipt className="w-3.5 h-3.5" />}
              >
                Events
              </AdminNavLink>
              <AdminNavLink
                href="/admin/errors"
                icon={<AlertOctagon className="w-3.5 h-3.5" />}
              >
                Errors
              </AdminNavLink>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Terug naar app
          </Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition"
    >
      {icon}
      {children}
    </Link>
  );
}
