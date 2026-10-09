import FantasyFooter from "@/components/FantasyFooter";
import Navbar from "@/components/Navbar";
import RecipeDetailClient from "@/components/RecipeDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="fantasy-page">
      <Navbar />
      <RecipeDetailClient id={id} />
      <FantasyFooter />
    </div>
  );
}
