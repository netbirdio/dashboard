import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetupKey } from "@/interfaces/SetupKey";

// revokeSetupKey's GET-then-PUT is unordered against the teardown DELETE of the
// same key, so the PUT can fail against a key that is already gone — and the toast
// must not claim a live credential is outstanding when it has been deleted.

type Call = { method: string; path: string };
let calls: Call[] = [];
let keys: Record<string, SetupKey | undefined> = {};
// Paths whose PUT rejects, standing in for the race with the delete.
let putFails = new Set<string>();
const notify = vi.fn();

vi.mock("swr", () => ({ mutate: vi.fn() }));
vi.mock("@components/Notification", () => ({
  notify: (a: unknown) => notify(a),
}));
vi.mock("@utils/api", () => ({
  useApiCall: (url: string) => ({
    get: async (suffix?: string) => {
      calls.push({ method: "GET", path: `${url}${suffix ?? ""}` });
      const found = keys[`${url}${suffix ?? ""}`];
      if (!found) throw new Error("404");
      return found;
    },
    put: async (_body: unknown, suffix?: string) => {
      const path = `${url}${suffix ?? ""}`;
      calls.push({ method: "PUT", path });
      if (putFails.has(path)) throw new Error("404");
      return {};
    },
    del: async (_body: unknown, suffix?: string) => {
      calls.push({ method: "DELETE", path: `${url}${suffix ?? ""}` });
      return {};
    },
    post: async () => ({}),
  }),
}));

const { usePlaceholderArtifacts } = await import(
  "@/modules/control-center/hooks/usePlaceholderArtifacts"
);

const subject = () => renderHook(() => usePlaceholderArtifacts()).result;
const settle = () => act(async () => void (await Promise.resolve()));
const liveKey = (over: Partial<SetupKey> = {}) =>
  ({
    id: "sk-1",
    name: "Draft Server",
    type: "one-off",
    expires_in: 86400,
    revoked: false,
    auto_groups: [],
    usage_limit: 1,
    ephemeral: false,
    allow_extra_dns_labels: false,
    ...over,
  }) as SetupKey;

beforeEach(() => {
  calls = [];
  keys = { "/setup-keys/sk-1": liveKey() };
  putFails = new Set();
  notify.mockClear();
});

