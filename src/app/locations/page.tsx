import { LocationsHubPage } from "@/components/entities/FictionEntityViews";
import { getAllLocations } from "@/lib/wiki/parser";

export default function LocationsPage() {
  return <LocationsHubPage entities={getAllLocations()} />;
}
