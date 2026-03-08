import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy - VideoSanity',
  description: 'Cookie policy for the VideoSanity moderation platform.',
};

const CookiesPage: React.FC = () => {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="mb-4 text-3xl font-bold text-black">Cookie Policy</h1>
        <p className="text-sm text-gray-500">Last updated: March 8, 2026</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">1. What Are Cookies</h2>
        <p className="leading-relaxed text-gray-700">
          Cookies are small text files stored on your device by your web browser when you visit a
          website. They are widely used to make websites function correctly, provide security
          features, and collect usage information.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">2. Cookies We Use</h2>
        <p className="leading-relaxed text-gray-700">
          The VideoSanity moderation platform uses only strictly necessary cookies required for
          authentication and security. We do not use any marketing, analytics, or third-party
          tracking cookies.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 pr-4 text-left font-semibold text-black">Cookie Name</th>
                <th className="py-3 pr-4 text-left font-semibold text-black">Purpose</th>
                <th className="py-3 pr-4 text-left font-semibold text-black">Duration</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-mono text-xs">mod_access_token</td>
                <td className="py-3 pr-4">Authenticates your session with the platform.</td>
                <td className="py-3 pr-4">10 minutes</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-mono text-xs">mod_refresh_token</td>
                <td className="py-3 pr-4">Allows silent session renewal without re-entering credentials.</td>
                <td className="py-3 pr-4">7 days</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-mono text-xs">mod_session_meta</td>
                <td className="py-3 pr-4">Stores non-sensitive session metadata for the client.</td>
                <td className="py-3 pr-4">Session</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-mono text-xs">mod_csrf_token</td>
                <td className="py-3 pr-4">Protects against cross-site request forgery attacks.</td>
                <td className="py-3 pr-4">Session</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-mono text-xs">mod_oauth_state</td>
                <td className="py-3 pr-4">Validates the OAuth authorization flow integrity.</td>
                <td className="py-3 pr-4">5 minutes</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-mono text-xs">mod_pkce_v</td>
                <td className="py-3 pr-4">Stores the PKCE code verifier during authentication.</td>
                <td className="py-3 pr-4">5 minutes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">3. Strictly Necessary Classification</h2>
        <p className="leading-relaxed text-gray-700">
          All cookies listed above are classified as strictly necessary under GDPR Article 6(1)(f)
          and the ePrivacy Directive. They are essential for the platform to function and cannot be
          disabled. Without these cookies, authentication and security protections would not operate
          correctly.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">4. Third-Party Cookies</h2>
        <p className="leading-relaxed text-gray-700">
          This platform does not set any third-party cookies. We do not integrate advertising
          networks, social media widgets, or third-party analytics services that would place cookies
          on your device.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">5. Managing Cookies</h2>
        <p className="leading-relaxed text-gray-700">
          You can configure your browser to block or delete cookies at any time. However, since all
          cookies on this platform are strictly necessary for authentication, blocking them will
          prevent you from signing in and using the moderation tools. Refer to your browser&apos;s
          help documentation for instructions on managing cookie settings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">6. Contact</h2>
        <p className="leading-relaxed text-gray-700">
          For questions about our use of cookies, please contact your organization&apos;s data
          protection officer or platform administrator.
        </p>
      </section>
    </article>
  );
};

export default CookiesPage;
