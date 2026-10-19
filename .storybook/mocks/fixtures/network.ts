import type { Group } from "@/interfaces/Group";
import type { DNSZone } from "@/interfaces/DNS";
import type { NameserverGroup } from "@/interfaces/Nameserver";
import type {
  Network,
  NetworkResource,
  NetworkRouter,
} from "@/interfaces/Network";
import type { Policy, PolicyRule } from "@/interfaces/Policy";
import type { PostureCheck } from "@/interfaces/PostureCheck";
import type { Route } from "@/interfaces/Route";
import { groups as coreGroups } from "./core-data";
import { GROUP, NETWORK, PEER, POLICY, POSTURE } from "./ids";
import type { Handler, HandlerContext } from "./index";

/* The API embeds minimal group objects in policy rules and resources;
   they are taken from the core groups so names and counts agree. */
const group = (id: string): Group => {
  const { name, peers_count, resources_count, issued } = coreGroups.find(
    (g) => g.id === id,
  )!;
  return {
    id,
    name,
    peers_count,
    resources_count,
    issued: issued as Group["issued"],
  };
};

const RESOURCE = {
  printer: "res-office-printer",
  officeLan: "res-office-lan",
  wiki: "res-internal-domain",
  wildcard: "res-berlin-wildcard",
  nas: "res-office-nas",
  postgres: "res-postgres",
  vpc: "res-aws-vpc",
  s3: "res-aws-s3",
} as const;

const rule = (r: Partial<PolicyRule>): PolicyRule => ({
  name: "",
  description: "",
  enabled: true,
  action: "accept",
  bidirectional: true,
  protocol: "all",
  ports: [],
  sources: [],
  destinations: [],
  ...r,
});

