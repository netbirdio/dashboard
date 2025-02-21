import { Group } from "@/interfaces/Group";

export interface SetupKey {
  expires: Date;
  id: string;
  key: string;
  last_used: Date;
  name: string;
  revoked: boolean;
  state: string;
  type: string;
  used_times: number;
  valid: boolean;
  auto_groups: string[];
  groups?: Group[];
  expires_in: number;
  usage_limit: number | null;
  ephemeral: boolean;
  allow_extra_dns_labels: boolean;
}
