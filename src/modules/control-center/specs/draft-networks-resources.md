# Draft Mode: Networks, Resources & Routing Peers — Specification

> Status: **Draft / not implemented.** This spec defines how networks, network
> resources, and routing peers become first-class citizens of the control
> center draft mode. Today the components panel already offers **Network** and
> **Resource** create templates, but they drop purely visual placeholders —
> no editor, no changeset entry, no deploy wiring
> (`useDraftNodeCreation.addBlankNode`, see CLAUDE.md "Blank nodes").

## 1. Goals

- Create **networks** and **resources** in draft mode, wire resources into
  policies as destinations, assign **routing peers** to networks, and deploy
  all of it through the existing Review & Deploy changeset flow.
- Reuse the established draft patterns: blank nodes with NEW badges, unique
  auto-names, changeset coalescing, placeholder-peer gating ("draft-" ids stay
  out of the changeset), client-id → API-id resolution on deploy.

### Non-goals (v1)

- Listing **existing networks** in the components panel and drawing them with
  their resource previews (existing *resources* are already listed and
  droppable). Follow-up.
- Editing/deleting **existing** networks, resources, or routers from the draft
  canvas. v1 covers full lifecycle for *draft-created* entities only; existing
  resources can be referenced (policies, groups) but not mutated.
- Exit nodes, DNS routes, advanced router settings UI (metric tuning,
  masquerade toggle) — deploy uses defaults, see §6.3.
- Enforcing that a network has a routing peer. It is a **warning**, never a
  blocker (mirrors the live "no access control policies" warning, which also
  allows continuing).

## 2. Domain model (existing API, unchanged)

From `src/interfaces/Network.ts` and the live modals
(`NetworkModal`, `NetworkResourceModal`, `NetworkRoutingPeerModal`):

| Entity | Required | Optional | API |
| --- | --- | --- | --- |
| **Network** | `name` | `description` | `POST /networks` |
| **Resource** | `name`, `address`, parent network | `description`, `groups`, `enabled` (default true) | `POST /networks/{networkId}/resources` |
| **Router** ("routing peer") | parent network, `peer` XOR `peer_groups` (exactly one group) | `metric` (default 9999), `masquerade` (default true), `enabled` (default true) | `POST /networks/{networkId}/routers` |

Domain rules:

- **A resource requires a network.** There is no standalone resource; the
  create endpoint is nested under the network.
- **A resource address is a single IP, a CIDR block, or a domain**
  (`10.0.0.1`, `192.168.1.0/24`, `service.internal`, `*.example.com`).
  Validation and type derivation follow `ResourceSingleAddressInput` +
  `normalizeHostCIDR`: contains letters → `domain`; valid CIDR with prefix →
  `subnet`; single host address → `host`.
- **Resources are one-way: destinations only.** A resource never appears as a
  policy source (e.g. group *Admins* → policy → resource *Postgres DB*). The
  canvas already enforces this: `ResourceNode` exposes no draggable source
  handles. A policy side holds multiple groups XOR one peer/resource
  (`PolicyRuleResource`), unchanged.
- **Resources can be members of groups** (`resource.groups`), and policies may
  target such a group instead of the resource directly — group membership is
  how one policy covers many resources.
- **Resources are only reachable through a routing peer.** A network should
  have ≥ 1 router; more than one (or a peer-group router) provides high
  availability. The recommended draft flow for a new router is a **Server
  placeholder peer installed via setup key** (the existing `PeerNode`
  placeholder + `DraftInstallPeerModal` machinery).
- A network can have **many routers**; a router belongs to exactly one
  network.

## 3. Components panel

Category rail stays `Peers / Policies / Groups / Resources`. The Resources
category already carries both create templates (`BLANK_TEMPLATES`), searchable
via the `networks`/`resources` category keywords. Changes:

- **Add New → Network** — drop/click places a network node (behavior in §4.1).
- **Add New → Resource** — drop/click places a resource node and opens the
  draft resource editor (§4.2).
- **Existing Resources** — unchanged (droppable, disabled + ON CANVAS when
  present).
- **Draft resources** created in this draft are listed under Existing
  Resources with a NEW badge, disabled (same presentation as draft groups in
  the Groups category).

## 4. Canvas behavior

### 4.1 Network node (draft-created)

- **Drop** places a `networkNode` with a unique auto-name `"New Network"`,
  `"New Network (1)"`, … (same generator pattern as draft groups /
  placeholder peers) and immediately records a `create-network` change —
  networks only need a name, so they are deployable from the moment they hit
  the canvas (exact symmetry with `addNewGroup`).
- Node id: `network-new-<uuid>`; the `new-<uuid>` part is the changeset
  `clientId`.
