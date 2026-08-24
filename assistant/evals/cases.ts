// Routing evaluations over two dimensions of the same first tool batch: which
// guide the model reached for, and which tool it reached for. `expect: []`
// means no guide should be loaded — over-loading costs a step and pulls in
// irrelevant context, so precision is scored as well as recall.
export interface RoutingCase {
  query: string;
  expect: string[];
  // Tools that must appear in the first batch, and tools that must not. Both
  // are left unset where more than one opening read is defensible: a case
  // should score what the prompt actually commits to, not a preference.
  expectTools?: string[];
  forbidTools?: string[];
  why: string;
}

export const CASES: RoutingCase[] = [
  // --- access-control
  {
    query: "my laptop can't reach the build server, both are online",
    expect: ["access-control"],
    forbidTools: ["search_docs"],
    why: "connectivity triage is the access-control guide's core job; which read opens it is a judgement call",
  },
  {
    query: "why can everyone in the company connect to everything?",
    expect: ["access-control"],
    expectTools: ["list_policies"],
    forbidTools: ["search_docs"],
    why: "the default allow-all policy is called out in the guide, but which policy it is has to be read",
  },
  {
    query: "same group but one peer still gets refused",
    expect: ["access-control"],
    why: "posture checks are the invisible cause named in the guide; the guide sets the read order, not this case",
  },
  // --- network-routing
  {
    query: "I need my peers to reach the office printer at 10.0.5.20",
    expect: ["network-routing"],
    why: "a device that doesn't run NetBird means networks/resources; read-first or draft-first is the guide's call",
  },
  {
    query: "how do I set up an exit node so traffic leaves through Berlin?",
    expect: ["network-routing"],
    why: "exit nodes are a 0.0.0.0/0 route, and the guide may be answer enough — no read is required",
  },
  // --- dns-resolution
  {
    query: "one of my peers ignores our internal DNS server completely",
    expect: ["dns-resolution"],
    expectTools: ["list_nameserver_groups"],
    forbidTools: ["open_page"],
    why: "DNS settings lists groups that don't apply NetBird DNS; the nameserver groups are the config being ignored",
  },
  // --- reverse-proxy
  {
    query: "I want to publish our internal wiki on a public URL for contractors without the client",
    expect: ["reverse-proxy"],
    why: "visitors needing only a browser is the services feature, and the guide carries the procedure",
  },
  // --- users-and-roles
  {
    query: "what can a network_admin actually do that a regular user can't?",
    expect: ["users-and-roles"],
    forbidTools: ["open_page"],
    why: "the role ladder lives in the users guide — a question about roles, not a request to go anywhere",
  },
  {
    query: "we need a token for our CI to call the API",
    expect: ["users-and-roles"],
    forbidTools: ["get_api_reference"],
    why: "service users hold API tokens; \"call the API\" is a surface-word trap for get_api_reference",
  },
  {
    query: "who has admin rights here?",
    expect: ["users-and-roles"],
    expectTools: ["list_users"],
    forbidTools: ["search_docs"],
    why: "the role ladder is the guide's, but who holds which role is only in the account",
  },
  // --- audit-events
  {
    query: "who deleted the staging peer last week?",
    expect: ["audit-events"],
    expectTools: ["list_events"],
    forbidTools: ["open_page"],
    why: "audit events carry initiator, activity code and time — and the initiator is read, never guessed",
  },
  // --- account-settings
  {
    query: "our peers keep asking people to log in again, can we make that less often?",
    expect: ["account-settings"],
    expectTools: ["get_account_settings"],
    why: "peer login expiration is an authentication setting; the current value comes from the account",
  },
  {
    query: "how do I enroll 40 machines without each person logging in?",
    expect: ["account-settings"],
    why: "setup keys are documented under settings; the keys or the procedure are both fine openings",
  },
  // --- control-center
  {
    query: "draw me a topology with a jump host in front of the database group",
    expect: ["control-center"],
    why: "building a topology is draft work on the canvas; which batch the draft opens in is the guide's call",
  },
  {
    query: "show me our network as a diagram",
    expect: ["control-center"],
    forbidTools: ["list_peers", "render_component"],
    why: "wanting to *see* the topology is the canvas, not a list tool and not a rendered table",
  },
  // --- multi-guide
  {
    query: "build a draft where contractors can only reach the web server on 443",
    expect: ["control-center", "access-control"],
    forbidTools: ["open_page"],
    why: "drafting plus a narrowed policy touches both guides, and the canvas is where it is built",
  },
  // --- negative: answerable from account data alone
  {
    query: "how many peers do I have?",
    expect: [],
    expectTools: ["list_peers"],
    forbidTools: ["open_page", "ask_user"],
    why: "a plain count needs list_peers, no domain guide — and neither a page nor a question",
  },
  {
    query: "is my laptop online?",
    expect: [],
    expectTools: ["list_peers"],
    forbidTools: ["open_page"],
    why: "peer status is in the always-on prompt, not a guide; `yours: true` is what \"my\" resolves to",
  },
  {
    query: "what's my email address?",
    expect: [],
    expectTools: ["get_current_user"],
    forbidTools: ["list_users"],
    why: "get_current_user answers it outright — the user list is the wrong tool for the person asking",
  },
  {
    query: "what public IP does my laptop connect from?",
    expect: [],
    expectTools: ["list_peers"],
    forbidTools: ["search_docs", "open_page"],
    why: "`connection_ip` is a peer field the always-on prompt explains, so this is one account read",
  },
  // --- negative: docs-shaped, must not touch account data
  {
    query: "what's the difference between a relay server and a signal server?",
    expect: [],
    expectTools: ["search_docs"],
    forbidTools: ["list_peers"],
    why: "no guide covers the infrastructure components, and this account's peers say nothing about them",
  },
  {
    query: "how do I self-host the management server with Postgres instead of SQLite?",
    expect: [],
    expectTools: ["search_docs"],
    forbidTools: ["get_account_settings"],
    why: "self-hosting lives in the docs; account settings are this account's, not the server's deployment",
  },
  {
    query: "which fields does the create-policy API endpoint accept?",
    expect: [],
    expectTools: ["get_api_reference"],
    forbidTools: ["list_policies"],
    why: "a question about the API's own shape, not about the policies in this account",
  },
  // --- negative: navigation still reads first
  {
    query: "open my laptop's page",
    expect: [],
    expectTools: ["list_peers"],
    forbidTools: ["open_page"],
    why: "navigating to \"my\" anything needs the `yours: true` row first — open_page here means an invented id",
  },
];
