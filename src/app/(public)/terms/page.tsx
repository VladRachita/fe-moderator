import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - merg.ro',
  description: 'Terms of service for the merg.ro platform.',
};

const TermsPage: React.FC = () => {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="mb-4 text-3xl font-bold text-black">Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: March 15, 2026</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">1. Acceptance of Terms</h2>
        <p className="leading-relaxed text-gray-700">
          By accessing and using merg.ro (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) and its
          associated mobile applications, you accept and agree to be bound by the terms and provisions
          of this agreement. If you do not agree to abide by these Terms of Service, please do not use
          this service.
        </p>
        <p className="leading-relaxed text-gray-700">
          These terms constitute a legally binding agreement between you and merg.ro. Your continued
          use of the platform signifies your acceptance of any changes to these terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">2. User Accounts</h2>
        <p className="leading-relaxed text-gray-700">
          To access certain features of our service, you must register for an account. You are
          responsible for maintaining the confidentiality of your account credentials and for all
          activities that occur under your account.
        </p>
        <p className="leading-relaxed text-gray-700">
          You agree to provide accurate, current, and complete information during registration and to
          update such information to keep it accurate, current, and complete. We reserve the right to
          suspend or terminate your account if any information provided proves to be inaccurate, false,
          or incomplete.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">3. Content Guidelines</h2>
        <p className="leading-relaxed text-gray-700">
          Users are solely responsible for the content they upload, post, or share through our
          platform. You retain ownership of your content but grant us a worldwide, non-exclusive,
          royalty-free license to use, reproduce, modify, and distribute your content for the purpose
          of operating and promoting the service.
        </p>
        <p className="leading-relaxed text-gray-700">
          You agree not to upload content that is illegal, harmful, threatening, abusive, defamatory,
          vulgar, obscene, or otherwise objectionable. We reserve the right to remove any content that
          violates these guidelines without notice.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">4. Intellectual Property</h2>
        <p className="leading-relaxed text-gray-700">
          The service and its original content, features, and functionality are owned by merg.ro and
          are protected by international copyright, trademark, patent, trade secret, and other
          intellectual property laws.
        </p>
        <p className="leading-relaxed text-gray-700">
          You may not copy, modify, distribute, sell, or lease any part of our services or included
          software without our express written permission. You also may not reverse engineer or attempt
          to extract the source code of that software.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">5. Prohibited Activities</h2>
        <p className="leading-relaxed text-gray-700">
          You agree not to engage in any of the following prohibited activities:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Using the service for any illegal purpose or in violation of any applicable law.</li>
          <li>Harassing, abusing, or harming another person or group.</li>
          <li>Attempting to gain unauthorized access to our systems or networks.</li>
          <li>Interfering with or disrupting the service or servers connected to the service.</li>
          <li>Impersonating another person or entity.</li>
          <li>
            Using automated systems or software to extract data from our service (web scraping).
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">6. Termination</h2>
        <p className="leading-relaxed text-gray-700">
          We may terminate or suspend your account and bar access to the service immediately, without
          prior notice or liability, under our sole discretion, for any reason whatsoever, including
          without limitation if you breach these Terms of Service.
        </p>
        <p className="leading-relaxed text-gray-700">
          Upon termination, your right to use the service will immediately cease. If you wish to
          terminate your account, you may simply discontinue using the service or request account
          deletion through your account settings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">7. Limitation of Liability</h2>
        <p className="leading-relaxed text-gray-700">
          In no event shall merg.ro, nor its directors, employees, partners, agents, suppliers, or
          affiliates, be liable for any indirect, incidental, special, consequential or punitive
          damages, including without limitation, loss of profits, data, use, goodwill, or other
          intangible losses, resulting from your access to or use of or inability to access or use the
          service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">8. Disclaimer</h2>
        <p className="leading-relaxed text-gray-700">
          Your use of the service is at your sole risk. The service is provided on an &quot;AS
          IS&quot; and &quot;AS AVAILABLE&quot; basis. The service is provided without warranties of
          any kind, whether express or implied, including, but not limited to, implied warranties of
          merchantability, fitness for a particular purpose, non-infringement or course of
          performance.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">9. Changes to Terms</h2>
        <p className="leading-relaxed text-gray-700">
          We reserve the right to modify or replace these Terms of Service at any time at our sole
          discretion. If a revision is material, we will provide at least 30 days notice prior to any
          new terms taking effect. By continuing to access or use our service after any revisions
          become effective, you agree to be bound by the revised terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">10. Contact</h2>
        <p className="leading-relaxed text-gray-700">
          If you have any questions about these Terms of Service, please contact us at
          legal@merg.ro or reach out to your platform administrator.
        </p>
      </section>
    </article>
  );
};

export default TermsPage;
