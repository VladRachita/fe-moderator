'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listReports,
  reviewReport,
  ReportServiceError,
} from '@/services/report-service';
import { useSession } from '@/lib/auth/use-session';
import type { IReport, ReportStatus } from '@/types';

const GeneralPage: React.FC = () => {
  const { session, isLoading: isSessionLoading } = useSession();
  const canManageUsers = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );

  const [reports, setReports] = useState<IReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportActiveTab, setReportActiveTab] = useState<ReportStatus>('PENDING');
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null);

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
    if (isSessionLoading || !canManageUsers) return;
    loadReports();
  }, [isSessionLoading, canManageUsers, loadReports]);

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

  return (
    <>
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

      <section className="rounded-lg bg-white p-8 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              Reports
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Review and action user and video reports.
            </p>
          </div>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => { void loadReports(); }}
            disabled={reportsLoading}
          >
            {reportsLoading ? 'Refreshing\u2026' : 'Refresh'}
          </button>
        </div>

        {reportsError && (
          <div className="mt-4 rounded border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {reportsError}
          </div>
        )}

        <div className="mt-6 flex gap-2 border-b border-gray-200">
          {(['PENDING', 'REVIEWED', 'DISMISSED'] as ReportStatus[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`px-4 py-2 text-sm font-semibold transition ${
                reportActiveTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setReportActiveTab(tab)}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {reportsLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading reports&hellip;</div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No {reportActiveTab.toLowerCase()} reports.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reporter</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Target</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    {reportActiveTab === 'PENDING' && (
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((report) => {
                    const isReviewing = reviewingReportId === report.id;

                    return (
                      <tr key={report.id}>
                        <td className="px-4 py-3">{report.reporterUsername}</td>
                        <td className="px-4 py-3">{report.reportType}</td>
                        <td className="px-4 py-3">
                          {report.reportType === 'VIDEO'
                            ? report.targetVideoTitle || report.targetVideoId || '\u2014'
                            : report.targetUsername || report.targetUserId || '\u2014'}
                        </td>
                        <td className="px-4 py-3">{report.reason.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        {reportActiveTab === 'PENDING' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReviewReport(report.id, 'REVIEWED')}
                                disabled={isReviewing}
                                className="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-50"
                              >
                                Reviewed
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewReport(report.id, 'DISMISSED')}
                                disabled={isReviewing}
                                className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-50"
                              >
                                Dismiss
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default GeneralPage;
