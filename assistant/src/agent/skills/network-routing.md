---
description: Covers networks, resources, routing peers and the older routes primitive. Use when reaching something that does not run NetBird — a printer, database, subnet or domain — or when the user mentions exit nodes, site-to-site, masquerade or route metrics.
---

# Network Routing

**Networks** are how peers reach things that don't run NetBird: resources (a host, subnet or
domain — the printer, the database, the ERP server) reached through routing peers (the machine
carrying the site's traffic); access is a policy pointed at the resource's group. Several routing
peers is high availability; `masquerade` hides NetBird addresses from the LAN; lower `metric`
wins. When drafting, route every network in the same turn you add it (`cc_node` `route_network` —
a placeholder peer not yet installed is valid), and never leave a resource off for lack of an
address: assume a plausible one and say so.

**Routes** are the older primitive and what `list_routes` returns: a CIDR or domain list via a
peer or peer groups, distributed to `groups`; rows sharing a `network_id` are one route with high
availability. An exit node is a `0.0.0.0/0` route. "Exit node", "route through", "site-to-site"
land here or in Networks.
