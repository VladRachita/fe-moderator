'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/use-session';
import { rotatePassword, PasswordRotationError } from '@/services/account-service';
import type { IUserSession } from '@/types';
import { validatePasswordPolicy } from '@/lib/password-policy';

type FieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

const resolveDestination = (details: IUserSession | null | undefined): string => {
  if (!details) {
    return '/login';
  }
  if (details.permissions.canModerate) {
    return '/dashboard';
  }
  if (details.permissions.canViewAnalytics) {
    return '/analytics';
  }
  if (details.permissions.canManageUsers) {
    return '/super-admin';
  }
  return '/login';
};

const PasswordRotationPage: React.FC = () => {
  const router = useRouter();
  const { session, isLoading: isSessionLoading, refresh } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [issueList, setIssueList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }
    if (!session?.authenticated) {
      router.replace('/login?returnTo=/account/password');
      return;
    }
    if (session.needsPasswordChange !== true) {
      router.replace(resolveDestination(session));
    }
  }, [isSessionLoading, session, router]);

  const validateFields = useCallback(() => {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!currentPassword.trim()) {
      errors.currentPassword = 'Enter your current password.';
    }
    const newPasswordError = validatePasswordPolicy(newPassword);
    if (newPasswordError) {
      errors.newPassword = newPasswordError;
    }
    if (newPassword.trim() && confirmPassword.trim() && newPassword.trim() !== confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmation must match the new password.';
    }
    setFieldErrors(errors);
    return errors;
  }, [confirmPassword, newPassword, currentPassword]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setIssueList([]);
      setSuccessMessage(null);

      const validationErrors = validateFields();
      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      const payload = {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim() || undefined,
      };

      setIsSubmitting(true);
      try {
        await rotatePassword(payload);
        setSuccessMessage('Password updated successfully. Redirecting to your dashboard…');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refresh();
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Unknown error');
        setFormError(typedError.message);
        if (typedError instanceof PasswordRotationError) {
          setIssueList(typedError.issues);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [confirmPassword, currentPassword, newPassword, refresh, validateFields],
  );

  const passwordHints = useMemo(
    () => [
      'At least 12 characters long',
      'Include uppercase and lowercase letters',
      'Include at least one number',
      'Include at least one symbol',
    ],
    [],
  );

  if (isSessionLoading || session?.needsPasswordChange === undefined) {
    return null;
  }

  if (!session?.authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Update Your Password</h1>
        <p className="mt-2 text-sm text-gray-600">
          For security reasons you must rotate your password before continuing. Choose a strong password that meets the policy below.
        </p>

        <section className="mt-4 rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <h2 className="font-semibold">Password requirements:</h2>
          <ul className="mt-2 list-disc pl-5">
            {passwordHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </section>

        {successMessage && (
          <div className="mt-4 rounded border border-green-400 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMessage}
          </div>
        )}

        {formError && (
          <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
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

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="currentPassword">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`w-full rounded border px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.currentPassword
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 mr-2 flex items-center rounded px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                onClick={() => setShowCurrentPassword((value) => !value)}
                aria-pressed={showCurrentPassword}
              >
                {showCurrentPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.currentPassword}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="newPassword">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`w-full rounded border px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 ${
                  fieldErrors.newPassword
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 mr-2 flex items-center rounded px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                onClick={() => setShowNewPassword((value) => !value)}
                aria-pressed={showNewPassword}
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.confirmPassword
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordRotationPage;
