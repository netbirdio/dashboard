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
- Placeholder peers ("User Device"/"Server"/"Agent") are canvas-only until installed/selected; `usePlaceholderUpgrade` swaps them in place and re-records referencing changes with the real peer id.
- Server/agent placeholders are matched to their installed machine by a **hidden throwaway group** (not a changeset entry, never shown, never in policies): `DraftInstallPeerModal.resolveAutoGroups` creates it via `POST /groups` when the setup key is generated and puts its id on the key as an `auto_group`; the registering peer lands in it, so `useDraftPeerUpgrade.findByGroup` matches unambiguously (hostname is a fallback). Teardown (`usePlaceholderArtifacts`) then runs silently in the background, in this ORDER — the API refuses to delete a group still linked to a setup key: unlink the group from the key's `auto_groups` → empty the group's peers → delete the group → delete the setup key → revalidate `/peers` + `/groups`.
- Pure draft logic is factored for unit tests (`npm run test:unit`): `utils/draft-connect.ts`, `utils/node-capabilities.ts`, `utils/frame-view.ts`, `utils/helpers.ts`, changeset tests.

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

**Behavior**:

- Saving a policy in live patches the canvas from the PUT response (`refreshLiveView`) — no fitView, no refetch wait.
- Frame-ness is `data.frame` (or `network-new-` id = draft network), not an id prefix; `getNetworkRef` resolves a frame to real or client id.
- Policy edges to framed resources attach to the frame in the parent view and to the resource when drilled (`useFrameEdgeAttachment`).
- Deletes always confirm ("marked for deletion…"); Removes are canvas-only and never confirm.
- Draft keyboard shortcuts go through `useControlCenterShortcuts` (draft-only, input-aware).
