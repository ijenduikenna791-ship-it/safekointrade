import { notFound } from "next/navigation";

// Catch-all so unknown localized URLs render the localized 404 page.
export default function CatchAll() {
  notFound();
}
