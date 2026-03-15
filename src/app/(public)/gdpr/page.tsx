import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDPR Compliance - merg.ro',
  description: 'GDPR compliance information for the merg.ro moderation platform.',
};

const GdprPage: React.FC = () => {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="mb-4 text-3xl font-bold text-black">GDPR Compliance</h1>
        <p className="text-sm text-gray-500">Last updated: March 8, 2026</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">1. Our Commitment</h2>
        <p className="leading-relaxed text-gray-700">
          merg.ro is committed to protecting personal data in accordance with the General Data
          Protection Regulation (EU) 2016/679 (&quot;GDPR&quot;). This page outlines how we comply
          with GDPR requirements for data processed through the moderation platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">2. Legal Basis for Processing</h2>
        <p className="leading-relaxed text-gray-700">
          We process personal data under the following legal bases:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <strong>Legitimate interest (Article 6(1)(f)):</strong> Platform security, fraud
            prevention, and maintaining the integrity of the moderation workflow.
          </li>
          <li>
            <strong>Contractual necessity (Article 6(1)(b)):</strong> Processing staff account data
            necessary to provide access to moderation tools as part of employment or contract
            obligations.
          </li>
          <li>
            <strong>Legal obligation (Article 6(1)(c)):</strong> Retaining audit logs of content
            moderation decisions where required by applicable law or regulation.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">3. Data Subject Rights</h2>
        <p className="leading-relaxed text-gray-700">
          Under the GDPR, you have the following rights regarding your personal data:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <strong>Right of access (Article 15):</strong> Request a copy of the personal data we
            hold about you.
          </li>
          <li>
            <strong>Right to rectification (Article 16):</strong> Request correction of inaccurate
            personal data.
          </li>
          <li>
            <strong>Right to erasure (Article 17):</strong> Request deletion of your personal data,
            subject to legal retention requirements for audit logs.
          </li>
          <li>
            <strong>Right to restriction (Article 18):</strong> Request that we limit the processing
            of your data under certain circumstances.
          </li>
          <li>
            <strong>Right to data portability (Article 20):</strong> Receive your personal data in a
            structured, commonly used, machine-readable format.
          </li>
          <li>
            <strong>Right to object (Article 21):</strong> Object to the processing of your personal
            data based on legitimate interest.
          </li>
        </ul>
        <p className="leading-relaxed text-gray-700">
          To exercise any of these rights, contact your organization&apos;s data protection officer.
          We will respond to valid requests within 30 days.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">4. Data Protection Measures</h2>
        <p className="leading-relaxed text-gray-700">
          We implement technical and organizational measures to protect personal data, including:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Encryption in transit (TLS 1.2+) and at rest for sensitive data stores.</li>
          <li>Argon2 password hashing with no plaintext credential storage.</li>
          <li>OAuth 2.0 with PKCE for secure authentication flows.</li>
          <li>Role-based access control limiting data access to authorized personnel.</li>
          <li>Automatic session expiry and token rotation.</li>
          <li>Audit logging of all authentication events and privilege changes.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">5. Data Processing Records</h2>
        <p className="leading-relaxed text-gray-700">
          In accordance with Article 30 of the GDPR, we maintain records of processing activities.
          These records document the categories of data processed, the purposes of processing,
          retention periods, and the technical measures in place to protect data. Processing records
          are available to supervisory authorities upon request.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">6. International Data Transfers</h2>
        <p className="leading-relaxed text-gray-700">
          When personal data is transferred outside the European Economic Area (EEA), we ensure
          adequate protection through approved mechanisms such as Standard Contractual Clauses (SCCs)
          or adequacy decisions by the European Commission. Details of specific transfer safeguards
          are available from the data protection officer.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">7. Data Breach Notification</h2>
        <p className="leading-relaxed text-gray-700">
          In the event of a personal data breach, we will notify the relevant supervisory authority
          within 72 hours as required by Article 33 of the GDPR. Where the breach is likely to
          result in a high risk to the rights and freedoms of affected individuals, we will also
          notify those individuals without undue delay in accordance with Article 34.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-black">8. Contact</h2>
        <p className="leading-relaxed text-gray-700">
          For GDPR-related inquiries, to exercise your data subject rights, or to report a concern,
          please contact your organization&apos;s data protection officer or platform administrator.
          You also have the right to lodge a complaint with your local supervisory authority.
        </p>
      </section>
    </article>
  );
};

export default GdprPage;
