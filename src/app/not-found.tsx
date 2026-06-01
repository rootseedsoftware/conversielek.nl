// 404-pagina — App Router fallback voor onbestaande routes.
// Krijgt automatisch de globale AppFooter via layout.tsx.

import Link from 'next/link';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Pagina niet gevonden — Conversielek',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">Conversielek</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-6xl font-bold text-orange-500 mb-3">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Pagina niet gevonden</h1>
        <p className="text-slate-600 mb-8">
          Deze pagina bestaat niet (meer). Misschien is de link verlopen of getypt zonder dat we
          het wisten — probeer terug te gaan naar de homepage.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar Conversielek
        </Link>
      </main>
    </div>
  );
}
