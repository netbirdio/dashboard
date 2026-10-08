import { GROUP, PEER, USER } from "./ids";
import type { Handler, HandlerContext } from "./index";

const EU = "eu.proxy.netbird.io";
const US = "us.proxy.netbird.io";
const OWN = "proxy.acme-corp.com";

/* Free domains double as the proxy clusters a service can be placed on; custom ones are user-owned. */
const domains = [
  {
    id: "dom-eu",
    domain: EU,
    validated: true,
    type: "free",
    supports_custom_ports: true,
    require_subdomain: true,
    supports_crowdsec: true,
    supports_private: true,
  },
  {
    id: "dom-us",
    domain: US,
    validated: true,
    type: "free",
    require_subdomain: true,
  },
  {
    id: "dom-own",
    domain: OWN,
    validated: true,
    type: "free",
    supports_custom_ports: true,
    supports_private: true,
  },
  {
    id: "dom-acme",
    domain: "apps.acme-corp.com",
    validated: true,
    type: "custom",
    target_cluster: EU,
  },
  {
    id: "dom-status",
    domain: "status.acme-corp.com",
    validated: true,
    type: "custom",
    target_cluster: OWN,
  },
  {
    id: "dom-pending",
    domain: "internal.acme-corp.io",
    validated: false,
    type: "custom",
    target_cluster: EU,
  },
  {
    id: "dom-long",
    domain: "customer-facing-portal.very-long-subsidiary-name.acme-corp.co.uk",
    validated: false,
    type: "custom",
    target_cluster: US,
  },
];

const clusters = [
  {
    id: "cl-eu",
    address: EU,
    type: "shared",
    online: true,
    connected_proxies: 3,
    supports_custom_ports: true,
    require_subdomain: true,
    supports_crowdsec: true,
    private: true,
  },
  {
    id: "cl-us",
    address: US,
    type: "shared",
    online: true,
    connected_proxies: 2,
    require_subdomain: true,
  },
  {
    id: "cl-own",
    address: OWN,
    type: "account",
    online: true,
    connected_proxies: 1,
    supports_custom_ports: true,
    private: true,
  },
  {
    id: "cl-edge",
    address: "edge.acme-corp.net",
    type: "account",
    online: false,
    connected_proxies: 0,
  },
];

const created = "2026-09-20T08:15:00Z";
const certified = {
  created_at: created,
  status: "active",
  certificate_issued_at: "2026-09-20T08:17:00Z",
};

/*
 * One service per visual state: every mode (http/tcp/udp/tls), every status badge,
 * every auth method, NetBird-only access, a disabled row and a name long enough to truncate.
 * Resource targets use the IDs from network.ts so the expanded rows resolve resource names.
 */
