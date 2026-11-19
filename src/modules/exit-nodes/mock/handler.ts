/**
 * Mock of the exit node management API, which does not exist yet.
 *
 * src/utils/api.tsx hands every request to `exitNodesMock.handle` before it
 * goes to the network; requests the mock doesn't claim continue as usual.
 * Components therefore use `useFetchApi("/exit-nodes")` and
 * `useApiCall("/exit-nodes")` exactly as they will against the real API.
 *
 * Set NEXT_PUBLIC_EXIT_NODES_MOCK=off to send these requests to the
 * management API instead (Storybook does, and answers from fixtures). To
 * switch to the real API for good: delete this folder, the `exitNodesMock`
 * lines in src/utils/api.tsx and the define in .storybook/main.ts.
 *
 * Endpoints: GET/POST /exit-nodes, GET/PUT/DELETE /exit-nodes/:id.
 *
 * Policies: the real /policies API rejects `destinationResource.type
 * "exit_node"`, so policies targeting an exit node are kept here as well,
 * as the least invasive option that leaves the policy code untouched:
 *  - POST /policies with an exit node destination is stored in the mock;
 *  - PUT/DELETE /policies/:id go to the mock when it holds that id (or the
 *    update now targets an exit node), otherwise to the real API;
 *  - GET /policies returns the real list merged with the mock's policies,
 *    their groups expanded like the API does, so the Access Control page
 *    and every policy count show them.
 */
import { ExitNodeRequest } from "@/interfaces/ExitNode";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { isExitNodePolicy } from "@/modules/exit-nodes/exitNodeHelpers";
import { buildExitNodesSeed } from "@/modules/exit-nodes/mock/seed";
import {
  ExitNodesMockStore,
  MOCK_POLICY_ID_PREFIX,
  MockError,
} from "@/modules/exit-nodes/mock/store";

export type MockMethod = "GET" | "POST" | "PUT" | "DELETE";

export type MockContext = {
  /** Sends the intercepted request to the real management API. */
  next: () => Promise<unknown>;
  /** Sends another request to the real management API. */
  request: (
    method: MockMethod,
    path: string,
    body?: unknown,
  ) => Promise<unknown>;
};

const expandGroups = (ids: unknown, groups: Group[]) =>
  Array.isArray(ids)
    ? ids.map((id) => {
        if (typeof id !== "string") return id;
        const group = groups.find((g) => g.id === id);
        return group
          ? {
              id,
              name: group.name,
              peers_count: group.peers_count,
              resources_count: group.resources_count,
              issued: group.issued,
            }
          : { id, name: id };
      })
    : ids;

/** Groups as objects, like GET /policies returns them. */
const expandPolicy = (policy: Policy, groups: Group[]): Policy => ({
  ...policy,
  rules: policy.rules.map((rule) => ({
    ...rule,
    sources: expandGroups(rule.sources, groups) as Group[] | null,
    destinations: expandGroups(rule.destinations, groups) as Group[] | null,
  })),
});

