import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
