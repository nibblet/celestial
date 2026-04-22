import { FictionEntityIndexPage } from "@/components/entities/FictionEntityViews";
import { getAllVaults } from "@/lib/wiki/parser";

export default function VaultsPage() {
  return (
    <FictionEntityIndexPage
      title="Vaults"
      description="Alien-heritage interfaces and resonance sites — first-class canon pages linked from locations and story."
      basePath="/vaults"
      entities={getAllVaults()}
    />
  );
}
