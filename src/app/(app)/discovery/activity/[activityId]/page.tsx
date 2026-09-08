import DiscoveryActivity from "@/components/discovery/DiscoveryActivity";

export default async function DiscoveryActivityPage({ params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  return <DiscoveryActivity activityId={activityId} />;
}