describe("revokeSetupKey", () => {
  it("revokes a live key without a toast", async () => {
    const result = subject();
    act(() => result.current.revokeSetupKey("sk-1"));
    await settle();

    expect(calls.filter((c) => c.method === "PUT")).toEqual([
      { method: "PUT", path: "/setup-keys/sk-1" },
    ]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("stays silent when the PUT fails because the key is already gone", async () => {
    putFails.add("/setup-keys/sk-1");
    let reads = 0;
    keys = {
      get "/setup-keys/sk-1"() {
        reads += 1;
        // The first read is the revoke's own; by the re-read the delete has landed.
        return reads === 1 ? liveKey() : undefined;
      },
    } as unknown as typeof keys;

    const result = subject();
    act(() => result.current.revokeSetupKey("sk-1"));
    await settle();
    await settle();
    await settle();

    expect(reads).toBe(2);
    expect(notify).not.toHaveBeenCalled();
  });

  it("stays silent when the re-read shows it already revoked", async () => {
    putFails.add("/setup-keys/sk-1");
    let reads = 0;
    keys = {
      get "/setup-keys/sk-1"() {
        reads += 1;
        // First read sees it live; by the re-read another path has revoked it.
        return reads === 1 ? liveKey() : liveKey({ revoked: true });
      },
    } as unknown as typeof keys;

    const result = subject();
    act(() => result.current.revokeSetupKey("sk-1"));
    await settle();
    await settle();
    await settle();

    expect(notify).not.toHaveBeenCalled();
  });

  // A key that really did survive is the case worth a toast: it stays usable.
  it("reports a key that is still live after the failed PUT", async () => {
    putFails.add("/setup-keys/sk-1");
    const result = subject();
    act(() => result.current.revokeSetupKey("sk-1"));
    await settle();
    await settle();
    await settle();

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Draft cleanup",
        description: expect.stringContaining("Draft Server"),
      }),
    );
  });

  it("does nothing for a key that is already revoked", async () => {
    keys["/setup-keys/sk-1"] = liveKey({ revoked: true });
    const result = subject();
    act(() => result.current.revokeSetupKey("sk-1"));
    await settle();

    expect(calls.filter((c) => c.method === "PUT")).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("does nothing without a key id", async () => {
    const result = subject();
    act(() => result.current.revokeSetupKey(undefined));
    await settle();

    expect(calls).toEqual([]);
  });
});

// The registry outlives the canvas history: undo reverts node data past a key
// generation, so callers can re-register stale or partial artifacts. A stored id
// names a real API object and must survive until its own teardown.
describe("the registry", () => {
  it("ignores explicitly undefined fields so a stale caller cannot erase a stored key", async () => {
    const result = subject();
    act(() => {
      result.current.registerArtifacts("owner-a", {
        boundGroupId: "g-1",
        setupKeyId: "sk-1",
      });
      // Post-undo node data: the group survived the snapshot, the key did not.
      result.current.registerArtifacts("owner-a", {
        boundGroupId: "g-1",
        setupKeyId: undefined,
      });
      result.current.deleteArtifacts("owner-a");
    });
    await settle();
    await settle();

    expect(calls).toContainEqual({
      method: "DELETE",
      path: "/setup-keys/sk-1",
    });
  });

  it("keeps superseded generations so a regenerated key still gets torn down", async () => {
    const result = subject();
    act(() => {
      result.current.registerArtifacts("owner-b", { boundGroupId: "g-1" });
      result.current.registerArtifacts("owner-b", { setupKeyId: "sk-1" });
      // Undo reverted the node, so a reopened Install created a second pair.
      result.current.registerArtifacts("owner-b", { boundGroupId: "g-2" });
      result.current.registerArtifacts("owner-b", { setupKeyId: "sk-2" });
      result.current.flushArtifacts();
    });
    await settle();
    await settle();

    const deletes = calls
      .filter((c) => c.method === "DELETE")
      .map((c) => c.path);
    expect(deletes).toContain("/setup-keys/sk-1");
    expect(deletes).toContain("/setup-keys/sk-2");
    expect(deletes).toContain("/groups/g-1");
    expect(deletes).toContain("/groups/g-2");
  });

  // After two undone generations the replayed node data holds the FIRST pair —
  // cloning that generation would make flush delete the same ids twice and toast
  // a false "stays usable" for a key that is already gone.
  it("re-registering ids known from any generation adds nothing", async () => {
    const result = subject();
    act(() => {
      result.current.registerArtifacts("owner-d", {
        boundGroupId: "g-1",
        setupKeyId: "sk-1",
      });
      result.current.registerArtifacts("owner-d", {
        boundGroupId: "g-1",
        setupKeyId: "sk-2",
      });
      result.current.registerArtifacts("owner-d", {
        boundGroupId: "g-1",
        setupKeyId: "sk-1",
      });
      result.current.flushArtifacts();
    });
    await settle();
    await settle();

    const deletes = calls
      .filter((c) => c.method === "DELETE")
      .map((c) => c.path);
    expect(deletes.filter((p) => p === "/setup-keys/sk-1")).toHaveLength(1);
    expect(deletes.filter((p) => p === "/setup-keys/sk-2")).toHaveLength(1);
    expect(deletes.filter((p) => p === "/groups/g-1")).toHaveLength(1);
  });

  // remove → undo → reopen: the dead-key reconcile cleared the key but the bound
  // group is reused, so the NEW key carries its auto_groups link and the pair
  // must share a generation.
  it("keeps a reused group in the same generation as its new key", async () => {
    const result = subject();
    act(() => {
      result.current.registerArtifacts("owner-e", { boundGroupId: "g-1" });
      result.current.registerArtifacts("owner-e", {
        boundGroupId: "g-1",
        setupKeyId: "sk-1",
      });
      result.current.registerArtifacts("owner-e", {
        boundGroupId: "g-1",
        setupKeyId: "sk-2",
      });
      result.current.flushArtifacts();
    });
    await settle();
    await settle();

    const deletes = calls
      .filter((c) => c.method === "DELETE")
      .map((c) => c.path);
    expect(deletes.filter((p) => p === "/groups/g-1")).toHaveLength(1);
    expect(deletes.indexOf("/groups/g-1")).toBeGreaterThan(
      deletes.indexOf("/setup-keys/sk-2"),
    );
  });

  it("answers the newest key id it knows even after a new generation began", async () => {
    const result = subject();
    act(() => {
      result.current.registerArtifacts("owner-c", {
        boundGroupId: "g-1",
        setupKeyId: "sk-1",
      });
      // A reopened Install registered its new group but no key yet.
      result.current.registerArtifacts("owner-c", { boundGroupId: "g-2" });
    });

    expect(result.current.registeredSetupKeyId("owner-c")).toBe("sk-1");

    act(() => result.current.deleteArtifacts("owner-c"));
    expect(result.current.registeredSetupKeyId("owner-c")).toBeUndefined();
    await settle();
    await settle();
  });
});
