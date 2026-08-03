# Control Center — Canvas Interaction Matrix

Source of truth for e2e test generation (`e2e/tests/control-center-draft-matrix.spec.ts`).
Derived from `utils/node-capabilities.ts`, `utils/draft-connect.ts`, `NodeContextMenu.tsx`,
`hooks/useDragToGroup.ts`, `hooks/useDraft.ts`, `ControlCenterPolicyModals.tsx`, `utils/helpers.ts`.
Draft mode unless noted; live-mode differences called out inline.

## Node variants

| Node | Id pattern | Variants |
|---|---|---|
| Peer | `peer-<id>` / `peer-draft-<uuid>` | real · placeholder server/agent (user-device is hidden from creation for now) |
| Group | `group-<id>` / `group-new-<uuid>` / `dest-group-<gid>-<pid>` | existing · draft-new · "All" (system) · self-ref destination copy |
| Policy | `policy-<id>` / `policy-new-<uuid>` | existing · new (may be incomplete) · enabled/disabled |
| Network | `network-<id>` / `network-new-<uuid>` | existing frame (read-only name) · draft frame (editable) |
| Resource | `resource-<id>` / `resource-new-<uuid>` | existing framed · draft framed · draft standalone "No Network" |
| Resource group row | `resourcegroup-<id or new-…>` | group folded/dropped into a frame |

## Connect matrix (handle drag, draft)

Left handle = `sl*`, right = `sr*`. Policy: left = source side, right = destination side.
Rule everywhere: a policy side holds **groups XOR exactly one peer/resource**. Resources are
**destination-only** (mirrors access-control: resource access is never bidirectional).

| Source → Target | Allowed | Result | Changeset |
|---|---|---|---|
| peer → peer / peer ↔ group / group → group | ✅ | create-policy modal, both sides prefilled, name "A to B" | `create-policy` on Save only |
| peer/group → resource | ✅ | modal, resource = destination | on Save |
| resource → peer/group | ✅ roles flipped | resource forced onto destination side | on Save |
| resource → resource | ❌ no-op | | none |
| resource → policy (dest side) | ✅ | sets `destinationResource` directly, no modal (only if side empty) | `update-policy` / folds into create |
| resource → policy (source side) | ❌ backstop no-op | | none |
| group/peer → policy (empty/compatible side) | ✅ | appended directly, no modal | `update-policy` / folds into create |
| group → policy (duplicate on that side) | ❌ no-op | | none |
| peer → policy (side has groups or a peer already) | ❌ no-op | | none |
| policy → policy | ❌ no-op (no code path) | | none |
| network → policy / policy → network | ✅ | destination picker modal (`network-destination-selector`); always lands on destination | on pick |
| network → peer/group | ❌ no-op | | none |
| peer/group → network frame | ✅ | create-policy modal, destination scope locked to frame contents, name "X to \<network\>" | on Save |
| peer/group → framed resource / resourcegroup row | ✅ | modal, that resource/group preset as destination | on Save |
| resource → network frame | ✅ | reparents resource into frame (no policy) | resource change once complete |
| self-connection (A → A) | ⚠ not blocked | opens modal with the same entity on both sides | — (open question) |

## Completeness / deployability

- Policy enters the changeset only when both sides are set AND neither references a
  placeholder peer (`draft-` id) or an untracked draft resource. Placeholder-peer policies
  stay canvas-only until the peer is installed (`usePlaceholderUpgrade` re-records them).
- Blank policies (`policy-new-`) can sit incomplete indefinitely; making a tracked policy
  incomplete again (removing its only source) drops its pending change silently.
- A standalone draft resource without network+address never reaches `create-resource` —
  silently absent from Review & Deploy.

## Click / context menu (draft)

No node has a double-click handler. Delete/Backspace acts as the context menu's **Remove**
(routed through `useNodeRemoval`) for nodes that offer Remove; nodes without it (existing
framed resources, live mode entirely) are unaffected. Standalone edges never delete.

| Node | Click | Context menu (draft) | Live diff |
|---|---|---|---|
| Group | Details panel | Focus · Details · Rename¹ · Remove · Delete² | live: no Remove/Delete; Rename behind confirm |
| Policy | edit modal | Focus · Edit · Disable/Enable · Remove³ · Delete² | live: Edit/toggle behind confirm |
| Placeholder peer | — | Focus · Rename · Remove | n/a live |
| Real peer | Details/groups panel | Focus · Details · Remove | live: no Remove |
| Network frame | drill-down | Edit⁴ · Add Resource · Add Resource Group · Add Routing Peer · Remove | live: drill-down only |
| Resource | — (live: editor behind confirm) | Focus · Edit · Rename⁴ · Disable/Enable · Delete (existing+framed) / Remove (draft or unframed) | live: no Delete/Remove |
| Canvas pane | — | New Server/Agent (⌥1-2) · New Policy (⌥3) · New Group (⌥4) · New Network (⌥5) · New Resource (⌥6) | draft only (User Device hidden for now) |

