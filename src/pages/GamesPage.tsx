import SpotlightHero from "@/components/hero/SpotlightHero";
import AviatorGame from "@/components/games/AviatorGame";

const GamesPage = () => (
  <div className="min-h-screen pb-24">
    <SpotlightHero title="Aviator">
      <div className="px-4 pt-2">
        <AviatorGame />
      </div>
    </SpotlightHero>
  </div>
);

export default GamesPage;

