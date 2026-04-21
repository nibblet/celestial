import { FictionEntityIndexPage } from "@/components/entities/FictionEntityViews";
import { getAllArtifacts } from "@/lib/wiki/parser";

export default function ArtifactsPage() {
  return (
    <FictionEntityIndexPage
      title="Artifacts"
      description="Objects, systems, and material anomalies that shape the narrative."
      basePath="/artifacts"
      entities={getAllArtifacts()}
    />
  );
}
