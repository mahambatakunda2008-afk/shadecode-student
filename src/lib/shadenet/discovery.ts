import type { ResourceVisibility } from "./resource-policy";

export interface PeerAdvertisement {
  peerId: string;
  protocol: 1;
  expiresAt: string;
  capabilities: { resourceExchange: boolean; maxChunkBytes: number };
}

export interface ResourceAdvertisement {
  peerId: string;
  resourceId: string;
  visibility: Exclude<ResourceVisibility, "private">;
  sizeBytes: number;
  publishedAt: string;
  expiresAt?: string;
}

export interface DiscoveryPolicy {
  enabled: boolean;
  allowPeerDiscovery: boolean;
  allowResourceAdvertisements: boolean;
  maxPeerEntries: number;
}

export const DEFAULT_DISCOVERY_POLICY: DiscoveryPolicy = {
  enabled: false,
  allowPeerDiscovery: false,
  allowResourceAdvertisements: false,
  maxPeerEntries: 32,
};

export function canAdvertise(policy: DiscoveryPolicy, visibility: ResourceVisibility): boolean {
  if (!policy.enabled || !policy.allowResourceAdvertisements) return false;
  return visibility !== "private";
}

export function pruneExpiredPeers(peers: PeerAdvertisement[], now = Date.now()): PeerAdvertisement[] {
  return peers.filter((peer) => Date.parse(peer.expiresAt) > now).slice(0, 32);
}

export function rankPeers(peers: PeerAdvertisement[]): PeerAdvertisement[] {
  return [...peers].sort((a, b) => a.peerId.localeCompare(b.peerId));
}
