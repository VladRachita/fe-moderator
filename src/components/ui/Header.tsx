'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/use-session';

const Header: React.FC = () => {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const { session } = useSession();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isModerator = Boolean(session?.authenticated && session.permissions.canModerate);
  const isAnalyst = Boolean(session?.authenticated && session.permissions.canViewAnalytics);

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-8">
        <Link href="/">
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
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button>
          <Image alt="User avatar" className="rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiKajiDtNMgaU32_95LAooZoEVoRWEjAFZzFLGMq4T8S1QorIoBTO0mpbV9J4LPhzKVaV07eSB59W9_AD3H3mKrWV4oA43YNmImItF8EMtpjyM5cuUpmxZYBvNzxpQD1OPXSEw1W0MviRFY-HPhwNLRsqEssekF5N7q5QQurnMuLoyg_Dci6UOmuUnc2WOLSUX4nmN2cJjNPSPr2XAx1-12PRYUUXhJowZACgshSyttgfs4FCQemFDzfCLjJ0JXIXFUehD2Ui0TA" width={40} height={40} />
        </button>
      </div>
    </header>
  );
};

export default Header;
