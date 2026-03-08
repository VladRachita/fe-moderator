import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
