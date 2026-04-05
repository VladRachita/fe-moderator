'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAllToggles,
  updateToggle,
  CategoryToggleError,
} from '@/services/category-toggle-service';
import type { CategoryToggle } from '@/services/category-toggle-service';
import { useSession } from '@/lib/auth/use-session';

const CATEGORY_LABELS: Record<string, string> = {
  RESTAURANT: 'Restaurants',
  SERVICE: 'Services',
  STAY: 'Stays',
};

const CATEGORY_ORDER = ['RESTAURANT', 'SERVICE', 'STAY'];

const CategoriesPage: React.FC = () => {
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [toggles, setToggles] = useState<CategoryToggle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleKey = (t: CategoryToggle) =>
    t.subcategory ? `${t.category}:${t.subcategory}` : t.category;

  const loadToggles = useCallback(async () => {
    if (!canManageUsers) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAllToggles();
      setToggles(data);
    } catch (err) {
      if (err instanceof CategoryToggleError) {
        setError(err.message);
      } else {
        setError('Failed to load category toggles');
      }
    } finally {
      setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    loadToggles();
  }, [loadToggles, identityVersion]);

  // Auto-dismiss success message with cleanup
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleToggle = async (toggle: CategoryToggle) => {
    const key = toggleKey(toggle);

    // Prevent concurrent updates on the same toggle
    if (pendingKeys.has(key)) return;

    setPendingKeys((prev) => new Set([...prev, key]));
    setError(null);
    setSuccessMessage(null);

    // Optimistic update
    const previous = [...toggles];
    setToggles((prev) =>
      prev.map((t) => (toggleKey(t) === key ? { ...t, enabled: !t.enabled } : t)),
    );

    try {
      await updateToggle({
        category: toggle.category,
        subcategory: toggle.subcategory,
        enabled: !toggle.enabled,
      });
      const label = toggle.subcategory ?? toggle.category;
      setSuccessMessage(`${label} ${!toggle.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      // Revert on failure
      setToggles(previous);
      if (err instanceof CategoryToggleError) {
        setError(err.message);
      } else {
        setError('Failed to update toggle');
      }
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const isCategoryEnabled = (category: string): boolean => {
    const catToggle = toggles.find((t) => t.category === category && t.subcategory === null);
    return catToggle?.enabled ?? true;
  };

  const getCategoryToggle = (category: string): CategoryToggle | undefined =>
    toggles.find((t) => t.category === category && t.subcategory === null);

  const getSubcategoryToggles = (category: string): CategoryToggle[] =>
    toggles.filter((t) => t.category === category && t.subcategory !== null);

  if (isSessionLoading || !canManageUsers) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories &amp; Subcategories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Control which business types are available for new host applications.
          </p>
        </div>
        <button
          type="button"
          onClick={loadToggles}
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

      {loading && toggles.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading toggles...</div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((categoryName) => {
            const catToggle = getCategoryToggle(categoryName);
            const catEnabled = isCategoryEnabled(categoryName);
            const subcategories = getSubcategoryToggles(categoryName);

            return (
              <div
                key={categoryName}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                {/* Category header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {CATEGORY_LABELS[categoryName] ?? categoryName}
                    </h2>
                    {catToggle?.updatedAt && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        Last updated:{' '}
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(catToggle.updatedAt))}
                      </p>
                    )}
                  </div>
                  <ToggleSwitch
                    enabled={catEnabled}
                    loading={pendingKeys.has(categoryName)}
                    onToggle={() => catToggle && handleToggle(catToggle)}
                  />
                </div>

                {/* Subcategories grid */}
                <div className={`px-5 py-4 ${!catEnabled ? 'opacity-50' : ''}`}>
                  {!catEnabled && (
                    <p className="mb-3 text-xs font-medium text-amber-700">
                      All subcategories are disabled when the parent category is off.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {subcategories.map((sub) => {
                      const key = toggleKey(sub);
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                            sub.enabled && catEnabled
                              ? 'border-gray-200 bg-white'
                              : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              sub.enabled && catEnabled ? 'text-gray-900' : 'text-gray-400'
                            }`}
                          >
                            {formatSubcategoryLabel(sub.subcategory ?? '')}
                          </span>
                          <ToggleSwitch
                            enabled={sub.enabled}
                            loading={pendingKeys.has(key)}
                            disabled={!catEnabled}
                            onToggle={() => handleToggle(sub)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function formatSubcategoryLabel(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ToggleSwitchProps {
  enabled: boolean;
  loading?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  loading = false,
  disabled = false,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    disabled={disabled || loading}
    onClick={onToggle}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      enabled ? 'bg-blue-600' : 'bg-gray-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
    {loading && (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </span>
    )}
  </button>
);

export default CategoriesPage;
