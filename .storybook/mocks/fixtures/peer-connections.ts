import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import { PEER, USER } from "./ids";

// Shaped like Management's peer.connect / peer.disconnect events: the initiator is
// the peer's owner and the meta is the peer's event meta, which carries the source
// IP and location of that connection. Only a disconnect has session_duration, as
// whole seconds in a string.
const peerMeta = {
  name: "olivias-macbook-pro",
  fqdn: "olivias-macbook-pro.netbird.cloud",
  ip: "100.92.14.21",
  serial_number: "C02F1234Q6L4",
  os: "darwin",
  os_version: "15.1",
  hostname: "olivias-macbook-pro",
  user_id: USER.owner,
};

const berlin = {
  location_connection_ip: "203.0.113.24",
  location_country_code: "DE",
  location_city_name: "Berlin",
  location_geo_name_id: "2950159",
};

const amsterdam = {
  location_connection_ip: "198.51.100.12",
  location_country_code: "NL",
  location_city_name: "Amsterdam",
  location_geo_name_id: "2759794",
};

const connectionEvent = (
  id: string,
  timestamp: string,
  code: "peer.connect" | "peer.disconnect",
  meta: Record<string, string>,
): ActivityEvent => ({
  id,
  timestamp,
  activity: code === "peer.connect" ? "Peer connected" : "Peer disconnected",
  activity_code: code,
  initiator_id: USER.owner,
  initiator_email: "owner@netbird.io",
  initiator_name: "Olivia Owner",
  target_id: PEER.macbook,
  meta: { ...peerMeta, ...meta },
});

export const peerConnectionEvents: ActivityEvent[] = [
  connectionEvent("connection-4", "2026-11-13T09:58:40Z", "peer.disconnect", {
    ...berlin,
    session_duration: "982",
  }),
  connectionEvent(
    "connection-3",
    "2026-11-13T09:42:18Z",
    "peer.connect",
    berlin,
  ),
  connectionEvent("connection-2", "2026-11-13T09:40:03Z", "peer.disconnect", {
    ...amsterdam,
    session_duration: "55473",
  }),
  connectionEvent(
    "connection-1",
    "2026-11-12T18:15:30Z",
    "peer.connect",
    amsterdam,
  ),
];
