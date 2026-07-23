# Control Center Module

> **Important:** Always update this CLAUDE.md file after making changes to the control center module. Keep the provider tree, file structure, node/edge types, and feature descriptions in sync with the code.

Canvas-based network topology editor built on [ReactFlow](https://reactflow.dev/). Shows peers, groups, policies, and networks as interactive nodes with connections between them. Supports a draft/edit mode for modifying the topology.

## Architecture

### Provider Tree (page.tsx)

```
DraftModeProvider          → isDraft, activeTool (select/hand)
  DragAndDropProvider      → drag-from-sidebar logic
    ReactFlowProvider      → canvas state
      PoliciesProvider     → global policies
        PeersProvider      → global peers
          CanvasStateProvider      → nodes, edges, selection state, view state
            GroupsProvider         → group CRUD, dropdown options
              ChangesetProvider    → draft change tracking (localStorage-backed)
                DraftHistoryProvider → draft undo/redo (canvas + changeset snapshots)
                  PolicyProvider     → policy modal state + addPolicyEdge (records draft changes)
                    UIProvider       → view hooks, handlers, navigation (sidebar={...})
                      ControlCenterCanvas  → ReactFlow + overlays
```

### Key Contexts

| Context                       | Hook                       | What it provides                                                                                                                         |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `CanvasStateProvider`         | `useCanvasState()`         | nodes, edges, setters, layoutInitialized, currentView, all selection state, loggedInUser, forceSingle\*ViewRefs                          |
| `ControlCenterUIProvider`     | `useControlCenterUI()`     | networkOptions, currentNetwork, onViewChange, onNetworkSelect, onNodeClick, onForceSingleUserView                                        |
| `ControlCenterPolicyProvider` | `useControlCenterPolicy()` | selectedPolicy, policyModalOpen, createPolicyModal, source/destination resources & groups, addPolicyEdge                                 |
| `DraftModeProvider`           | `useDraftMode()`           | isDraft, setIsDraft, activeTool, setActiveTool                                                                                           |
| `DraftChangesetProvider`      | `useDraftChangeset()`      | changes, changeCount, CRUD track\* helpers (create/update/delete group + policy), removeChange, clearChanges — persisted to localStorage |
| `GroupsProvider`              | `useGroups()`              | groups, createOrUpdate, refresh, dropdownOptions                                                                                         |

### Data Flow

1. **`useControlCenterData()`** fetches all API data (policies, peers, networks, groups, users, resources) + derives `networkOptions` and `isDataReady`
2. **View hooks** (`useGroupView`, `usePeerView`, `useUserView`, `useNetworkView`) build node/edge graphs for each view mode. They consume data and canvas state via context internally — no params needed.
3. **`useSelectNodeHandlers({ views })`** owns all navigation, entity change handlers, view initialization effect, and onNodeClick. Only param is `views` (to break circular dep between handlers and view builders). Its shared `fitView` waits (bounded rAF retries) until every target node has a measured size — returning to the page via client-side nav remounts with a warm SWR cache, so the view initializes before ReactFlow measured the new nodes and an immediate fit would misalign the camera.
4. **`ControlCenterUIProvider`** calls the view hooks + handlers internally, wires up circular dependency refs, and provides everything to the UI via context.
5. **`useDraft()`** manages draft mode — builds canvas from visible policies (source groups/peers → policy → destination groups/peers/resources), restores a persisted draft canvas after a reload, persists the draft canvas to localStorage (debounced), handles node connections to open policy modal.
6. **`useCreateGroupOnCanvas()`** creates groups and adds them to canvas — via API in live mode, changeset-only in draft. Used by PeersToolbar and CanvasContextMenu.
7. **`useDraftGroupActions()`** draft group operations (drop new group with unique "New Group (n)" name, rename across all canvas instances, remove-from-canvas, delete) — all changeset-only.
8. **`useDeployChangeset()`** executes the changeset against the API in CRUD dependency order (create groups → update groups → create policies → update policies → delete policies → delete groups).

### Circular Dependency Resolution

View hooks create node `onClick` callbacks that reference `forceSingleGroupView`/`forceSinglePeerView` from the handlers. But handlers need the view builders. This is resolved via refs in `CanvasStateProvider`:

```
forceSingleGroupViewRef / forceSinglePeerViewRef / refreshLiveViewRef
  ↑ set by ControlCenterUIProvider after both hooks return
  ↓ read by view hooks via useCanvasState() when onClick fires
```

### Live policy updates (no refetch wait)

Saving a policy in LIVE mode patches the canvas in place from the PUT response instead of waiting for the SWR `/policies` revalidation: the modal's `handlePolicyChange(updated)` calls `refreshLiveViewRef.current(updated)` → `refreshLiveView` (useSelectNodeHandlers) rebuilds the CURRENT view (group/peer/user/single-network/networks-overview) with the fresh policy spliced into the cached list — every view applier accepts an optional `policiesOverride` (single/overview network views skip their `layoutInitialized` guard when it's given). Surviving top-level nodes keep their positions, `select-*` nodes are carried over, no `layoutInitialized` reset, no fitView — added/removed sources, destinations, edges and handles reconcile through the rebuild. `currentPolicy` (policy modal) prefers the canvas node's `data.policy` in BOTH modes (freshest: draft edits or the just-saved response), falling back to the API list. The background `mutate("/policies")` from PoliciesProvider still runs and simply confirms what's already drawn.

## File Structure

