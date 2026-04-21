import { FictionEntityIndexPage } from "@/components/entities/FictionEntityViews";
import { getAllFactions } from "@/lib/wiki/parser";

export default function FactionsPage() {
  return (
    <FictionEntityIndexPage
      title="Factions"
      description="Organized groups, loyalties, and conflicts in the Celestial world."
      basePath="/factions"
      entities={getAllFactions()}
    />
  );
}
