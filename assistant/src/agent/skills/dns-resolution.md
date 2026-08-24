---
description: Covers nameserver groups, DNS zones, and the settings that disable NetBird DNS per group. Use when names do not resolve, when a peer ignores nameserver configuration, or when the user mentions upstream DNS, match domains or A/CNAME records.
---

# DNS

Peers resolve each other by `dns_label` — peer-to-peer names need no configuration.
**Nameservers** (`list_nameserver_groups`) forward queries from distribution-group peers to
upstream servers; `primary` takes all queries, otherwise only the listed match domains. **Zones**
hold a domain's A/AAAA/CNAME records, published to distribution groups. **DNS settings** lists
groups whose peers don't apply NetBird DNS at all — check when a peer ignores nameserver config.
