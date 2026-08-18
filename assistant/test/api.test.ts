import { test, expect } from "bun:test";
import { indexOpenApi, queryOpenApi } from "@/tools/docs.ts";
import { isServerTool, TOOLS } from "@/tools/index.ts";

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
  expect(idx.endpoints).toContainEqual({ method: "GET", path: "/api/peers", summary: "List all Peers" });
  expect(idx.endpoints.some((e) => e.path === "/api/peers/{peerId}")).toBe(true);
  expect(idx.schemas.get("Peer")).toContain("connected");
});

test("queryOpenApi returns matching endpoints + schema (with one-level $ref expansion)", () => {
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

test("get_api_reference is a known, server-executed tool", () => {
  expect("get_api_reference" in TOOLS).toBe(true);
  expect(isServerTool("get_api_reference")).toBe(true);
});
