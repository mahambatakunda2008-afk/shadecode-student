export interface ShadeNetIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ShadeNetIceConfig {
  iceServers: ShadeNetIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

function list(value: string | undefined): string[] {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

/**
 * Reads only public ICE server URLs and optional server credentials supplied by
 * the deployment environment. No default third-party TURN service is bundled.
 */
export function getShadeNetIceConfig(env: Record<string, string | undefined>): ShadeNetIceConfig {
  const stun = list(env.NEXT_PUBLIC_SHADENET_STUN_URLS);
  const turnUrls = list(env.NEXT_PUBLIC_SHADENET_TURN_URLS);
  const username = env.NEXT_PUBLIC_SHADENET_TURN_USERNAME?.trim();
  const credential = env.NEXT_PUBLIC_SHADENET_TURN_CREDENTIAL?.trim();

  const iceServers: ShadeNetIceServer[] = stun.map((urls) => ({ urls }));
  if (turnUrls.length > 0) {
    if (!username || !credential) throw new Error("ShadeNet TURN URLs require TURN username and credential");
    iceServers.push({ urls: turnUrls, username, credential });
  }
  return { iceServers };
}
