'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAllFlags,
  updateFlag,
  FeatureFlagError,
} from '@/services/feature-flag-service';
import type { PlatformFeatureFlag } from '@/services/feature-flag-service';
import { useSession } from '@/lib/auth/use-session';
import ToggleSwitch from '@/components/admin/ToggleSwitch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface FlagDescriptor {
  flagKey: string;
  label: string;
  description: string;
}

const FLAG_DESCRIPTORS: FlagDescriptor[] = [
  {
    flagKey: 'telemetry.feed',
    label: 'Feed telemetry',
    description:
      'Record one audit row per feed page served. Disable to reduce audit_log pressure under heavy feed load.',
  },
  {
    flagKey: 'telemetry.search',
    label: 'Search telemetry',
    description:
      'Record one audit row per search query. Disable if search volume spikes.',
  },
];

const PlatformSettingsPage: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [flags, setFlags] = useState<PlatformFeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmFlag, setConfirmFlag] = useState<PlatformFeatureFlag | null>(null);

  const rateLimitMap = useRef<Map<string, number[]>>(new Map());

  const loadFlags = useCallback(async () => {
    if (!canManageUsers) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAllFlags();
      setFlags(data);
    } catch (err) {
      if (err instanceof FeatureFlagError) {
        setError(err.message);
      } else {
        setError('Failed to load feature flags');
      }
    } finally {
      setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags, identityVersion]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const isRateLimited = (key: string): boolean => {
    const now = Date.now();
    const timestamps = rateLimitMap.current.get(key) ?? [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    rateLimitMap.current.set(key, recent);
    return recent.length >= RATE_LIMIT_MAX;
  };

  const recordToggleAction = (key: string) => {
    const now = Date.now();
    const timestamps = rateLimitMap.current.get(key) ?? [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    rateLimitMap.current.set(key, recent);
  };

  const descriptorFor = (flagKey: string): FlagDescriptor | undefined =>
    FLAG_DESCRIPTORS.find((d) => d.flagKey === flagKey);

  const requestToggle = (flag: PlatformFeatureFlag) => {
    if (pendingKeys.has(flag.flagKey)) return;

    if (isRateLimited(flag.flagKey)) {
      const label = descriptorFor(flag.flagKey)?.label ?? flag.flagKey;
      setError(`Too many changes for "${label}". Please wait a moment before trying again.`);
      return;
    }

    setConfirmFlag(flag);
  };

  const handleToggle = async (flag: PlatformFeatureFlag) => {
    const key = flag.flagKey;
    if (pendingKeys.has(key)) return;

    recordToggleAction(key);
    setPendingKeys((prev) => new Set([...prev, key]));
    setError(null);
    setSuccessMessage(null);

    const previous = [...flags];
    setFlags((prev) =>
      prev.map((f) => (f.flagKey === key ? { ...f, enabled: !f.enabled } : f)),
    );

    try {
      await updateFlag({ flagKey: flag.flagKey, enabled: !flag.enabled });
      const label = descriptorFor(flag.flagKey)?.label ?? flag.flagKey;
      setSuccessMessage(`${label} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setFlags(previous);
      if (err instanceof FeatureFlagError) {
        setError(err.message);
      } else {
        setError('Failed to update feature flag');
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (isSessionLoading || !canManageUsers) {
    return null;
  }

  const orderedFlags = FLAG_DESCRIPTORS.map((descriptor) => {
    const flag = flags.find((f) => f.flagKey === descriptor.flagKey);
    return flag ? { descriptor, flag } : null;
  }).filter((entry): entry is { descriptor: FlagDescriptor; flag: PlatformFeatureFlag } => entry !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Runtime kill-switches for telemetry streams. Changes take effect within a few seconds and do not require a redeploy.
          </p>
        </div>
        <button
          type="button"
          onClick={loadFlags}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-400 bg-green-50 px-4 py-3 text-sm text-green-900">
          {successMessage}
        </div>
      )}

      {loading && flags.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading flags...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-200">
            {orderedFlags.map(({ descriptor, flag }) => (
              <li
                key={flag.flagKey}
                className="flex items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-900">{descriptor.label}</p>
                  <p className="mt-1 text-sm text-gray-600">{descriptor.description}</p>
                  {flag.updatedAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      Last updated:{' '}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(flag.updatedAt))}
                    </p>
                  )}
                </div>
                <div className="pt-1">
                  <ToggleSwitch
                    enabled={flag.enabled}
                    loading={pendingKeys.has(flag.flagKey)}
                    onToggle={() => requestToggle(flag)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmFlag && (
        <ConfirmDialog
          title="Confirm change"
          message={(() => {
            const descriptor = descriptorFor(confirmFlag.flagKey);
            const label = descriptor?.label ?? confirmFlag.flagKey;
            const action = confirmFlag.enabled ? 'disable' : 'enable';
            if (confirmFlag.enabled) {
              return (
                <>
                  <p>
                    Are you sure you want to <span className="font-medium">{action}</span>{' '}
                    <span className="font-medium">{label}</span>?
                  </p>
                  <p className="mt-2 text-amber-700">
                    Disabling this stops all audit rows for this endpoint. Re-enable anytime.
                  </p>
                </>
              );
            }
            return (
              <p>
                Are you sure you want to <span className="font-medium">{action}</span>{' '}
                <span className="font-medium">{label}</span>?
              </p>
            );
          })()}
          confirmLabel={confirmFlag.enabled ? 'Disable' : 'Enable'}
          destructive={confirmFlag.enabled}
          onConfirm={() => {
            const toConfirm = confirmFlag;
            setConfirmFlag(null);
            handleToggle(toConfirm);
          }}
          onCancel={() => setConfirmFlag(null)}
        />
      )}
    </div>
  );
};

export default PlatformSettingsPage;
