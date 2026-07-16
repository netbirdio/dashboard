# Draft Mode — Known Limitations

> Running list of accepted v1 limitations to revisit later. When one gets
> fixed, remove it here and update CLAUDE.md / the feature spec.

## Contained resources can't be dragged into groups

Resources inside a network frame are laid out by the frame — `draggable:
false`, full frame width. That deliberately kills the drag gesture, which
also means the **drag-onto-a-group** flow is unavailable for them: group
membership for a framed resource is only editable through the resource
editor's **Assigned Groups** field (drag-to-group still works for resources
that aren't framed yet).

Possible later fixes: re-enable dragging with a snap-back when the drag
doesn't end on a group, or offer "Add to group" in the resource node's
context menu.

## Deleting a routing edge doesn't drop its router change

Removing the peer/group node or the network frame cleans up the
`create-router` change, but deleting only the routing *edge* (keyboard
edge delete) leaves the change behind. Same class of gap exists for policy
edges (visual-only edge deletion) — probably solved together by disabling
raw edge deletion or handling `onEdgesChange` removals.

## Draft network description is not editable on the canvas

`create-network` supports an optional description and the editor's inline
network creation could carry one, but the network context menu only offers
Rename (name). Needs a small edit modal (name + description).
