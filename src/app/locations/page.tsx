import { FictionEntityIndexPage } from "@/components/entities/FictionEntityViews";
import { getAllLocations } from "@/lib/wiki/parser";

export default function LocationsPage() {
  return (
    <FictionEntityIndexPage
      title="Locations"
      description="Places that carry strategic, emotional, and historical weight."
      basePath="/locations"
      entities={getAllLocations()}
    />
  );
}
