# Navigation option A: a product switcher

Branch `design/nav-with-switcher`. One of two navigation prototypes for a
dashboard with two products, Networking and Agent Network; option B (one
sidebar with product sections, no switcher) is built on another branch.

## The design

A switch in the header picks the product. The sidebar shows that product's
pages, and an account area right below them is the same in both.

| Networking | Agent Network |
| --- | --- |
| Control Center | Control Center |
| Peers | Peers |
| Access Control › Policies, Posture Checks | Insights › Overview, Models, Tasks, Departments (preview) |
| Network Routing › Networks, Routes | Usage & Logs |
| Reverse Proxy › Services, Custom Domains, Clusters, Access Logs | Agents › Connect Agent, Providers, Agent Policies |
| DNS › Nameservers, Zones, DNS Settings | Configuration |
| Traffic Events | |

**Account area, both products:** Team › Users, Service Users, Groups;
Audit Events; Settings; Tenants (MSP); Integrations; Documentation.

Agent Network only accounts (`agent_network_only`, or
`NETBIRD_AGENT_NETWORK_ONLY`) get no switch: the Agent Network sidebar and the
account area. Users without Agent Network see no switch and no `?product=`,
only the regrouped sidebar.

The stories are in Storybook under *Pages/Core/Layout* (`NetworkingProduct`,
`AgentNetworkProduct`, `AgentNetworkProductPeers`, `AccountArea`,
`NetworkingAccountArea`, `AgentNetworkOnlyAccount`,
`AgentNetworkCollapsedSidebar`, `AgentNetworkMobile`, …) and
*Pages/Platform/Agent Network/Insights*.

## Decisions

### Groups move to Team

Groups are account-wide: users get them from the IdP sync, peers and resources
join them, and both products' policies are written against them (Access
Control policies between source and destination groups, Agent Policies from a
group to providers). Under Networking's Access Control, someone writing agent
policies would have to switch product to manage the groups those policies use.
In the account area they are one click away in both products, at the same URL
(`/groups`, unchanged).

### Audit Events go to the account area

Audit events record changes across the whole account: users, policies,
providers, settings. They are their own item in the account area, as the
distributor sidebar already has them. Traffic events stay with Networking. With
Audit Events gone, the Activity group held only them, so it became a single
"Traffic Events" entry, and the page's breadcrumb dropped its Activity crumb.

### The product is a URL parameter, not a route prefix

A page both products show keeps one path and names the product in its query:
`/peers?product=agent-network`. Reasons:

- **One URL per shared page.** A prefix gives Peers two paths (`/peers` and
  `/agent-network/peers`), which is what a shared object should not have.
- **In-page links keep working.** Tables, modals and docs link to
  `/peer?id=…`, `/group?id=…`, `/team/user?id=…` without knowing the product.
  When a shared page opens without the parameter, it opens in the user's last
  product and the URL is rewritten in place to name it. With prefixes, every
  such link would need to know the product or drop the user into the other one.
- **Static export.** The dashboard is a static export, so every route is a
  file. Prefixes would duplicate every shared route, and the route guards,
  stories and e2e specs that address them by path.

The pages of one product (`/agent-network/…`, `/dns`, `/networks`, …) never
carry the parameter; a stray one is removed. Only callers with both products
get it, so nothing changes for anyone else.

### Remembered per user, not per tab

The last product is kept in localStorage per user
(`netbird-last-product:<userId>`), replacing the per-tab sessionStorage. It is
only the default for a shared page opened without `?product=`; the URL always
wins. There is no server setting yet, and `productStore.ts` is the one place to
swap one in.

### Two cues for the product

1. The switch's label in the header.
2. The root of the breadcrumb trail: "Agent Network › Peers",
   "Networking › Peers". Agent Network pages already start their trail with
   "Agent Network"; Networking pages get "Networking" when there is a second
   product.

The mobile drawer gets its own switch, because the header's sits behind the
drawer's overlay.

### Where the account area sits

Two placements were tried. The branch has the second.

- **Pinned to the bottom of the sidebar.** The divider above Account sits at
  the same height in both products and on every page (633 px down a 960 px
  screen), so switching product only changes the part above it. On a tall
  screen there is an empty band between the two.
- **Right below the product's pages.** No empty band, and Team or Settings is
  closer to the product's own entries. But the area moves with whatever is
  above it: its divider sits at 360 px in Networking, 322 px in Agent
  Network, and 611 px on an Agent Network page with Insights and Agents open.
  Switching product, or opening a page inside a group, moves it.

On an Insights page the two placements nearly meet: the open group fills most
of the sidebar, so on a 900 px screen the divider sits at 573 px pinned and
487 px in flow. The difference shows on short product lists.

With a switcher, pinning keeps the shared part still while the product part
changes, which is what tells people the bottom is the same everywhere. Going
back is a two-line change in `Navigation.tsx` (the spacer moves above
`AccountNavigation`).

### Smaller calls

- Agent Network's Policies is "Agent Policies", in the sidebar and on the page.
- Switching lands on the product's home: Peers in Networking, or Providers in
  Agent Network (Connect Agent without the providers grant).
- The logo opens the current product's home.
- In Agent Network, Control Center drops its Networks pivot, as Agent Network
  only accounts already did.
- The Beta badge moved from the old Agent Network sidebar entry to the switch's
  menu.
- Insights are placeholder routes behind `NETBIRD_AGENT_NETWORK_INSIGHTS_PREVIEW`
  (off by default; Storybook turns it on). They follow the
  `agent_network.usage` grant.

## Trade-offs

- **The switch is a mode.** People have to notice which product they are in.
  The URL and the two cues make it visible and reproducible, but a task that
  spans both products (a network policy and an agent policy for the same group)
  means switching. Option B shows both at once.
- **Shared pages have two ways in.** Peers is in both sidebars at one URL; the
  sidebar around it depends on the product it was opened from.
- **The parameter is visible.** Users with both products see `?product=…` on
  shared pages. A shared page opened without it renders in the remembered
  product, then gains it with a replace (no extra history entry).
- **The regrouping reaches everyone.** Groups under Team and Audit Events in the
  account area also change the sidebar for users who never see Agent Network.
- **Agent Network only accounts lose Access Control from the sidebar.** The
  pages still open by URL.
- **Loading.** Until the account and the caller's agent setup load, the
  sidebar shows Networking, as it did before.

## What this prototype does not do

- The e2e specs (`product-navigation.spec.ts`, the updated
  `agent-network-focused-view.spec.ts`) are written and type-checked but were
  not run: they need the Docker environment.
- Shared pages are not filtered to the product beyond Control Center's pivot:
  Peers lists every peer in both products.
- No server-side preference for the last product.
- The visual check captures at 1440 px only; mobile was checked with Playwright
  at 390 px.

## Open questions

1. Switching from a shared page: stay on it (Peers in Networking → Peers in
   Agent Network) or go to the product's home, as now?
2. After login, land on Peers in the last product (now), or on that product's
   home?
3. Do Agent Network only accounts need Access Control or Posture Checks, for
   example to let peers reach the gateway?
4. Groups under Team, or their own entry in the account area? Is "Team" still
   the right name once it holds groups of peers and resources?
5. A new user with both products starts in Networking. Should it be Agent
   Network for accounts that signed up through netbird.ai?
6. Should the distributor and MSP entries move to the account area too?
7. Which grant should Insights follow once it is real?
8. The account area: pinned to the bottom, or right below the product's pages?
