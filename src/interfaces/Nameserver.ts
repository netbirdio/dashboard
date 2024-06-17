export interface NameserverGroup {
  id?: string;
  name: string;
  description: string;
  primary: boolean;
  domains: string[];
  nameservers: Nameserver[];
  groups: string[];
  enabled: boolean;
  search_domains_enabled: boolean;
}

export interface Nameserver {
  ip: string;
  ns_type: "udp";
  port: number;
  id?: string;
}

export const NameserverPresets: Record<string, NameserverGroup> = {
  Default: {
    name: "",
    description: "",
    primary: true,
    domains: [],
    nameservers: [
      {
        ip: "",
        ns_type: "udp",
        port: 53,
        id: "1",
      },
    ],
    groups: [],
    enabled: true,
    search_domains_enabled: false,
  },
  Google: {
    name: "Google DNS",
    description: "Google DNS Servers",
    primary: true,
    domains: [],
    nameservers: [
      {
        ip: "8.8.8.8",
        ns_type: "udp",
        port: 53,
        id: "1",
      },
      {
        ip: "8.8.4.4",
        ns_type: "udp",
        port: 53,
        id: "2",
      },
      {
        ip: "2001:4860:4860::8888",
        ns_type: "udp",
        port: 53,
        id: "3",
      },
      {
        ip: "2001:4860:4860::8844",
        ns_type: "udp",
        port: 53,
        id: "4",
      },
    ],
    groups: [],
    enabled: true,
    search_domains_enabled: false,
  },
  Cloudflare: {
    name: "Cloudflare DNS",
    description: "Cloudflare DNS Servers",
    primary: true,
    domains: [],
    nameservers: [
      {
        ip: "1.1.1.1",
        ns_type: "udp",
        port: 53,
        id: "1",
      },
      {
        ip: "1.0.0.1",
        ns_type: "udp",
        port: 53,
        id: "2",
      },
      {
        ip: "2606:4700:4700::1111",
        ns_type: "udp",
        port: 53,
        id: "3",
      },
      {
        ip: "2606:4700:4700::1001",
        ns_type: "udp",
        port: 53,
        id: "4",
      },
    ],
    groups: [],
    enabled: true,
    search_domains_enabled: false,
  },
  Quad9: {
    name: "Quad9 DNS",
    description: "Quad9 DNS Servers",
    primary: true,
    domains: [],
    nameservers: [
      {
        ip: "9.9.9.9",
        ns_type: "udp",
        port: 53,
        id: "1",
      },
      {
        ip: "149.112.112.112",
        ns_type: "udp",
        port: 53,
        id: "2",
      },
      {
        ip: "2620:fe::fe",
        ns_type: "udp",
        port: 53,
        id: "3",
      },
      {
        ip: "2620:fe::9",
        ns_type: "udp",
        port: 53,
        id: "4",
      },
    ],
    groups: [],
    enabled: true,
    search_domains_enabled: false,
  },
};
