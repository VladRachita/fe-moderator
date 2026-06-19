'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/use-session';
import { useLogout } from '@/lib/auth/use-logout';

const Header: React.FC = () => {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const { session, forceLogout } = useSession();
  const { logout, isLoggingOut, error: logoutError } = useLogout(forceLogout);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isModerator = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canModerate,
  );
  const isAnalyst = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canViewAnalytics,
  );
  const isSuperAdmin = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canManageUsers,
  );
  const isHost = Boolean(
    session?.authenticated &&
      !session?.needsPasswordChange &&
      session.permissions.canManageBusinesses &&
      session.userType === 'HOST',
  );

  // Priority mirrors the login-route default-redirect ladder at
  // /api/auth/login/route.ts so a super-admin (canModerate AND
  // canManageUsers) lands on /dashboard just like after a fresh login.
  const logoHref =
    isModerator   ? '/dashboard'
    : isAnalyst     ? '/analytics'
    : isSuperAdmin  ? '/super-admin'
    : isHost        ? '/host'
    : '/';

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-8">
        <Link href={logoHref} className="flex items-center gap-2">
          <Image src="/logo.png" alt="Merg logo" width={32} height={32} priority />
          <h1 className="text-xl font-bold">Video Review Playlist</h1>
        </Link>
        <nav className="flex items-center gap-6">
          {isModerator && (
            <Link href="/dashboard">
              <span
                className={`relative text-sm font-medium ${
                  isClient && pathname.startsWith('/dashboard')
                    ? "font-bold text-black after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-full after:bg-black after:content-['']"
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                Reviews
              </span>
            </Link>
          )}
          {isAnalyst && (
            <Link href="/analytics">
              <span
                className={`relative text-sm font-medium ${
                  isClient && pathname.startsWith('/analytics')
                    ? "font-bold text-black after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-full after:bg-black after:content-['']"
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                Analytics
              </span>
            </Link>
          )}
          {isSuperAdmin && (
            <Link href="/super-admin">
              <span
                className={`relative text-sm font-medium ${
                  isClient && pathname.startsWith('/super-admin')
                    ? "font-bold text-black after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-full after:bg-black after:content-['']"
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                Platform Users
              </span>
            </Link>
          )}
          {isHost && (
            <Link href="/host">
              <span
                className={`relative text-sm font-medium ${
                  isClient && pathname.startsWith('/host')
                    ? "font-bold text-black after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-full after:bg-black after:content-['']"
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                Dashboard
              </span>
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button>
          <Image alt="User avatar" className="rounded-full" src="/logo.png" width={40} height={40} />
        </button>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            className="rounded bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              void logout();
            }}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out…' : 'Logout'}
          </button>
          {logoutError && (
            <span className="text-xs text-red-600">
              We could not reach the logout service. Close this tab if the issue persists.
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
