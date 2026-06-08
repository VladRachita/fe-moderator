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
    <>
      <Navbar />

      <div className="flex-grow pt-[80px]">
        <section className="w-full min-h-[90vh] flex items-center bg-background relative overflow-hidden px-container-margin py-section-gap-mobile md:py-section-gap">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center w-full">
            {/* Hero Copy */}
            <div className="flex flex-col items-start z-10">
              <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary bg-surface-container-low mb-6">
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Mobile Only Exclusivity</span>
              </div>
              <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-6 max-w-2xl">
                Descoperă orașul la un Click Distanță.
              </h1>
              <p className="font-body-lg text-body-lg text-secondary mb-10 max-w-xl">
                O experiență premium, construită exclusiv pentru mobil. Simplifică modul în care descoperi și explorezi cele mai tari locații, direct din buzunarul tău.
              </p>
              {/* iOS/Android Toggle */}
              {/* <div className="flex items-center bg-surface-container-high rounded-full p-1 w-fit mb-8 relative">
                <button className="relative z-10 font-label-sm text-label-sm uppercase tracking-wider px-6 py-2 rounded-full text-on-primary bg-primary transition-colors focus:outline-none" id="btn-ios">iOS</button>
                <button className="relative z-10 font-label-sm text-label-sm uppercase tracking-wider px-6 py-2 rounded-full text-secondary hover:text-primary transition-colors focus:outline-none" id="btn-android">Android</button>
              </div> */}
              {/* QR Code Download */}
              {/* <div className="flex items-center gap-6">
                <div className="w-24 h-24 border border-outline-variant rounded-xl p-2 bg-white relative shrink-0 flex items-center justify-center">
                  <span className="text-xs text-center text-secondary">QR Code</span>
                </div>
              </div> */}
            </div>

            {/* Right Column / Visuals Placeholder */}
            <div className="relative z-10 flex justify-center lg:justify-end">
              {/* Visual goes here */}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default LandingPage;
