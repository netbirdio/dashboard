import type { Peer } from "@/interfaces/Peer";

export type PeerKind = "auto" | "device" | "server";
export type ResolvedPeerKind = Exclude<PeerKind, "auto">;
export type PeersTableKind = "users" | "servers";

export const PEER_KIND_LABELS: Record<PeerKind, string> = {
  auto: "Automatic",
  device: "Device",
  server: "Server",
};

export const PEERS_TABLE_KIND_LABELS: Record<PeersTableKind, string> = {
  users: "Devices",
  servers: "Servers",
};

export const supportsPeerKind = (peer: Peer) =>
  Object.prototype.hasOwnProperty.call(peer, "kind");

export const normalizePeerKind = (kind: unknown): PeerKind => {
  if (kind === "device" || kind === "server" || kind === "auto") {
    return kind;
  }

  return "auto";
};

export const inferPeerKind = (peer: Peer): ResolvedPeerKind => {
  const hasRealUser = !!peer.user && !peer.user.is_service_user;
  return hasRealUser ? "device" : "server";
};

export const getEffectivePeerKind = (peer: Peer): ResolvedPeerKind => {
  const kind = normalizePeerKind(peer.kind);
  if (kind === "device" || kind === "server") {
    return kind;
  }

  return inferPeerKind(peer);
};

export const matchesPeerTableKind = (peer: Peer, kind?: PeersTableKind) => {
  if (!kind) return true;

  const effectiveKind = getEffectivePeerKind(peer);
  return kind === "users"
    ? effectiveKind === "device"
    : effectiveKind === "server";
};
