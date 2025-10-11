'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const errorMessages: Record<string, string> = {
  missing_credentials: 'Enter both email and password to continue.',
  authentication_failed: 'Authentication failed. Check your credentials and try again.',
  authorization_failed: 'You do not have access to any dashboards. Contact your administrator.',
  refresh_failed: 'Your session has expired. Please sign in again.',
  session_expired: 'Session expired. Log in to continue.',
  state_mismatch: 'Security check failed. Please try again.',
  default: 'Unable to sign you in right now. Please try again.',
};

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const error = searchParams.get('error');
  const returnTo = searchParams.get('returnTo') ?? undefined;

  const displayError = formError ?? (error ? errorMessages[error] ?? errorMessages.default : null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError(errorMessages.missing_credentials);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, returnTo }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorKey = typeof data.error === 'string' ? data.error : 'authentication_failed';
        setFormError(errorMessages[errorKey] ?? errorMessages.default);
        setIsSubmitting(false);
        return;
      }

      const data = (await response.json()) as { redirect?: string };
      router.push(data.redirect ?? '/dashboard');
    } catch (err) {
      console.error('Login submission failed', err);
      setFormError(errorMessages.default);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold">Moderator Login</h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Use your workstation credentials to start a moderated session.
        </p>
        {displayError && (
          <div className="mb-4 rounded border border-red-600 bg-red-100 px-3 py-2 text-sm text-red-800">
            {displayError}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
