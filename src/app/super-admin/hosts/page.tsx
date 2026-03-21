'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listHostApplications,
  reviewHostApplication,
  ApplicationListError,
  ApplicationReviewError,
} from '@/services/business-service';
import { useSession } from '@/lib/auth/use-session';
import type { ApplicationStatus, IHostApplication } from '@/types';

const HostApprovalPage: React.FC = () => {
  const router = useRouter();
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [applications, setApplications] = useState<IHostApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('PENDING');
  const [selectedApplication, setSelectedApplication] = useState<IHostApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingState, setReviewingState] = useState<Record<string, boolean>>({});
  const [reviewError, setReviewError] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [],
  );

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
    if (isSessionLoading || !canManageUsers) {
      return;
    }
    void loadApplications(activeTab);
  }, [isSessionLoading, canManageUsers, activeTab, identityVersion, loadApplications]);

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

  return (
    <section className="rounded-lg bg-white p-8 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            Host Applications
          </h2>
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
          {applicationsLoading ? 'Refreshing\u2026' : 'Refresh'}
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
          <div className="py-12 text-center text-sm text-gray-500">Loading applications\u2026</div>
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
                            {app.category} &bull; {app.priceRange}
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
                                  {isReviewing ? 'Processing\u2026' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() =>
                                    handleReviewApplication(app.applicationId, 'REJECTED')
                                  }
                                  disabled={isReviewing}
                                >
                                  {isReviewing ? 'Processing\u2026' : 'Reject'}
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
  );
};

export default HostApprovalPage;
