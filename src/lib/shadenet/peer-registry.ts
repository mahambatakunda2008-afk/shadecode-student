import type { PeerAdvertisement, ResourceAdvertisement } from "./discovery";

export class PeerRegistry {
  private peers = new Map<string, PeerAdvertisement>();
  private resources = new Map<string, ResourceAdvertisement[]>();

  upsertPeer(peer: PeerAdvertisement): void {
    if (Date.parse(peer.expiresAt) <= Date.now()) return;
    this.peers.set(peer.peerId, peer);
  }

  removePeer(peerId: string): void {
    this.peers.delete(peerId);
    this.resources.delete(peerId);
  }

  listPeers(): PeerAdvertisement[] {
    return [...this.peers.values()]
      .filter((peer) => Date.parse(peer.expiresAt) > Date.now())
      .sort((a, b) => a.peerId.localeCompare(b.peerId));
  }

  advertiseResource(resource: ResourceAdvertisement): void {
    if (!this.peers.has(resource.peerId)) return;
    const current = this.resources.get(resource.peerId) ?? [];
    const withoutDuplicate = current.filter((item) => item.resourceId !== resource.resourceId);
    this.resources.set(resource.peerId, [...withoutDuplicate, resource].slice(-128));
  }

  findResource(resourceId: string): ResourceAdvertisement[] {
    const now = Date.now();
    return [...this.resources.values()]
      .flat()
      .filter((resource) => resource.resourceId === resourceId)
      .filter((resource) => !resource.expiresAt || Date.parse(resource.expiresAt) > now)
      .filter((resource) => this.peers.has(resource.peerId))
      .sort((a, b) => a.peerId.localeCompare(b.peerId));
  }
}

export const peerRegistry = new PeerRegistry();
