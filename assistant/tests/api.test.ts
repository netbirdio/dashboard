import { expect, test } from "bun:test";
import { isServerTool, TOOLS } from "@/agent/tools/registry.ts";
import { indexOpenApi, queryOpenApi } from "@/lib/openapi.ts";

const SPEC = `openapi: 3.0.0
paths:
  /api/peers:
    get:
      summary: List all Peers
      tags: [Peers]
  /api/peers/{peerId}:
    get:
      summary: Retrieve a Peer
  /api/groups:
    get:
      summary: List all Groups
components:
  schemas:
    Peer:
      allOf:
        - $ref: '#/components/schemas/PeerMinimum'
        - type: object
          properties:
            ip:
              type: string
            connected:
              type: boolean
    PeerMinimum:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
    Group:
      type: object
      properties:
        id:
          type: string
`;

test("indexOpenApi extracts schemas and endpoints", () => {
  const idx = indexOpenApi(SPEC);
  expect([...idx.schemas.keys()].sort()).toEqual(["Group", "Peer", "PeerMinimum"]);
  expect(idx.endpoints).toContainEqual(
    expect.objectContaining({ method: "GET", path: "/api/peers", summary: "List all Peers", tags: ["Peers"] }),
  );
  expect(idx.endpoints.some((e) => e.path === "/api/peers/{peerId}")).toBe(true);
  expect(idx.schemas.get("Peer")).toContain("connected");
});

test("queryOpenApi returns matching endpoints + schema (following $ref)", () => {
  const idx = indexOpenApi(SPEC);
  const out = queryOpenApi(idx, "peers", 10_000);
  expect(out).toContain("GET /api/peers");
  expect(out).toContain("Peer:");
  expect(out).toContain("PeerMinimum:");
  expect(out).not.toContain("Group:");
});

test("queryOpenApi returns empty string when nothing matches", () => {
  expect(queryOpenApi(indexOpenApi(SPEC), "zzznotathing", 10_000)).toBe("");
});

test("a matched endpoint drags in the schemas it references", () => {
  // "Peers" is only the endpoint's tag; Peer/PeerMinimum come from its $ref.
  const out = queryOpenApi(indexOpenApi(SPEC), "list all peers", 10_000);
  expect(out).toContain("GET /api/peers");
  expect(out).toContain("Peer:");
  expect(out).toContain("PeerMinimum:");
});

test("camelCase schema names are matchable as separate words", () => {
  const spec = SPEC + `    NameserverGroup:
      type: object
      properties:
        primary:
          type: boolean
`;
  const out = queryOpenApi(indexOpenApi(spec), "nameserver group", 10_000);
  expect(out).toContain("NameserverGroup:");
});

test("an oversized schema is skipped, not a wall for the rest", () => {
  const idx = indexOpenApi(SPEC);
  const small = idx.schemas.get("Group")!;
  idx.schemas.set("Peer", "Peer:\n" + "  x: y\n".repeat(4000));
  const out = queryOpenApi(idx, "peers groups", small.length + 200);
  expect(out).toContain("Group:");
  expect(out).not.toContain("x: y");
});

// This is what the old hand-maintained SYNONYMS table existed for: "dns" has
// to reach NameserverGroup, whose name shares no substring with the query. It
// works now because the /api/dns/nameservers operation $refs it.
test("a query reaches schemas its wording never mentions, via the endpoint", () => {
  const spec = `openapi: 3.0.0
paths:
  /api/dns/nameservers:
    get:
      summary: List all Nameserver Groups
      tags: [DNS]
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NameserverGroup'
components:
  schemas:
    NameserverGroup:
      type: object
      properties:
        primary:
          type: boolean
        nameservers:
          items:
            $ref: '#/components/schemas/Nameserver'
    Nameserver:
      type: object
      properties:
        ip:
          type: string
`;
  const out = queryOpenApi(indexOpenApi(spec), "dns", 10_000);
  expect(out).toContain("GET /api/dns/nameservers");
  expect(out).toContain("NameserverGroup:");
  // Nested a further $ref away, so it needs the breadth-first closure.
  expect(out).toContain("Nameserver:");
});

test("get_api_reference is a known, server-executed tool", () => {
  expect("get_api_reference" in TOOLS).toBe(true);
  expect(isServerTool("get_api_reference")).toBe(true);
});
