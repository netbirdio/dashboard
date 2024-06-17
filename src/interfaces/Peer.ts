import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";

export interface Peer {
  id?: string;
  name: string;
  ip: string;
  ip6?: string,
  connected: boolean;
  last_seen: Date;
  os: string;
  version: string;
  groups?: Group[];
  ssh_enabled: boolean;
  hostname: string;
  user_id?: string;
  user?: User;
  ui_version?: string;
  dns_label: string;
  last_login: Date;
  login_expired: boolean;
  login_expiration_enabled: boolean;
  ipv6_supported: boolean,
  ipv6_enabled: string,
  approval_required: boolean;
  city_name: string;
  country_code: string;
  connection_ip: string;
}
