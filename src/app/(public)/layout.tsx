import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <>
      <Navbar />
      <div className="flex-grow pt-[80px]">
        <div className="mx-auto max-w-3xl px-6 py-16">{children}</div>
      </div>
      <Footer />
    </>
  );
};

export default PublicLayout;
