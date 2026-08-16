# ShadeNet

ShadeNet is Shadecode Student's optional peer-assisted educational content network.

## Data boundaries

- Personal study state stays device-first.
- Private Cortex memory, tasks, scores, and account data are not advertised.
- Shareable resources require an explicit sharing policy.
- Device discovery is disabled by default.
- Replication is disabled by default.
- Peers are untrusted transport; received content is accepted only after final SHA-256 verification.

## Network model

1. Check the local resource cache.
2. If missing, discover opted-in peers advertising the resource.
3. Establish a short-lived signaling session when a peer connection is needed.
4. Transfer resource chunks directly over WebRTC where available.
5. Reassemble and verify the content hash.
6. Cache verified content locally.
7. Fall back to another peer or the cloud backup/control path when necessary.

The cloud is a control/backup path, not the default carrier for peer-shareable content.
