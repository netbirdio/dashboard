import { Group } from "@/interfaces/Group";

export interface Policy {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  query: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  sources: Group[] | string[] | null;
  destinations: Group[] | string[] | null;
  bidirectional: boolean;
  action: string;
  protocol: Protocol;
  ports: string[];
}

export type Protocol = "all" | "tcp" | "udp" | "icmp";

export interface PolicyToSave extends Policy {
  sourcesNoId?: string[];
  destinationsNoId?: string[];
  groupsToSave?: string[];
}
