// Inline script dat de dark-class op <html> zet vóór React hydrateert.
// Voorkomt FOUC (flash van light → dark bij page-load).
//
// Lees: cookie of localStorage 'cl_theme' → 'dark' of 'light'.
// Geen preference → check OS-preference (prefers-color-scheme).
//
// Wordt gerendered in <head> binnen layout.tsx. dangerouslySetInnerHTML
// is veilig: het is een statische literal zonder user-input.

export default function ThemeScript() {
  const code = `(function(){try{var k='cl_theme';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||(!s&&m);if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
