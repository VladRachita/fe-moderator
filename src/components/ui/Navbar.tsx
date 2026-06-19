import Link from 'next/link';
import Image from 'next/image';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-background fixed top-0 w-full z-50 border-b border-outline-variant">
      <div className="flex justify-between items-center h-20 px-container-margin max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <Image
              alt="Merg"
              className="h-10 w-auto object-contain"
              src="/logo.png"
              width={40}
              height={40}
              priority
            />
          </Link>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            className="font-body-md text-body-md text-primary font-medium hover:opacity-80 transition-opacity"
            href="/login"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
