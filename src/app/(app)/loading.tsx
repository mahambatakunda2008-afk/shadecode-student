import PageSkeleton from "@/components/ui/PageSkeleton";

/** Instant feedback while a route's server work finishes, so navigation never feels frozen. */
export default function AppLoading() {
  return <PageSkeleton variant="cards" />;
}