export const policies: Policy[] = [
  {
    id: POLICY.allowAll,
    name: "Default",
    description:
      "This is a default rule that allows connections between all the resources",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        name: "Default",
        sources: [group(GROUP.all)],
        destinations: [group(GROUP.all)],
      }),
    ],
  },
  {
    id: POLICY.devsToServers,
    name: "Developers to Servers",
    description: "SSH, HTTPS and the dev port range for the engineering team",
    enabled: true,
    source_posture_checks: [POSTURE.minVersion, POSTURE.os],
    rules: [
      rule({
        protocol: "tcp",
        bidirectional: false,
        ports: ["22", "443", "8080"],
        port_ranges: [{ start: 3000, end: 3999 }],
        sources: [group(GROUP.developers)],
        destinations: [group(GROUP.servers), group(GROUP.kubernetes)],
      }),
    ],
  },
  {
    id: POLICY.dbAccess,
    name: "Database Access",
    description: "Postgres and MySQL from trusted groups only",
    enabled: true,
    source_posture_checks: [POSTURE.geo, "pc-network-range", "pc-process"],
    rules: [
      rule({
        protocol: "tcp",
        bidirectional: false,
        ports: ["5432", "3306", "6379", "27017"],
        sources: [
          group(GROUP.devops),
          group(GROUP.developers),
          group(GROUP.kubernetes),
          group(GROUP.contractors),
          group(GROUP.officeBerlin),
        ],
        destinations: [group(GROUP.databases)],
      }),
    ],
  },
  {
    id: POLICY.disabled,
    name: "Legacy OpenVPN Bridge",
    description: "Kept for reference until the office migration is complete",
    enabled: false,
    source_posture_checks: [],
    rules: [
      rule({
        enabled: false,
        protocol: "udp",
        ports: ["1194"],
        sources: [group(GROUP.contractors)],
        destinations: [group(GROUP.officeBerlin)],
      }),
    ],
  },
  {
    id: "pol-icmp-monitoring",
    name: "Ping Monitoring",
    description: "Uptime checks from the servers to every peer",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        protocol: "icmp",
        bidirectional: false,
        sources: [group(GROUP.servers)],
        destinations: [group(GROUP.all)],
      }),
    ],
  },
  {
    id: "pol-office-dns",
    name: "Office DNS",
    description: "",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        protocol: "udp",
        ports: ["53"],
        port_ranges: [{ start: 5353, end: 5355 }],
        sources: [group(GROUP.officeBerlin), group(GROUP.officeNewYork)],
        destinations: [group(GROUP.servers)],
      }),
    ],
  },
  {
    id: "pol-postgres-resource",
    name: "Developers to Postgres",
    description: "Direct access to the production database host",
    enabled: true,
    source_posture_checks: [POSTURE.minVersion],
    rules: [
      rule({
        protocol: "tcp",
        bidirectional: false,
        ports: ["5432"],
        sources: [group(GROUP.developers)],
        destinations: null,
        destinationResource: { id: RESOURCE.postgres, type: "host" },
      }),
    ],
  },
  {
    id: "pol-aws-vpc",
    name: "DevOps to AWS VPC",
    description: "Full access to the production VPC",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        bidirectional: false,
        sources: [group(GROUP.devops)],
        destinations: null,
        destinationResource: { id: RESOURCE.vpc, type: "subnet" },
      }),
    ],
  },
  {
    id: "pol-office-resources",
    name: "Office Resources",
    description: "Printers, NAS and the internal wiki",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        protocol: "tcp",
        bidirectional: false,
        ports: ["80", "443", "445", "631"],
        sources: [
          group(GROUP.officeBerlin),
          group(GROUP.officeNewYork),
          group(GROUP.developers),
        ],
        destinations: null,
        destinationResource: { id: RESOURCE.printer, type: "host" },
      }),
    ],
  },
  {
    id: "pol-netbird-ssh",
    name: "NetBird SSH for DevOps",
    description: "Limited SSH logins on servers",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        protocol: "netbird-ssh",
        bidirectional: false,
        sources: [group(GROUP.devops)],
        destinations: [group(GROUP.servers)],
        authorized_groups: { [GROUP.devops]: ["root", "ubuntu"] },
      }),
    ],
  },
  {
    id: "pol-long-name",
    name: "Contractors from the external QA agency to staging Kubernetes ingress controllers",
    description:
      "A deliberately long name and description that should be truncated in the table",
    enabled: false,
    source_posture_checks: [POSTURE.geo],
    rules: [
      rule({
        protocol: "tcp",
        ports: ["80", "443", "8443", "9090", "9443", "10250"],
        sources: [group(GROUP.contractors)],
        destinations: [group(GROUP.kubernetes), group(GROUP.empty)],
      }),
    ],
  },
  {
    id: "pol-temporary",
    name: "Temporary access for the browser client",
    description: "Temporary policy for the browser client",
    enabled: true,
    source_posture_checks: [],
    rules: [
      rule({
        protocol: "tcp",
        ports: ["22"],
        sources: [group(GROUP.all)],
        destinations: [group(GROUP.servers)],
      }),
    ],
  },
];

export const postureChecks: PostureCheck[] = [
  {
    id: POSTURE.minVersion,
    name: "NetBird 0.50 or newer",
    description: "Older clients lack the latest security fixes",
    checks: { nb_version_check: { min_version: "0.50.0" } },
  },
  {
    id: POSTURE.geo,
    name: "EU and US offices only",
    description: "Allow connections from Germany and the United States",
    checks: {
      geo_location_check: {
        action: "allow",
        locations: [
          { id: "loc-de-berlin", country_code: "DE", city_name: "Berlin" },
          { id: "loc-de", country_code: "DE", city_name: "" },
          { id: "loc-us-ny", country_code: "US", city_name: "New York" },
          { id: "loc-nl", country_code: "NL", city_name: "" },
        ],
      },
    },
  },
  {
    id: POSTURE.os,
    name: "Supported operating systems",
    description: "",
    checks: {
      os_version_check: {
        darwin: { min_version: "14.0" },
        windows: { min_kernel_version: "10.0.2" },
        linux: { min_kernel_version: "5.15" },
        ios: { min_version: "17.0" },
        android: { min_version: "13" },
      },
    },
  },
  {
    id: "pc-network-range",
    name: "Block home networks",
    description: "Deny peers whose local network is a typical home range",
    checks: {
      peer_network_range_check: {
        action: "deny",
        ranges: ["192.168.0.0/16", "172.16.0.0/12", "100.64.0.0/10"],
      },
    },
  },
  {
    id: "pc-process",
    name: "EDR agent running",
    description: "The endpoint protection agent must be running",
    checks: {
      process_check: {
        processes: [
          {
            id: "proc-1",
            mac_path: "/Applications/Falcon.app/Contents/Resources/falcond",
            windows_path: "C:\\Program Files\\CrowdStrike\\CSFalconService.exe",
            linux_path: "/opt/CrowdStrike/falcond",
          },
          { id: "proc-2", linux_path: "/usr/sbin/auditd" },
        ],
      },
    },
  },
  {
    id: "pc-all-checks",
    name: "Hardened workstation baseline with every check enabled",
    description:
      "Combines version, location, network range, OS and process checks",
    checks: {
      nb_version_check: { min_version: "0.55.1" },
      geo_location_check: {
        action: "deny",
        locations: [
          { id: "loc-fr", country_code: "FR", city_name: "" },
          { id: "loc-gb", country_code: "GB", city_name: "" },
        ],
      },
      peer_network_range_check: {
        action: "allow",
        ranges: ["10.0.0.0/8", "192.168.1.0/24"],
      },
      os_version_check: {
        darwin: { min_version: "15.0" },
        windows: { min_kernel_version: "10.0.2" },
        linux: { min_kernel_version: "6.1" },
      },
      process_check: {
        processes: [
          {
            id: "proc-3",
            mac_path: "/usr/local/bin/osqueryd",
            linux_path: "/usr/bin/osqueryd",
          },
        ],
      },
    },
  },
];

