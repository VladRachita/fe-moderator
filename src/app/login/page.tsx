'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9._+-]+(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?$/;
const IDENTIFIER_PATTERN_SOURCE = '^[A-Za-z0-9._+-]+(?:@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})?$';

const errorMessages: Record<string, string> = {
  missing_credentials: 'Enter both email and password to continue.',
  authentication_failed: 'Authentication failed. Check your credentials and try again.',
  authorization_failed: 'You do not have access to any dashboards. Contact your administrator.',
  refresh_failed: 'Your session has expired. Please sign in again.',
  session_expired: 'Session expired. Log in to continue.',
  state_mismatch: 'Security check failed. Please try again.',
  rate_limit_exceeded: 'Too many login attempts. Please wait a few minutes and try again.',
  invalid_input: 'Invalid input. Check your email and password length.',
  login_code_required: 'A login code is required for your account. Enter your code and try again.',
  invalid_code: 'Invalid login code. Check the code and try again.',
  verification_failed: 'Unable to verify your login code. Please try again.',
  default: 'Unable to sign you in right now. Please try again.',
};

const infoMessages: Record<string, string> = {
  logged_out: 'You have been signed out of your session.',
  logout_failed: 'We could not confirm the logout with the server. Sign in again to continue.',
};

const LOGIN_CODE_PATTERN = /^[A-Za-z0-9]{6,12}$/;

const LoginFormContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loginCode, setLoginCode] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const returnTo = searchParams.get('returnTo') ?? undefined;

  const displayError = formError ?? (error ? errorMessages[error] ?? errorMessages.default : null);
  const infoBanner = message ? infoMessages[message] ?? null : null;

  const submitLogin = async (code?: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: identifier.trim(),
        password,
        returnTo,
        ...(code ? { loginCode: code } : {}),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorKey = typeof data.error === 'string' ? data.error : 'authentication_failed';
      return { ok: false, errorKey } as const;
    }

    const data = (await response.json()) as { redirect?: string };
    return { ok: true, redirect: data.redirect ?? '/dashboard' } as const;
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setFormError(errorMessages.missing_credentials);
      return;
    }
    if (!IDENTIFIER_PATTERN.test(trimmedIdentifier)) {
      setFormError(
        'Enter a valid email address or username (letters, numbers, ., _, -, +; include a domain when using @).',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitLogin();
      if (result.ok) {
        router.push(result.redirect);
        return;
      }
      if (result.errorKey === 'login_code_required') {
        setShowCodeModal(true);
        setCodeError(null);
        setLoginCode('');
      } else {
        setFormError(errorMessages[result.errorKey] ?? errorMessages.default);
      }
    } catch (err) {
      console.error('Login submission failed', err);
      setFormError(errorMessages.default);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCodeError(null);
    const trimmedCode = loginCode.trim();
    if (!trimmedCode || !LOGIN_CODE_PATTERN.test(trimmedCode)) {
      setCodeError('Enter a valid login code (6-12 alphanumeric characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitLogin(trimmedCode);
      if (result.ok) {
        router.push(result.redirect);
        return;
      }
      if (result.errorKey === 'invalid_code' || result.errorKey === 'verification_failed') {
        setCodeError(errorMessages[result.errorKey] ?? errorMessages.default);
      } else {
        // Credentials issue or rate limit — close modal, show on main form
        setShowCodeModal(false);
        setLoginCode('');
        setFormError(errorMessages[result.errorKey] ?? errorMessages.default);
      }
    } catch {
      setCodeError(errorMessages.default);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCodeModal = () => {
    setShowCodeModal(false);
    setLoginCode('');
    setCodeError(null);
  };

  return (
    <>
      <h1 className="mb-6 text-center text-3xl font-bold">Sign in</h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        Sign in with your work email address or username alongside your password to access the dashboards.
      </p>
      {infoBanner && (
        <div className="mb-4 rounded border border-blue-600 bg-blue-100 px-3 py-2 text-sm text-blue-800">
          {infoBanner}
        </div>
      )}
      {displayError && (
        <div className="mb-4 rounded border border-red-600 bg-red-100 px-3 py-2 text-sm text-red-800">
          {displayError}
        </div>
      )}
      <form className="space-y-4" onSubmit={handleLoginSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="identifier">
            Email or Username
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            pattern={IDENTIFIER_PATTERN_SOURCE}
            inputMode="email"
            maxLength={254}
            title="Use letters, numbers, ., _, -, +, and include a domain when using @"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full rounded border border-gray-300 px-3 py-2 pr-16 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              maxLength={128}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 mr-2 flex items-center rounded px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-center text-xl font-bold">Login Code</h2>
            <p className="mb-4 text-center text-sm text-gray-600">
              Your account requires a login code. Enter the code provided by your administrator.
            </p>
            {codeError && (
              <div className="mb-4 rounded border border-red-600 bg-red-100 px-3 py-2 text-sm text-red-800">
                {codeError}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleCodeSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="loginCode">
                  Login Code
                </label>
                <input
                  id="loginCode"
                  name="loginCode"
                  type="text"
                  autoComplete="one-time-code"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
                  value={loginCode}
                  onChange={(event) => setLoginCode(event.target.value)}
                  required
                  maxLength={12}
                  pattern="^[A-Za-z0-9]{6,12}$"
                  title="6-12 alphanumeric characters"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleCancelCodeModal}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const LoginFormFallback: React.FC = () => (
  <>
    <h1 className="mb-6 text-center text-3xl font-bold">Sign in</h1>
    <p className="mb-6 text-center text-sm text-gray-600">
      Sign in with your work email address or username alongside your password to access the dashboards.
    </p>
    <div className="animate-pulse space-y-4">
      <div className="h-10 rounded bg-gray-200" />
      <div className="h-10 rounded bg-gray-200" />
      <div className="h-10 rounded bg-gray-300" />
    </div>
  </>
);

const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  );
};

export default LoginPage;
