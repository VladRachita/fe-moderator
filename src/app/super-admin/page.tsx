'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  AdminUserProvisionError,
  AdminUserRoleUpdateError,
  AdminUserListError,
} from '@/services/admin-service';
import {
  listHostApplications,
  reviewHostApplication,
  ApplicationListError,
  ApplicationReviewError,
} from '@/services/business-service';
import {
  listReports,
  reviewReport,
  ReportServiceError,
} from '@/services/report-service';
import { useSession } from '@/lib/auth/use-session';
import type {
  PlatformRole,
  IAdminUserProvisionResult,
  IStaffUserSummary,
  IHostApplication,
  ApplicationStatus,
  IReport,
  ReportStatus,
} from '@/types';
import { validatePasswordPolicy } from '@/lib/password-policy';

const ROLE_OPTIONS: { label: string; value: PlatformRole }[] = [
  { label: 'Moderator', value: 'MODERATOR' },
  { label: 'Analyst', value: 'ANALYST' },
];

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,80}$/;

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
  const [staffMembers, setStaffMembers] = useState<IStaffUserSummary[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [roleChangeState, setRoleChangeState] = useState<Record<string, boolean>>({});
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

  // Host application state
  const [applications, setApplications] = useState<IHostApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('PENDING');
  const [selectedApplication, setSelectedApplication] = useState<IHostApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingState, setReviewingState] = useState<Record<string, boolean>>({});
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Report moderation state
  const [reports, setReports] = useState<IReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportActiveTab, setReportActiveTab] = useState<ReportStatus>('PENDING');
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null);

  const roleOrder = useMemo(() => ({ MODERATOR: 0, ANALYST: 1 }), []);

  const sortStaffMembers = useCallback(
    (members: IStaffUserSummary[]): IStaffUserSummary[] => {
      return [...members].sort((a, b) => {
        const roleComparison = roleOrder[a.role] - roleOrder[b.role];
        if (roleComparison !== 0) {
          return roleComparison;
        }
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdA - createdB;
      });
    },
    [roleOrder],
  );

  const loadStaff = useCallback(async (): Promise<void> => {
    if (!canManageUsers) {
      setStaffMembers([]);
      return;
    }
    setIsStaffLoading(true);
    setStaffError(null);
    try {
      const staffList = await listAdminUsers();
      setStaffMembers(sortStaffMembers(staffList));
      setRoleChangeState({});
      setRoleChangeError(null);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error('Failed to load staff.');
      if (
        typedError instanceof AdminUserListError &&
        (typedError.status === 401 || typedError.status === 403)
      ) {
        setStaffMembers([]);
        router.replace('/login?error=authorization_failed');
        return;
      }
      const fallback =
        typedError instanceof AdminUserListError && typedError.issues.length > 0
          ? typedError.issues[0]
          : typedError.message;
      setStaffError(fallback);
      setStaffMembers([]);
    } finally {
      setIsStaffLoading(false);
    }
  }, [canManageUsers, router, sortStaffMembers]);

  const loadApplications = useCallback(
    async (status: ApplicationStatus = 'PENDING'): Promise<void> => {
      if (!canManageUsers) {
        setApplications([]);
        return;
      }
      setApplicationsLoading(true);
      setApplicationsError(null);
      try {
        const result = await listHostApplications(status, 0, 50);
        setApplications(result.applications);
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Failed to load applications.');
        if (
          typedError instanceof ApplicationListError &&
          (typedError.status === 401 || typedError.status === 403)
        ) {
          setApplications([]);
          router.replace('/login?error=authorization_failed');
          return;
        }
        const fallback =
          typedError instanceof ApplicationListError && typedError.issues.length > 0
            ? typedError.issues[0]
            : typedError.message;
        setApplicationsError(fallback);
        setApplications([]);
      } finally {
        setApplicationsLoading(false);
      }
    },
    [canManageUsers, router],
  );

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

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }
    if (!canManageUsers) {
      setStaffMembers([]);
      setRoleChangeState({});
      return;
    }
    void loadStaff();
  }, [isSessionLoading, canManageUsers, identityVersion, loadStaff]);

  useEffect(() => {
    if (isSessionLoading || !canManageUsers) {
      return;
    }
    void loadApplications(activeTab);
  }, [isSessionLoading, canManageUsers, activeTab, identityVersion, loadApplications]);

  const loadReports = useCallback(async () => {
    if (!canManageUsers) return;
    setReportsLoading(true);
    setReportsError(null);
    try {
      const page = await listReports(reportActiveTab, 0, 50);
      setReports(page.items);
    } catch (error) {
      if (error instanceof ReportServiceError) {
        setReportsError(error.message);
      } else {
        setReportsError('Failed to load reports');
      }
    } finally {
      setReportsLoading(false);
    }
  }, [canManageUsers, reportActiveTab]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleReviewReport = async (reportId: string, status: ReportStatus) => {
    setReviewingReportId(reportId);
    try {
      await reviewReport(reportId, status);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (error) {
      if (error instanceof ReportServiceError) {
        setReportsError(error.message);
      } else {
        setReportsError('Failed to review report');
      }
    } finally {
      setReviewingReportId(null);
    }
  };

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
    } else if (!USERNAME_PATTERN.test(trimmedUsername)) {
      nextErrors.username =
        'Username must be 3-80 characters using letters, numbers, dots, underscores, or hyphens.';
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

  const handleRoleSelection = useCallback(
    async (user: IStaffUserSummary, nextRole: PlatformRole) => {
      if (user.role === nextRole) {
        return;
      }

      const confirmed = window.confirm(
        `Change ${user.username}'s role to ${nextRole.toLowerCase()}? Their current session will be revoked.`,
      );
      if (!confirmed) {
        return;
      }

      setRoleChangeError(null);
      setRoleChangeState((prev) => ({ ...prev, [user.userId]: true }));
      setStaffMembers((prev) =>
        sortStaffMembers(
          prev.map((entry) =>
            entry.userId === user.userId
              ? {
                  ...entry,
                  role: nextRole,
                }
              : entry,
          ),
        ),
      );

      try {
        await updateAdminUserRole(user.userId, nextRole);
        await loadStaff();
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Failed to update role.');
        const message =
          typedError instanceof AdminUserRoleUpdateError && typedError.issues.length > 0
            ? typedError.issues[0]
            : typedError.message;
        setRoleChangeError(message);
        setStaffMembers((prev) =>
          sortStaffMembers(
            prev.map((entry) =>
              entry.userId === user.userId
                ? {
                    ...entry,
                    role: user.role,
                  }
                : entry,
            ),
          ),
        );
      } finally {
        setRoleChangeState((prev) => {
          const next = { ...prev };
          delete next[user.userId];
          return next;
        });
      }
    },
    [loadStaff, sortStaffMembers],
  );

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
        await loadStaff();
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
    [deriveErrorMessage, formValues, loadStaff, resetForm, validateForm],
  );

  const dismissSecret = useCallback(() => {
    setTemporarySecret(null);
  }, []);

  const handleReviewApplication = useCallback(
    async (applicationId: string, status: 'APPROVED' | 'REJECTED') => {
      const app = applications.find((a) => a.applicationId === applicationId);
      if (!app) {
        return;
      }

      const actionText = status === 'APPROVED' ? 'approve' : 'reject';
      const confirmed = window.confirm(
        `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} application from ${app.businessName}?`,
      );
      if (!confirmed) {
        return;
      }

      setReviewError(null);
      setReviewingState((prev) => ({ ...prev, [applicationId]: true }));

      try {
        await reviewHostApplication(applicationId, {
          status,
          reviewNotes: reviewNotes.trim() || undefined,
        });
        setReviewNotes('');
        setSelectedApplication(null);
        await loadApplications(activeTab);
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Failed to review application.');
        const message =
          typedError instanceof ApplicationReviewError && typedError.issues.length > 0
            ? typedError.issues[0]
            : typedError.message;
        setReviewError(message);
      } finally {
        setReviewingState((prev) => {
          const next = { ...prev };
          delete next[applicationId];
          return next;
        });
      }
    },
    [applications, reviewNotes, activeTab, loadApplications],
  );

  const roleOptions = useMemo(() => ROLE_OPTIONS, []);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

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

        <section className="mt-8 rounded-lg bg-white p-8 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Platform Users</h2>
              <p className="mt-1 text-sm text-gray-600">
                Manage moderator and analyst assignments. Role updates immediately revoke existing sessions.
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void loadStaff();
              }}
              disabled={isStaffLoading}
            >
              {isStaffLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {staffError && (
            <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {staffError}
            </div>
          )}

          {roleChangeError && (
            <div className="mt-4 rounded border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {roleChangeError}
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffMembers.length === 0 && !isStaffLoading && !staffError ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                      No staff members found.
                    </td>
                  </tr>
                ) : null}
                {isStaffLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                      Loading staff…
                    </td>
                  </tr>
                ) : null}
                {!isStaffLoading &&
                  staffMembers.map((member) => {
                    const isUpdating = roleChangeState[member.userId] === true;
                    return (
                      <tr key={member.userId} className={isUpdating ? 'bg-blue-50/40' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{member.username}</div>
                          <div className="text-xs text-gray-500">{member.email ?? 'No email on file'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {member.mustRotatePassword ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                              <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
                              Rotation required
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {member.lastPasswordRotation
                                ? `Rotated ${dateFormatter.format(new Date(member.lastPasswordRotation))}`
                                : 'Rotation pending'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {dateFormatter.format(new Date(member.createdAt))}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            value={member.role}
                            onChange={(event) => {
                              const nextRole = event.target.value as PlatformRole;
                              void handleRoleSelection(member, nextRole);
                            }}
                            disabled={isUpdating}
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isUpdating && (
                            <p className="mt-1 text-xs text-blue-600">Updating…</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-lg bg-white p-8 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Host Applications</h2>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve/reject business host applications.
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void loadApplications(activeTab);
              }}
              disabled={applicationsLoading}
            >
              {applicationsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {reviewError && (
            <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {reviewError}
            </div>
          )}

          {applicationsError && (
            <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {applicationsError}
            </div>
          )}

          <div className="mt-6 flex gap-2 border-b border-gray-200">
            {(['PENDING', 'APPROVED', 'REJECTED'] as ApplicationStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === status
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab(status)}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {applicationsLoading ? (
              <div className="py-12 text-center text-sm text-gray-500">Loading applications…</div>
            ) : applications.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No {activeTab.toLowerCase()} applications found.
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const isReviewing = reviewingState[app.applicationId] === true;
                  const isSelected = selectedApplication?.applicationId === app.applicationId;

                  return (
                    <div
                      key={app.applicationId}
                      className={`rounded-lg border p-6 transition ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {app.businessName}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600">
                                {app.category} • {app.priceRange}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                app.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : app.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <dt className="font-semibold text-gray-700">Applicant</dt>
                                  <dd className="text-gray-900">{app.username}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-gray-700">Email</dt>
                                  <dd className="text-gray-900">{app.email}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-gray-700">Phone</dt>
                                  <dd className="text-gray-900">{app.phoneNumber}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-gray-700">Address</dt>
                                  <dd className="text-gray-900">{app.businessAddress}</dd>
                                </div>
                              </div>
                              <div>
                                <dt className="font-semibold text-gray-700">Services Offered</dt>
                                <dd className="mt-1 text-gray-900">{app.servicesOffered}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-gray-700">Business Hours</dt>
                                <dd className="mt-1 space-y-1 text-gray-900">
                                  {[
                                    { key: 'monday', label: 'Monday' },
                                    { key: 'tuesday', label: 'Tuesday' },
                                    { key: 'wednesday', label: 'Wednesday' },
                                    { key: 'thursday', label: 'Thursday' },
                                    { key: 'friday', label: 'Friday' },
                                    { key: 'saturday', label: 'Saturday' },
                                    { key: 'sunday', label: 'Sunday' },
                                  ].map(({ key, label }) => (
                                    <div key={key} className="flex justify-between">
                                      <span>{label}:</span>
                                      <span>{app.businessHours[key as keyof typeof app.businessHours]}</span>
                                    </div>
                                  ))}
                                </dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-gray-700">Submitted</dt>
                                <dd className="text-gray-900">
                                  {dateFormatter.format(new Date(app.submittedAt))}
                                </dd>
                              </div>
                              {app.reviewedAt && (
                                <>
                                  <div>
                                    <dt className="font-semibold text-gray-700">Reviewed</dt>
                                    <dd className="text-gray-900">
                                      {dateFormatter.format(new Date(app.reviewedAt))}
                                    </dd>
                                  </div>
                                  {app.reviewNotes && (
                                    <div>
                                      <dt className="font-semibold text-gray-700">Review Notes</dt>
                                      <dd className="mt-1 text-gray-900">{app.reviewNotes}</dd>
                                    </div>
                                  )}
                                </>
                              )}

                              {app.status === 'PENDING' && (
                                <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                                  <div>
                                    <label
                                      htmlFor="reviewNotes"
                                      className="block text-sm font-semibold text-gray-700"
                                    >
                                      Review Notes (optional)
                                    </label>
                                    <textarea
                                      id="reviewNotes"
                                      rows={3}
                                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      placeholder="Enter optional notes about this decision..."
                                      disabled={isReviewing}
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() =>
                                        handleReviewApplication(app.applicationId, 'APPROVED')
                                      }
                                      disabled={isReviewing}
                                    >
                                      {isReviewing ? 'Processing…' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() =>
                                        handleReviewApplication(app.applicationId, 'REJECTED')
                                      }
                                      disabled={isReviewing}
                                    >
                                      {isReviewing ? 'Processing…' : 'Reject'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                          onClick={() =>
                            setSelectedApplication(isSelected ? null : app)
                          }
                        >
                          {isSelected ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ==================== REPORTS SECTION ==================== */}
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Reports
          </h2>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['PENDING', 'REVIEWED', 'DISMISSED'] as ReportStatus[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setReportActiveTab(tab)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: reportActiveTab === tab ? '#3b82f6' : '#ffffff',
                  color: reportActiveTab === tab ? '#ffffff' : '#374151',
                  cursor: 'pointer',
                  fontWeight: reportActiveTab === tab ? 'bold' : 'normal',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {reportsError && (
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{reportsError}</div>
          )}

          {reportsLoading ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No {reportActiveTab.toLowerCase()} reports.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Reporter</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Target</th>
                  <th style={{ padding: '0.75rem' }}>Reason</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  {reportActiveTab === 'PENDING' && (
                    <th style={{ padding: '0.75rem' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>{report.reporterUsername}</td>
                    <td style={{ padding: '0.75rem' }}>{report.reportType}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {report.reportType === 'VIDEO'
                        ? report.targetVideoTitle || report.targetVideoId || '—'
                        : report.targetUsername || report.targetUserId || '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{report.reason.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    {reportActiveTab === 'PENDING' && (
                      <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleReviewReport(report.id, 'REVIEWED')}
                          disabled={reviewingReportId === report.id}
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            cursor: reviewingReportId === report.id ? 'wait' : 'pointer',
                            opacity: reviewingReportId === report.id ? 0.5 : 1,
                          }}
                        >
                          Reviewed
                        </button>
                        <button
                          onClick={() => handleReviewReport(report.id, 'DISMISSED')}
                          disabled={reviewingReportId === report.id}
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            cursor: reviewingReportId === report.id ? 'wait' : 'pointer',
                            opacity: reviewingReportId === report.id ? 0.5 : 1,
                          }}
                        >
                          Dismiss
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default SuperAdminPage;
