'use client';

// Sprint M6 — BrandingForm: kleur-pickers + logo-upload + footer-tekst
// + live preview-card die alle aanpassingen direct visualiseert.
//
// Logo-upload: direct client-side naar Supabase Storage (bypass Vercel
// 4.5MB body-limit + sneller dan via Server Action). Path-conventie
// <user_id>/logo.<ext> matched de RLS-policy uit migratie 010.

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Upload, CheckCircle2, AlertCircle, Trash2, Eye, Save, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveMyBranding, deleteMyLogo, getLogoPublicUrl } from '@/lib/branding';
import {
  applyBrandingDefaults, normalizeHex,
} from '@/lib/branding-types';
import type { BrandingSettings } from '@/lib/branding-types';

type Props = {
  initialBranding: BrandingSettings | null;
  initialLogoUrl: string | null;
};

const MAX_LOGO_BYTES = 524_288; // 500 KB matched RLS-bucket-limit

export default function BrandingForm({ initialBranding, initialLogoUrl }: Props) {
  const [primary, setPrimary] = useState(
    initialBranding?.primaryColor ? `#${initialBranding.primaryColor}` : '#f97316'
  );
  const [secondary, setSecondary] = useState(
    initialBranding?.secondaryColor ? `#${initialBranding.secondaryColor}` : '#dc2626'
  );
  const [brandName, setBrandName] = useState(initialBranding?.brandName ?? '');
  const [footerText, setFooterText] = useState(initialBranding?.footerText ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset save-state na 2s zodat "Opgeslagen!" weer naar "Opslaan" gaat
  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveState]);

  // ---- Logo upload (client → Supabase Storage direct) -------------------

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Bestand is groter dan 500 KB. Verklein eerst.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setLogoError('Alleen PNG, JPG, WebP of SVG.');
      return;
    }

    setLogoUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLogoError('Niet ingelogd.');
        return;
      }

      // Path: <uid>/logo.<ext>. Overschrijven van bestaand bestand zonder
      // suffix-incrementeren want we hebben er maar één per user.
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const path = `${user.id}/logo.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) {
        console.error('[logo upload] storage error:', uploadErr);
        setLogoError(`Upload mislukt: ${uploadErr.message}`);
        return;
      }

      // Path opslaan in branding_settings
      const saveResult = await saveMyBranding({ logoPath: path });
      if (!saveResult.ok) {
        setLogoError(saveResult.error ?? 'Kon logo-pad niet opslaan.');
        return;
      }

      // Public URL ophalen voor preview (server action zodat ENV-var bekend is)
      const newUrl = await getLogoPublicUrl(path);
      // Cache-buster zodat browser de nieuwe versie laadt (overschreven file)
      setLogoUrl(newUrl ? `${newUrl}?v=${Date.now()}` : null);
    } catch (e) {
      console.error('[logo upload] exception:', e);
      setLogoError('Upload mislukt — onbekende fout.');
    } finally {
      setLogoUploading(false);
      // Reset file-input zodat dezelfde file opnieuw uploaden ook werkt
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoDelete = () => {
    startTransition(async () => {
      const r = await deleteMyLogo();
      if (r.ok) setLogoUrl(null);
      else setLogoError(r.error ?? 'Kon logo niet verwijderen.');
    });
  };

  // ---- Save kleur/tekst -------------------------------------------------

  const handleSave = () => {
    setSaveState('saving');
    setSaveError(null);

    const primNorm = normalizeHex(primary);
    const secNorm = normalizeHex(secondary);
    if (!primNorm) {
      setSaveState('error');
      setSaveError('Primaire kleur is geen geldige hex-code.');
      return;
    }
    if (!secNorm) {
      setSaveState('error');
      setSaveError('Secundaire kleur is geen geldige hex-code.');
      return;
    }

    startTransition(async () => {
      const r = await saveMyBranding({
        primaryColor: primNorm,
        secondaryColor: secNorm,
        brandName: brandName.trim() || null,
        footerText: footerText.trim() || null,
      });
      if (r.ok) setSaveState('saved');
      else {
        setSaveState('error');
        setSaveError(r.error ?? 'Opslaan mislukt.');
      }
    });
  };

  // ---- Preview-data --------------------------------------------------------

  const preview = applyBrandingDefaults({
    primaryColor: normalizeHex(primary),
    secondaryColor: normalizeHex(secondary),
    brandName: brandName.trim() || null,
    logoPath: null,
    footerText: footerText.trim() || null,
  });
  const primHex = `#${preview.primaryColor}`;
  const secHex = `#${preview.secondaryColor}`;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
      {/* Form */}
      <div className="space-y-6">
        {/* Logo */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
            Logo
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 flex-shrink-0 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt="Jouw logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {logoUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploaden...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      {logoUrl ? 'Vervangen' : 'Upload logo'}
                    </>
                  )}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Verwijderen
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                PNG, JPG, WebP of SVG. Max 500 KB. Vierkant aanbevolen — wordt
                proportioneel ingepast in PDF-header.
              </p>
              {logoError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-md text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {logoError}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Brand name */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
            Merk-naam
          </h2>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="bv. Studio Pixel · UX Audit"
            maxLength={60}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Verschijnt naast je logo in de PDF-header. Leeg laten = &quot;Conversielek&quot;.
          </p>
        </section>

        {/* Colors */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
            Kleuren
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <ColorPicker
              label="Primair"
              value={primary}
              onChange={setPrimary}
              description="Hoofdkleur voor headers + accenten"
            />
            <ColorPicker
              label="Secundair"
              value={secondary}
              onChange={setSecondary}
              description="Voor gradient-eindkleur (PDF-cover)"
            />
          </div>
        </section>

        {/* Footer text */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
            Footer-tekst
          </h2>
          <textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="bv. Voor vragen: jan@studiopixel.nl &nbsp;·&nbsp; +31 6 1234 5678 &nbsp;·&nbsp; KvK 12345678"
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 resize-none"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Verschijnt onderaan PDF in plaats van Conversielek-KvK-blok.
          </p>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || saveState === 'saving'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-semibold text-sm transition"
          >
            {saveState === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : saveState === 'saved' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Opgeslagen!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Opslaan
              </>
            )}
          </button>
          {saveState === 'error' && saveError && (
            <div className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-6 self-start">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            Voorbeeld
          </div>

          {/* Mini PDF-cover preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950">
            <div
              className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
              style={{
                background: `linear-gradient(135deg, #ffffff 0%, ${primHex}10 100%)`,
              }}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={logoUrl}
                      alt=""
                      className="w-8 h-8 object-contain rounded"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${primHex}, ${secHex})`,
                      }}
                    >
                      {(brandName || 'C')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {brandName || 'Conversielek'}
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                      Conversie-audit
                    </div>
                  </div>
                </div>
              </div>

              {/* Score-block */}
              <div className="px-4 pb-3 pt-3">
                <div
                  className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: 'white' }}
                >
                  <div
                    className="text-3xl font-bold leading-none"
                    style={{ color: primHex }}
                  >
                    7.4
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-700 leading-tight">
                    <div className="font-semibold" style={{ color: primHex }}>
                      Voldoende
                    </div>
                    <div>Overall UX-score</div>
                  </div>
                </div>
              </div>

              {/* Mini issue-rows */}
              <div className="px-4 pb-3 space-y-1">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-md px-2 py-1.5 text-[9px] text-slate-700 dark:text-slate-700 bg-white flex items-center gap-1.5"
                    style={{
                      borderLeft: `3px solid ${primHex}`,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: primHex }} />
                    <span>Verbeterpunt #{i}</span>
                  </div>
                ))}
              </div>

              {/* Footer band */}
              <div
                className="px-4 py-2 text-[8px] text-center text-white font-semibold uppercase tracking-wider"
                style={{ background: primHex }}
              >
                {footerText || 'Gegenereerd door Conversielek'}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Live-preview — wijzigingen zichtbaar direct. PDF-output volgt
            dezelfde stijl op A4-formaat.
          </div>
        </div>
      </aside>
    </div>
  );
}

// ---- Sub-component: ColorPicker ----------------------------------------

function ColorPicker({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          aria-label={`${label} kleur-picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#f97316"
          maxLength={7}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
        />
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">{description}</p>
    </div>
  );
}
