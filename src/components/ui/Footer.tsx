import Link from 'next/link';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} VideoSanity. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-gray-500 transition-colors hover:text-black"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              className="text-sm text-gray-500 transition-colors hover:text-black"
            >
              Cookie Policy
            </Link>
            <Link
              href="/gdpr"
              className="text-sm text-gray-500 transition-colors hover:text-black"
            >
              GDPR
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
