import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";

export interface Peer {
  id?: string;
  name: string;
  ip: string;
  ipv6?: string;
  connected: boolean;
  created_at?: Date;
  last_seen: Date;
  os: string;
  version: string;
  groups?: Group[];
  ssh_enabled: boolean;
  hostname: string;
  user_id?: string;
  user?: User;
  ui_version?: string;
  kernel_version?: string;
  dns_label: string;
  extra_dns_labels?: string[];
  last_login: Date;
  login_expired: boolean;
  login_expiration_enabled: boolean;
  inactivity_expiration_enabled: boolean;
  approval_required: boolean;
  disapproval_reason?: string;
  force_approved?: boolean;
  city_name: string;
  country_code: string;
  connection_ip: string;
  serial_number: string;
  ephemeral: boolean;
  local_flags?: PeerLocalFlags;
  network_addresses?: NetworkAddress[];
}

export interface NetworkAddress {
  net_ip: string;
  mac: string;
}

// peerMacAddresses returns the unique, non-empty MAC addresses reported by a
// peer's network interfaces. A peer reports the same MAC for several IPs
// (e.g. IPv4 + IPv6 of one NIC), so we de-duplicate.
export function peerMacAddresses(peer: Peer): string[] {
  if (!peer.network_addresses) return [];
  return Array.from(
    new Set(
      peer.network_addresses
        .map((address) => address.mac)
        .filter((mac) => !!mac),
    ),
  );
}

export interface PeerLocalFlags {
  block_inbound: boolean;
  block_lan_access: boolean;
  disable_client_routes: boolean;
  disable_dns: boolean;
  disable_firewall: boolean;
  disable_server_routes: boolean;
  lazy_connection_enabled: boolean;
  rosenpass_enabled: boolean;
  rosenpass_permissive: boolean;
  server_ssh_allowed: boolean;
}
