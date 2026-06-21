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
  events: {
    type: TrafficEventType;
    timestamp: string;
  }[];
}

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
