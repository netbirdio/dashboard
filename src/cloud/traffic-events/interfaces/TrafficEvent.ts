import {
  ICMPCode,
  ICMPType,
} from "@/cloud/traffic-events/interfaces/TrafficEventICMP";
import { TrafficEventProtocol } from "@/cloud/traffic-events/interfaces/TrafficEventProtocol";

export interface TrafficEvent {
  id: string; //  removed?
  flow_id: string;
  reporter_id: string;
  source: TrafficEventMachine;
  destination: TrafficEventMachine;
  user: {
    id: string;
    email: string;
    name: string;
  };
  policy: {
    id: string;
    name: string;
  };
  icmp: {
    code: ICMPCode;
    type: ICMPType;
  };
  protocol: keyof typeof TrafficEventProtocol;
  direction: TrafficEventDirection;
  rx_bytes: number;
  rx_packets: number;
  tx_bytes: number;
  tx_packets: number;
  num_of_starts?: number;
  num_of_ends?: number;
  num_of_drops?: number;
  window_start?: string;
  window_end?: string;
  events: {
    type: TrafficEventType;
    timestamp: string;
  }[];
}

export const getTrafficEventCounts = (event: TrafficEvent) => {
  const starts = event.num_of_starts ?? 0;
  const ends = event.num_of_ends ?? 0;
  const drops = event.num_of_drops ?? 0;
  const total = starts + ends + drops;
  return {
    starts,
    ends,
    drops,
    total,
    isAggregated: total > 0,
  };
};

export interface TrafficEventMachine {
  id: string;
  name: string;
  os: string;
  type: TrafficEventMachineType;
  address: string;
  dns_label: string;
  geo_location: {
    city_name: string;
    country_code: string;
  };
}

export enum TrafficEventDirection {
  UNKNOWN = "DIRECTION_UNKNOWN",
  INGRESS = "INGRESS",
  EGRESS = "EGRESS",
}

export const getTrafficEventProtocol = (
  protocol: keyof typeof TrafficEventProtocol,
): string => {
  try {
    return TrafficEventProtocol[protocol] ?? "Unassigned";
  } catch (error) {
    return "Unknown";
  }
};

export enum TrafficEventType {
  UNKNOWN = "TYPE_UNKNOWN",
  CONNECTED = "TYPE_START",
  STOPPED = "TYPE_END",
  BLOCKED = "TYPE_DROP",
}

export enum TrafficEventMachineType {
  UNKNOWN = "UNKNOWN",
  PEER = "PEER",
  HOST_RESOURCE = "HOST_RESOURCE",
  SUBNET_RESOURCE = "SUBNET_RESOURCE",
  DOMAIN_RESOURCE = "DOMAIN_RESOURCE",
  ROUTE = "ROUTE",
}
