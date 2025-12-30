import { Group } from "@/interfaces/Group";
import { PostureCheck } from "@/interfaces/PostureCheck";

export interface Policy {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  query?: string;
  rules: PolicyRule[];
  source_posture_checks: string[] | PostureCheck[];
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
  port_ranges?: PortRange[];
  sourceResource?: PolicyRuleResource;
  destinationResource?: PolicyRuleResource;
  authorized_groups?: AuthorizedGroups;
}

export type AuthorizedGroups = Record<string, string[]>; // group_id, local machine usernames

export interface PortRange {
  start: number;
  end: number;
}

export interface PolicyRuleResource {
  id: string;
  type?: "domain" | "host" | "subnet" | "peer";
}

export type Protocol = "all" | "tcp" | "udp" | "icmp" | "netbird-ssh";