¹ not for "All" or IdP/JWT-issued groups. ² only for existing (API) entities, always confirmed
("marked for deletion…"). ³ Remove is canvas-only, never confirms: draft entity → pending create
cancelled; existing policy → update with emptied sides; existing group → stripped from policies, not deleted.
⁴ draft-new only.

## Drop-into matrix (node drag)

Droppable into groups: peers + resources (real and complete-draft). NOT droppable: groups,
policies, networks, resourcegroup rows.

| Drag → drop | Outcome |
|---|---|
| peer/resource → group | node absorbed, counts bump on all instances, policies follow the entity into the group; `update-group`/folds into `create-group` |
| already-a-member → same group | no-op |
| incomplete draft resource → group | no-op (no groupable id yet) |
| anything → "All" group | ❌ rejected (system-managed; no highlight, no drop). All's canvas count/Details still mirror draft peers added to OTHER groups — implicit membership, never a changeset entry |
| eligible group → network frame | converts to resourcegroup row inside the frame |
| framed resource dragged | moves the whole frame (frame-drag mode) |
| group/policy/network dragged onto anything | plain reposition |

## Rename matrix

Renamable: placeholder peers, draft+existing groups (not "All"/IdP), draft resources,
draft networks (via Edit). NOT renamable: real peers, existing resources (use Edit),
existing network frames, "All".

## Deploy order & dependencies

groups (create/update) → networks → resources → routers → policies → deletes (policy,
resource, group). Client ids (`new-…`) resolve to real ids as creates succeed; a policy
referencing a draft group deploys after that group's create. Failed step halts the run;
completed changes are already removed, so Deploy resumes.

## Resolved design decisions (2026-07)

1. Self-connection (same entity on both policy sides) is intentionally allowed.
2. Group names: "All" is reserved; duplicates (API + canvas draft groups) rejected in the
   create/rename modals.
3. Policies referencing uninstalled placeholder peers are listed in Review & Deploy as an
   ordinary change (`isTrackablePolicy`) — the deploy is blocked by that peer's own
   `install-peer` issue, not a policy-level one; installing the peer re-records the policy
   with the real id.
4. Standalone no-network resources also surface a Review & Deploy warning.
5. Delete/Backspace maps to Remove semantics via `useNodeRemoval` (nodes without a Remove
   menu item are exempt).
6. Focus mode is explicit only (context-menu Focus / header tool). Left-clicking a group
   opens its panel WITHOUT dimming the canvas.
7. Group mutations (rename, membership add/remove via panel or drop) propagate into the
   group copies held by canvas policy nodes/edges (`utils/policy-group-sync.ts`), so the
   policy edit modal and PeerGroupSelector always see the current name/counts.
8. Placeholder peers track an `install-peer` changeset entry (amber "Install" row in
   Review & Deploy — a USER step, not an API call; deploy skips it, Deploy requires ≥1
   real change). Resolved by install/select (placeholder upgrade) or canvas removal;
   renames follow into the entry.
9. Draft members dropped into a group ride on the group node (`draftPeers`/
   `draftResources`) so the Details panel lists them (with the NEW badge) — absorbed
   placeholders included (hostname matching scans `draftPeers` too). Incomplete
   (no-network) draft resources are droppable too and show a "No Network" alert row.
10. All placeholder kinds show the same "⚠ Not installed" alert CTA (canvas node and
    panel rows) — servers/agents open the install modal. (The user-device kind and its
    setup-stepper modal `DraftUserDeviceModal` still exist in code but are hidden from
    creation for now; upgraded placeholders always become plain peer cards.)
11. Clicking a placeholder peer opens its groups panel (like real peers). Assigned
    EXISTING groups become the setup key's `auto_groups` (peer registers pre-grouped);
    draft-group memberships can't ride on the key (no API id yet) — they deploy with the
    changeset after the upgrade sweep swaps in the real peer id, so ordering stays
    correct either way.
12. **Install matching via a hidden bound group (2026-07).** Server/agent placeholders are
    matched to their registering machine by GROUP membership, not hostname (hostname is a
    fallback). The mechanism is invisible to the user — it is NOT a changeset entry, never
    shown in Review & Deploy or the components panel, and never used in policies:
    - When the user generates the setup key (`DraftInstallPeerModal.resolveAutoGroups`), a
      throwaway group named "<placeholder name> (<suffix>)" is created directly via
      `POST /groups` and its id rides on the key as an `auto_group`. Its id is stored on
      the node (`boundGroupId`) so a reopened Install reuses it.
    - The registering peer lands in that unique group, so `useDraftPeerUpgrade.findByGroup`
      identifies it unambiguously and upgrades the placeholder in place. Once matched, the
      group has served its purpose and is `DELETE`d from the API.
    - Policies still reference the placeholder by its `draft-` peer ref and are re-recorded
      with the real peer id on upgrade (design decision 8), unchanged by this.
