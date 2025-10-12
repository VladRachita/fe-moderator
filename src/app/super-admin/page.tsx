'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminUser, AdminUserProvisionError } from '@/services/admin-service';
import { useSession } from '@/lib/auth/use-session';
import type { PlatformRole, IAdminUserProvisionResult } from '@/types';
import { validatePasswordPolicy } from '@/lib/password-policy';

const ROLE_OPTIONS: { label: string; value: PlatformRole }[] = [
  { label: 'Moderator', value: 'MODERATOR' },
  { label: 'Analyst', value: 'ANALYST' },
];

interface FormValues {
  username: string;
  email: string;
  role: PlatformRole;
  temporaryPassword: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SuperAdminPage: React.FC = () => {
  const router = useRouter();
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [formValues, setFormValues] = useState<FormValues>({
    username: '',
    email: '',
    role: 'MODERATOR',
    temporaryPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [issueList, setIssueList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionSummary, setProvisionSummary] = useState<
    Omit<IAdminUserProvisionResult, 'temporaryPassword'> | null
  >(null);
  const [temporarySecret, setTemporarySecret] = useState<string | null>(null);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  useEffect(() => {
    if (identityVersion === 0) {
      return;
    }
    setProvisionSummary(null);
    setTemporarySecret(null);
    setShowTemporaryPassword(false);
  }, [identityVersion, setProvisionSummary, setTemporarySecret, setShowTemporaryPassword]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }
    if (session?.error === 'logout' || session?.error === 'logout_failed') {
      const message = session.error === 'logout_failed' ? 'logout_failed' : 'logged_out';
      router.replace(`/login?message=${message}`);
      return;
    }
    if (session?.error === 'forbidden') {
      router.replace('/login?error=authorization_failed');
      return;
    }
    if (!session?.authenticated) {
      router.replace('/login?returnTo=/super-admin');
      return;
    }
    if (session.needsPasswordChange) {
      router.replace('/account/password');
      return;
    }
    if (!session.permissions.canManageUsers) {
      if (session.permissions.canModerate) {
        router.replace('/dashboard');
        return;
      }
      if (session.permissions.canViewAnalytics) {
        router.replace('/analytics');
        return;
      }
      router.replace('/login?error=authorization_failed');
    }
  }, [isSessionLoading, session, router]);

  const resetForm = useCallback(() => {
    setFormValues({
      username: '',
      email: '',
      role: 'MODERATOR',
      temporaryPassword: '',
    });
    setShowTemporaryPassword(false);
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};
    const trimmedUsername = formValues.username.trim();
    const trimmedEmail = formValues.email.trim();

    if (!trimmedUsername) {
      nextErrors.username = 'Username is required.';
    }
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!ROLE_OPTIONS.some((option) => option.value === formValues.role)) {
      nextErrors.role = 'Select a valid role.';
    }

    const passwordError = validatePasswordPolicy(formValues.temporaryPassword, { allowEmpty: true });
    if (passwordError) {
      nextErrors.temporaryPassword = passwordError;
    }

    setFieldErrors(nextErrors);
    return nextErrors;
  }, [formValues]);

  const deriveErrorMessage = useCallback((error: AdminUserProvisionError | Error): string => {
    if (error instanceof AdminUserProvisionError) {
      switch (error.status) {
        case 400:
          return error.issues[0] ?? 'Please review the highlighted fields.';
        case 401:
        case 403:
          return 'You are not authorized to provision accounts.';
        case 409:
          return 'An account with this username or email already exists.';
        default:
          return error.message || 'Failed to create the account.';
      }
    }
    return error.message || 'Failed to create the account.';
  }, []);

  const handleChange = useCallback(
    (field: keyof FormValues, value: string) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (!prev[field]) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (formError) {
        setFormError(null);
        setIssueList([]);
      }
    },
    [formError],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setIssueList([]);
      setTemporarySecret(null);

      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      const payload = {
        username: formValues.username.trim(),
        email: formValues.email.trim(),
        role: formValues.role,
        ...(formValues.temporaryPassword.trim()
          ? { temporaryPassword: formValues.temporaryPassword.trim() }
          : {}),
      };

      setIsSubmitting(true);
      try {
        const result = await createAdminUser(payload);
        const { temporaryPassword, ...rest } = result;
        setProvisionSummary(rest);
        setTemporarySecret(temporaryPassword ?? null);
        resetForm();
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Unknown error');
        setFormError(deriveErrorMessage(typedError));
        if (typedError instanceof AdminUserProvisionError) {
          setIssueList(typedError.issues);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [deriveErrorMessage, formValues, resetForm, setProvisionSummary, setTemporarySecret, validateForm],
  );

  const dismissSecret = useCallback(() => {
    setTemporarySecret(null);
  }, []);

  const roleOptions = useMemo(() => ROLE_OPTIONS, []);

  if (isSessionLoading) {
    return null;
  }

  if (!canManageUsers) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="mx-auto w-full max-w-3xl flex-1 p-8">
        <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <h2 className="mb-2 text-base font-semibold text-amber-900">Super Admin Guidance</h2>
          <p className="mb-2">
            Rotate the seeded super-admin credentials immediately after receiving access. Use this
            tool to onboard moderators and analysts, and coordinate password resets once the read /
            reset endpoints go live.
          </p>
          <p className="font-medium">
            Temporary credentials are only shown once&mdash;securely transfer them to the operator
            and instruct them to update their password during the first sign-in.
          </p>
        </section>

        <form className="rounded-lg bg-white p-8 shadow-md" onSubmit={handleSubmit}>
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Provision New Account</h1>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="off"
                className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.username
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                value={formValues.username}
                onChange={(event) => handleChange('username', event.target.value)}
              />
              {fieldErrors.username && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.username}</p>
              )}
            </div>

            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="off"
                className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                value={formValues.email}
                onChange={(event) => handleChange('email', event.target.value)}
              />
              {fieldErrors.email && <p className="mt-2 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.role
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                value={formValues.role}
                onChange={(event) => handleChange('role', event.target.value)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.role && <p className="mt-2 text-xs text-red-600">{fieldErrors.role}</p>}
            </div>

            <div className="md:col-span-1">
              <label
                className="mb-2 block text-sm font-medium text-gray-700"
                htmlFor="temporaryPassword"
              >
                Temporary Password (optional)
              </label>
              <div className="relative">
                <input
                  id="temporaryPassword"
                  name="temporaryPassword"
                  type={showTemporaryPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full rounded border px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 ${
                    fieldErrors.temporaryPassword
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  value={formValues.temporaryPassword}
                  onChange={(event) => handleChange('temporaryPassword', event.target.value)}
                  placeholder="Auto-generate if left blank"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 mr-2 flex items-center rounded px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  onClick={() => setShowTemporaryPassword((value) => !value)}
                  aria-pressed={showTemporaryPassword}
                >
                  {showTemporaryPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.temporaryPassword && (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.temporaryPassword}</p>
              )}
            </div>
          </div>

          {formError && (
            <div className="mt-6 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{formError}</p>
              {issueList.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {issueList.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => {
                resetForm();
                setFieldErrors({});
                setFormError(null);
                setIssueList([]);
                setShowTemporaryPassword(false);
              }}
              disabled={isSubmitting}
            >
              Clear
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>

        {provisionSummary && (
          <section className="mt-6 rounded-lg border border-green-400 bg-green-50 p-6 text-sm text-green-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Account Provisioned</h2>
                <p className="mt-1">
                  Share the details below with the operator and confirm they change their password
                  at first login.
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wide text-green-800"
                onClick={() => {
                  setProvisionSummary(null);
                  setTemporarySecret(null);
                }}
              >
                Dismiss
              </button>
            </div>
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-green-700">Username</dt>
                <dd className="text-sm font-medium">{provisionSummary.username}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-green-700">Email</dt>
                <dd className="text-sm font-medium">{provisionSummary.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-green-700">Role</dt>
                <dd className="text-sm font-medium">{provisionSummary.role}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-green-700">
                  Requires Password Change
                </dt>
                <dd className="text-sm font-medium">
                  {provisionSummary.requiresPasswordChange ? 'Yes' : 'No'}
                </dd>
              </div>
            </dl>
            {temporarySecret && (
              <div className="mt-4 rounded border border-green-500 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-700">
                      Temporary Password (copy and send securely)
                    </p>
                    <p className="mt-2 font-mono text-sm">{temporarySecret}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-wide text-green-800"
                    onClick={dismissSecret}
                  >
                    Hide
                  </button>
                </div>
                <p className="mt-3 text-xs text-green-700">
                  This value will not be retrievable after you hide it or leave this page.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPage;
