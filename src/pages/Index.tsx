import Hero from "@/components/Hero";
import FloatingNavbar from "@/components/FloatingNavbar";
import ClientLogosMarquee from "@/components/ClientLogosMarquee";
import Services from "@/components/Services";
import Positioning from "@/components/Positioning";
import Differentials from "@/components/Differentials";
import Method from "@/components/Method";
import Cases from "@/components/Cases";
import Audience from "@/components/Audience";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="bg-background text-foreground">
      <FloatingNavbar />
      <Hero />
      <ClientLogosMarquee />
      <Services />
      <Positioning />
      <Differentials />
      <Method />
      <Cases />
      <Audience />
      <FinalCTA />
      <Footer />
    </main>
  );
};

export default Index;
