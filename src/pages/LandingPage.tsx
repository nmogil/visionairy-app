import { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SimpleFooter from "@/components/landing/SimpleFooter";
import Header from "@/components/layout/Header";

const LandingPage = () => {
  useEffect(() => {
    document.title = "AI Image Party — Multiplayer AI image game";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "AI Image Party: Generate hilarious AI images to match crazy prompts with friends. Create or join a room instantly."
      );
    }
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AI Image Party",
    url: typeof window !== "undefined" ? window.location.origin : "",
    description:
      "Generate hilarious AI images to match crazy prompts with friends.",
  };

  return (
    <>
      <Header />
      <main className="pt-16">
        <HeroSection />
        <HowItWorksSection />
        <SimpleFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </main>
    </>
  );
};

export default LandingPage;