const resourceGroups = (...ids: string[]) => ids.map(group);

export const networkResources: (NetworkResource & { network_id: string })[] = [
  {
    id: RESOURCE.officeLan,
    network_id: NETWORK.office,
    name: "Office LAN",
    description: "Whole office subnet",
    address: "192.168.1.0/24",
    type: "subnet",
    enabled: true,
    groups: resourceGroups(GROUP.databases),
  },
  {
    id: RESOURCE.printer,
    network_id: NETWORK.office,
    name: "Office Printer",
    description: "HP LaserJet, 2nd floor",
    address: "192.168.1.20/32",
    type: "host",
    enabled: true,
    groups: [],
  },
  {
    id: RESOURCE.wiki,
    network_id: NETWORK.office,
    name: "Internal Wiki",
    address: "wiki.office.example.com",
    type: "domain",
    enabled: true,
    groups: resourceGroups(GROUP.servers),
  },
  {
    id: RESOURCE.wildcard,
    network_id: NETWORK.office,
    name: "Berlin Services",
    description: "Every service behind the Berlin reverse proxy",
    address: "*.berlin.example.com",
    type: "domain",
    enabled: true,
    groups: [],
  },
  {
    id: RESOURCE.nas,
    network_id: NETWORK.office,
    name: "Synology NAS with an unnecessarily long descriptive resource name",
    description: "Decommissioned, kept disabled",
    address: "192.168.1.50/32",
    type: "host",
    enabled: false,
    groups: [],
  },
  {
    id: RESOURCE.postgres,
    network_id: NETWORK.aws,
    name: "Production Postgres",
    description: "RDS primary",
    address: "10.0.12.5/32",
    type: "host",
    enabled: true,
    groups: resourceGroups(GROUP.databases),
  },
  {
    id: RESOURCE.vpc,
    network_id: NETWORK.aws,
    name: "Production VPC",
    address: "10.0.0.0/16",
    type: "subnet",
    enabled: true,
    groups: [],
  },
  {
    id: RESOURCE.s3,
    network_id: NETWORK.aws,
    name: "S3 Endpoint",
    address: "s3.eu-central-1.amazonaws.com",
    type: "domain",
    enabled: true,
    groups: [],
  },
];

const routers: Record<string, NetworkRouter[]> = {
  [NETWORK.office]: [
    {
      id: "router-office-berlin",
      peer: PEER.routerBerlin,
      peer_groups: [],
      metric: 9999,
      masquerade: true,
      enabled: true,
    },
    {
      id: "router-office-group",
      peer: "",
      peer_groups: [GROUP.routingPeers],
      metric: 100,
      masquerade: true,
      enabled: true,
    },
    {
      id: "router-office-ny",
      peer: PEER.routerNewYork,
      peer_groups: [],
      metric: 500,
      masquerade: false,
      enabled: false,
    },
  ],
  [NETWORK.aws]: [
    {
      id: "router-aws-k8s",
      peer: PEER.k8sNode,
      peer_groups: [],
      metric: 9999,
      masquerade: true,
      enabled: true,
    },
  ],
  [NETWORK.empty]: [],
};

