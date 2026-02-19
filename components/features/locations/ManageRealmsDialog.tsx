'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { RefreshCw, Link2 } from 'lucide-react';

/** Match GET /api/realm response shape (realm-centric, locationId only for auth flow). */
export type ConnectionItem = {
  locationId: string;
  realmId: string | null;
  qbRealmId: string | null;
  realmName: string | null;
  hasTokens: boolean;
  refreshExpiresAt: string | null;
  accessTokenExpired: boolean;
  refreshTokenExpired: boolean;
};

type ManageRealmsDialogProps = {
  /** Called when the dialog closes (e.g. so parent can refetch realms). */
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export function ManageRealmsDialog({
  onOpenChange,
  trigger,
}: ManageRealmsDialogProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/realm');
      if (!res.ok) throw new Error('Failed to load connections');
      const data = await res.json();
      setConnections(data.connections ?? []);
      setIsAdmin(data.isAdmin);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to load connections',
      );
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchConnections();
  }, [open, fetchConnections]);

  const handleConnect = useCallback(
    (locationId?: string) => {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const returnTo = encodeURIComponent(pathname || '/locations');
      window.location.href = `${baseUrl}/api/quickbooks/auth?${locationId ? `locationId=${encodeURIComponent(locationId)}` : ''}&returnTo=${returnTo}`;
    },
    [pathname],
  );

  const handleRefresh = useCallback(
    async (realmId: string, locationId: string) => {
      setRefreshingId(locationId);
      try {
        const res = await fetch('/api/quickbooks/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ realmId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? 'Refresh failed');
        }
        toast.success('Tokens refreshed');
        await fetchConnections();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Refresh failed');
      } finally {
        setRefreshingId(null);
      }
    },
    [fetchConnections],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Manage Realms
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Manage Realms</DialogTitle>
          <Button size="sm" onClick={() => handleConnect()}>
            Connect New Realm
          </Button>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-8" />
          </div>
        ) : connections.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            No locations available. You can connect QuickBooks per location from
            the Locations table.
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {connections.map((conn) => {
              const showRefresh =
                conn.hasTokens &&
                conn.realmId &&
                (isAdmin
                  ? !conn.refreshTokenExpired
                  : conn.refreshTokenExpired);
              const showReconnect =
                conn.hasTokens && (isAdmin || conn.refreshTokenExpired);
              const hint = conn.hasTokens
                ? conn.refreshTokenExpired
                  ? 'Refresh token expired — reconnect to get new tokens.'
                  : conn.accessTokenExpired
                    ? 'Access token expired — refresh to get new access token.'
                    : 'Tokens valid.'
                : null;

              return (
                <div
                  key={conn.locationId}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {conn.realmName ??
                        (conn.qbRealmId
                          ? `Realm ${conn.qbRealmId}`
                          : 'QuickBooks')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {conn.hasTokens ? (
                        conn.refreshExpiresAt ? (
                          <>
                            Connected · Refresh expires{' '}
                            {new Date(
                              conn.refreshExpiresAt,
                            ).toLocaleDateString()}
                          </>
                        ) : (
                          'Connected'
                        )
                      ) : (
                        'Not connected'
                      )}
                    </p>
                    {isAdmin && hint && (
                      <p
                        className={
                          conn.refreshTokenExpired
                            ? 'text-destructive text-xs mt-1'
                            : conn.accessTokenExpired
                              ? 'text-amber-600 dark:text-amber-500 text-xs mt-1'
                              : 'text-muted-foreground text-xs mt-1'
                        }
                      >
                        {hint}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {conn.hasTokens ? (
                      <>
                        {showReconnect && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(conn.locationId)}
                            className={
                              conn.refreshTokenExpired
                                ? 'border-1 border-destructive ring-2 ring-destructive/20'
                                : ''
                            }
                          >
                            Reconnect
                          </Button>
                        )}
                        {showRefresh && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              conn.realmId &&
                              handleRefresh(conn.realmId, conn.locationId)
                            }
                            disabled={refreshingId === conn.locationId}
                            className={
                              conn.accessTokenExpired
                                ? 'border-1 border-amber-600 ring-2 ring-amber-600/20'
                                : ''
                            }
                          >
                            {refreshingId === conn.locationId ? (
                              <Spinner className="size-4" />
                            ) : (
                              <>
                                <RefreshCw className="size-4 mr-1" />
                                Refresh
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(conn.locationId)}
                      >
                        <Link2 className="size-4 mr-1" />
                        Connect QuickBooks
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