const services = [
  {
    id: "svc-grafana",
    name: `grafana.${EU}`,
    domain: `grafana.${EU}`,
    mode: "http",
    proxy_cluster: EU,
    enabled: true,
    pass_host_header: true,
    rewrite_redirects: true,
    targets: [
      {
        target_id: PEER.webServer,
        target_type: "peer",
        protocol: "http",
        host: "100.92.10.10",
        port: 3000,
        enabled: true,
        path: "/",
      },
      {
        target_id: "res-office-nas",
        target_type: "host",
        protocol: "https",
        host: "192.168.1.50",
        port: 8443,
        enabled: true,
        path: "/api",
        options: {
          skip_tls_verify: true,
          request_timeout: "30s",
          custom_headers: { "X-Forwarded-Team": "observability" },
        },
      },
      {
        target_id: "res-office-wiki",
        target_type: "domain",
        protocol: "http",
        host: "wiki.office.example.com",
        port: 80,
        enabled: false,
        path: "/legacy",
      },
    ],
    auth: {
      bearer_auth: {
        enabled: true,
        distribution_groups: [GROUP.developers, GROUP.devops],
      },
      password_auth: { enabled: false, password: "" },
      pin_auth: { enabled: false, pin: "" },
    },
    access_restrictions: {
      allowed_countries: ["DE", "US", "NL"],
      blocked_cidrs: ["203.0.113.0/24"],
      crowdsec_mode: "enforce",
    },
    meta: certified,
  },
  {
    id: "svc-wiki",
    name: "wiki.apps.acme-corp.com",
    domain: "wiki.apps.acme-corp.com",
    mode: "http",
    proxy_cluster: EU,
    enabled: true,
    targets: [
      {
        target_id: PEER.k8sNode,
        target_type: "peer",
        protocol: "http",
        host: "100.92.12.5",
        port: 8080,
        enabled: true,
      },
    ],
    auth: {
      password_auth: { enabled: true, password: "********" },
      pin_auth: { enabled: true, pin: "****" },
    },
    meta: { created_at: created, status: "certificate_pending" },
  },
  {
    id: "svc-long",
    name: `the-internal-platform-engineering-dashboard-for-release-management.${US}`,
    domain: `the-internal-platform-engineering-dashboard-for-release-management.${US}`,
    mode: "http",
    proxy_cluster: US,
    enabled: true,
    targets: [
      {
        target_id: "res-office-lan",
        target_type: "subnet",
        protocol: "http",
        host: "192.168.1.15",
        port: 8000,
        enabled: true,
      },
      {
        target_id: PEER.macbook,
        target_type: "peer",
        protocol: "https",
        host: "100.92.14.21",
        port: 443,
        enabled: true,
        path: "/releases",
      },
    ],
    auth: {
      header_auths: [
        { enabled: true, header: "X-Api-Key", value: "********" },
        { enabled: true, header: "Authorization", value: "********" },
      ],
    },
    meta: { created_at: created, status: "pending" },
  },
  {
    id: "svc-status",
    name: "status.acme-corp.com",
    domain: "status.acme-corp.com",
    mode: "http",
    proxy_cluster: OWN,
    enabled: true,
    targets: [
      {
        target_type: "cluster",
        target_id: OWN,
        protocol: "https",
        host: "status.upstream.example.com",
        port: 443,
        enabled: true,
        options: { direct_upstream: true },
      },
    ],
    meta: { created_at: created, status: "certificate_failed" },
  },
  {
    id: "svc-private",
    name: `intranet.${OWN}`,
    domain: `intranet.${OWN}`,
    mode: "http",
    proxy_cluster: OWN,
    enabled: true,
    private: true,
    access_groups: [GROUP.all, GROUP.officeBerlin],
    targets: [
      {
        target_id: PEER.dbServer,
        target_type: "peer",
        protocol: "http",
        host: "100.92.10.20",
        port: 8081,
        enabled: true,
      },
    ],
    meta: certified,
  },
  {
    id: "svc-postgres",
    name: `postgres.${EU}`,
    domain: `postgres.${EU}`,
    mode: "tcp",
    listen_port: 5432,
    proxy_cluster: EU,
    enabled: true,
    targets: [
      {
        target_id: PEER.dbServer,
        target_type: "peer",
        protocol: "tcp",
        host: "100.92.10.20",
        port: 5432,
        enabled: true,
        options: { proxy_protocol: true, request_timeout: "10s" },
      },
    ],
    access_restrictions: {
      allowed_cidrs: ["198.51.100.0/24", "192.0.2.10/32"],
    },
    meta: { created_at: created, status: "active" },
  },
  {
    id: "svc-voip",
    name: `voip.${EU}`,
    domain: `voip.${EU}`,
    mode: "udp",
    listen_port: 5060,
    port_auto_assigned: true,
    proxy_cluster: EU,
    enabled: true,
    targets: [
      {
        target_id: PEER.routerBerlin,
        target_type: "peer",
        protocol: "udp",
        host: "100.92.1.1",
        port: 5060,
        enabled: true,
        options: { session_idle_timeout: "2m" },
      },
    ],
    meta: { created_at: created, status: "error" },
  },
  {
    id: "svc-tls",
    name: `vault.${EU}`,
    domain: `vault.${EU}`,
    mode: "tls",
    listen_port: 8200,
    proxy_cluster: EU,
    enabled: true,
    targets: [
      {
        target_id: "res-aws-postgres",
        target_type: "host",
        protocol: "tcp",
        host: "10.0.12.5",
        port: 8200,
        enabled: true,
      },
    ],
    meta: { created_at: created, status: "tunnel_not_created" },
  },
  {
    id: "svc-disabled",
    name: `old-jenkins.${US}`,
    domain: `old-jenkins.${US}`,
    mode: "http",
    proxy_cluster: US,
    enabled: false,
    targets: [
      {
        target_id: PEER.offlineLaptop,
        target_type: "peer",
        protocol: "http",
        host: "100.92.55.17",
        port: 8080,
        enabled: true,
      },
    ],
    auth: {
      pin_auth: { enabled: true, pin: "****" },
      link_auth: { enabled: true },
    },
    meta: certified,
  },
];