const resourcesOf = (networkId: string) =>
  networkResources.filter((r) => r.network_id === networkId);

export const networks: Network[] = [
  {
    id: NETWORK.office,
    name: "Berlin Office",
    description: "Office LAN, printers and the internal wiki",
    resources: resourcesOf(NETWORK.office).map((r) => r.id),
    routers: routers[NETWORK.office].map((r) => r.id),
    policies: ["pol-office-resources"],
    routing_peers_count: 3,
  },
  {
    id: NETWORK.aws,
    name: "AWS Production VPC (eu-central-1)",
    description: "",
    resources: resourcesOf(NETWORK.aws).map((r) => r.id),
    routers: routers[NETWORK.aws].map((r) => r.id),
    policies: ["pol-postgres-resource", "pol-aws-vpc"],
    routing_peers_count: 1,
  },
  {
    id: NETWORK.empty,
    name: "Staging",
    description: "Not set up yet",
    resources: [],
    routers: [],
    policies: [],
    routing_peers_count: 0,
  },
];

const route = (
  r: Partial<Route> & Pick<Route, "id" | "network_id">,
): Route => ({
  description: "",
  enabled: true,
  network_type: "IPv4",
  metric: 9999,
  masquerade: true,
  groups: [GROUP.all],
  keep_route: false,
  skip_auto_apply: false,
  ...r,
});

export const routes: Route[] = [
  route({
    id: "route-exit-berlin",
    network_id: "Exit Node Berlin",
    network: "0.0.0.0/0",
    peer: PEER.routerBerlin,
    groups: [GROUP.developers, GROUP.devops],
    description: "Route all internet traffic through Berlin",
  }),
  route({
    id: "route-exit-ny",
    network_id: "Exit Node New York",
    network: "0.0.0.0/0",
    peer: PEER.routerNewYork,
    groups: [GROUP.officeNewYork],
    skip_auto_apply: true,
  }),
  route({
    id: "route-office-lan-1",
    network_id: "office-lan",
    network: "192.168.1.0/24",
    peer: PEER.routerBerlin,
    metric: 100,
    groups: [GROUP.developers, GROUP.officeBerlin],
    description: "Primary office router",
  }),
  route({
    id: "route-office-lan-2",
    network_id: "office-lan",
    network: "192.168.1.0/24",
    peer: PEER.routerNewYork,
    metric: 200,
    masquerade: false,
    groups: [GROUP.developers, GROUP.officeBerlin],
    description: "Failover router",
  }),
  route({
    id: "route-k8s-pods",
    network_id: "k8s-pods",
    network: "10.42.0.0/16",
    peer_groups: [GROUP.kubernetes],
    groups: [GROUP.devops],
    access_control_groups: [GROUP.kubernetes],
    description: "Kubernetes pod network",
  }),
  route({
    id: "route-internal-domains",
    network_id: "internal-domains",
    network_type: "Domain",
    network: "",
    domains: [
      "*.internal.example.com",
      "grafana.example.com",
      "vault.example.com",
    ],
    keep_route: true,
    peer: PEER.webServer,
    groups: [GROUP.developers, GROUP.devops, GROUP.contractors],
  }),
  route({
    id: "route-legacy-dc",
    network_id: "legacy-datacenter",
    network: "172.16.0.0/12",
    peer: PEER.dbServer,
    enabled: false,
    masquerade: false,
    groups: [GROUP.servers],
    description: "Old datacenter, being decommissioned",
  }),
];

