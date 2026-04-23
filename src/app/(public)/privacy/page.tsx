import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Merg',
  description:
    'How Merg collects, uses, and protects your personal information, the legal bases under the GDPR, and the rights you can exercise in the app.',
};

const PrivacyPage: React.FC = () => {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="mb-4 text-3xl font-bold text-black">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: April 21, 2026</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">Introduction</h2>
        <p className="leading-relaxed text-gray-700">
          At Merg we take your privacy seriously. This Privacy Policy explains what information
          we collect, why we collect it, the legal bases under the GDPR that we rely on, how long
          we keep it, and the rights you have to control it.
        </p>
        <p className="leading-relaxed text-gray-700">
          We are a Romania-based service (Merg, Uranus 19, Brasov, Romania) and process personal
          data in accordance with Regulation (EU) 2016/679 (GDPR) and Romanian Law 190/2018. If
          you have any question, email our Data Protection Officer at{' '}
          <a className="underline" href="mailto:dpo@merg.ro">
            dpo@merg.ro
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">1. Information We Collect</h2>
        <p className="leading-relaxed text-gray-700">
          We collect the following categories of information:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <strong>Account Information:</strong> username, email address, phone number, hashed
            password, date of birth, profile details. Used to deliver the service.
          </li>
          <li>
            <strong>Content:</strong> videos, photos, reservations, comments, likes and other
            content you create in the app.
          </li>
          <li>
            <strong>Firebase Analytics &amp; Crashlytics (third-party):</strong> anonymous crash
            reports and aggregate feature-usage metrics processed by Google Ireland Limited. No
            advertising IDs are collected. This category is opt-in &mdash; OFF until you toggle
            it ON in Settings &rarr; Permissions &rarr; &quot;Share analytics with Google&quot;.
          </li>
          <li>
            <strong>Product Improvement Telemetry (first-party):</strong> anonymous usage signals
            &mdash; feed swipes (counts only, not which videos), screens you navigate to, and the
            length of your session &mdash; sent to our own servers. Used to prioritise features
            and fix bugs. No advertising, no profiling, no third-party sharing, and your user ID
            is replaced with a pseudonymous hash before the signal is stored. This category is
            opt-out &mdash; ON by default, disabled from Settings &rarr; Permissions &rarr;
            &quot;Help improve the app&quot;.
          </li>
          <li>
            <strong>Device Information:</strong> device type, operating system, app version, and a
            coarse device class derived from your User-Agent. Needed for security (fraud
            detection) and debugging.
          </li>
          <li>
            <strong>Location:</strong> approximate location derived from your IP address (hashed
            on the server, same-day). Precise GPS location is only used when you explicitly grant
            the Android runtime permission and only while you use map features.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">2. Why We Use Your Information (Legal Bases)</h2>
        <p className="leading-relaxed text-gray-700">
          Every processing activity we perform has a specific legal basis under GDPR Article 6:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            To provide the service you signed up for &mdash; account management, reservations,
            content you create. Legal basis: Art. 6(1)(b) performance of a contract.
          </li>
          <li>
            To detect fraud and abuse, and to keep the service secure &mdash; login audit, IP
            hashing for abuse detection, rate limiting. Legal basis: Art. 6(1)(f) legitimate
            interest.
          </li>
          <li>
            To improve the product &mdash; first-party Product Improvement Telemetry (see Section
            1). Legal basis: Art. 6(1)(f) legitimate interest; you can object at any time via
            Settings &rarr; Permissions (Art. 21).
          </li>
          <li>
            To send you third-party analytics and crash reports &mdash; Firebase Analytics +
            Crashlytics. Legal basis: Art. 6(1)(a) explicit consent; you can withdraw at any time
            via Settings &rarr; Permissions.
          </li>
          <li>
            To comply with legal obligations &mdash; tax, accounting, law-enforcement requests.
            Legal basis: Art. 6(1)(c) legal obligation.
          </li>
        </ul>
        <p className="leading-relaxed text-gray-700">
          We do NOT sell your personal data. We do NOT profile individual users for targeted
          advertising. We do NOT share your content or personal information with advertisers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">3. Who We Share Information With</h2>
        <p className="leading-relaxed text-gray-700">
          We share personal data only with the following categories of recipients, each under a
          written data processing agreement:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            Google Ireland Limited (Firebase Analytics, Crashlytics, Firebase Cloud Messaging).
            Only when you have opted in to &quot;Share analytics with Google&quot; in Settings
            &rarr; Permissions (Crashlytics is always on for operational stability and is limited
            to crash stack traces, no personal content).
          </li>
          <li>
            Cloud infrastructure providers hosting our servers (under EU-based contractual data
            processing agreements).
          </li>
          <li>Law-enforcement authorities, strictly where legally required.</li>
        </ul>
        <p className="leading-relaxed text-gray-700">
          We do NOT share personal data with advertisers, data brokers, or any third party for
          marketing purposes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">4. How We Protect Your Data</h2>
        <p className="leading-relaxed text-gray-700">
          We apply the following technical and organisational measures:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>TLS 1.3 in transit for all API calls.</li>
          <li>Argon2 password hashing (industry standard).</li>
          <li>
            Pseudonymisation at rest &mdash; your IP address is hashed with a rotating server
            secret before it enters the audit log, and your user ID on telemetry rows is replaced
            with a pseudonym hash.
          </li>
          <li>Access controls, rate limiting, and security audits.</li>
          <li>
            Encrypted storage on the device for your session tokens (Android Keystore +
            AES-256-GCM).
          </li>
        </ul>
        <p className="leading-relaxed text-gray-700">
          No system is 100% secure. If we become aware of a personal-data breach that is likely
          to result in a high risk to your rights, we will notify you without undue delay as
          required by Art. 34 GDPR.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">5. Your Rights Under GDPR</h2>
        <p className="leading-relaxed text-gray-700">
          You have the following rights, exercisable free of charge:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            Right of access (Art. 15) &mdash; request a copy of your data. Available in-app via
            Settings &rarr; Notifications &rarr; &quot;Request data export&quot;.
          </li>
          <li>
            Right to rectification (Art. 16) &mdash; correct inaccurate data via Settings &rarr;
            Account.
          </li>
          <li>
            Right to erasure (Art. 17) &mdash; delete your account via Settings &rarr; Account
            &rarr; Delete account.
          </li>
          <li>
            Right to object (Art. 21) &mdash; object to processing based on legitimate interest.
            For our first-party Product Improvement Telemetry, use Settings &rarr; Permissions
            &rarr; &quot;Help improve the app&quot; to turn it off. The opt-out takes effect
            immediately on your device and is synced to our servers.
          </li>
          <li>
            Right to portability (Art. 20) &mdash; the same data export download is structured
            JSON, machine-readable.
          </li>
          <li>
            Right to withdraw consent (Art. 7(3)) &mdash; for Firebase Analytics, toggle Settings
            &rarr; Permissions &rarr; &quot;Share analytics with Google&quot; off.
          </li>
          <li>
            Right to lodge a complaint &mdash; with the Romanian Data Protection Authority
            (ANSPDCP,{' '}
            <a className="underline" href="https://www.dataprotection.ro" rel="noopener noreferrer" target="_blank">
              www.dataprotection.ro
            </a>
            ) or your local DPA.
          </li>
        </ul>
        <p className="leading-relaxed text-gray-700">
          To exercise any right that isn&apos;t available in-app, email{' '}
          <a className="underline" href="mailto:dpo@merg.ro">
            dpo@merg.ro
          </a>
          . We respond within 30 days of receipt as required by Art. 12 GDPR.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">6. How Long We Keep Your Data</h2>
        <p className="leading-relaxed text-gray-700">
          We keep each category of data only for as long as necessary:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            Account data &mdash; for as long as your account exists. On deletion we remove your
            personal data within 30 days, except where law requires us to keep it longer (e.g.
            invoicing records for 10 years under Romanian tax law).
          </li>
          <li>Security audit log &mdash; up to 180 days, then deleted.</li>
          <li>
            Product improvement telemetry &mdash; up to 60 days in pseudonymised form, then
            deleted. Individual rows cannot be re-identified to you after the hash secret
            rotates.
          </li>
          <li>
            Firebase Analytics data &mdash; governed by Google&apos;s Firebase data retention
            policy (14 months by default).
          </li>
          <li>
            Backups &mdash; rolling 30-day window for operational recovery; not used for active
            data access.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">7. Children&apos;s Privacy</h2>
        <p className="leading-relaxed text-gray-700">
          Our service is not intended for children under the age of 13. We do not knowingly
          collect personal information from children under 13. If you are a parent or guardian
          and believe your child has provided us with personal information, please contact us
          immediately.
        </p>
        <p className="leading-relaxed text-gray-700">
          For users between 13 and 18 years of age, we recommend parental guidance and
          supervision when using our service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">8. International Data Transfers</h2>
        <p className="leading-relaxed text-gray-700">
          Your information may be transferred to and maintained on servers located outside of
          your state, province, country, or other governmental jurisdiction where data protection
          laws may differ.
        </p>
        <p className="leading-relaxed text-gray-700">
          When we transfer information internationally, we ensure appropriate safeguards are in
          place to protect your information in accordance with this Privacy Policy and applicable
          data protection laws.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">9. Changes to This Privacy Policy</h2>
        <p className="leading-relaxed text-gray-700">
          We may update our Privacy Policy from time to time. We will notify you of any changes
          by posting the new Privacy Policy on this page and updating the &quot;Last
          updated&quot; date at the top of this policy.
        </p>
        <p className="leading-relaxed text-gray-700">
          We will also notify you via email or through a prominent notice in our application
          before any material changes take effect. You are advised to review this Privacy Policy
          periodically for any changes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">10. Contact Us</h2>
        <p className="leading-relaxed text-gray-700">
          If you have any questions or concerns about this Privacy Policy or our data practices,
          please contact us:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            Email:{' '}
            <a className="underline" href="mailto:privacy@merg.ro">
              privacy@merg.ro
            </a>
          </li>
          <li>
            Data Protection Officer:{' '}
            <a className="underline" href="mailto:dpo@merg.ro">
              dpo@merg.ro
            </a>
          </li>
          <li>
            Privacy Policy:{' '}
            <a className="underline" href="https://merg.ro/privacy">
              https://merg.ro/privacy
            </a>
          </li>
          <li>Address: Uranus 19, Brasov, Romania</li>
          <li>Phone: +40729108329</li>
        </ul>
        <p className="leading-relaxed text-gray-700">
          Hosts and businesses are subject to an additional privacy policy available at{' '}
          <a className="underline" href="https://merg.ro/privacy/hosts">
            https://merg.ro/privacy/hosts
          </a>
          .
        </p>
        <p className="leading-relaxed text-gray-700">
          We will respond to your inquiry within 30 days of receipt.
        </p>
      </section>
    </article>
  );
};

export default PrivacyPage;