const eventTemplates = [
  {
    method: "GET",
    path: "/d/home",
    status_code: 200,
    service_id: "svc-grafana",
    user_id: USER.developer,
    auth_method_used: "oidc",
    country_code: "DE",
    city_name: "Berlin",
    source_ip: "91.64.12.8",
  },
  {
    method: "POST",
    path: "/api/ds/query?from=now-6h&to=now",
    status_code: 201,
    service_id: "svc-grafana",
    user_id: USER.admin,
    auth_method_used: "oidc",
    country_code: "US",
    city_name: "New York",
    source_ip: "74.125.24.100",
  },
  {
    method: "GET",
    path: "/login",
    status_code: 401,
    service_id: "svc-wiki",
    auth_method_used: "password",
    reason: "invalid password",
    country_code: "NL",
    city_name: "Amsterdam",
    source_ip: "145.97.3.11",
  },
  {
    method: "PUT",
    path: "/pages/onboarding/edit",
    status_code: 200,
    service_id: "svc-wiki",
    auth_method_used: "pin",
    country_code: "FR",
    city_name: "Paris",
    source_ip: "88.170.4.2",
  },
  {
    method: "DELETE",
    path: "/api/releases/2026.10.1",
    status_code: 403,
    service_id: "svc-long",
    auth_method_used: "header",
    reason: "header mismatch",
    country_code: "GB",
    city_name: "London",
    source_ip: "81.2.69.160",
  },
  {
    method: "GET",
    path: "/",
    status_code: 403,
    service_id: "svc-grafana",
    auth_method_used: "country_restricted",
    reason: "country not allowed",
    country_code: "BR",
    city_name: "São Paulo",
    source_ip: "177.71.128.21",
  },
  {
    method: "GET",
    path: "/wp-admin",
    status_code: 403,
    service_id: "svc-grafana",
    auth_method_used: "crowdsec_ban",
    reason: "crowdsec: ban",
    country_code: "CN",
    source_ip: "222.186.30.112",
  },
  {
    method: "PATCH",
    path: "/api/dashboards/uid/abc123",
    status_code: 500,
    service_id: "svc-grafana",
    user_id: USER.admin,
    auth_method_used: "sso",
    reason: "upstream error",
    country_code: "DE",
    city_name: "Munich",
    source_ip: "93.184.216.34",
  },
  {
    method: "HEAD",
    path: "/health",
    status_code: 204,
    service_id: "svc-status",
    country_code: "US",
    city_name: "Ashburn",
    source_ip: "54.239.28.85",
  },
  {
    method: "OPTIONS",
    path: "/api/v1/status",
    status_code: 302,
    service_id: "svc-status",
    auth_method_used: "ip_restricted",
    source_ip: "10.0.0.5",
  },
  {
    protocol: "tcp",
    method: "",
    path: "",
    status_code: 200,
    service_id: "svc-postgres",
    country_code: "DE",
    city_name: "Frankfurt",
    source_ip: "198.51.100.23",
  },
  {
    protocol: "udp",
    method: "",
    path: "",
    status_code: 502,
    service_id: "svc-voip",
    reason: "backend unreachable",
    country_code: "ES",
    city_name: "Madrid",
    source_ip: "83.44.10.7",
  },
  {
    protocol: "tls",
    method: "",
    path: "",
    status_code: 200,
    service_id: "svc-tls",
    country_code: "JP",
    city_name: "Tokyo",
    source_ip: "133.242.0.3",
  },
  {
    method: "GET",
    path: "/assets/app.4f9c2.js",
    status_code: 304,
    service_id: "svc-private",
    user_id: USER.owner,
    auth_method_used: "link",
    country_code: "CH",
    city_name: "Zurich",
    source_ip: "100.92.14.21",
  },
];

const events = Array.from({ length: 28 }, (_, i) => {
  const template = eventTemplates[i % eventTemplates.length];
  const service = services.find((s) => s.id === template.service_id)!;
  return {
    id: `evt-${String(i + 1).padStart(3, "0")}`,
    host: service.domain,
    timestamp: new Date(
      Date.parse("2026-10-08T11:58:00Z") - i * 7 * 60_000,
    ).toISOString(),
    duration_ms: [12, 245, 3, 1890, 87, 54][i % 6],
    bytes_upload: [512, 2048, 0, 18_400, 1_048_576][i % 5],
    bytes_download: [24_576, 1_310_720, 128, 7_340_032, 4096][i % 5],
    ...template,
    metadata:
      i % 3 === 0
        ? {
            "plg.llm.model": "gpt-4o",
            "plg.llm.tokens": "1284",
            "plg.capture.request_id": `req-${i}`,
            region: "eu-central-1",
          }
        : undefined,
  };
});

export const reverseProxyFixtures: Record<string, Handler> = {
  "GET /reverse-proxies/services": services,
  // Polled by the status cell of every row that is not fully active yet.
  "GET /reverse-proxies/services/:id": ({ path }: HandlerContext) =>
    services.find((s) => s.id === path.split("/").pop()) ?? services[0],
  "GET /reverse-proxies/domains": domains,
  "GET /reverse-proxies/clusters": clusters,
  // Issued when the cluster setup modal reaches its install step.
  "POST /reverse-proxies/proxy-tokens": {
    id: "tok-regression",
    name: "proxy",
    plain_token: "nbp_RegressionTestToken0123456789abcdef",
    created_at: created,
  },
  "GET /events/proxy": ({ query }: HandlerContext) => {
    const page = Number(query.get("page") ?? 1);
    const size = Number(query.get("page_size") ?? 25);
    return {
      data: events.slice((page - 1) * size, page * size),
      page,
      page_size: size,
      total_pages: Math.ceil(events.length / size),
      total_records: events.length,
    };
  },
};