export function createExitNodesMock(
  store = new ExitNodesMockStore(),
  initiallyEnabled = true,
) {
  let enabled = initiallyEnabled;
  let seeding: Promise<void> | undefined;
  let knownGroups: Group[] = [];

  const asList = <T>(value: unknown) =>
    Array.isArray(value) ? (value as T[]) : [];

  const fetchGroups = async (ctx: MockContext) => {
    try {
      knownGroups = asList<Group>(await ctx.request("GET", "/groups"));
    } catch {
      // Keep the last known groups; a policy then shows group ids at worst.
    }
    return knownGroups;
  };

  /** Seeds the store once, from the account's own peers and groups. */
  const ensureSeeded = (ctx: MockContext) => {
    seeding ??= (async () => {
      const [peers, groups] = await Promise.all([
        ctx.request("GET", "/peers").catch(() => []),
        fetchGroups(ctx),
      ]);
      store.load(buildExitNodesSeed(asList<Peer>(peers), groups));
    })();
    return seeding;
  };

  const ownsPolicy = (id?: string) =>
    !!id && (id.startsWith(MOCK_POLICY_ID_PREFIX) || store.hasPolicy(id));

  const exitNodeRoutes = async (
    method: MockMethod,
    id: string | undefined,
    body: unknown,
  ) => {
    if (!id && method === "GET") return store.listExitNodes();
    if (!id && method === "POST")
      return store.createExitNode(body as ExitNodeRequest);
    if (id && method === "GET") return store.getExitNode(id);
    if (id && method === "PUT")
      return store.updateExitNode(id, body as ExitNodeRequest);
    if (id && method === "DELETE") {
      store.deleteExitNode(id);
      return {};
    }
    throw { code: 405, message: "method not allowed" } as MockError;
  };

  const listPolicies = async (ctx: MockContext) => {
    const [real, groups] = await Promise.all([ctx.next(), fetchGroups(ctx)]);
    const mocked = store.listPolicies().map((p) => expandPolicy(p, groups));
    const shadowed = (p: Policy) => mocked.find((m) => m.id === p.id);
    const merged = asList<Policy>(real).map((p) => shadowed(p) ?? p);
    const added = mocked.filter((m) => !merged.some((p) => p.id === m.id));
    return [...merged, ...added];
  };

  const updatePolicy = async (ctx: MockContext, id: string, body: Policy) => {
    if (isExitNodePolicy(body)) {
      const policy = store.upsertPolicy(id, body);
      return expandPolicy(policy, await fetchGroups(ctx));
    }
    // The policy no longer targets an exit node, so the real API owns it.
    store.deletePolicy(id);
    if (id.startsWith(MOCK_POLICY_ID_PREFIX))
      return ctx.request("POST", "/policies", body);
    return ctx.next();
  };

  const deletePolicy = async (ctx: MockContext, id: string) => {
    store.deletePolicy(id);
    // A shadowed real policy is deleted in the real API as well.
    if (!id.startsWith(MOCK_POLICY_ID_PREFIX)) return ctx.next();
    return {};
  };

  return {
    store,

    get enabled() {
      return enabled;
    },

    setEnabled(value: boolean) {
      enabled = value;
    },

    /** Forgets all state; the next request seeds again. */
    reset() {
      seeding = undefined;
      knownGroups = [];
      store.load({});
    },

    /**
     * Answers the request when it belongs to the mock, else returns
     * undefined and the caller sends it to the real API.
     */
    handle(
      method: MockMethod,
      url: string,
      body: unknown,
      ctx: MockContext,
    ): Promise<unknown> | undefined {
      if (!enabled) return undefined;
      const [resource, id, ...rest] = url
        .split("?")[0]
        .split("/")
        .filter(Boolean);

      const run = (fn: () => Promise<unknown>) => ensureSeeded(ctx).then(fn);

      if (resource === "exit-nodes") {
        if (rest.length > 0)
          return Promise.reject({ code: 404, message: "not found" });
        return run(() => exitNodeRoutes(method, id, body));
      }

      if (resource !== "policies" || rest.length > 0) return undefined;
      const policy = body as Policy | undefined;

      if (!id && method === "GET") return run(() => listPolicies(ctx));
      if (!id && method === "POST" && isExitNodePolicy(policy))
        return run(async () =>
          expandPolicy(
            store.createPolicy(policy as Policy),
            await fetchGroups(ctx),
          ),
        );
      if (id && method === "GET" && ownsPolicy(id))
        return run(async () =>
          expandPolicy(store.getPolicy(id), await fetchGroups(ctx)),
        );
      if (
        id &&
        method === "PUT" &&
        (ownsPolicy(id) || isExitNodePolicy(policy))
      )
        return run(() => updatePolicy(ctx, id, policy as Policy));
      if (id && method === "DELETE" && ownsPolicy(id))
        return run(() => deletePolicy(ctx, id));
      return undefined;
    },
  };
}

export type ExitNodesMock = ReturnType<typeof createExitNodesMock>;

/** The mock the dashboard uses, unless NEXT_PUBLIC_EXIT_NODES_MOCK is "off". */
export const exitNodesMock = createExitNodesMock(
  undefined,
  process.env.NEXT_PUBLIC_EXIT_NODES_MOCK !== "off",
);
