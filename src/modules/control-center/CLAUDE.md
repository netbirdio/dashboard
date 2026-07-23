# Control Center Module

Canvas-based network topology editor built on [ReactFlow](https://reactflow.dev/) (xyflow v12). Peers, groups, policies, and networks are nodes; policies connect them. Live mode shows the real account; Draft mode is a local editor whose changes deploy as a batch.

> Keep this file in sync when the architecture or the rules below change — but keep it SHORT. Details live in the code.

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
- `useDraftChangeset()` — tracked draft changes (localStorage-backed).
- `useGroups()` — group CRUD + dropdown options.

Data flow: `useControlCenterData()` fetches everything (SWR) → view hooks (`usePeerView`, `useGroupView`, `useUserView`, `useNetworkView`) build node/edge graphs → `useSelectNodeHandlers({ views })` owns navigation, the view-init effect, and the shared `fitView` → `ControlCenterUIProvider` wires it together. Circular deps (node onClick → handlers → view builders) resolve via refs on CanvasStateProvider (`forceSingleGroupViewRef`, `refreshLiveViewRef`).

Key directories under `control-center/`: `hooks/` (data, views, draft logic, layout reconcilers), `draft/` (draft-mode UI + changeset/history contexts), `nodes/`, `edges/`, `handles/`, `utils/` (graph-builder, layouts, canvas-transition, pure testable logic).

## Views (live)

Peer / Group / User: select node on the left → policies (x500, 60 pitch) → destinations (groups + resources as ONE column, x1000, 100 pitch). Built with `applyD3HierarchicalLayout(nodes, edges, 400, 120, view, DEFAULT_LAYOUT_CONFIG)`. Policies sorted by enabled; the GROUP view additionally name-sorts each policy's destinations.

Networks: all networks as interactive frames (resources as child rows, capped at 6 with a "+N more" cell) — sources column (160 pitch) → policy nodes (x480, 90 pitch) → staggered frame grid (`packFrameGrid`). Clicking a frame drills into the single-network view (`drilled-layout.ts`, shared with draft). Focus mode (click a group in any live view, or a peer in the user view) dims everything off the node's edge path via `cc-dimmed`.

## Draft mode

- Entering draft rebuilds the canvas from the policies visible in the live view (`useDraft`): source groups/peers → policy → destinations. Live network frames carry over as existing-network frames; destination groups whose resources live in exactly one carried network fold into that frame as `resourceGroupNode` rows.
- **Layout parity**: the draft build mirrors the live view it was entered from (same column x/pitch, same sort — see Views). Destinations restack as one column with sides resolved by edge direction, ordered by first policy edge; existing destination resources get `draftNetwork` stamped so they don't show "No Network".
- Changes are tracked as CRUD-shaped entries in `DraftChangesetContext` (groups/policies/resources: create+update+delete; networks/routers: create only), coalesced per entity, persisted to localStorage together with a canvas snapshot (reload restores instead of rebuilding). Only complete policies enter the changeset (`isCompletePolicy` — both sides set, no uninstalled placeholder peers).
- Deploy (`useDeployChangeset`) runs in dependency order: group creates/updates → networks → resources → routers → policies → deletes (policy, resource, group); client ids (`new-…`) resolve to real ids as creates succeed.
- Placeholder peers ("User Device"/"Server"/"Agent") are canvas-only until installed/selected; `usePlaceholderUpgrade` swaps them in place and re-records referencing changes with the real peer id.
- Pure draft logic is factored for unit tests (`npm run test:unit`): `utils/draft-connect.ts`, `utils/node-capabilities.ts`, `utils/frame-view.ts`, `utils/helpers.ts`, changeset + storage tests.

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
