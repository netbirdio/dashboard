# Control Center Module

Canvas-based network topology editor built on [ReactFlow](https://reactflow.dev/) (xyflow v12). Peers, groups, policies, and networks are nodes; policies connect them. Live mode shows the real account; Draft mode is a local editor whose changes deploy as a batch.

> Keep this file in sync when the architecture or the rules below change — but keep it SHORT. Details live in the code.
> The full node-interaction matrix (connects, drops, menus, rename/delete rules) is exercised by the control-center e2e suites (`e2e/tests/control-center-draft-*.spec.ts`) — keep those in sync when interaction behavior changes.

## Architecture

Provider tree (page.tsx), outermost first:

```
DraftModeProvider → DragAndDropProvider → ReactFlowProvider → PoliciesProvider
→ PeersProvider → CanvasStateProvider → GroupsProvider → DraftChangesetProvider
→ DraftHistoryProvider → ControlCenterPolicyProvider → ControlCenterUIProvider
→ ControlCenterCanvas
```

- `useCanvasState()` — nodes, edges, setters, currentView, selection state. Changes identity on EVERY nodes update: node/edge components must never use it. They use the narrow contexts instead: `useCanvasUI()`, `useDestinationGroup()`, `useNetworkHover()`, or ReactFlow `useStore` selectors with value equality.
- `useControlCenterUI()` — navigation, onNodeClick, network options.
- `useControlCenterPolicy()` — policy modal state + `addPolicyEdge`.
- `useDraftMode()` — isDraft, active tool, draft modals/drill-down state.
- `useDraftChangeset()` — tracked draft changes (React state only; not persisted).
- `useGroups()` — group CRUD + dropdown options.

Data flow: `useControlCenterData()` fetches everything (SWR) → view hooks (`usePeerView`, `useGroupView`, `useUserView`, `useNetworkView`) build node/edge graphs → `useSelectNodeHandlers({ views })` owns navigation, the view-init effect, and the shared `fitView` → `ControlCenterUIProvider` wires it together. Circular deps (node onClick → handlers → view builders) resolve via refs on CanvasStateProvider (`forceSingleGroupViewRef`, `refreshLiveViewRef`).

Key directories under `control-center/`: `contexts/` (ControlCenterContext, DragAndDropProvider, policy modals), `header/` (top chrome + FlowSelector), `menus/` (canvas/node context menus), `panels/` (destination-group, peer-groups, routing-peers), `nodes/`, `edges/` (+ ConnectionLine), `handles/`, `toolbar/`, `hooks/` (data, `views/`, draft logic, layout reconcilers), `utils/` (graph-builder, layouts, canvas-transition, pure testable logic), `draft/` (draft-mode UI + changeset/history contexts; `modals/` holds the Draft\* modals, `changeset/` the review views).

## Views (live)

Peer / Group / User: select node on the left → policies (x500, 60 pitch) → destinations (groups + resources as ONE column, x1000, 100 pitch). Built with `applyD3HierarchicalLayout(nodes, edges, 400, 120, view, DEFAULT_LAYOUT_CONFIG)`. Policies sorted by enabled; the GROUP view additionally name-sorts each policy's destinations/sources. GROUP view also shows policies where the selected group is only a DESTINATION, mirrored to the left (sources at x-1000 → policy at x-500 → selected group); those policy nodes carry `data.side === "left"`, which the layout uses to split the policy column.

Networks: all networks as interactive frames (resources as child rows, capped at 6 with a "+N more" cell) — sources column (160 pitch) → policy nodes (x500 +14, 90 pitch — same anchor as the other views so policies don't jump on view switch) → staggered frame grid (`packFrameGrid`, centered on the columns' midline). Clicking a frame drills into the single-network view (`drilled-layout.ts`, shared with draft). Focus mode is EXPLICIT (a node's context-menu Focus item or the header's armed Focus tool — live AND draft; left-clicking a group only opens its panel, no dim) and dims everything off the node's edge path via `cc-dimmed` and rings the focused node; policy editing lives in the node's right-click menu (live: Edit + Disable/Enable only, behind "you are in live mode" confirmations via `usePolicies` + `refreshLiveViewRef`).

## Draft mode

- Entering draft rebuilds the canvas from the policies visible in the live view (`useDraft`): source groups/peers → policy → destinations. Live network frames carry over as existing-network frames; destination groups whose resources live in exactly one carried network fold into that frame as `resourceGroupNode` rows.
- **Layout parity**: the draft build mirrors the live view it was entered from (same column x/pitch, same sort — see Views). The build layout lives in `utils/draft-build-layout.ts` (`applyDraftBuildLayout`), shared with the toolbar's Auto Arrange so arranging an untouched draft reproduces the entry layout exactly (drill-downs re-run `applyDrilledLayout`). Destinations restack as one column (x 1000) with sides resolved by edge direction, ordered by first policy edge — including in a frames draft, where the frame grid then starts past that column instead of at its bare `FRAME_GRID_BASE_X` (the hierarchical layout buckets by node TYPE, so a destination peer would otherwise sit on the sources at x 0 and a standalone resource inside the frame grid); existing destination resources get `draftNetwork` stamped so they don't show "No Network". Draft nodes adopt their live twin's measured size (`initialWidth/Height`, incl. renamed ids like self-ref `dest-group-…` clones) — React Flow hides unmeasured nodes for a frame, which read as flicker on the mode switch.
- Changes are tracked as CRUD-shaped entries in `DraftChangesetContext` (groups/policies/resources: create+update+delete; networks: create+update+delete; routers: create+update), coalesced per entity. Editing an EXISTING network/router in draft records an `update-network`/`update-router` change instead of a live PUT (`DraftNetworkEditModal` / `DraftRoutingPeerModal` run the live modals in `useSave={false}` mode and hand the values to the changeset). Draft state (the changeset and the canvas) lives only in React context for the lifetime of the draft session — nothing is persisted, so a reload rebuilds from live rather than restoring. A policy enters the changeset once it's *trackable* (`isTrackablePolicy` — both sides set, referenced draft resources tracked); a one-sided policy stays canvas-only. A trackable policy that references an uninstalled placeholder peer is still listed (as an ordinary change) — that peer's own `install-peer` issue is what blocks the deploy, and installing it re-records the policy with the real id (`usePlaceholderUpgrade`). `isDeployablePolicy` is the stricter gate the deploy itself uses.
- Deploy (`useDeployChangeset`) runs in dependency order: group creates/updates → networks → resources → routers → policies → deletes (policy, resource, group); client ids (`new-…`) resolve to real ids as creates succeed.
- The group panel (`DestinationGroupPanel`) offers what's on the CANVAS as well as what's in the API, for peers *and* resources (`canvasPlaceholderPeers` / `canvasDraftResources`): checking one absorbs its node exactly like dropping it on the group. Without the resource half, a draft resource could only be grouped by dragging its card.
- Placeholder peers ("User Device"/"Server"/"Agent") are canvas-only until installed/selected; `usePlaceholderUpgrade` swaps them in place and re-records referencing changes with the real peer id.
- A placeholder can BE a network's routing peer: the routing-peer modal lists the draft's placeholders (`extraPeers` → `PeerSelector`, exempt from the version gate since an uninstalled peer has no version), the create/update-router change is recorded against its `draft-…` id (the deploy is blocked by that peer's own `install-peer` step, which Review & Deploy lists first — the router row shows its request instead of repeating the badge; `getChangeIssue(change, changes)` only flags the router when the placeholder has left the canvas and no install step remains), the request PREVIEW renders the peer as `{office_router_peer_id}` via `peerIdForRef` rather than an unrunnable draft id, the frame's row reads "not installed", and the install rewrites it with the real peer (`replacePeerIdInGroups`, which covers routers as well as groups). A routing peer is NOT a canvas node — it's a changeset entry plus a row on the frame's `RoutingPeersBar` — so there is nothing to draw or tidy away.
- Server/agent placeholders are matched to their installed machine by a **hidden throwaway group** (not a changeset entry, never shown, never in policies): `DraftInstallPeerModal.resolveAutoGroups` creates it via `POST /groups` when the setup key is generated and puts its id on the key as an `auto_group`; the registering peer lands in it, so `useDraftPeerUpgrade.findByGroup` matches unambiguously (hostname is a fallback). Teardown (`usePlaceholderArtifacts`) then runs silently in the background, in this ORDER — the API refuses to delete a group still linked to a setup key: unlink the group from the key's `auto_groups` → empty the group's peers → delete the group → delete the setup key → revalidate `/peers` + `/groups`.
- Pure draft logic is factored for unit tests (`npm run test:unit`): `utils/draft-connect.ts`, `utils/node-capabilities.ts`, `utils/frame-view.ts`, `utils/helpers.ts`, changeset tests.

## Assistant bridge (`agent/`)

- The assistant panel lives in `DashboardLayout`, above this page's providers, so it reaches the canvas through a module-level registry: `CanvasAgentBridge` (mounted in the canvas) publishes an imperative API via `registerCanvasAgent`; the assistant's executor picks it up (`modules/assistant/tools/controlCenterTools.ts`, tools `cc_state` / `cc_navigate` / `cc_draft` / `cc_add` / `cc_connect` / `cc_node` / `cc_policy` / `cc_canvas`, declared in netbird-assistant `src/llm/tools.ts`). Not mounted → the executor pushes `/control-center` and waits.
- ONE action per tool call (the bridge still takes arrays, and the executor accepts a batched list). So arranging is DEBOUNCED, not per-call: each structural step pushes `scheduleArrange` back by `ARRANGE_IDLE_MS`, and a burst settles into a single arrange+fit.
- Grouping a resource that is a FRAME CHILD keeps its card in the frame (`addMemberToGroup` skips the absorb for a node with a `parentId`): the row is the network's own representation of that resource, and removing it left the frame looking empty while the changeset still deployed the resource into that network. Standalone cards are still absorbed — the group stands for them.
- `cc_add` `new_resource_group` is the agent's version of a frame's "Add Resource Group" (`addResourceGroupToFrame`): an ordinary group whose node is a child of the frame, so a group of one network's resources reads as part of that network.
- Group membership from the agent side goes through `resolveMember` (shared by `cc_node add_to_group` and `new_group`'s `members`): a DRAFT resource node's `data.resource` is a partial with **no id** — the id comes from `getDraftResource` — and `addMemberToGroup` silently ignores a member with no `itemId`, so reading the raw field made grouping a freshly drawn resource a no-op that still reported success. Both paths now re-read the group afterwards and report what actually joined.
- The bridge only ORCHESTRATES: every action calls the same hook the human UI calls (`useDraftEntityDrop`, `useDraftNodeCreation`, `useDraftGroupActions`, `useDraftNodeActions`, `useNodeRemoval`, `useDragToGroup`, `useAutoArrange`, the canvas's own `onConnect`). Add a draft capability → extend the shared hook, never re-implement it in `agent/`.
- Draft-only and camera-only by design: no deploy, and no live mutation. Steps run one at a time (`STEP_MS`) so the user sees each one land.
- **Placement + feedback** (what makes it look alive): new nodes go straight into the layout's own columns (`LANE_X` = sources 0 / policies 500 / destinations 1000, `role` on the add says which side), stacking downward from an anchor computed once per draft session (empty draft → origin; carried-over draft → below the existing world). Each step spawns + pulses its node (`utils/node-pulse.ts`, shared with the resource-into-frame highlight), a connect glows the new edges and rings both ends, and `revealNode` fits the graph only when the new node is off-screen.
- While the assistant acts, the pane is dimmed and pointer-locked by `AgentBusyOverlay` (`beginAgentActivity`/`agentActivityStore`, every API method inside `acting()`); the header, toolbar and Cancel stay live so the user can always stop it. The overlay says NOTHING — the assistant panel narrates each step, and a second commentary over the canvas was one more thing to read where the user is trying to watch. The lock is scoped to the whole TURN, not each step (`beginAgentTurn`, held by the runtime's `finally`): a step lasts milliseconds and the model's round trip between two of them lasts seconds, so per-step scoping handed the canvas back mid-layout. It engages only once a canvas tool has actually run, and a watchdog releases it if the runtime never does.
- Arranging is driven by the CALLER: `final: true` on the last `cc_add`/`cc_connect`/`cc_node`/`cc_policy` of a turn arranges once, in that step (`arrangeNow`, which also cancels the pending timer). The `ARRANGE_IDLE_MS` debounce is only the fallback for a caller that never says it's done — it can't tell "still working" from "finished thinking", which is how a build arranged twice.
- The debounced arrange announces itself twice: the busy pill names it while it runs, and it leaves a line in `drainNotices()` that the assistant's next tool report lists first — it fires after the step that triggered it has already reported, and unexplained movement of every node reads as a glitch.
- Two things NOT to reintroduce: (1) an arrange per step — it's debounced by `ARRANGE_IDLE_MS` (longer than a model round trip) so a whole build settles once, at the end; (2) a CSS transition on node transforms — edges recompute from the store instantly, so the nodes lag behind their own lines. Names/direction are set at CREATION for the same family of reasons (see addNewGroup / addBlankPolicy / addPeerPlaceholder).
- Policy direction mirrors the editor: `bidirectional` is refused for a resource-only destination (`destinationOnlyResources` in useAccessControl), and there is no deny action — every policy is an allow rule.
- Policy edits go through `updateDraftPolicy` (the modal's own writer), so an assistant edit records the same changeset entry as a hand edit. Group membership goes through `addMemberToGroup` — and accepts a peer/resource that was never drawn, which is the group panel's drop zone.
- Peer names never leave the browser: a node goes out as `{NODE_n}` plus the token of the entity behind it (`{PEER_3}`), and step `detail` strings name peers by node id so the executor can tokenise them. Group/policy/network/resource names pass through as labels.
- `window.__ccAgent` (APP_ENV=test only) is how `e2e/tests/control-center-agent.spec.ts` drives these actions with no model in the loop.

## Rules & gotchas (hard-won — don't regress these)

**Performance** (the canvas re-renders ~2700 fibers if you get this wrong):

- Every callback/object prop on `<ReactFlow>` must be identity-stable (`useStableHandler`, module-level constants).
- Edges subscribe to endpoint nodes via `useEdgeNodeRect`, never `useInternalNode`. Nodes use `useConnection` in SELECTOR form only.
- Edge dash animation is the shared `cc-animated-edge` CSS class (paused during interaction via `.cc-interacting`), never SMIL.
- No data-fetching hooks in node components that render per-frame; frames fetch router rows lazily on popover open.
- Drag handlers must return the same array from `setNodes` when nothing changed; layout reconcilers, draft persistence, and history capture all skip while dragging and pre-check structurally before any full-canvas JSON.stringify.
- Always-mounted draft consumers that only need node data subscribe via `useStructuralNodes()`.

**Camera / transitions**:

- The shared `fitView` (useSelectNodeHandlers) waits for node measurement; the FIRST fit after mount hides the viewport (`cc-prefit` class + instant fit) so warm-cache remounts don't flash nodes at the origin.
- Drill-downs use `drillInto` / `drillOutOf` (canvas-transition.ts); view-init fitView is suppressed while a transition runs. Browser Back exits drill-downs via `useDrillDownBrowserHistory`.
- Side panels pan the canvas instead of covering nodes: the group panel does it per selected node (`DestinationGroupPanel`), and the assistant panel does it for the whole card via `useAssistantPanelPan` (shift = `PANEL_WIDTH + CARD_INSET`, only when a node reaches into that strip, reversed exactly on close).

**Behavior**:

- Saving a policy in live patches the canvas from the PUT response (`refreshLiveView`) — no fitView, no refetch wait.
- Frame-ness is `data.frame` (or `network-new-` id = draft network), not an id prefix; `getNetworkRef` resolves a frame to real or client id.
- Policy edges to framed resources attach to the frame in the parent view and to the resource when drilled (`useFrameEdgeAttachment`).
- Deletes always confirm ("marked for deletion…"); Removes are canvas-only and never confirm.
- Draft keyboard shortcuts go through `useControlCenterShortcuts` (draft-only, input-aware).
