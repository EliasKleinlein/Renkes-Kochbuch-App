import FantasyFooter from "@/components/FantasyFooter";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import RecipeExperienceClient from "@/components/RecipeExperienceClient";

export default function Home() {
  return (
    <div className="fantasy-page">
      <Navbar />
      <main>
        <div className="px-3 sm:px-6">
          <Hero />
        </div>
        <RecipeExperienceClient />
      </main>
      <FantasyFooter />
    </div>
  );
}
