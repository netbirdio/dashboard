export interface DNSZone {
  id?: string;
  name: string;
  domain: string;
  enabled: boolean;
  enable_search_domain: boolean;
  distribution_groups: string[];
  records?: DNSRecord[];
  groups_search?: string;
}

export interface DNSRecord {
  id?: string;
  name: string;
  type: "A" | "AAAA" | "CNAME";
  content: string;
  ttl: number;
}

export type DNSRecordType = "A" | "AAAA" | "CNAME";

export const DNS_ZONE_DOCS_LINK = "https://docs.netbird.io/manage/dns/zones";
export const DNS_RECORDS_DOCS_LINK = "https://docs.netbird.io/manage/dns/zones";
