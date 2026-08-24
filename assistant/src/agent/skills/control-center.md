---
description: Covers the topology canvas and the cc_ tools, including the shape of a draft build and the naming rules for nodes it creates. Use whenever the user wants to see or build a topology, or when a request means staging changes on a draft.
---

# Control center

A canvas of the network: peers, groups, policies, networks and resources as nodes, policies as the
edges between them. **Live** mirrors the account, read-only. **Draft** is a scratch copy the user
reviews and deploys — you never deploy, that click is theirs. Use it when the user wants to *see*
or *build* a topology; for a question you can answer in a sentence, read the account tools instead
— don't move someone's screen to tell them something.

**The shape of a build**: `cc_navigate` to what it's about → `cc_draft` (`from_current_view` to
change what exists, `new_empty` to start clean) → `cc_add` each node → `cc_connect` each link →
`cc_policy` to name, narrow and direct it. One action per call, so the user sees each step land and
can stop you — but make every call whose inputs you already know in the same message; they run in
order. The only reason to hold a call back is that it needs an id you haven't seen, so a build is
normally two batches: `cc_draft` plus every `cc_add`, then every `cc_connect` plus `cc_policy`
using the ids the adds returned. Never spend a call on layout: mark your last change of the turn
`final: true` and the canvas arranges once, there.

**Draft first, ask second.** The moment a request is drafting work, your *first* tool batch of the
turn opens the draft and puts every certain thing on the canvas, even a single node. Placeholders
stand in for what you don't know yet (an unnamed `server` for an unidentified machine, a
`new_group` for a set you haven't worked out); ask once, at the end, for the short list you
genuinely can't invent. A canvas that's wrong in places beats a question with a blank screen
behind it — the user corrects what they can see.

**Model with the sections above** — translate the user's words into groups, resources and routing
peers rather than echoing them. Build a policy as a `new_policy` node with a link into each side;
connecting two ordinary nodes hands the user a dialog instead.

**Name everything you create**: Title Case labels an admin would write ("Build Servers",
"Contractors to Staging"), never slugs and never the `Policy (1)` fallback; match the account's
existing style. A description is one plain sentence saying why the thing exists.

Inside a draft there are no view tabs — the canvas is what you drew. To work with something not on
it, `cc_add` the real thing (`existing_peer`, `existing_group`, …); never navigate away. Node
handles are `[NODE_n]` tokens, from `cc_state` or from what a step returned; a node also carries
the token of the account entity behind it (`[PEER_3]`), which is how it lines up with what you read
elsewhere. Check `can.rename` / `can.remove` / `can.delete` rather than attempt. Remove takes a
node off the canvas; Delete marks the real thing for deletion on deploy.

Say what you drew in a few words — the user was watching, and the review panel lists the
changeset; don't narrate steps or restate it.
