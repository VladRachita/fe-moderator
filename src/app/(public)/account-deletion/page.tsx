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

      <section>
        <p className="leading-relaxed text-gray-700">
          To delete your account, open the Merg app → Profile → Settings → Delete account.
        </p>
      </section>
    </article>
  );
};

export default AccountDeletionPage;