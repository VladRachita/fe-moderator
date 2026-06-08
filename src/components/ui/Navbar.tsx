import Link from 'next/link';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-background fixed top-0 w-full z-50 border-b border-outline-variant">
      <div className="flex justify-between items-center h-20 px-container-margin max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <img
              alt="Merg.ro"
              className="h-10 object-contain"
              src="https://lh3.googleusercontent.com/aida/AP1WRLtQLVTrWJY6wPukGMSzvJxWxBlqBEc4dqbkmWEUua-hnUFWDXBHORqRX0ol2mOuA1mljgWYM7WUDO41pbkBUqsboYFOsntStRE-Re_GTVyOFvlSAMSduGM54T_hFt-onupWxqoqtKIMCbXBC7OtJ6dB4Qk2XMHQYO8AULWLU-AtHoddOG0OlIiueogtkKb16YSAtYGe3e472Khb9X6PIClc0bJJNCUf3-JgWqOt0E59BPuK-sbP541r"
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
