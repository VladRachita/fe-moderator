'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth/use-session';

const HostDashboardPage: React.FC = () => {
  const { session } = useSession();
  const displayName = session?.name ?? session?.email ?? 'there';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {displayName}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your reservations from the web. Coupon management remains in the Android app for now.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Link
          href="/host/reservations"
          className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">Reservations</h2>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="ml-auto size-5 text-gray-400 group-hover:text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            Approve, reject, complete, or cancel customer reservations. Updates from your phone show up here within 25 seconds.
          </p>
        </Link>

        <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Coupons</h2>
            <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              Android only
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Toggle, delete, and adjust usage limits on existing coupons from the Android app. Web management coming in a future release.
          </p>
        </article>
      </section>
    </div>
  );
};

export default HostDashboardPage;
