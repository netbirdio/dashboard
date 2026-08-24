---
description: Covers policies, groups and posture checks, and the triage order for connectivity failures. Use when a peer cannot reach another peer or a resource, when the user asks why something is allowed or blocked, or when designing or tightening access rules.
---

# Access Control

Default deny: peers connect only when a policy allows it. "A can't reach B" triage, in order: both
online → a policy links a group of A to a group of B → protocol and port match → posture checks
pass.

**Policies** allow source groups → destination groups (or a network resource); there is no deny
rule — absence of a policy is the deny. Rules carry protocol, ports and direction (`bidirectional`
or one-way, source-initiated). A Default allow-everything policy is common: usually the answer to
"why CAN they connect", and worth flagging as the thing to tighten. One policy per rule, never per
thing it touches — group resources that share a rule (even just two) and point the policy at the
group. Never create "everything to everywhere": set the protocol and the ports the destination
actually listens on, one-way unless both ends genuinely initiate; if unsure, pick the narrowest
rule that could work and say in one line what you assumed.

**Groups** are named sets of peers and resources — the unit policies, routes, nameservers and
setup keys operate on; almost nothing targets a single peer. `All` contains every peer. People and
departments are groups of peers on the source side of a policy — an HR department is not an HR
server. `jwt` and `integration` groups are IdP-synced: not renamable, membership managed there.

**Posture checks** are conditions the *source* peer must meet on top of membership — minimum
NetBird/OS version, geolocation, network range, running process. They attach to policies: a
failing peer loses that policy's access while still in the right group — the invisible cause of
"same group but can't connect".
