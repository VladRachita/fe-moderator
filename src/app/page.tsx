import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { COOKIE_NAMES } from '@/lib/auth/constants';
import { decrypt } from '@/lib/auth/crypto';
import { getAuthConfig } from '@/lib/auth/config';
import { decodeJwtPayload, mapSessionDetails, type SessionDetails } from '@/lib/auth/jwt';

const LandingPage = async () => {
  const cookieStore = await cookies();
  const encryptedAccess = cookieStore.get(COOKIE_NAMES.accessToken)?.value;

  let session: SessionDetails | null = null;
  if (encryptedAccess) {
    try {
      const accessToken = decrypt(encryptedAccess, getAuthConfig().cookieSecret);
      const payload = decodeJwtPayload(accessToken);
      const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
      const now = Math.floor(Date.now() / 1000);
      if (!exp || exp > now) {
        session = mapSessionDetails(payload);
      }
    } catch {
      // Tampered or unreadable token — fall through to the public landing.
    }
  }

  // DO NOT wrap these redirect() calls in try/catch. `redirect()` throws
  // NEXT_REDIRECT which Next.js MUST receive at the framework boundary; a
  // future edit that widens the catch above to cover these lines silently
  // breaks the authenticated-user redirect and leaves the user on the
  // public landing. Priority mirrors /api/auth/login/route.ts default
  // redirect ladder.
  if (session?.authenticated && !session.needsPasswordChange) {
    if (session.permissions.canModerate) redirect('/dashboard');
    if (session.permissions.canViewAnalytics) redirect('/analytics');
    if (session.permissions.canManageUsers) redirect('/super-admin');
    if (session.permissions.canManageBusinesses && session.userType === 'HOST') {
      redirect('/host');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