```
control-center/
├── page.tsx                          → Provider tree + ControlCenterCanvas component
├── ControlCenterContext.tsx           → CanvasStateProvider + ControlCenterUIProvider
├── ControlCenterPolicyModals.tsx      → Policy modal context + modals (renders inside provider)
├── ControlCenterHeader.tsx            → Header overlays (HeaderTopLeft, HeaderTopRight, HeaderBottom); the networks-view selector only renders when networks exist (hidden alongside the empty state)
├── ControlCenterEmptyStates.tsx       → Empty state displays per view
├── CanvasContextMenu.tsx              → Right-click canvas menu (Create Group, Add Peer, etc.)
├── NodeContextMenu.tsx                → Right-click node menu (Rename/Remove/Delete, policy Enable/Disable)
├── ConnectionLine.tsx                 → Custom connection line during drag
├── DragAndDropProvider.tsx            → Drag-from-sidebar state
├── FlowSelector.tsx                   → Peer/User/Group/Networks tab selector
├── NetworkRoutingPeerCount.tsx        → Live single-network header's routing-peers control (RoutingPeersBar over the API routers; rows open the REAL routing-peer modal — its save PUTs; Add navigates to the routing-peers tab). API-router rows everywhere (live frames, draft frames' existing networks) open that real modal via routingPeerModal.router; draft-change rows keep the pure-data edit flow
├── RoutingPeersBar.tsx                → Shared `[● status ⌄ | ⊕ Add]` button group + PeerSelector-style routers popover (RoutingPeersIndicator, RoutingPeerRow, getRoutingPeerCount, sortRoutingPeerRows) — used by the draft frame's floating bar and the live header
│
├── hooks/
│   ├── useControlCenterData.ts        → All API fetching + networkOptions + isDataReady
│   ├── useSelectNodeHandlers.ts       → Entity handlers, force-view, navigation, onNodeClick, view init effect
│   ├── useDraft.ts                    → Draft save/restore, canvas persistence (localStorage), node transformation, onNodeConnect
│   ├── useControlCenterShortcuts.ts   → Keyboard shortcut hook (draft-only, input-aware) + isInputFocused()
│   ├── useDraftNetworkActions.ts     → Draft network/resource/router actions: addRouterFromSelection, assignResourceToNetwork, saveDraftResource + syncDraftResource, renameDraftNetwork, getNetworkRef
│   ├── useNetworkFrameLayout.ts      → Reconciling frame layout from measured child heights (parent view 2×4 grid + overflow hiding; drilled frame = full viewport-shaped grid); also stamps frame children `selectable: false` (full-width rows + Partial selection mode would drag them into any grazing rubber-band selection)
│   ├── useFrameEdgeAttachment.ts     → Policy edges to framed resources attach to the frame (parent view) / the resource (drill-down); pure logic in utils/frame-view.ts
│   ├── useNetworkDrillDown.ts        → Single-network drill-down: hides everything but the frame's world, RE-LAYS the kept nodes out like the live single-network view ("network" hierarchical layout, resource spacing 95), fits the view; restores hidden flags + snapshotted parent positions + viewport on exit
│   ├── useDraftPeerUpgrade.ts        → usePlaceholderUpgrade (swap placeholder→real peer in place, rewire edges, re-record policies + routers, rename group member ids; user-device selects keep their dropdown) + useDraftPeerUpgrade (watches peers, matches installHostname)
│   ├── useEdgeAwareMenuPosition.ts    → Keeps context menus inside the viewport (flip to other side of cursor, clamp fallback); used by CanvasContextMenu + NodeContextMenu
│   ├── useCreateGroupOnCanvas.ts     → Creates group (API in live, changeset in draft) + adds group node to canvas
│   ├── useDraftGroupActions.ts       → Draft group ops: addNewGroup, renameGroup, removeGroup, deleteGroup (changeset-only)
│   ├── useDeployChangeset.ts         → Deploys the changeset via API in dependency order
│   ├── useDragToGroup.ts             → Drag peer/resource onto group node (tracked as update-group in draft)
│   └── views/
│       ├── types.ts                   → ViewResult type + addDestinationResourceNodes helper
│       ├── useGroupView.ts            → Group view builder
│       ├── usePeerView.ts             → Peer view builder
│       ├── useUserView.ts             → User view builder
│       └── useNetworkView.ts          → Network view builder (single + all)
│
├── draft/
│   ├── DraftModeContext.tsx            → isDraft toggle + CanvasTool (Select/Hand; draft-only — live always pans with the grab cursor, even if Select was active on draft exit) + installModal state
│   ├── DraftChangesetContext.tsx       → Typed draft changes + coalescing + change labels/API-call descriptions
│   ├── DraftHistoryContext.tsx         → Undo/redo: debounced snapshots of nodes+edges+changes (⌘Z / ⇧⌘Z)
│   ├── draft-storage.ts                → localStorage persistence (changes + canvas snapshot, Set-safe)
│   ├── DraftLeaveGuard.tsx             → beforeunload prompt + in-app navigation intercept while changes pending
│   ├── useDiscardDraft.ts              → Guarded draft exit (confirm while changes pending) + exitAfterDeploy
│   ├── ReviewDeployModal.tsx           → "Review & Deploy" modal: lists changes + API calls, runs useDeployChangeset
│   ├── GroupRenameModal.tsx            → Rename modal used by the node context menu (groups, placeholder peers, draft networks — via takenNames)
│   ├── DraftResourceEditorModal.tsx    → Draft resource editor (name/address/network/groups; pure-data, records create-resource)
│   ├── DraftRoutingPeerModal.tsx       → Networks page's routing-peer modal in pure-data mode (frame "Add" button / context menu; onSaved → addRouterFromSelection)
│   ├── DraftNetworkDestinationModal.tsx → Minimal destination picker: POLICY↔network drags pick that policy's destination among the network's resources/resource-groups
│   ├── DraftNetworkEditModal.tsx       → Networks page's network modal in pure-data mode (name + description of a draft network; context menu Edit + drill-down header)
│   ├── DraftResourceNetworkModal.tsx   → "No Network" picker for a standalone draft resource: pick an existing network (draft frame or API network) or Create New Network (NetworkModalContent) → assigns/reparents the resource
│   ├── ControlCenterComponentsPanel.tsx → Floating, toggleable "Components" node picker. Peers/Resources/Groups accordion sections, each with create-new items on top + existing entities below. Toggled via the CanvasToolbar "Add" button (A) / Esc to close
│   ├── CanvasToolbar.tsx              → Bottom toolbar (select/hand/undo/redo/zoom/fit/auto-arrange)
│   ├── PeersToolbar.tsx               → Selection toolbar (create group from selected peers/resources; Remove/Delete for selected groups)
│   ├── CreateGroupNameModal.tsx       → Shared modal for entering group name (used by PeersToolbar + CanvasContextMenu)
│   ├── DraftInstallPeerModal.tsx      → Shared "Install NetBird" modal (driven by useDraftMode().installModal)
│   ├── DraftModeSwitcher.tsx          → Live/Draft toggle + Cancel + Review & Deploy (change-count badge)
│   └── DraftModeTitle.tsx             → Draft name + dropdown selector
│
├── nodes/
│   ├── PeerNode.tsx                   → Peer device card with handles
│   ├── GroupNode.tsx                  → Group with name, counts, dropTarget highlight
│   ├── PolicyNode.tsx                 → Policy pill with protocol/port info
│   ├── NetworkNode.tsx                → Network card with resource preview
│   ├── ResourceNode.tsx               → Network resource display (routes standalone draft/existing resources to StandaloneResourceNode; renders the flat row for framed resources + DeviceCard for live views)
│   ├── StandaloneResourceNode.tsx     → Standalone draft resource card: unassigned → floating top-left "No Network" button (opens picker); assigned → network shown inline after the name ("Name - Network", same color); context-menu halo on the whole card
│   ├── ResourceGroupNode.tsx          → Resource group INSIDE a network frame (flat resource-row look, frame-managed)
│   ├── MoreResourcesNode.tsx          → "+N more" cell for a network frame's overflow (overlay, not a ReactFlow node; positioned by useNetworkFrameLayout)
│   ├── DeviceCard.tsx                 → Reusable device/peer card
│   ├── NodeItem.tsx                   → Sidebar list item renderer
│   ├── SelectPeerNode.tsx             → Peer selector dropdown node (live mode)
│   ├── SelectGroupNode.tsx            → Group selector dropdown node (live mode)
│   └── SelectUserNode.tsx             → User selector dropdown node (live mode)
│
├── edges/
│   ├── SmartEdge.tsx                  → Dynamic edge: picks best side, supports bidirectional (green=bi, blue=uni)
│   ├── DirectionIn.tsx                → Static directional edge (bezier/straight/smoothstep)
│   ├── BidirectionalEdges.tsx         → Two offset animated lines
│   ├── FloatingEdge.tsx               → Floating intersection-point edge
│   ├── AnimatedLine.tsx               → Animated dashed line with label
│   └── SimpleConnection.tsx           → Simple gray dashed line
│
├── handles/
│   ├── AllHandles.tsx                 → Left/right source handles + full-area target handle (top/bottom non-connectable for edge anchors)
│   ├── ConnectHandle.tsx              → Visible connection handle with arrow icon (shown on hover via group/node)
│   └── FullAreaTargetHandle.tsx       → Invisible whole-node target (shared by AllHandles, PolicyNode, NetworkNode)
│
├── toolbar/
│   ├── ToolbarButton.tsx              → Button with tooltip + shortcut badge
│   ├── ToolbarContainer.tsx           → Outer flex container with border
│   ├── ToolbarDivider.tsx             → Full-height vertical separator
│   └── ToolbarGroup.tsx               → Section wrapper with padding
│
├── utils/
│   ├── graph-builder.ts               → addNode, addEdge, addExpandedGroupContent, getGroupPeers/Resources, DEFAULT_LAYOUT_CONFIG
│   ├── nodes.ts                       → NodeType enum + NODE_TYPES registry
│   ├── edges.ts                       → EDGE_TYPES registry
│   ├── helpers.ts                     → getFirstGroup (initial group-view pick: non-All group with policies → All with policies → any non-All → any; never an empty group while a populated one exists), getPolicyProtocolAndPortText, getResourcePolicyByGroups
│   ├── layouts.ts                     → D3 force/hierarchical layout + zoom constants
│   ├── canvas-transition.ts           → Shared dive/fly-out scene transition. One-liner facades for ANY drill-down: `drillInto(reactFlow, clickedNodeOrRect, swap)` and `drillOutOf(reactFlow, swap, fromNodeOrRect?)` (accelerating pre-swap motion + fade-out → invisible swap → grow-in reveal computed from the new scene; half-eases stitch into ONE zoom). Used by the draft drill-down (both directions) and live network select/back; view-init fitView is suppressed while isCanvasTransitionActive()
│   ├── drilled-layout.ts              → THE single-network layout (applyDrilledLayout + getDrilledFrameAnchor + DRILLED_RESOURCE_SPACING) — one definition shared by the live single-network view, the draft drill-down, and live→draft drilled entry
│   ├── frame-view.ts                  → Pure §10 logic: computeFrameEdgeTargets (frame↔resource edge attachment), computeDrillDownKeepSet (drill-down visibility)
│   └── edge-helper.ts                → Node intersection calculations for floating edges
│
└── user/
    └── ControlCenterCurrentUserBadge.tsx → User badge in header
```