- **Rendering**: reuses `NetworkNode` — NEW badge when the network has no API
  id, resource count, and the routing-peer traffic light (gray = 0, yellow
  = 1, green ≥ 2) computed from **draft state** (§4.4) instead of
  `routing_peers_count`.
- **Context menu**: Rename (shared `GroupRenameModal` with network copy;
  unique against other networks on canvas + API networks), Edit (small modal
  for name + optional description, `NetworkModal` content in pure/`useSave-`
  less mode), Remove (canvas-only; for a draft network this drops its
  `create-network` change **and all dependent draft resources/routers**,
  see §5.3), Delete — v1: draft networks only, so Remove and Delete collapse
  into Remove.
- **Handles**: full-area target in draft. Networks are never policy actors —
  they accept only the two membership-style connections in §4.4/§4.5 and
  cannot be dragged from as a policy source.

### 4.2 Resource node (draft-created)

- **Drop** places a `resourceNode` (`resource-new-<uuid>`) with unique
  auto-name `"New Resource (n)"` and opens the **draft resource editor**
  immediately. Unlike networks, a bare resource is not deployable (needs
  address + network), so the editor-on-drop front-loads the required fields —
  same precedent as the User Device template opening its modal on drop.
- **Draft resource editor**: a pure-data modal (policy-modal style,
  `useSave={false}` — no API call) built from the live
  `NetworkResourceModal` fields:
  - **Name** (required, unique across API resources + draft resources).
  - **Address** (required; `ResourceSingleAddressInput` validation verbatim).
  - **Network** (required): selector offering API networks *and* draft
    networks on the canvas; allows creating a new draft network inline by
    typing a name (records `create-network`), mirroring how the policy
    modal's group selector creates draft groups.
  - Optional: description, resource groups (`PeerGroupSelector`, may create
    draft groups).
  - No Access Control tab — policies are drawn on the canvas in draft.
