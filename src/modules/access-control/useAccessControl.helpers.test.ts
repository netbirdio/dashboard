import assert from "node:assert/strict";
import test from "node:test";
import type { Group } from "../../interfaces/Group";
import type { PostureCheck } from "../../interfaces/PostureCheck";
import {
  buildPolicyRulePayload,
  createDefaultRule,
  mergeCreatedPostureChecks,
  type RuleState,
} from "./useAccessControl.helpers";

const groups: Group[] = [
  { id: "group-source", name: "Source" },
  { id: "group-destination", name: "Destination" },
  { id: "group-ssh", name: "SSH Users" },
];

const rule = (overrides: Partial<RuleState>): RuleState => ({
  ...createDefaultRule(),
  sources: [groups[0]],
  destinations: [groups[1]],
  protocol: "tcp",
  ports: [80],
  ...overrides,
});

test("buildPolicyRulePayload swaps sources and destinations for outbound rules", () => {
  const payload = buildPolicyRulePayload(
    rule({
      direction: "out",
      bidirectional: false,
    }),
    groups,
  );

  assert.equal(payload.bidirectional, false);
  assert.deepEqual(payload.sources, ["group-destination"]);
  assert.deepEqual(payload.destinations, ["group-source"]);
});

test("buildPolicyRulePayload omits group destinations when a destination resource is set", () => {
  const payload = buildPolicyRulePayload(
    rule({
      destinationResource: { id: "resource-1", type: "host" },
    }),
    groups,
  );

  assert.deepEqual(payload.sources, ["group-source"]);
  assert.equal(payload.destinations, undefined);
  assert.deepEqual(payload.destinationResource, {
    id: "resource-1",
    type: "host",
  });
});

test("buildPolicyRulePayload omits group sources when a source resource is set", () => {
  const payload = buildPolicyRulePayload(
    rule({
      sourceResource: { id: "peer-1", type: "peer" },
    }),
    groups,
  );

  assert.equal(payload.sources, undefined);
  assert.deepEqual(payload.destinations, ["group-destination"]);
  assert.deepEqual(payload.sourceResource, { id: "peer-1", type: "peer" });
});

test("buildPolicyRulePayload maps SSH authorized groups by group name and forces SSH ports", () => {
  const payload = buildPolicyRulePayload(
    rule({
      protocol: "netbird-ssh",
      ports: [1000],
      port_ranges: [{ start: 2000, end: 3000 }],
      sshAccessType: "limited",
      sshAuthorizedGroups: {
        "SSH Users": ["root", "ubuntu"],
        Missing: ["nobody"],
      },
    }),
    groups,
  );

  assert.deepEqual(payload.ports, ["22"]);
  assert.deepEqual(payload.port_ranges, []);
  assert.deepEqual(payload.authorized_groups, {
    "group-ssh": ["root", "ubuntu"],
  });
});

test("buildPolicyRulePayload clears SSH authorized groups for full SSH access", () => {
  const payload = buildPolicyRulePayload(
    rule({
      protocol: "netbird-ssh",
      sshAccessType: "full",
      sshAuthorizedGroups: {
        "SSH Users": ["root"],
      },
    }),
    groups,
  );

  assert.deepEqual(payload.authorized_groups, {});
});

test("mergeCreatedPostureChecks replaces no-id checks with the created checks", () => {
  const existing = { id: "check-existing", name: "Existing" } as PostureCheck;
  const draft = { name: "Draft" } as PostureCheck;
  const created = { id: "check-created", name: "Draft" } as PostureCheck;

  assert.deepEqual(mergeCreatedPostureChecks([existing, draft], [created]), [
    existing,
    created,
  ]);
});
