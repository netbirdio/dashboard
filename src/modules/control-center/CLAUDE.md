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

| Context | Hook | What it provides |
|---------|------|-----------------|
| `CanvasStateProvider` | `useCanvasState()` | nodes, edges, setters, layoutInitialized, currentView, all selection state, loggedInUser, forceSingle*ViewRefs |
| `ControlCenterUIProvider` | `useControlCenterUI()` | networkOptions, currentNetwork, onViewChange, onNetworkSelect, onNodeClick, onForceSingleUserView |
| `ControlCenterPolicyProvider` | `useControlCenterPolicy()` | selectedPolicy, policyModalOpen, createPolicyModal, source/destination resources & groups, addPolicyEdge |
| `DraftModeProvider` | `useDraftMode()` | isDraft, setIsDraft, activeTool, setActiveTool |
| `DraftChangesetProvider` | `useDraftChangeset()` | changes, changeCount, CRUD track* helpers (create/update/delete group + policy), removeChange, clearChanges — persisted to localStorage |
| `GroupsProvider` | `useGroups()` | groups, createOrUpdate, refresh, dropdownOptions |

### Data Flow

1. **`useControlCenterData()`** fetches all API data (policies, peers, networks, groups, users, resources) + derives `networkOptions` and `isDataReady`
2. **View hooks** (`useGroupView`, `usePeerView`, `useUserView`, `useNetworkView`) build node/edge graphs for each view mode. They consume data and canvas state via context internally — no params needed.
3. **`useSelectNodeHandlers({ views })`** owns all navigation, entity change handlers, view initialization effect, and onNodeClick. Only param is `views` (to break circular dep between handlers and view builders).
4. **`ControlCenterUIProvider`** calls the view hooks + handlers internally, wires up circular dependency refs, and provides everything to the UI via context.
5. **`useDraft()`** manages draft mode — builds canvas from visible policies (source groups/peers → policy → destination groups/peers/resources), restores a persisted draft canvas after a reload, persists the draft canvas to localStorage (debounced), handles node connections to open policy modal.
6. **`useCreateGroupOnCanvas()`** creates groups and adds them to canvas — via API in live mode, changeset-only in draft. Used by PeersToolbar and CanvasContextMenu.
7. **`useDraftGroupActions()`** draft group operations (drop new group with unique "New Group (n)" name, rename across all canvas instances, remove-from-canvas, delete) — all changeset-only.
8. **`useDeployChangeset()`** executes the changeset against the API in CRUD dependency order (create groups → update groups → create policies → update policies → delete policies → delete groups).

### Circular Dependency Resolution

View hooks create node `onClick` callbacks that reference `forceSingleGroupView`/`forceSinglePeerView` from the handlers. But handlers need the view builders. This is resolved via refs in `CanvasStateProvider`:

```
forceSingleGroupViewRef / forceSinglePeerViewRef
  ↑ set by ControlCenterUIProvider after both hooks return
  ↓ read by view hooks via useCanvasState() when onClick fires
```

## File Structure

```
control-center/
├── page.tsx                          → Provider tree + ControlCenterCanvas component
├── ControlCenterContext.tsx           → CanvasStateProvider + ControlCenterUIProvider
├── ControlCenterPolicyModals.tsx      → Policy modal context + modals (renders inside provider)
├── ControlCenterHeader.tsx            → Header overlays (HeaderTopLeft, HeaderTopRight, HeaderBottom); the networks-view selector only renders when networks exist (hidden alongside the empty state)
├── ControlCenterEmptyStates.tsx       → Empty state displays per view
├── CanvasContextMenu.tsx              → Right-click canvas menu (Create Group, Add Peer, etc.)
├── ConnectionLine.tsx                 → Custom connection line during drag
├── DragAndDropProvider.tsx            → Drag-from-sidebar state
├── FlowSelector.tsx                   → Peer/User/Group/Networks tab selector
├── NetworkRoutingPeerCount.tsx        → Network peer count badge
│
├── hooks/
│   ├── useControlCenterData.ts        → All API fetching + networkOptions + isDataReady
│   ├── useSelectNodeHandlers.ts       → Entity handlers, force-view, navigation, onNodeClick, view init effect
│   ├── useDraft.ts                    → Draft save/restore, canvas persistence (localStorage), node transformation, onNodeConnect
│   ├── useControlCenterShortcuts.ts   → Keyboard shortcut hook (draft-only, input-aware) + isInputFocused()
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
│   ├── GroupRenameModal.tsx            → Rename modal used by the node context menu
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
│   ├── ResourceNode.tsx               → Network resource display
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
│   └── ConnectHandle.tsx              → Visible connection handle with arrow icon (shown on hover via group/node)
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
│   ├── helpers.ts                     → getFirstGroup, getPolicyProtocolAndPortText, getResourcePolicyByGroups
│   ├── layouts.ts                     → D3 force/hierarchical layout + zoom constants
│   └── edge-helper.ts                → Node intersection calculations for floating edges
│
└── user/
    └── ControlCenterCurrentUserBadge.tsx → User badge in header
```

