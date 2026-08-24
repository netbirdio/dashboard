---
description: Covers services, custom domains, proxy clusters and access logs. Use when publishing an internal app at a public URL for visitors without NetBird, when a service is down or unreachable, or when the user asks who accessed a service.
---

# Reverse Proxy

**Services** publish internal apps at a public URL through a proxy cluster — visitors need a
browser, not NetBird. A service maps a domain to targets (peers, hosts, domains or subnets; `http`
or raw `tcp`/`udp`/`tls`), with optional auth (SSO, magic link, password, PIN, header,
NetBird-login-only for chosen groups) and access restrictions (CIDR/country lists, CrowdSec);
`private` means reachable only from inside the network. For "my service doesn't work", check
`status` first. **Custom domains** replace the free NetBird subdomain — verified via DNS records,
then pointed at a cluster; unverified means not usable yet. **Clusters** carry the traffic: shared
ones NetBird runs, or account clusters the user self-hosts; `online` and `connected_proxies` are
the health signal when every service on one is down at once. **Access logs** answer "who accessed
my service": per-request time, status, duration, bytes, source IP with location, auth method,
user, and a `reason` on denials.
