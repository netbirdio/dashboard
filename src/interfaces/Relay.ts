/**
 * An account-level relay server operated by the customer. Peers matched by
 * the distribution receive its addresses and short-lived credentials signed
 * with the auth secret, in addition to or instead of the instance relays.
 */
export interface Relay {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  /** Relay URLs, e.g. rels://relay-eu.example.com:443 */
  addresses: string[];
  /** Write-only. Never returned by the API, only sent on create or rotate. */
  auth_secret?: string;
  /** Seconds a credential issued to a peer stays valid before it is reissued. */
  credentials_ttl: number;
  distribution: RelayDistribution;
  /** Lets matched peers fall back to the instance relays when this one is unreachable. */
  instance_fallback: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * A peer receives the relay when it is in any of the groups or is located in
 * any of the countries.
 */
export interface RelayDistribution {
  groups: string[];
  locations: RelayLocation[];
}

export interface RelayLocation {
  country_code: string;
}

export type RelayRequest = Omit<Relay, "id" | "created_at" | "updated_at">;
