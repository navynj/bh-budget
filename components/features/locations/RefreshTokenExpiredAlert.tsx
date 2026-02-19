'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ManageRealmsDialog } from './ManageRealmsDialog';

type RefreshTokenExpiredAlertProps = {
  isOfficeOrAdmin: boolean;
};

type ConnectionItem = {
  locationId: string;
  realmId: string | null;
  realmName: string | null;
  refreshTokenExpired: boolean;
};

export function RefreshTokenExpiredAlert({
  isOfficeOrAdmin,
}: RefreshTokenExpiredAlertProps) {
  const [hasExpired, setHasExpired] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/realm')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { connections?: ConnectionItem[] } | null) => {
        if (cancelled || !data?.connections) {
          setHasExpired(false);
          return;
        }
        const anyExpired = (data.connections as ConnectionItem[]).some(
          (c) => c.refreshTokenExpired,
        );
        setHasExpired(anyExpired);
      })
      .catch(() => setHasExpired(false));

    return () => {
      cancelled = true;
    };
  }, []);

  if (hasExpired !== true) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-destructive/80 bg-destructive/15 px-4 py-3 text-destructive"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="size-5 shrink-0" aria-hidden />
        <p className="text-sm font-medium">
          {isOfficeOrAdmin
            ? 'One or more QuickBooks refresh tokens have expired. Reconnect in Manage Realms to restore access.'
            : 'QuickBooks connection has expired. Contact your admin or office to reconnect.'}
        </p>
      </div>
      {isOfficeOrAdmin && (
        <ManageRealmsDialog
          trigger={
            <Button variant="destructive" size="sm" className="shrink-0">
              Manage Realms
            </Button>
          }
        />
      )}
    </div>
  );
}
