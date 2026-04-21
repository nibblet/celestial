import { permanentRedirect } from "next/navigation";

/** @deprecated Use `/characters` — kept for bookmarks and external links. */
export default function PeopleIndexRedirect() {
  permanentRedirect("/characters");
}
