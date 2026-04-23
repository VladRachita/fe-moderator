import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Deletion - merg.ro',
  description: 'How to delete your Merg account.',
};

const AccountDeletionPage: React.FC = () => {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="mb-4 text-3xl font-bold text-black">Account Deletion</h1>
      </header>

      <section className="space-y-4">
        <p className="leading-relaxed text-gray-700">
          To delete your account, open the Merg app → Profile → Settings → Account →
          Delete Account, then tap <strong>Delete My Account</strong> and confirm in the dialog.
        </p>
        <p className="leading-relaxed text-gray-700">
          Deletion is immediate and irreversible. It permanently removes your
          activities, reservations, videos, comments, likes, and personal data
          from your account.
        </p>
      </section>
    </article>
  );
};

export default AccountDeletionPage;