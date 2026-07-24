'use client';

// Client-side accept-button. Roept de acceptInvite server action aan en
// redirect naar /account/team bij succes.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvite } from '@/lib/workspace-actions';

export default function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const r = await acceptInvite(token);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // Route naar team-page van de zojuist geaccepteerde workspace.
      // De cookie-switch naar deze workspace kan de user handmatig doen
      // via de WorkspaceSwitcher.
      router.push('/account/team');
      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Accepteren…' : 'Accepteer invite'}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
    </div>
  );
}
