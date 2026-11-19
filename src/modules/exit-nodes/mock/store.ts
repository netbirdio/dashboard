import { cloneDeep } from "lodash";
import { ExitNode, ExitNodeRequest } from "@/interfaces/ExitNode";
import { Group } from "@/interfaces/Group";
import { Policy, PolicyRule } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import {
  ExitNodeValidationError,
  isExitNodePolicy,
  validateExitNodeRequest,
} from "@/modules/exit-nodes/exitNodeHelpers";

/** Rejection shape of src/utils/api.tsx, so callers handle mock errors like real ones. */
export type MockError = ExitNodeValidationError;

const notFound = (what: string): MockError => ({
  code: 404,
  message: `${what} not found`,
});

/** Ids of policies the mock created itself; any other id it holds is a real one it shadows. */
export const MOCK_POLICY_ID_PREFIX = "exit-node-policy-";

const toId = (value: Group | string | PostureCheck) =>
  typeof value === "string" ? value : value.id ?? "";

/**
 * Policies are kept the way the API stores them: groups and posture checks
 * as ids. The dashboard sends rules it read back (groups as objects) when it
 * toggles a policy, so they are normalised here.
 */
const normalizePolicy = (policy: Policy, id: string): Policy => ({
  ...cloneDeep(policy),
  id,
  source_posture_checks: (policy.source_posture_checks ?? [])
    .map((c) => toId(c as PostureCheck | string))
    .filter(Boolean),
  rules: (policy.rules ?? []).map((rule) => ({
    ...cloneDeep(rule),
    sources: rule.sourceResource
      ? null
      : (rule.sources ?? []).map((s) => toId(s as Group | string)),
    destinations: rule.destinationResource
      ? null
      : (rule.destinations ?? []).map((d) => toId(d as Group | string)),
  })),
});

/**
 * In-memory stand-in for the exit node API that does not exist yet.
 *
 * It owns the exit nodes and the access control policies whose destination
 * is an exit node: the real /policies API rejects `type: "exit_node"`, so
 * those policies have to live here too (see handler.ts).
 */
export class ExitNodesMockStore {
  private exitNodes: ExitNode[] = [];
  private policies: Policy[] = [];
  private seq = 0;

  constructor(initial?: { exitNodes?: ExitNode[]; policies?: Policy[] }) {
    if (initial) this.load(initial);
  }

  /** Replaces the whole state, e.g. with seed data. */
  load({
    exitNodes = [],
    policies = [],
  }: {
    exitNodes?: ExitNode[];
    policies?: Policy[];
  }) {
    this.exitNodes = cloneDeep(exitNodes);
    this.policies = policies.map((p) =>
      normalizePolicy(p, p.id ?? this.nextPolicyId()),
    );
  }

  private nextExitNodeId() {
    this.seq += 1;
    return `exit-node-${this.seq}`;
  }

  private nextPolicyId() {
    this.seq += 1;
    return `${MOCK_POLICY_ID_PREFIX}${this.seq}`;
  }

  /* ---------- exit nodes ---------- */

  listExitNodes(): ExitNode[] {
    return cloneDeep(this.exitNodes);
  }

  getExitNode(id: string): ExitNode {
    const node = this.exitNodes.find((n) => n.id === id);
    if (!node) throw notFound("exit node");
    return cloneDeep(node);
  }

  createExitNode(request: ExitNodeRequest): ExitNode {
    const error = validateExitNodeRequest(request, this.exitNodes);
    if (error) throw error;
    const node = this.fromRequest(this.nextExitNodeId(), request);
    this.exitNodes.push(node);
    return cloneDeep(node);
  }

  updateExitNode(id: string, request: ExitNodeRequest): ExitNode {
    const index = this.exitNodes.findIndex((n) => n.id === id);
    if (index === -1) throw notFound("exit node");
    const error = validateExitNodeRequest(request, this.exitNodes, id);
    if (error) throw error;
    const node = this.fromRequest(id, request);
    this.exitNodes[index] = node;
    return cloneDeep(node);
  }

  /** Deletes the exit node together with the policies that target it. */
  deleteExitNode(id: string) {
    if (!this.exitNodes.some((n) => n.id === id)) throw notFound("exit node");
    this.exitNodes = this.exitNodes.filter((n) => n.id !== id);
    this.policies = this.policies.filter((p) => !isExitNodePolicy(p, id));
  }

  private fromRequest(id: string, request: ExitNodeRequest): ExitNode {
    return {
      id,
      name: request.name.trim(),
      description: request.description ?? "",
      enabled: request.enabled ?? true,
      auto_apply: request.auto_apply ?? true,
      peers: (request.peers ?? []).map((p) => ({
        peer_id: p.peer_id,
        metric: Number(p.metric),
        enabled: p.enabled ?? true,
      })),
    };
  }

  /* ---------- policies targeting exit nodes ---------- */

  hasPolicy(id: string) {
    return this.policies.some((p) => p.id === id);
  }

  listPolicies(): Policy[] {
    return cloneDeep(this.policies);
  }

  getPolicy(id: string): Policy {
    const policy = this.policies.find((p) => p.id === id);
    if (!policy) throw notFound("policy");
    return cloneDeep(policy);
  }

  createPolicy(policy: Policy): Policy {
    this.assertExitNodesExist(policy.rules);
    const created = normalizePolicy(policy, this.nextPolicyId());
    this.policies.push(created);
    return cloneDeep(created);
  }

  /** Updates a mock policy, or starts shadowing a real one that now targets an exit node. */
  upsertPolicy(id: string, policy: Policy): Policy {
    this.assertExitNodesExist(policy.rules);
    const updated = normalizePolicy(policy, id);
    const index = this.policies.findIndex((p) => p.id === id);
    if (index === -1) this.policies.push(updated);
    else this.policies[index] = updated;
    return cloneDeep(updated);
  }

  deletePolicy(id: string) {
    if (!this.hasPolicy(id)) throw notFound("policy");
    this.policies = this.policies.filter((p) => p.id !== id);
  }

  private assertExitNodesExist(rules: PolicyRule[] = []) {
    rules.forEach((rule) => {
      const target = rule.destinationResource;
      if (target?.type !== "exit_node") return;
      if (!this.exitNodes.some((n) => n.id === target.id))
        throw {
          code: 422,
          message: "destination exit node does not exist",
        } as MockError;
    });
  }
}
