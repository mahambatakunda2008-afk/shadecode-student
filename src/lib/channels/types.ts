/**
 * Shared channel contract for Shadecode clients.
 *
 * Channels are transport layers. They do not own learning logic, AI logic,
 * permissions, or progress state. Those remain platform services.
 */

export const CLIENT_CHANNELS = [
  "web",
  "pwa",
  "mobile",
  "desktop",
  "whatsapp",
  "email",
  "push",
] as const;

export type ClientChannel = (typeof CLIENT_CHANNELS)[number];

export type ClientRole =
  | "student"
  | "teacher"
  | "parent"
  | "school_admin"
  | "tutor"
  | "content_author"
  | "organization_admin";

export interface ChannelIdentity {
  userId?: string | null;
  externalId?: string | null;
  role?: ClientRole | null;
}

export interface ChannelMessage {
  id?: string;
  channel: ClientChannel;
  identity: ChannelIdentity;
  text: string;
  locale?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChannelResponse {
  text: string;
  metadata?: Record<string, unknown>;
  actions?: ChannelAction[];
}

export interface ChannelAction {
  id: string;
  label: string;
  type: "reply" | "link" | "deep_link" | "confirm";
  value: string;
}

export interface ChannelAdapter {
  readonly channel: ClientChannel;
  receive(message: ChannelMessage): Promise<ChannelResponse>;
}
