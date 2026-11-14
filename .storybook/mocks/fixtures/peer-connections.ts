import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import { PEER } from "./ids";

export const peerConnectionEvents: ActivityEvent[] = [
  {
    id: "connection-3",
    timestamp: "2026-11-13T09:42:18Z",
    activity: "Peer connected",
    activity_code: "peer.connect",
    initiator_id: "system",
    initiator_email: "",
    initiator_name: "",
    target_id: PEER.macbook,
    meta: {
      name: "olivias-macbook-pro",
      location_connection_ip: "203.0.113.24",
      location_country_code: "DE",
      location_city_name: "Berlin",
    },
  },
  {
    id: "connection-2",
    timestamp: "2026-11-13T09:40:03Z",
    activity: "Peer disconnected",
    activity_code: "peer.disconnect",
    initiator_id: "system",
    initiator_email: "",
    initiator_name: "",
    target_id: PEER.macbook,
    meta: { name: "olivias-macbook-pro" },
  },
  {
    id: "connection-1",
    timestamp: "2026-11-12T18:15:30Z",
    activity: "Peer connected",
    activity_code: "peer.connect",
    initiator_id: "system",
    initiator_email: "",
    initiator_name: "",
    target_id: PEER.macbook,
    meta: {
      name: "olivias-macbook-pro",
      location_connection_ip: "198.51.100.12",
      location_country_code: "NL",
      location_city_name: "Amsterdam",
    },
  },
];
