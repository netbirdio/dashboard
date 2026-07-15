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
              PolicyProvider       → policy modal state + addPolicyEdge
                ChangesetProvider  → draft change tracking
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
| `DraftChangesetProvider` | `useDraftChangeset()` | changes array, addChange, removeChange, clearChanges |
| `GroupsProvider` | `useGroups()` | groups, createOrUpdate, refresh, dropdownOptions |

### Data Flow

1. **`useControlCenterData()`** fetches all API data (policies, peers, networks, groups, users, resources) + derives `networkOptions` and `isDataReady`
2. **View hooks** (`useGroupView`, `usePeerView`, `useUserView`, `useNetworkView`) build node/edge graphs for each view mode. They consume data and canvas state via context internally — no params needed.
3. **`useSelectNodeHandlers({ views })`** owns all navigation, entity change handlers, view initialization effect, and onNodeClick. Only param is `views` (to break circular dep between handlers and view builders).
4. **`ControlCenterUIProvider`** calls the view hooks + handlers internally, wires up circular dependency refs, and provides everything to the UI via context.
5. **`useDraft()`** manages draft mode — builds canvas from visible policies (source groups/peers → policy → destination groups/peers/resources), handles node connections to open policy modal.
6. **`useCreateGroupOnCanvas()`** creates groups via API and adds them to canvas. Used by PeersToolbar and CanvasContextMenu.

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
├── ControlCenterComponentsPanel.tsx   → Legacy panel (used by sidebar)
├── CanvasContextMenu.tsx              → Right-click canvas menu (Create Group, Add Peer, etc.)
├── ConnectionLine.tsx                 → Custom connection line during drag
├── DragAndDropProvider.tsx            → Drag-from-sidebar state
├── FlowSelector.tsx                   → Peer/User/Group/Networks tab selector
├── NetworkRoutingPeerCount.tsx        → Network peer count badge
│
├── hooks/
│   ├── useControlCenterData.ts        → All API fetching + networkOptions + isDataReady
│   ├── useSelectNodeHandlers.ts       → Entity handlers, force-view, navigation, onNodeClick, view init effect
│   ├── useDraft.ts                    → Draft save/restore, node transformation, onNodeConnect
│   ├── useControlCenterShortcuts.ts   → Keyboard shortcut hook (draft-only, input-aware) + isInputFocused()
│   ├── useCreateGroupOnCanvas.ts     → Creates group via API + adds group node to canvas
│   ├── useDragToGroup.ts             → Drag peer/resource onto group node
│   └── views/
│       ├── types.ts                   → ViewResult type + addDestinationResourceNodes helper
│       ├── useGroupView.ts            → Group view builder
│       ├── usePeerView.ts             → Peer view builder
│       ├── useUserView.ts             → User view builder
│       └── useNetworkView.ts          → Network view builder (single + all)
│
├── draft/
│   ├── DraftModeContext.tsx            → isDraft toggle + CanvasTool (Select/Hand)
│   ├── DraftChangesetContext.tsx       → Tracks draft changes (create-group)
│   ├── ControlCenterComponentsSidebar.tsx → Floating, toggleable "Components" panel. Peers/Resources/Groups accordion sections, each with create-new items on top + existing entities below. Toggled via the CanvasToolbar "Add" button (A) / Esc to close
│   ├── CanvasToolbar.tsx              → Bottom toolbar (select/hand/undo/redo/zoom/fit)
│   ├── PeersToolbar.tsx               → Selection toolbar (create group from selected peers/resources)
│   ├── CreateGroupNameModal.tsx       → Shared modal for entering group name (used by PeersToolbar + CanvasContextMenu)
│   ├── DraftInstallPeerModal.tsx      → Shared "Install NetBird" modal (driven by useDraftMode().installModal)
│   ├── DraftModeSwitcher.tsx          → Live/Draft toggle
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
2. Canvas is rebuilt from **visible policies** (only policies that had policyNodes on the live canvas):
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
- **Draft start screen** (`DraftEmptyCanvas`): shown while `isDraft && nodes.length === 0`; fades out (framer-motion `AnimatePresence` opacity) when the components panel opens. Mirrors the live `GetStartedTest` header (no card bg) with template cards (Remote Access / Business VPN / Site-to-Site — all just open the components panel for now; starter topologies are TODO). No standalone Add button — the always-visible `CanvasToolbar` "Add" is used to open the components panel. Draft chrome in draft: back arrow in `HeaderTopLeft` (`DraftModeTitle` — Untitled Draft dropdown + three-dots — is currently hidden/commented out in the header, kept for later), the `CanvasToolbar` (always visible in draft, slides in/out with draft via framer-motion) in `HeaderBottom`, and Cancel / Deploy in `DraftModeSwitcher` (Cancel always shown and exits draft; Deploy **hidden** when the canvas is empty). While an empty state is shown (`nodes.length === 0`), canvas interactions (pan/zoom/select/drag) are locked in `page.tsx`. In draft, `HeaderTopLeft` shows only the back arrow + draft title (all live controls — network selector, etc. — are gated `!isDraft`).
- **Components sidebar**: A floating overlay on the left (mirrors `DestinationGroupPanel` on the right). Toggled by the CanvasToolbar "Add" button (shortcut `C`); `Esc` closes it. Does not push the canvas. Three collapsible accordion sections (**Peers** / **Resources** / **Groups**), each with its create-new items pinned at the top followed by the existing entities:
  - **Peers**: create items **User Device** / **Server** / **Agent** → all draggable onto the canvas. **User Device** drop opens the `SetupModal` install flow (`isUserDevice=true`). **Server**/**Agent** drop generates a one-off setup key (`POST /setup-keys`, `ephemeral=true` for agent), held locally on a dropped placeholder `PeerNode` (`placeholderKind` + `setupKey`) that renders an **Install** button. The Install button (and User Device drop) open the shared install modal via `useDraftMode().setInstallModal`, rendered once by `DraftInstallPeerModal` in the canvas. Then existing peers (drag onto canvas; disabled if already there).
  - **Resources**: create items **Resource** + **Network** → drag onto canvas to drop a blank, id-less node. Then existing resources.
  - **Groups**: create item **Group** → drag to drop a blank group node (renders NEW badge). Then existing groups.
  - Blank nodes: only `create-group` is tracked by the changeset today; blank network/resource nodes are visual placeholders (no apply wiring yet).
  - Each section's count reflects existing entities only (not create items). Search matches item names/labels **and** category words (e.g. "peers"/"groups"/"resources"/"networks" reveal the whole matching section); a section shows if its existing items OR its create items match.
- **Connect nodes**: Drag between handles to create a policy (peer↔peer, peer↔group, group↔group, group↔resource, peer↔resource)
- **Create group**: Select 2+ peers/resources → toolbar appears → opens name modal → creates group via API → replaces selected nodes with group node
- **Create group (context menu)**: Right-click canvas → "Create Group" → name modal → creates group via API at click position
- **Add peer (context menu)**: Right-click canvas → "Add Peer" → opens SetupModal (install NetBird)
- **Drag to group**: Drag a peer/resource onto a group node to add it (validates duplicates)
- **Changeset**: Tracks `create-group` changes for later "Apply Changes"

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

The `SmartEdge` is used in draft mode. It dynamically picks connection sides:
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

Shortcuts are managed by `useControlCenterShortcuts(shortcuts, enabled?)` — automatically draft-only and input-aware. The `isInputFocused()` helper (exported from the same file) checks `INPUT`, `TEXTAREA`, `SELECT`, `BUTTON`, `OPTION`, `DETAILS`, `SUMMARY`, `contentEditable`, and elements inside `[role='dialog']`/`[role='alertdialog']`. The spacebar hold-to-pan in `CanvasToolbar.tsx` uses the same guard.

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
| `smart` | SmartEdge | Draft mode (dynamic routing, bi/unidirectional) |
| `in` | DirectionIn | Live mode (peer→policy→group) |
| `bi` | BidirectionalEdges | Live mode bidirectional |
| `floating` | FloatingEdge | Dynamic floating edges |
| `floating-straight` | AnimatedLine | Network view (group→network) |
| `simple` | SimpleConnection | Group→peer/resource expansion |
