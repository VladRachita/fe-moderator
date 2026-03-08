import Link from 'next/link';

const Navbar: React.FC = () => {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-black">
          VideoSanity
        </Link>
        <Link
          href="/login"
          className="rounded bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-50 focus:outline-none"
        >
          Intra
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