- **Save** → records/updates the `create-resource` change and stamps the node
  data. **Cancel** → the blank node stays on canvas as an *incomplete*
  visual placeholder (today's behavior), configurable later.
- **Incomplete resources** (missing name/address/network) render an amber
  "Set up" affordance on the node (styling of the placeholder-peer Install
  button); clicking the node or the affordance reopens the editor. Incomplete
  resources have **no changeset entry** and gate any policy referencing them
  (§5.2) — the exact pattern of blank policies / `isCompletePolicy`.
- **Rendering**: existing `ResourceNode`/`DeviceCard`, NEW badge while
  id-less; subtitle shows `address` and the parent network name once set.
- **Context menu**: Edit (reopens editor), Rename, Remove (drops the pending
  `create-resource` + cleans dependent policy references, §5.3).

### 4.3 Resources in policies (one-way)

- **Connect group/peer → resource** (existing flow): opens the create-policy
  modal with the resource prefilled as `destinationResource`. Extend
  `handleDraftConnect` so **draft resources** participate like placeholder
  peers do: a pseudo-resource built from node data
  (`{ id: "new-<uuid>", type: derivedFromAddress }`) prefills the modal via
  an `additionalResources` prop (mirror of `additionalPeers`).
- **Resource as source**: impossible by construction (no source handles);
  `handleDraftConnect` additionally hard-rejects `resource → *` if reached.
- **Policy → resource via policy handles**: dragging from a policy's right
  handle onto a resource sets it as the side's single `destinationResource`
  (occupied/duplicate rules unchanged); dragging onto the policy's **left**
  (source) side from a resource is a no-op.
- **Drag resource onto a group node** (existing `useDragToGroup`): unchanged;
  draft resources join with their `new-<uuid>` id in the group's
  `resourceIds`, resolved on deploy (§6.2).

### 4.4 Routing peers

- **Connect peer → network** or **group → network**: records a
  `create-router` change for that network (`peer` for a peer node —
  including placeholders — `peer_groups: [group]` for a group node) and draws
  a **routing edge**. No modal — defaults apply (§6.3).
- **Routing edge**: visually distinct from policy edges — the live network
  view's `floating-straight` (`AnimatedLine`) gray dashed line with a
  "routes" label, direction peer/group → network. Not a `SmartEdge`; it never
  opens the policy modal.
- **Duplicate/occupied rules**: connecting the same peer/group to the same
  network twice is a no-op. Multiple *different* routers per network are
  allowed (that is the HA story: either one group router whose members share
  the duty, or several single-peer routers).
- **"Add Routing Peer" affordance** — the optimal path the feature is named
  for: the network node context menu (and an inline button on a network node
  with 0 routers) offers *Add Routing Peer*, which drops a connected
  **Server placeholder** next to the network, records the `create-router`
  (with the placeholder's `draft-<uuid>` id), and opens the shared install
  modal (`useDraftMode().setInstallModal`) — setup-key install, exactly like
  the Server template. When the placeholder upgrades to a real peer
  (`usePlaceholderUpgrade` / `useDraftPeerUpgrade`), the router change is
  re-recorded with the real peer id and becomes deployable (§5.2).
- **Traffic light**: the draft network node counts its draft routers
  (single-peer routers + group routers; a group router counts as its member
  count when known, else 1) and colors the dot gray/yellow/green as the live
  node does.

### 4.5 Resource ↔ network membership on canvas

Primary assignment is the editor's Network field (§4.2). Additionally:

- **Drag a resource node onto a network node** (drag-to-group interaction
  style) re-/assigns the resource's parent network — updates the pending
  `create-resource` change. v1: draft resources only.
- When a resource and its parent network are both on canvas, a subtle
  membership edge (`simple` gray dashed, resource → network) is drawn so the
  relationship is visible. The network node's resource count includes draft
  members.

## 5. Changeset

### 5.1 New change types (`DraftChangesetContext`)

```ts
interface CreateNetworkChange {
  id: string;
  type: "create-network";
  clientId: string;           // network-new-<uuid> node → "new-<uuid>"
  name: string;
  description?: string;
}

interface CreateResourceChange {
  id: string;
  type: "create-resource";
  clientId: string;           // "new-<uuid>"
  name: string;
  description?: string;
  address: string;            // validated, normalizeHostCIDR() applied on deploy
  // Parent network: API id, or clientId of a draft network (resolved on deploy)
  networkId?: string;
  networkClientId?: string;
  groupIds: string[];         // API ids or draft-group names, resolved like policy groups
}

interface CreateRouterChange {
  id: string;
  type: "create-router";
  clientId: string;
  networkId?: string;         // same either/or as resources
  networkClientId?: string;
  // Exactly one of the two. peerId may be a placeholder "draft-<uuid>" —
  // gated until install (§5.2). groupId may be a draft-group name.
  peerId?: string;
  groupId?: string;
}
```

`update-*`/`delete-*` variants for these entities are out of scope in v1
(non-goal: mutating existing entities); "editing" a draft entity always folds
into its `create-*` change. `getChangeKind` maps all three to `"add"`.

Labels / API-call descriptions (`getChangeLabel` / `getChangeApiCall`):

| Change | Label | API call |
| --- | --- | --- |
| create-network | `Create network "Office"` | `POST /networks` |
| create-resource | `Create resource "Postgres DB" in "Office"` | `POST /networks/{id}/resources` |
| create-router | `Add routing peer "server-1" to "Office"` / `Add routing peer group "Routers" to "Office"` | `POST /networks/{id}/routers` |

### 5.2 Deployability gating (extends `isDeployablePolicy` pattern)

- `isCompleteResource(change)`: name + valid address + network reference.
  Incomplete resources are never in the changeset (the editor only records on
  save with all required fields, so this is an invariant, not a runtime
  filter).
- **Policies referencing a draft resource** are deployable — deploy order
  creates the resource first and resolves the id (§6.2). They are gated only
  while the referenced resource is *incomplete/untracked*: extend
  `isDeployablePolicy` so a `destinationResource` with a `new-` id must have
  a matching `create-resource` change.
- **Routers referencing a placeholder peer** (`peerId` starts with `draft-`)
  stay **out of the changeset** until the placeholder installs or a real
  peer is selected — identical to placeholder-peer policies. On upgrade,
  `usePlaceholderUpgrade` re-records the router with the real id (extend its
  policy re-record sweep to router changes).

### 5.3 Coalescing & cleanup rules

Mirroring the group/policy rules:

- Edits to a draft network/resource **fold into its `create-*` change** (one
  change per entity; the Review list never shows create + update for the same
  draft entity).
- **Removing a draft network node** drops its `create-network` change and
  cascades: dependent `create-resource` changes lose their network (resource
  becomes incomplete → change dropped, node stays with the "Set up"
  affordance), dependent `create-router` changes are dropped, routing/
  membership edges removed.
- **Removing a draft resource node** drops its `create-resource` change,
  removes its id from any group's `resourceIds`, and clears it from any
  policy that referenced it as `destinationResource` — reusing the existing
  `removeNodeWithEdges` policy-cleanup sweep (an emptied side makes the
  policy non-deployable → pending create dropped, exactly as for peers).
- **Removing a routing edge** (or the peer/group node behind it) drops the
  `create-router` change.
- Draft networks are keyed by `clientId`; renames update the change in place.
  Renaming a draft group referenced by a router/resource follows the rename
  (same name-following sweep as policies).

### 5.4 Persistence, undo/redo

- New change types round-trip through `draft-storage.ts`; unknown-type
  dropping on load already protects older snapshots — no version bump needed.
- Node data additions (resource address/network ref, router edges) are part
  of the canvas snapshot; nothing new required.
- `DraftHistoryContext` snapshots nodes+edges+changes — new changes are
  covered for free.

## 6. Deploy (`useDeployChangeset`)

### 6.1 Order

Creates must respect references (groups ← resources/routers/policies,
networks ← resources/routers, resources ← policies):

```
create-group → update-group
  → create-network
  → create-resource        (captures resource clientId → id)
  → create-router
  → create-policy → update-policy
  → delete-policy → delete-group      (unchanged tail)
```

### 6.2 Resolution maps

Alongside the existing group `nameToId` map:

- `networkClientToId`: filled as `create-network` responses arrive; consumed
  by `create-resource` / `create-router` (`networkClientId` → real id). A
  missing entry throws the same "removed from the draft" error as groups.
- `resourceClientToId`: filled by `create-resource` responses; consumed by
  `buildPolicyBody` (a `destinationResource` id starting with `new-` is
  resolved before POST/PUT, `type` taken from the created resource) and by
  group `resourceIds` in `create-group`/`update-group` — **note**: group
  changes deploy *before* resources, so draft-resource ids in groups are
  instead applied by including the (already resolved) group ids in the
  resource's own `groups` field on `POST /networks/{id}/resources`, which the
  API fans out to group membership (this is exactly how the live resource
  modal assigns groups). Group changes therefore filter out `new-` resource
  ids the way they filter `draft-` peer ids today.

### 6.3 Router defaults

`POST /networks/{id}/routers` body: `{ peer | peer_groups: [id], metric:
9999, masquerade: true, enabled: true }` — the live modal's defaults.
(Non-Linux routing peers force masquerade in the live modal; masquerade is
already `true` here, so no OS check is needed.)

### 6.4 Failure

Unchanged semantics: stop on first failure, completed changes removed,
failed + remaining stay for retry. Because resolution maps are rebuilt per
deploy run from API data + responses, a retry after a partial deploy resolves
already-created networks/resources by name/id lookup against the refreshed
API lists (`mutate("/networks")`, `mutate("/networks/resources")` join the
revalidation set).

## 7. Review & Deploy modal

- New changes render with the labels/API calls of §5.1 and the standard
  green "add" kind; individually discardable (discarding a `create-network`
  cascades per §5.3).
- **Warnings block** (new, non-blocking, above the change list):
  - *"Network 'X' has no routing peers — its resources won't be reachable."*
    for any draft network with ≥ 1 resource and 0 routers.
  - *"Resource 'Y' is not referenced by any policy — no peer will have
    access."* for draft resources with no policy referencing them directly or
    via one of their groups (draft equivalent of the live modal's
    `confirmMissingPolicies`).

## 8. Capability predicates & tests

Extend `utils/node-capabilities.ts` (the per-node-kind spec):

- `canBeRoutingPeer(node)` — real peers, placeholder peers, groups; not
  resources/networks/policies.
- `canAssignToNetwork(node)` — draft resources.
- `canConfigureResource(node)` / `canRenameNetworkNode(node)` — draft-created
  only (v1).

Unit test surface (Vitest, mirroring the existing suites):

- `utils/draft-connect.test.ts` — new connect matrix rows: `peer→network`,
  `group→network` (router creation, duplicate no-op), `resource→network`
  (membership), `resource→*` rejection, draft-resource policy prefill.
- `draft/DraftChangesetContext.test.tsx` — create-network/resource/router
  recording, fold-into-create on edit, remove cascades (§5.3), placeholder
  router gating + re-record on upgrade, group-rename following.
- `utils/helpers.test.ts` — address→type derivation, `isCompleteResource`,
  extended `isDeployablePolicy` (draft-resource destination).
- `draft/draft-storage.test.ts` — round-trip of the three new change types.
- Deploy resolution (`useDeployChangeset`): order + clientId resolution +
  group/resource fan-out, behind mocked `useApiCall`.

## 9. Open questions

1. **Existing-entity mutation** (rename existing network, move existing
   resource between networks, delete existing router) — deliberately v2;
   needs `update-*`/`delete-*` change types and delete ordering
   (delete policies → routers → resources → network).
2. Does deleting a draft *group* that is a router's `peer_groups` target
   drop the router change or block the delete? Spec'd: drop the router
   change (consistent with dependent-policy dropping), but worth a UX pass.
3. Should the membership edge (resource → network) be interactive
   (deletable to unassign)? v1: display-only; unassign via editor.