export const nameservers: NameserverGroup[] = [
  {
    id: "ns-google",
    name: "Google DNS",
    description: "Default resolver for everyone",
    primary: true,
    domains: [],
    nameservers: [
      { ip: "8.8.8.8", ns_type: "udp", port: 53 },
      { ip: "8.8.4.4", ns_type: "udp", port: 53 },
    ],
    groups: [GROUP.all],
    enabled: true,
    search_domains_enabled: false,
  },
  {
    id: "ns-internal",
    name: "Internal Resolver",
    description: "Resolves the corporate domains",
    primary: false,
    domains: ["corp.example.com", "office.example.com", "internal.example.com"],
    nameservers: [{ ip: "10.0.0.53", ns_type: "udp", port: 53 }],
    groups: [GROUP.developers, GROUP.devops, GROUP.servers, GROUP.contractors],
    enabled: true,
    search_domains_enabled: true,
  },
  {
    id: "ns-quad9",
    name: "Quad9 on a custom port",
    description: "",
    primary: false,
    domains: ["example.org"],
    nameservers: [
      { ip: "9.9.9.9", ns_type: "udp", port: 5353 },
      { ip: "149.112.112.112", ns_type: "udp", port: 5353 },
      { ip: "2620:fe::fe", ns_type: "udp", port: 53 },
    ],
    groups: [GROUP.officeNewYork],
    enabled: true,
    search_domains_enabled: false,
  },
  {
    id: "ns-cloudflare",
    name: "Cloudflare DNS",
    description: "Disabled after the migration",
    primary: true,
    domains: [],
    nameservers: [
      { ip: "1.1.1.1", ns_type: "udp", port: 53 },
      { ip: "1.0.0.1", ns_type: "udp", port: 53 },
    ],
    groups: [GROUP.contractors],
    enabled: false,
    search_domains_enabled: false,
  },
];

export const dnsZones: DNSZone[] = [
  {
    id: "zone-internal",
    name: "Internal",
    domain: "internal.example.com",
    enabled: true,
    enable_search_domain: true,
    distribution_groups: [GROUP.all],
    records: [
      {
        id: "rec-1",
        name: "grafana.internal.example.com",
        type: "A",
        content: "10.0.1.10",
        ttl: 300,
      },
      {
        id: "rec-2",
        name: "vault.internal.example.com",
        type: "A",
        content: "10.0.1.11",
        ttl: 3600,
      },
      {
        id: "rec-3",
        name: "ipv6.internal.example.com",
        type: "AAAA",
        content: "fd00:1234:5678::10",
        ttl: 300,
      },
      {
        id: "rec-4",
        name: "wiki.internal.example.com",
        type: "CNAME",
        content: "wiki.office.example.com",
        ttl: 86400,
      },
    ],
  },
  {
    id: "zone-office",
    name: "Berlin Office",
    domain: "berlin.office.lan",
    enabled: true,
    enable_search_domain: false,
    distribution_groups: [GROUP.officeBerlin, GROUP.developers, GROUP.devops],
    records: [
      {
        id: "rec-5",
        name: "printer.berlin.office.lan",
        type: "A",
        content: "192.168.1.20",
        ttl: 600,
      },
    ],
  },
  {
    id: "zone-staging",
    name: "Staging",
    domain: "staging.example.com",
    enabled: false,
    enable_search_domain: false,
    distribution_groups: [GROUP.contractors],
    records: [],
  },
];

const byId =
  <T extends { id?: string | null }>(items: T[]) =>
  ({ path }: HandlerContext) =>
    items.find((item) => item.id === path.split("/").pop()) ?? {};

export const networkFixtures: Record<string, Handler> = {
  "GET /policies": policies,
  "GET /policies/:id": byId(policies),
  "GET /posture-checks": postureChecks,
  "GET /posture-checks/:id": byId(postureChecks),
  "GET /networks": networks,
  "GET /networks/resources": networkResources,
  "GET /networks/:id": byId(networks),
  "GET /networks/:id/resources": ({ path }: HandlerContext) =>
    resourcesOf(path.split("/")[2]),
  "GET /networks/:id/routers": ({ path }: HandlerContext) =>
    routers[path.split("/")[2]] ?? [],
  "GET /networks/:id/resources/:resourceId": byId(networkResources),
  "GET /routes": routes,
  "GET /dns/nameservers": nameservers,
  "GET /dns/settings": {
    disabled_management_groups: [GROUP.contractors, GROUP.kubernetes],
  },
  "GET /dns/zones": dnsZones,
  "GET /dns/zones/:id": byId(dnsZones),
};
