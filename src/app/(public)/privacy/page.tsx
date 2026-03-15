import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - merg.ro',
  description: 'Privacy policy for the merg.ro moderation platform.',
};

const PrivacyPage: React.FC = () => {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="mb-4 text-3xl font-bold text-black">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: March 8, 2026</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">1. Introduction</h2>
        <p className="leading-relaxed text-gray-700">
          merg.ro (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the content
          moderation platform accessible to authorized staff members. This Privacy Policy explains
          how we collect, use, store, and protect personal information when you use our platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">2. Information We Collect</h2>
        <p className="leading-relaxed text-gray-700">
          We collect the following categories of personal information from platform staff:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <strong>Account credentials:</strong> Work email address, username, and hashed password
            (Argon2).
          </li>
          <li>
            <strong>Session data:</strong> Authentication tokens, session identifiers, and login
            timestamps.
          </li>
          <li>
            <strong>Moderation activity:</strong> Video review decisions, timestamps, and audit
            trails for accountability.
          </li>
          <li>
            <strong>Technical data:</strong> IP addresses, browser type, and device information
            collected through server logs.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">3. How We Use Your Information</h2>
        <p className="leading-relaxed text-gray-700">Your information is used exclusively to:</p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Authenticate and authorize access to the moderation platform.</li>
          <li>Record moderation decisions for audit and compliance purposes.</li>
          <li>Monitor platform security and detect unauthorized access attempts.</li>
          <li>Generate aggregated analytics about moderation activity (no personally identifiable data in reports).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">4. Data Retention</h2>
        <p className="leading-relaxed text-gray-700">
          Account data is retained for the duration of your employment or contract with the
          organization. Audit logs of moderation decisions are retained for a minimum of 12 months
          after the decision date to meet regulatory and compliance requirements. Session data
          expires automatically based on token lifetimes (access tokens: 10 minutes, refresh tokens:
          7 days).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">5. Data Security</h2>
        <p className="leading-relaxed text-gray-700">
          We implement industry-standard security measures including encrypted data transmission
          (TLS), secure password hashing (Argon2), OAuth 2.0 with PKCE for authentication, and
          role-based access controls. Access to personal data is restricted to authorized personnel
          on a need-to-know basis.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">6. Your Rights</h2>
        <p className="leading-relaxed text-gray-700">
          Depending on your jurisdiction, you may have the right to access, correct, or request
          deletion of your personal data. For data-related requests, contact your platform
          administrator or the data protection officer at the email address provided during
          onboarding.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">7. Contact</h2>
        <p className="leading-relaxed text-gray-700">
          For questions about this Privacy Policy or our data practices, please contact your
          organization&apos;s data protection officer or platform administrator.
        </p>
      </section>
    </article>
  );
};

export default PrivacyPage;