## Views

Each view builds a node/edge graph from API data:

| View | Source node | Layout | What it shows |
|------|------------|--------|---------------|
| **Peer** | SelectPeerNode → PeerNode (draft) | Hierarchical | Selected peer → policies → destination groups → expanded peers/resources |
| **Group** | SelectGroupNode | Hierarchical | Selected group → policies → destination groups → peers/resources |
| **User** | SelectUserNode | Hierarchical | Selected user → their peers → policies → destination groups |
| **Network** | (all networks) | Force / Hierarchical | All networks with groups, or single network detail |

## Draft Mode

When entering draft from a live view:
1. Live state (nodes/edges) is saved to a ref
2. Canvas is rebuilt from **visible policies** (only policies that had policyNodes on the live canvas), plus the entities shown in the live view even when they have no policies (group nodes on the canvas and the group/peer picked in the live select node) so a policy-less view doesn't enter an empty draft:
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
- **Draft start screen** (`DraftEmptyCanvas`): shown while `isDraft && nodes.length === 0`; hides instantly (no animation) when the components panel opens. Right-clicking it opens the draft canvas context menu — the overlay root carries the `draft-empty-canvas` marker class that `CanvasContextMenu` treats as canvas, and the menu is portaled to `<body>` so it renders above the overlay. Mirrors the live `GetStartedTest` header (no card bg) with template cards (Remote Access / Business VPN / Site-to-Site — all just open the components panel for now; starter topologies are TODO). No standalone Add button — the always-visible `CanvasToolbar` "Add" is used to open the components panel. Draft chrome in draft: `HeaderTopLeft` is empty — exiting happens via Cancel in the `DraftModeSwitcher` (`DraftModeTitle` — Untitled Draft dropdown + three-dots — is currently hidden/commented out in the header, kept for later), the `CanvasToolbar` (always visible in draft, slides in/out with draft via framer-motion) in `HeaderBottom`, and Cancel / Review & Deploy in `DraftModeSwitcher` (Cancel always shown and exits draft via `useDiscardDraft`; Review & Deploy **hidden** when the canvas is empty and no changes are pending, **disabled** at 0 changes, and shows the change count as a badge). While an empty state is shown (`nodes.length === 0`), canvas interactions (pan/zoom/select/drag) are locked in `page.tsx`. In draft, `HeaderTopLeft` shows nothing (all live controls — tabs, network selector, etc. — are gated `!isDraft`).
- **Components picker**: A node-picker panel floating above the bottom toolbar (centered, ~680px). Toggled by the CanvasToolbar "Add" button (shortcut `C`, plus icon rotates 45° while open); closed by `Esc`, clicking the canvas, or opening the canvas context menu (right-click). Layout: search bar on top, category rail on the left (**Home** / **Peers** / **Policies** / **Groups** / **Resources**), 2-column item grid on the right. **Home** shows "Popular" — every create template labelled "New …" (New Group, New Policy, New Agent, …). Searching spans all categories with section headings. Category contents (create templates pinned first, then existing entities):
  - **Peers**: create items **User Device** / **Server** / **Agent** → all draggable onto the canvas. **User Device** drop opens the `SetupModal` install flow (`isUserDevice=true`). **Server**/**Agent** drop only places a placeholder `PeerNode` (`placeholderKind`, no API call) with an **Install** button. The Install button (and User Device drop) open the shared install modal via `useDraftMode().setInstallModal` (carrying `placeholderKind` + `nodeId`), rendered once by `DraftInstallPeerModal`. The setup key is generated *inside* the modal on demand (`SetupKeyGenerator`, `ephemeralKey` for agents) and written back onto the node (`setupKey`) so reopening Install reuses it. Then existing peers (drag onto canvas; disabled if already there).
  - **Resources**: create items **Resource** + **Network** → drag onto canvas to drop a blank, id-less node. Then existing resources.
  - **Groups**: create item **Group** → drag to drop a blank group node (renders NEW badge). Then existing groups; groups pending deletion show a red DELETED badge and are disabled (can't be re-added).
  - **Policies**: create item **Policy** → drop opens the create-policy modal (the created policy lands at the drop position). Then existing policies → drop draws the policy with its sources/destinations via `drawPolicyOnCanvas`: nodes already on canvas are connected, missing ones are created around the drop point; disabled when already on canvas.
  - Blank nodes: only `create-group` is tracked by the changeset today; blank network/resource nodes are visual placeholders (no apply wiring yet).
  - Each section's count reflects existing entities only (not create items). Search matches item names/labels **and** category words (e.g. "peers"/"groups"/"resources"/"networks" reveal the whole matching section); a section shows if its existing items OR its create items match.
- **Connect nodes**: Drag between handles to create a policy (peer↔peer, peer↔group, group↔group, group↔resource, peer↔resource). The policy modal runs with `useSave={false}` in draft — it returns pure policy data (no API call), recorded as a `create-policy` change and drawn on canvas with a `policy-new-<uuid>` client id. Connecting a group to itself (e.g. All → All) creates a destination copy node (self-referencing policy).
- **Policy connect handles (draft)**: policy nodes show hover ConnectHandles; dragging from the policy's **right** handle onto a group adds it as a **destination**, from the **left** as a **source**. The reverse works too — policies expose a full-area target in draft: dragging from a group's **left** handle onto a policy adds the group as a **destination**, from its **right** handle as a **source** (`onNodeConnect` → `addGroupToPolicy` → `updateDraftPolicy`). No-ops for duplicates, resource-based sides, and non-group participants. Policy nodes also get the sky halo while their modal is open.
- **Default policy name**: connecting two nodes prefills the create-policy modal name as "Source to Destination" (e.g. "All to New Group") via `policyInitialName` on the policy context.
- **Auto Arrange** (toolbar, `A`): `applyDraftArrangeLayout` re-arranges by *connectivity* (not node type): policy sources → left column, policies → middle, destinations → right, unconnected nodes → far-left column; columns sorted by average policy index to reduce crossings.
- **Undo/redo (draft)**: `DraftHistoryContext` — debounced snapshots of nodes+edges+changes (drag positions collapse into one entry); toolbar buttons + ⌘Z/⇧⌘Z (Ctrl+Y also redoes). History resets when entering/leaving draft.
- **Create group**: Select 2+ peers/resources → toolbar appears → opens name modal → group node replaces selected nodes; changeset-only in draft (API in live)
- **Create group (context menu)**: Right-click canvas → "Add Group" → name modal → group node at click position; changeset-only in draft
- **Drop new group (sidebar)**: `useDraftGroupActions.addNewGroup` — unique "New Group" / "New Group (1)" name, NEW badge, `create-group` change (the group panel opens on click, not on drop). Draft groups also appear in the sidebar Groups list (NEW badge, disabled).
- **Add peer (context menu)**: Right-click canvas → "Add Peer" → opens SetupModal (install NetBird)
- **Drag to group**: Drag a peer/resource onto a group node to add it (validates duplicates); recorded as `update-group` (or folded into the group's `create-group` change)
- **Group panel** (`DestinationGroupPanel`): opens on group click (any view in draft); draft-aware — resolves the group from canvas nodes (renames, drag-added members across all instances), shows NEW badge, inline rename (pencil) in draft
- **Node context menus (draft)**: groups → Rename / Remove / Delete ("All" → Remove only; new groups → Rename / Remove). Remove only takes the node off the canvas (and drops a new group's pending changes + dependent draft policies); Delete asks for confirmation (`confirmAndDeleteGroups`) and records a `delete-group` change; pending-delete groups are excluded from the policy modal's group selector options. Policies → Disable/Enable + Delete, recorded as `update-policy` (origin: toggle) / `delete-policy` changes. Live mode keeps a plain Remove.

### Changeset & Deploy

- **Changeset** (`DraftChangesetContext`): CRUD-shaped changes — `create-group` / `update-group` / `delete-group` and `create-policy` / `update-policy` / `delete-policy` — each mapped to its API call (`getChangeApiCall`) and a human label (`getChangeLabel`). One change per entity: a rename and drag-added members share a single `update-group` (one PUT); enable/disable is an `update-policy` with `origin: "toggle"` (labelled Enable/Disable); a modal edit is `origin: "edit"` and supersedes toggles. Changes coalesce/cancel (renaming back to the original name with nothing else pending removes the change; edits to a not-yet-created entity fold into its create change). Draft-only groups are keyed by (unique) name, existing ones by id.
- **Policy editing in draft**: clicking a policy (including draft-created `policy-new-…`) opens the modal with the *draft* state — `currentPolicy` resolves from the canvas node data, not the API. The modal runs with `useSave={false}`; on save the provider records `update-policy` (or updates the create change), ensures `create-group` changes for any group typed directly into the selector, and redraws the policy (node data refreshed, edges fully replaced via `drawPolicyOnCanvas`). Draft groups are synced into `useGroups().dropdownOptions` (client-state, pruned on exit) so the modal's group selectors offer them.
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

| Key | Action |
|-----|--------|
| `C` | Toggle components panel |
| `V` | Select tool |
| `H` | Hand tool |
| `Space` (hold) | Temporary hand tool |
| `F` | Fit to view |
| `+` / `-` | Zoom in / out |
| `G` | Create group (when peers selected) |
| `Escape` | Cancel selection |
| `Delete` / `Backspace` | Remove selected (when peers selected) |
| `A` | Auto arrange |
| `⌘/Ctrl+Z` | Undo |
| `⇧⌘/Ctrl+Shift+Z`, `Ctrl+Y` | Redo |

Shortcut badges are platform-aware via the shared `isMac` from `src/hooks/useOperatingSystem.ts` (⌥/⌘ glyphs on macOS, "Alt + …"/"Ctrl + …" text elsewhere; `FORCE_PLATFORM` there previews the other platform). Shortcuts are managed by `useControlCenterShortcuts(shortcuts, enabled?)` — automatically draft-only and input-aware. The `isInputFocused()` helper (exported from the same file) checks `INPUT`, `TEXTAREA`, `SELECT`, `BUTTON`, `OPTION`, `DETAILS`, `SUMMARY`, `contentEditable`, and elements inside `[role='dialog']`/`[role='alertdialog']`. The spacebar hold-to-pan in `CanvasToolbar.tsx` uses the same guard.

## Node Types

| Type | ID Pattern | Used in |
|------|-----------|---------|
| `peerNode` | `peer-{id}` | All views, draft — left+right source ConnectHandles |
| `groupNode` | `group-{id}` | All views — left+right source ConnectHandles when `showHandles`, NEW badge if no id |
| `policyNode` | `policy-{id}` | All views — all handles `isConnectable={false}` (edges render but no user drag) |
| `networkNode` | `network-{id}` | Network view |
| `resourceNode` | `resource-{id}` | Network/expanded views — target only (no source handles, can't be dragged from) |
| `selectPeerNode` | `select-peer-node` | Peer view (live) |
| `selectGroupNode` | `select-group-node` | Group view (live) |
| `selectUserNode` | `select-user-node` | User view (live) |
| `sourcePeerNode` | `source-peer-{id}` | User view |
| `sourceGroupNode` | `group-{id}` | Group view |
| `destinationGroupNode` | `group-{id}` or `dest-group-{id}-{policyId}` | Peer/Group/User views, draft (copy for self-ref policies) |
| `expandedGroupPeer` | `expanded-peer-{id}` | Expanded destination groups |
| `destinationResourceNode` | `destination-resource-{id}` | Policy destination resources |

## Edge Types

| Type | Component | When used |
|------|-----------|-----------|
| `smart` | SmartEdge | All policy edges, draft + live (dynamic routing, bi/unidirectional) |
| `in` | DirectionIn | Registry only (policy edges migrated to `smart`) |
| `bi` | BidirectionalEdges | Registry only |
| `floating` | FloatingEdge | Dynamic floating edges |
| `floating-straight` | AnimatedLine | Network view (group→network) |
| `simple` | SimpleConnection | Group→peer/resource expansion |
