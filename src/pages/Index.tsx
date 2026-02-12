import Hero from "@/components/Hero";
import Positioning from "@/components/Positioning";
import Services from "@/components/Services";
import Differentials from "@/components/Differentials";
import Method from "@/components/Method";
import Cases from "@/components/Cases";
import Audience from "@/components/Audience";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="bg-background text-foreground overflow-x-hidden">
      <Hero />
      <Positioning />
      <Services />
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