## Views

Each view builds a node/edge graph from API data:

| View        | Source node                       | Layout               | What it shows                                                            |
| ----------- | --------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| **Peer**    | SelectPeerNode → PeerNode (draft) | Hierarchical         | Selected peer → policies → destination groups → expanded peers/resources |
| **Group**   | SelectGroupNode                   | Hierarchical         | Selected group → policies → destination groups → peers/resources         |
| **User**    | SelectUserNode                    | Hierarchical         | Selected user → their peers → policies → destination groups              |
| **Network** | (all networks)                    | Force / Hierarchical | All networks as read-only FRAMES (same chrome as draft frames: resources as child rows, floating RoutingPeersBar without Add, click drills into the single-network view; rows non-draggable), or single network detail |

## Draft Mode

When entering draft from a live view:

1. Live state (nodes/edges) is saved to a ref
2. Canvas is rebuilt from **visible policies** (only policies that had policyNodes on the live canvas), plus the entities shown in the live view even when they have no policies (group nodes on the canvas and the group/peer picked in the live select node) so a policy-less view doesn't enter an empty draft. The picked peer is skipped when a group already on the draft canvas contains it (peer view: a standalone copy would overlap the group unconnected):
   - Source groups/peers → policy node → destination groups/peers/resources
   - Self-referencing policies (same group in source + destination) create a `dest-group-` copy node
   - All group nodes get `showHandles: true` and `addedMembers` for drag-to-group validation
   - Resource nodes get `showHandles` but no draggable source handles (resources can't be sources)
3. Hierarchical layout is applied (sources → policies → destinations)
4. Canvas fits to view

When exiting draft:

1. Live state is restored from the ref
2. Canvas fits to view

### Draft Features

- **Draft start screen** (`DraftEmptyCanvas`): shown while `isDraft && nodes.length === 0`; fades out/in (100ms ease-out, matching the components panel animation) when the panel opens/closes. Right-clicking it opens the draft canvas context menu — the overlay root carries the `draft-empty-canvas` marker class that `CanvasContextMenu` treats as canvas, and the menu is portaled to `<body>` so it renders above the overlay. Mirrors the live `GetStartedTest` header (no card bg) with template cards (Remote Access / Business VPN / Site-to-Site — all just open the components panel for now; starter topologies are TODO). No standalone Add button — the always-visible `CanvasToolbar` "Add" is used to open the components panel. Draft chrome in draft: `HeaderTopLeft` is empty — exiting happens via Cancel in the `DraftModeSwitcher` (`DraftModeTitle` — Untitled Draft dropdown + three-dots — is currently hidden/commented out in the header, kept for later), the `CanvasToolbar` (always visible in draft, slides in/out with draft via framer-motion) in `HeaderBottom`, and Cancel / Review & Deploy in `DraftModeSwitcher` (Cancel always shown and exits draft via `useDiscardDraft`; Review & Deploy **hidden** when the canvas is empty and no changes are pending, **disabled** at 0 changes, and shows the change count as a badge). While an empty state is shown (`nodes.length === 0`), canvas interactions (pan/zoom/select/drag) are locked in `page.tsx`. In draft, `HeaderTopLeft` shows nothing (all live controls — tabs, network selector, etc. — are gated `!isDraft`).
- **Components picker**: A node-picker panel floating above the bottom toolbar (centered, ~680px). Toggled by the CanvasToolbar "Add" button (shortcut `C` — the shortcut hook cancels the keystroke so it isn't typed into the search input the panel focuses on open; plus icon rotates 45° while open); closed by `Esc` — even while focus is inside the panel (handled on the panel root, since the global shortcut hook is input-aware) — clicking the canvas, or opening the canvas context menu (right-click). Layout: search bar on top (placeholder "Search components, peers, groups, resources...", with a clickable `ESC` badge instead of an X — an X next to the search would read as "clear search"), category rail on the left (**Peers** / **Policies** / **Groups** / **Resources** — no separate "Create New" tab; every tab carries its own create items), virtualized item list on the right. Create-new templates use the same solid icon box as existing entities and always sit under an **"Add New"** section heading: entity categories show "Add New" followed by "Existing Peers/Policies/Groups/Resources", and search results show a top "Add New" section (matching templates across all categories) followed by per-entity sections of existing items. Items can be dragged onto the canvas **or simply clicked** — `useDragAndDrop` treats a release with < 5px pointer travel as a click and fires the same drop action at the canvas viewport center — or, when that spot is occupied, at the nearest free spot the user can currently see (`findFreeDropPosition` ring-searches outward from the center against the measured node rects). When the whole visible view is full, the node lands just outside it and the viewport zooms out via `fitBounds` to reveal it. Entities already on the canvas are disabled (content dimmed) and show a gray "ADDED" badge on the right instead of the drag grip. When a search matches nothing, the list area shows the same not-found state as the global search modal (icon box + "Could not find any results"). Templates that open a modal (**User Device**, new **Policy**) close the panel after a short delay (`MODAL_CLOSE_DELAY_MS`, 150ms) so the modal is already visible when the panel fades out — an instant close next to an opening modal reads as a flicker. Category contents:
  - **Peers**: create items **User Device** / **Server** / **Agent** → all draggable onto the canvas; every drop places a placeholder `PeerNode` (`placeholderKind`, no API call) named uniquely per drop ("User Device", "Server (1)", "Agent", … — `placeholderName`, computed against placeholder names on canvas). All placeholder kinds carry a floating **Install** button top-left above the node (positioned inside the node — not a `NodeToolbar` portal — so it zooms with the canvas; secondary-button styling). **User Device** renders as a select node (`UserDeviceSelectNode` in PeerNode.tsx): SelectPeerNode-style dropdown showing "Select user device..." until a peer is chosen (peers already on canvas are excluded from the options), plus the floating **Install** button (hidden once a peer is selected). Choosing a peer upgrades the node in place via `usePlaceholderUpgrade` — it keeps its dropdown (re-selecting later remaps again), edges are rewired, and draft policies referencing the old id follow the selection. The Install button (and User Device drop) open the shared install modal via `useDraftMode().setInstallModal` (carrying `placeholderKind` + `nodeId`), rendered once by `DraftInstallPeerModal`. The setup key is generated _inside_ the modal on demand (`SetupKeyGenerator`, `ephemeralKey` for agents) and written back onto the node (`setupKey`) so reopening Install reuses it. The placeholder node mirrors a real peer node's card layout (same paddings/text sizes); the IP slot shows a dimmed IP placeholder derived from the account's peer network range via `getIpPlaceholderFromRange` (`settings.network_range`, default 100.64.0.0/10 → "100.x.x.x"; prefix-fixed octets kept, host octets become "x"). Placeholders are renamable via the node context menu (Rename → shared `GroupRenameModal` with peer copy; duplicate check via `takenNames` against the other draft peers on canvas) — the name (`placeholderName`) is canvas-only. The install modal receives a suggested `hostname` (`getPlaceholderHostname`: the canvas name sanitized to lowercase/dashes, made unique across draft peers by appending -1, -2, …) woven into the `netbird up --hostname` commands, so the installed machine registers under the drafted name. The suggested hostname is stamped onto the node (`installHostname`, like `setupKey`) when the install modal opens; `useDraftPeerUpgrade` (called from `useDraft`) then watches the peers list and, when a peer registers with that hostname (or name), upgrades the placeholder in place — real peer node at the same position, edges rewired, and draft policies referencing the "draft-…" id re-recorded with the real peer id (now deployable → enters the changeset). Then existing peers (drag onto canvas; disabled if already there).
  - **Resources**: create items **Resource** + **Network** → drag onto canvas to drop a blank, id-less node. A dropped **Resource** is now a STANDALONE card (no auto-network) carrying a "No Network" control until assigned; a blank **Network** drops an empty frame. Existing resources show "name - network" (like global search) and can't drop into a frame. **Existing networks** drop as a FULL frame (`dropExistingNetworkFrame`): a node with its REAL id (`network-<realId>`, `data.network` keeps its id) marked a frame via `data.frame: true`, with its existing resources created as read-only child nodes. No `create-network` change (it already exists). Frame-ness is a property, NOT the id prefix: `isFrameNode(node)` = `data.frame` OR the `network-new-` fallback (draft networks are always frames); `isDraftNetworkNode(node)` = `network-new-` id (a not-yet-created network — editable/removable/tracked as a draft). So `network-new-` now means exclusively "draft network", and existing-network frames get frame behaviour (layout, drag-drop, drill-down, Add Resource/Routing Peer) but not draft-only actions (no Edit-name, no untrack on Remove). `getNetworkRef` resolves each frame to its real id (existing) or client id (draft). Dropping an existing network or an existing resource also draws the API policies granting access to the dropped resources — matched by `getPoliciesTargetingResources` (direct `destinationResource` id or a destination group the resource belongs to) and drawn via `drawPolicyOnCanvas` next tick (`drawResourcePolicies` in the panel; anchors left of the drop point, one row per policy) — the mirror of an existing-policy drop pulling in its sources/destinations.
  - **Groups**: create item **Group** → drag to drop a blank group node (renders NEW badge). Then existing groups; groups pending deletion show a red DELETED badge and are disabled (can't be re-added).
  - **Policies**: create item **Policy** → drop places a blank policy node (no modal) named uniquely "Policy" / "Policy (1)" … via `useDraftNodeCreation.addBlankPolicy` (client id `new-<uuid>`, empty sources/destinations, enabled, bidirectional, protocol all). Blank policies are NOT in the changeset — only real policies deploy; see Changeset below. Then existing policies → drop draws the policy with its sources/destinations via `drawPolicyOnCanvas`: nodes already on canvas are connected, missing ones are created around the drop point; disabled when already on canvas.
  - Draft networks/resources are fully tracked (see the Networks & Resources bullet below) — dropping a **Network** records `create-network` immediately (unique "New Network (n)" name); dropping a **Resource** opens the draft resource editor (`DraftResourceEditorModal`). Draft resources also list under Existing Resources with a NEW badge (disabled).
  - Each section's count reflects existing entities only (not create items). Search matches item names/labels **and** category words (e.g. "peers"/"groups"/"resources"/"networks" reveal the whole matching section); a section shows if its existing items OR its create items match.
- **Drop/drag z-order**: anything dropped from the panel or drag-released on the canvas settles ABOVE everything else (`getTopZIndex` in utils/helpers — maxZ+2 so it beats frames and their parent+1 children; transient ≥1000 drag elevations ignored). Applied in `placeNode`, `dropExistingNetworkFrame`, `addNewGroup`, and `useDragToGroup.onNodeDragStop` — e.g. a peer dropped over a network frame paints above it, not behind.
- **Connect nodes**: Drag between handles to create a policy (peer↔peer, peer↔group, group↔group, group↔resource, peer↔resource). The create-policy modal opens prefilled: groups land in the group lists, a peer lands as a single `PolicyRuleResource {type:"peer"}` (shown as a peer badge in `PeerGroupSelector`, which enforces per side: multiple groups XOR one peer/resource). All four prefill fields are reset on every connect so a cancelled modal can't leak stale values. The modal runs with `useSave={false}` in draft — it returns pure policy data (no API call), recorded as a `create-policy` change and drawn on canvas with a `policy-new-<uuid>` client id. Connecting a group to itself (e.g. All → All) creates a destination copy node (self-referencing policy). Placeholder peers participate too: `getPlaceholderPeer` (utils/helpers) turns their node into a pseudo-Peer with its unique draft id ("draft-<uuid>", node id `peer-draft-<uuid>`), so they prefill and connect like real peers — the policy modal's peer selectors receive them via `additionalPeers` (PeerGroupSelector merges them with fetched peers). Policies referencing an uninstalled placeholder are NOT deployable and stay out of the changeset (see Changeset).
- **Policy connect handles (draft)**: policy nodes show hover ConnectHandles; dragging from the policy's **right** handle onto a group or peer adds it as a **destination**, from the **left** as a **source**. The reverse works too — policies expose a full-area target in draft: dragging from a node's **left** handle onto a policy adds it as a **destination**, from its **right** handle as a **source** (`onNodeConnect` → `addGroupToPolicy` / `addPeerToPolicy` → `updateDraftPolicy`). Groups append to the side's group list; a peer (incl. placeholders) becomes the side's single `sourceResource`/`destinationResource` `{type:"peer"}` and only lands on an **empty** side (a side holds multiple groups XOR one peer/resource). No-ops for duplicates and occupied sides. Policy nodes also get the sky halo while their modal is open.
- **Default policy name**: connecting two nodes prefills the create-policy modal name as "Source to Destination" (e.g. "All to New Group") via `policyInitialName` on the policy context.
- **Auto Arrange** (toolbar, `A`): `applyDraftArrangeLayout` re-arranges by _connectivity_ (not node type): policy sources → left column, policies → middle, destinations → right, unconnected nodes → far-left column; columns sorted by average policy index to reduce crossings.
- **Undo/redo (draft)**: `DraftHistoryContext` — debounced snapshots of nodes+edges+changes (drag positions collapse into one entry); toolbar buttons + ⌘Z/⇧⌘Z (Ctrl+Y also redoes). History resets when entering/leaving draft.
- **Create group**: Select 2+ peers/resources → toolbar appears → opens name modal → group node replaces selected nodes; changeset-only in draft (API in live). Policies that referenced a grouped peer/resource (incl. placeholders) as their single source/destination are rewired to the new group (`getPolicyRegroupUpdates` → `updateDraftPolicy`) — the peer resource is dropped, the group takes its side, edges redraw. Placeholders join the group as members with their "draft-…" ids (create-group `peerIds` + node `addedMembers`); when they install/get selected, `usePlaceholderUpgrade` renames the id to the real peer everywhere (`replacePeerIdInGroups` + `addedMembers`), and deploy filters out any "draft-" member ids that never materialized.
- **Create group (context menu)**: Right-click canvas → "Add Group" → name modal → group node at click position; changeset-only in draft
- **Drop new group (sidebar)**: `useDraftGroupActions.addNewGroup` — unique "Group" / "Group (1)" name, NEW badge, `create-group` change (the group panel opens on click, not on drop). Draft groups also appear in the sidebar Groups list (NEW badge, disabled).
- **Add peer (context menu)**: Right-click canvas → "Add Peer" → opens SetupModal (install NetBird)
- **Drag group into network frame**: dragging a group node onto a frame converts it in place to a resource-group row INSIDE the frame (same node id → its policy edges follow and re-attach to the frame; canvas-only in v1). Eligibility (`canDropGroupIntoNetwork` in utils/helpers, tested): the group is EMPTY (no peers/resources/draft-added members) OR at least one of the network's resources (API list + draft/standalone assigned ones) belongs to it; the frame shows the drop-target highlight only when eligible. Third case: a draft group carrying UNASSIGNED draft resources (grouped standalone cards ride on the group node as `data.draftResources`, stamped by `useCreateGroupOnCanvas` via PeersToolbar) may drop into any network — the drop records a `create-resource` change per carried resource (network + group membership; incomplete/address-less ones stay untracked).
- **Drag to group**: Drag a peer/resource onto a group node to add it (validates duplicates); recorded as `update-group` (or folded into the group's `create-group` change). Placeholders can be dragged in too (draft-id membership, renamed on install like Create group), and policies referencing the dragged entity as their single source/destination are rewired to the group. The count/`addedMembers` update applies to EVERY canvas instance of the group (source node + destination copies), matched by id — or by name for draft groups.
- **Group panel** (`DestinationGroupPanel`): opens on group click (any view in draft); draft-aware — resolves the group from canvas nodes (renames, drag-added members across all instances), shows NEW badge, inline rename (pencil) in draft
- **Networks, resources & routing peers (draft)** — spec: `specs/draft-networks-resources.md`; accepted v1 gaps: `specs/limitations.md`. Draft networks render as a **frame** (dashed border + solid bg, `NETWORK_FRAME_WIDTH`/`getNetworkFrameHeight` sizing via node style) whose resource nodes live INSIDE as ReactFlow children (`parentId`, relative `getFrameChildPosition`; parents precede children in the array; auto-arrange resolves child connectivity onto the frame and never moves children). Frame header band: name + resource count (`singularize`, "No Resources" when empty). The **"Add Resource"** button (draft only; opens the resource editor in create-mode via `setResourceEditor({ createInNetworkNodeId })`) lives in a bottom band the layout always reserves (`NETWORK_FRAME_ADD_ROW`) — centered in the body for an empty network, a full-width row pinned to the bottom once there are resources — so it stays reachable at any resource count (including past the overflow cap, where the last grid cell becomes a "+N more" cell; see the Parent view bullet). The frame's only children are resource nodes. The routing state lives in a floating button group above the frame — `[● status ⌄ | Add]` (no HelpCircle/HA tooltip): with ≥1 router the status button gains a ChevronsUpDown select icon and opens a PeerSelector-style popover (Popover + DropdownInput search via useSearch; one row per router — OSLogo + peer name or GroupBadgeIcon + group name, from create-router changes plus the API routers of existing networks; a hover-only edit icon on draft rows opens the routing-peer modal prefilled via `routingPeerModal.editChangeId` — the save replaces that change); with none it opens the add modal directly; full-area target; context menu Edit (name + description via `DraftNetworkEditModal`) / Add Routing Peer / Remove (cascades changes; the network's contained resources are removed with it, along with routing peers whose only connection was routing this network — peers/groups with other relationships stay). Dropping a **Resource** (components panel / canvas context menu "Add Resource") drops a STANDALONE resource card — it does NOT auto-create a network. A resource still needs a network to deploy: assign it either by dragging the card onto a network frame (`useDragToGroup` spatial drop → `assignResourceToNetwork`, reparents into the frame) or by clicking the card's floating "No Network" control (top-left, AlertTriangle) which opens `DraftResourceNetworkModal` — pick an existing draft frame (reparents) or API network (`assignResourceToExistingNetwork` stamps `{networkId}`, stays a card showing the network name), or Create New Network (`NetworkModalContent` name+desc → `addDraftNetwork(preset)` frame + reparent). The editor (`DraftResourceEditorModal`) opens on node click / context-menu Edit (not on drop) and REUSES the networks page's `ResourceModalContent` in pure-data mode (`useSave={false}`: no API calls, Access Control tab hidden — draft policies live on the canvas; data returns via `onSaved`, wrapped in a local `NetworkProvider` for its context needs). No network selector in the editor — assign via drag/picker. Draft-name uniqueness via `takenNames`. The standalone draft resource node is a CARD (border+bg like peer/group nodes) with a NEW badge; a framed one is a flat row managed by the frame. Icon box by derived type, address dimmed to "IP, CIDR or Domain" until set. Incomplete/unassigned ones stay out of the changeset; complete ones record `create-resource` (edits upsert) and re-run referencing policies (`useDraftNetworkActions.syncDraftResource`). Resources carry a single LEFT connect handle: dragging into a policy sets it as the destination (`addResourceToPolicy`; source side rejected), into a network re-assigns the parent (reparented into frames; membership `simple` edge only for non-frame networks); toward a peer/group it opens the create-policy modal with the roles FLIPPED — the resource as destination, the peer/group as source (resources stay destinations-only). Complete draft resources drop into groups like peers (their `new-…` id; deploy fans membership out via the resource's own `groups` field). Routing: the frame's button group ("Add") and the context menu's "Add Routing Peer" open the networks page's `NetworkRoutingPeerModal` in pure-data mode (`RoutingPeerModalContent`, `useSave={false}` — peer XOR group tabs, metric/masquerade/enabled advanced settings, setup-key install helper); `onSaved` → `addRouterFromSelection` puts the picked peer/group on the canvas next to the frame (if missing), draws the `floating-straight` "routes" edge and records `create-router` with the modal's settings. Dragging peer/group → network does NOT create routers (§10 — it opens the destination picker instead); placeholder-peer routers stay out of the changeset until install (the upgrade sweep records them with the real id). Existing resources (real id) can be edited/enabled/disabled/deleted from their context menu — Enable/Disable records an `update-resource` change (existing) or folds into `create-resource` (draft, via `enabled`); Delete (existing, framed) records `delete-resource`. Both new change types deploy as PUT/DELETE `/networks/{networkId}/resources/{resourceId}`. Deploy order: groups → networks → resources (create → update) → routers → policies → delete-policy → delete-resource → delete-group; client ids resolve via `networkClientToId`/`resourceClientToId`, group changes filter `new-` resource ids, router body uses live-modal defaults (metric 9999, masquerade, enabled). Review & Deploy shows non-blocking warnings (`getDraftWarnings`): networks with resources but no routers, resources no policy references.
- **Parent view & drill-down (spec §10, implemented)**: in the parent view a frame shows at most `NETWORK_FRAME_MAX_VISIBLE` (6) grid cells; once resources exceed the cap the **last cell becomes a "+N more" cell** (`MoreResourcesNode`, occupying one slot — so a real resource yields its place) and the rest are `hidden`. `useNetworkFrameLayout` computes the cell's frame-relative rect + hidden count and hands it to `NetworkNode` via the frame node's `data.moreCell` (`FrameMoreCell`); `NetworkNode` overlays `MoreResourcesNode` there. It's not a ReactFlow node, so it never enters persistence/deploy. `count` is the number of resources the cell stands in for (`total − visibleReal`, i.e. `total − 5`). Clicking it bubbles to the frame → drills in. The "Add Resource" button (bottom band) stays present and reachable at any resource count. Connections behave like everywhere else: dropping a peer/group onto the frame opens the **create-policy modal** with the source prefilled (name "X to Network"; destination picked inside the modal — draft resources are offered via `additionalResources`); dropping onto a contained resource / resource-group row (drop targets with the white hover ring) prefills that node as the destination too. Only dragging FROM contained rows stays drill-down-only. **POLICY↔network drags** (policy right handle onto the frame, or the frame's left connector onto a policy) open the **minimal destination picker** (`DraftNetworkDestinationModal`): the policy modal's destination `PeerGroupSelector` (NetworkRoutesIcon header, groups XOR one resource) limited to the network's contents via `resourceIds` + the `groupIds` whitelist prop (which also disables inline group creation); the pick lands on that policy's destination side with the usual occupied/dedup guards. Policy edges to framed resources **attach to the frame** in the parent view (`useFrameEdgeAttachment` → pure `computeFrameEdgeTargets` in utils/frame-view.ts; real target kept as `edge.data.resourceTarget`). **Clicking the frame drills in** (`useDraftMode().drillDownNetworkNodeId`) and mirrors the LIVE single-network view: `useNetworkDrillDown` hides everything outside the network's world INCLUDING the frame box and its routing peers (`computeDrillDownKeepSet`: children + policies targeting its resources + their sources — routing state lives in the header, like live mode), `useNetworkFrameLayout`'s drilled branch lays out ALL resources in a viewport-shaped grid (`getFrameGridColumns`, anchored to the hidden frame), edges re-attach to the actual resources, resources regain their connect handles and render as standalone-style CARDS (StandaloneResourceNode — flat rows are parent-view only), and the header (`DraftDrillDownHeader`) mirrors the live single-network header 1:1: back arrow + a network SelectDropdown (w-64, lists all frames on the canvas — picking one switches the drill-down) + the shared `RoutingPeersBar` (rows via `useFrameRouterRows`; Add opens the routing-peer modal — the draft counterpart of live's navigation to the routing-peers tab) + a draft-network-only edit pencil. Exit restores hidden flags and the saved viewport; the not-drilled branch is a reconciling repair, so hidden leftovers in persisted/undone snapshots heal themselves. Clicking a contained resource still opens its editor in both views. Gaps: group-mediated policies and auto-arrange while drilled (see limitations.md).
- **Remove peers/resources/groups**: `removeNodeWithEdges` also clears the removed entity from the policies it was part of and re-runs `updateDraftPolicy`: a real peer, placeholder, or resource is cleared from any policy that referenced it as its single source/destination; a GROUP node is removed from the sources/destinations lists of the policies its edges connected it to (edge direction says which side — a self-ref policy's dest copy only clears the destination side). An incomplete policy drops its pending create (`new-…`) or pending update (existing), so a broken state never deploys; the API policy stays untouched until the draft completes it again. (Removing the last instance of a draft group no longer drops referencing draft policies wholesale — they just lose the group, like peers.)
- **Node context menus (draft)**: Remove items use the CircleMinus icon and never confirm (canvas-only). Every Delete (groups, policies, existing resources) asks a danger-styled confirm with the shared copy "It will be marked for deletion and deleted when you review and deploy." Groups → Rename / Remove / Delete ("All" → Remove only; new groups → Rename / Remove). Remove only takes the node off the canvas (and drops a new group's pending changes + dependent draft policies); Delete asks for confirmation (`confirmAndDeleteGroups`) and records a `delete-group` change; pending-delete groups are excluded from the policy modal's group selector options. Policies → Edit (opens the policy modal) + Disable/Enable + Remove + Delete (Delete only for existing/API policies), toggles/edits recorded as `update-policy` (origin: toggle/edit), Delete as `delete-policy`. **Remove** is unconfirmed (`handleRemovePolicyFromCanvas`): the policy node and its edges go; its source/destination nodes STAY on the canvas, but the policy itself loses them — a `policy-new-` Remove cancels the pending create, an existing policy's Remove records an `update-policy` change with emptied sources/destinations (superseding any pending update/toggle) so the disconnect deploys. Live mode keeps a plain Remove.

### Changeset & Deploy

- **Changeset** (`DraftChangesetContext`): CRUD-shaped changes — `create-group` / `update-group` / `delete-group` and `create-policy` / `update-policy` / `delete-policy` — each mapped to its API call (`getChangeApiCall`) and a human label (`getChangeLabel`). Blank dropped policies stay OUT of the changeset until they're deployable: `updateDraftPolicy` (and `addPolicyEdge` for modal creates) records the `create-policy` change only once the policy has both a source and a destination AND neither side references an uninstalled placeholder peer (`isCompletePolicy` — placeholder peer ids start with "draft-"); until then edits/toggles/deletes of a `new-…` policy without a create change are canvas-only no-ops. A tracked draft policy that stops being deployable (e.g. a placeholder peer replaces a group) drops its pending create again. One change per entity: a rename and drag-added members share a single `update-group` (one PUT); enable/disable is an `update-policy` with `origin: "toggle"` (labelled Enable/Disable); a modal edit is `origin: "edit"` and supersedes toggles. Changes coalesce/cancel (renaming back to the original name with nothing else pending removes the change; edits to a not-yet-created entity fold into its create change). Draft-only groups are keyed by (unique) name, existing ones by id.
- **Policy editing in draft**: clicking a policy (including draft-created `policy-new-…`) opens the modal with the _draft_ state — `currentPolicy` resolves from the canvas node data, not the API. The modal runs with `useSave={false}`; on save the provider records `update-policy` (or updates the create change), ensures `create-group` changes for any group typed directly into the selector, and redraws the policy (node data refreshed, edges fully replaced via `drawPolicyOnCanvas`). Draft groups are synced into `useGroups().dropdownOptions` (client-state, pruned on exit) so the modal's group selectors offer them.
- **Persistence**: changes + a canvas snapshot live in localStorage (`draft-storage.ts`, `addedMembers` Sets serialized as arrays; unknown persisted change types are dropped on load) so a reload doesn't lose the draft; re-entering draft restores the persisted canvas instead of rebuilding. Cancel / switching to Live destroy both — guarded by a confirm dialog while changes are pending (`useDiscardDraft`). `DraftLeaveGuard` extends the guard to tab close/reload (native beforeunload prompt) and in-app navigation — anchor clicks (capture-phase intercept) and programmatic `router.push`/`replace` (the shared app-router instance is wrapped while changes are pending; the sidebar navigates via `router.push`, not links). Browser back/forward (popstate) is not guarded.
- **Review & Deploy** (`DraftModeSwitcher` → `ReviewDeployModal`): the button shows a change-count badge; the modal lists every change with its API call and allows discarding individual ones. Deploy (`useDeployChangeset`) runs sequentially in CRUD dependency order — create groups (collecting name→id for policy resolution) → update groups → create policies → update policies → delete policies → delete groups — then clears the draft and returns to live (awaits SWR revalidation and forces a live-view rebuild). On failure it stops, keeps the failed + remaining changes for retry, and notifies.

### Node Connections (onNodeConnect)

When two nodes are connected by dragging a handle:

1. Node IDs are parsed to determine type (peer/group/resource) and extract entity ID
2. Groups are looked up from API data or canvas node data (for newly created groups)
3. Policy modal opens pre-filled with source/destination groups or resources
4. After policy creation, `addPolicyEdge` creates missing nodes on canvas and connects edges

### addPolicyEdge

When a policy is saved from the modal:

1. Reads the policy's sources, destinations, sourceResource, destinationResource
2. For each source/destination: finds existing canvas nodes by ID or name, creates missing ones
3. Self-referencing groups (same in source + destination) reuse existing dest-group nodes
4. Policy node is positioned at center of matched source/destination nodes
5. Edges created: source → policy and policy → destination

### SmartEdge

The `SmartEdge` is used for all policy edges — in draft mode and in every live view (peer, group, user, network). It dynamically picks connection sides:

- **Policy nodes**: fixed sides — sources enter LEFT, destinations exit RIGHT
- **Other nodes**: picks best side (left/right) based on relative position
- **Bidirectional policies**: renders two green animated lines
- **Unidirectional policies**: renders one blue animated line

### Keyboard Shortcuts (draft mode only)

| Key                         | Action                                |
| --------------------------- | ------------------------------------- |
| `C`                         | Toggle components panel               |
| `V`                         | Select tool                           |
| `H`                         | Hand tool                             |
| `Space` (hold)              | Temporary hand tool                   |
| `F`                         | Fit to view                           |
| `+` / `-`                   | Zoom in / out                         |
| `G`                         | Create group (when peers selected)    |
| `Escape`                    | Cancel selection                      |
| `Delete` / `Backspace`      | Remove selected (when peers selected) |
| `A`                         | Auto arrange                          |
| `⌘/Ctrl+Z`                  | Undo                                  |
| `⇧⌘/Ctrl+Shift+Z`, `Ctrl+Y` | Redo                                  |

Shortcut badges are platform-aware via the shared `isMac` from `src/hooks/useOperatingSystem.ts` (⌥/⌘ glyphs on macOS, "Alt + …"/"Ctrl + …" text elsewhere; `FORCE_PLATFORM` there previews the other platform). Shortcuts are managed by `useControlCenterShortcuts(shortcuts, enabled?)` — automatically draft-only and input-aware. The `isInputFocused()` helper (exported from the same file) checks only genuine text-entry contexts: `INPUT`, `TEXTAREA`, `SELECT`, `contentEditable`, and elements inside `[role='dialog']`/`[role='alertdialog']`. Focused buttons deliberately do NOT block shortcuts — a click leaves the button focused, and hotkeys must keep working afterwards (Enter still activates a focused button). The spacebar hold-to-pan in `CanvasToolbar.tsx` uses the same guard.

## Unit Tests

`npm run test:unit` (Vitest, jsdom — no infra needed; e2e stays on Playwright via `npm test`). Draft logic is factored into pure/testable modules:

- `utils/draft-connect.ts` — `handleDraftConnect` (extracted from `useDraft.onNodeConnect`, which just injects live deps). `draft-connect.test.ts` covers the full connect matrix: node↔node modal prefills (peers/placeholders/groups/resources, XOR-side rules, stale-prefill resets), node↔policy direct side edits (handle-side mapping, duplicates, occupied sides), and node/policy↔network rules (destination picker opens, resource membership assign, networks never sources, no routers by drag).
- `utils/node-capabilities.ts` — capability predicates (`canRenamePeerNode`, `canInstallPeerNode`, `canSelectPeer`, `getGroupableEntityId`) wired into NodeContextMenu + useDragToGroup; `node-capabilities.test.ts` is the per-node-kind spec (what each node can/can't do).
- `utils/helpers.ts` — `isDeployablePolicy` (shared with ControlCenterPolicyModals' changeset gating), `getPolicyRegroupUpdates`, placeholder pseudo-peers/hostnames, IP placeholder; covered in `helpers.test.ts`.
- `draft/DraftChangesetContext.test.tsx` — coalescing rules via renderHook (create/rename folding, member folding, rename-follow into policies, toggle cancellation, delete superseding updates, `replacePeerIdInGroups`).
- `draft/draft-storage.test.ts` — persistence round-trips (Set serialization, unknown change types dropped, corrupt storage).
- `utils/frame-view.test.ts` — §10 parent-view/drill-down rules: frame↔resource edge attachment (idempotent, reversible, unframe restore, router edges untouched) and the drill-down keep-set (frame world + policies whether frame- or resource-attached).

## Node Types

| Type                      | ID Pattern                                   | Used in                                                                             |
| ------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `peerNode`                | `peer-{id}`                                  | All views, draft — left+right source ConnectHandles                                 |
| `groupNode`               | `group-{id}`                                 | All views — left+right source ConnectHandles when `showHandles`, NEW badge if no id |
| `policyNode`              | `policy-{id}`                                | All views — all handles `isConnectable={false}` (edges render but no user drag)     |
| `networkNode`             | `network-{id}`                               | Network view                                                                        |
| `resourceNode`            | `resource-{id}`                              | Network/expanded views — target only (no source handles, can't be dragged from)     |
| `resourceGroupNode`       | `resourcegroup-{id}`                         | Resource groups inside a draft network frame (flat row; id prefix unknown to parseNodeId → connects no-op for now) |
| `selectPeerNode`          | `select-peer-node`                           | Peer view (live)                                                                    |
| `selectGroupNode`         | `select-group-node`                          | Group view (live)                                                                   |
| `selectUserNode`          | `select-user-node`                           | User view (live)                                                                    |
| `sourcePeerNode`          | `source-peer-{id}`                           | User view (draft-style card via `variant:"card"`, `showHandles:false` — PeerNode always renders the invisible AllHandles edge anchors; showHandles only gates the visible connect bubbles) |
| `sourceGroupNode`         | `group-{id}`                                 | Group view                                                                          |
| `destinationGroupNode`    | `group-{id}` or `dest-group-{id}-{policyId}` | Peer/Group/User views, draft (copy for self-ref policies)                           |
| `expandedGroupPeer`       | `expanded-peer-{id}`                         | Expanded destination groups                                                         |
| `destinationResourceNode` | `destination-resource-{id}`                  | Policy destination resources                                                        |

## Edge Types

| Type                | Component          | When used                                                           |
| ------------------- | ------------------ | ------------------------------------------------------------------- |
| `smart`             | SmartEdge          | All policy edges, draft + live (dynamic routing, bi/unidirectional) |
| `in`                | DirectionIn        | Registry only (policy edges migrated to `smart`)                    |
| `bi`                | BidirectionalEdges | Registry only                                                       |
| `floating`          | FloatingEdge       | Dynamic floating edges                                              |
| `floating-straight` | AnimatedLine       | Network view (group→network)                                        |
| `simple`            | SimpleConnection   | Group→peer/resource expansion                                       |
