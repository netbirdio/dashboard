import { orderBy } from "lodash";
import type { Direction } from "../../components/ui/PolicyDirection";
import type { Group } from "../../interfaces/Group";
import type {
  AuthorizedGroups,
  Policy,
  PolicyRule,
  PolicyRuleResource,
  PortRange,
  Protocol,
} from "../../interfaces/Policy";
import type { PostureCheck } from "../../interfaces/PostureCheck";

export type RuleState = {
  id?: string;
  name?: string;
  description?: string;
  enabled: boolean;
  ports: number[];
  port_ranges: PortRange[];
  protocol: Protocol;
  direction: Direction;
  bidirectional: boolean;
  action: "accept" | "drop";
  sources: Group[];
  destinations: Group[];
  sourceResource?: PolicyRuleResource;
  destinationResource?: PolicyRuleResource;
  sshAccessType: "full" | "limited";
  sshAuthorizedGroups?: AuthorizedGroups;
};

type LegacyPolicyFields = {
  rule_id?: string;
  sources?: Group[] | string[] | null;
  destinations?: Group[] | string[] | null;
  protocol?: Protocol;
  ports?: string[];
  port_ranges?: PortRange[];
  bidirectional?: boolean;
  sourceResource?: PolicyRuleResource;
  destinationResource?: PolicyRuleResource;
  authorized_groups?: AuthorizedGroups;
};

export type InitialRuleInput = {
  policy?: Policy;
  groups?: Group[];
  initialDestinationGroups?: Group[] | string[];
  initialProtocol?: Protocol;
  initialPorts?: number[];
  initialDestinationResource?: PolicyRuleResource;
};

export type PolicyPayloadInput = {
  name: string;
  description: string;
  enabled: boolean;
  postureChecks: PostureCheck[];
  rules: RuleState[];
  groups: Group[];
};

export const createDefaultRule = (): RuleState => ({
  enabled: true,
  ports: [],
  port_ranges: [],
  protocol: "all",
  direction: "bi",
  bidirectional: true,
  action: "accept",
  sources: [],
  destinations: [],
  sshAccessType: "full",
  sshAuthorizedGroups: {},
});

export const resolveGroup = (
  group: Group | string | null | undefined,
  groups?: Group[],
): Group | null => {
  if (!group) return null;
  if (typeof group === "object" && "id" in group) return group;
  if (typeof group === "string") {
    return groups?.find((g) => g.id === group) ?? null;
  }
  return null;
};

export const resolveGroups = (
  values: Group[] | string[] | null | undefined,
  groups?: Group[],
): Group[] => {
  if (!Array.isArray(values)) return [];
  return values
    .map((group) => resolveGroup(group, groups))
    .filter(Boolean) as Group[];
};

export const convertRuleToState = (
  rule: PolicyRule,
  groups: Group[],
): RuleState => {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    enabled: rule.enabled ?? true,
    ports: rule.ports?.map((p) => Number(p)) ?? [],
    port_ranges: rule.port_ranges ?? [],
    protocol: rule.protocol ?? "all",
    direction: rule.bidirectional ? "bi" : "in",
    bidirectional: rule.bidirectional ?? true,
    action: (rule.action || "accept") as "accept" | "drop",
    sources: resolveGroups(rule.sources, groups),
    destinations: resolveGroups(rule.destinations, groups),
    sourceResource: rule.sourceResource,
    destinationResource: rule.destinationResource,
    sshAccessType:
      rule.authorized_groups && Object.keys(rule.authorized_groups).length > 0
        ? "limited"
        : "full",
    sshAuthorizedGroups: rule.authorized_groups,
  };
};

const hasLegacyRuleFields = (
  policy?: Policy,
): policy is Policy & LegacyPolicyFields => {
  if (!policy) return false;
  const legacy = policy as Policy & LegacyPolicyFields;
  return !!(legacy.sources || legacy.destinations || legacy.protocol);
};

export const buildInitialRules = ({
  policy,
  groups,
  initialDestinationGroups,
  initialProtocol,
  initialPorts,
  initialDestinationResource,
}: InitialRuleInput): RuleState[] => {
  if (policy?.rules && policy.rules.length > 0) {
    if (!groups) return [createDefaultRule()];
    return policy.rules.map((rule) => convertRuleToState(rule, groups));
  }

  if (hasLegacyRuleFields(policy)) {
    if (!groups) return [createDefaultRule()];
    const direction: Direction = policy.bidirectional ? "bi" : "in";

    return [
      {
        ...createDefaultRule(),
        id: policy.rule_id,
        name: policy.name,
        description: policy.description,
        protocol: policy.protocol ?? "all",
        ports: policy.ports?.map((p) => Number(p)) ?? [],
        port_ranges: policy.port_ranges ?? [],
        sources: resolveGroups(policy.sources, groups),
        destinations: resolveGroups(policy.destinations, groups),
        direction,
        bidirectional: policy.bidirectional ?? true,
        sourceResource: policy.sourceResource,
        destinationResource: policy.destinationResource,
        sshAccessType:
          policy.authorized_groups &&
          Object.keys(policy.authorized_groups).length > 0
            ? "limited"
            : "full",
        sshAuthorizedGroups: policy.authorized_groups,
      },
    ];
  }

  if (
    initialDestinationGroups ||
    initialProtocol ||
    initialPorts ||
    initialDestinationResource
  ) {
    return [
      {
        ...createDefaultRule(),
        protocol: initialProtocol ?? "all",
        ports: initialPorts ?? [],
        destinations: resolveGroups(initialDestinationGroups, groups),
        destinationResource: initialDestinationResource,
      },
    ];
  }

  return [createDefaultRule()];
};

export const getUniqueRuleGroups = (rules: RuleState[]): Group[] => {
  const groupsByName = new Map<string, Group>();
  rules
    .flatMap((rule) => [...rule.sources, ...rule.destinations])
    .forEach((group) => {
      if (group?.name && !groupsByName.has(group.name)) {
        groupsByName.set(group.name, group);
      }
    });
  return [...groupsByName.values()];
};

export const getGroupPeerIds = (group: Group): string[] => {
  return (
    group.peers
      ?.map((peer) => (typeof peer === "string" ? peer : peer.id))
      .filter((peer): peer is string => !!peer) ?? []
  );
};

export const buildGroupCreatePayload = (group: Group): Group => {
  return {
    name: group.name,
    peers: getGroupPeerIds(group),
    resources: group.resources,
  };
};

export const parseAccessControlPorts = (
  ports: number[],
  portRanges: PortRange[],
) => {
  const hasRanges = portRanges.length > 0;
  const hasPorts = ports.length > 0;
  if (!hasPorts && !hasRanges) return [undefined, undefined] as const;
  if (!hasRanges) return [ports.map(String), undefined] as const;
  if (!hasPorts) return [undefined, portRanges] as const;

  const portRangesFromPorts = ports.map((port) => ({
    start: port,
    end: port,
  })) as PortRange[];

  const allRanges = [...portRanges, ...portRangesFromPorts];
  return [undefined, allRanges] as const;
};

const resolveRuleGroupIds = (ruleGroups: Group[], groups: Group[]) => {
  return ruleGroups
    .map((ruleGroup) => groups.find((group) => group.name === ruleGroup.name))
    .map((group) => group?.id)
    .filter((id): id is string => !!id);
};

const buildSshAuthorizedGroups = (
  rule: RuleState,
  groups: Group[],
): AuthorizedGroups => {
  const isFullAccess =
    rule.sshAccessType === "full" ||
    !rule.sshAuthorizedGroups ||
    Object.keys(rule.sshAuthorizedGroups).length === 0;

  if (isFullAccess) return {};

  return Object.entries(rule.sshAuthorizedGroups ?? {}).reduce(
    (acc, [groupName, usernames]) => {
      const group = groups.find((group) => group.name === groupName);
      if (group?.id) acc[group.id] = usernames;
      return acc;
    },
    {} as AuthorizedGroups,
  );
};

export const buildPolicyRulePayload = (
  rule: RuleState,
  groups: Group[],
): PolicyRule => {
  let sources = resolveRuleGroupIds(rule.sources, groups);
  let destinations = resolveRuleGroupIds(rule.destinations, groups);

  if (rule.direction === "out") {
    [sources, destinations] = [destinations, sources];
  }

  let [ports, portRanges] = parseAccessControlPorts(
    rule.ports,
    rule.port_ranges,
  );

  let authorizedGroups: AuthorizedGroups | undefined;
  if (rule.protocol === "netbird-ssh") {
    ports = ["22"];
    portRanges = [];
    authorizedGroups = buildSshAuthorizedGroups(rule, groups);
  }

  return {
    id: rule.id,
    bidirectional: rule.direction === "bi",
    description: rule.description,
    name: rule.name,
    action: rule.action,
    protocol: rule.protocol,
    enabled: rule.enabled,
    sources: rule.sourceResource ? undefined : sources,
    destinations: rule.destinationResource ? undefined : destinations,
    sourceResource: rule.sourceResource || undefined,
    destinationResource: rule.destinationResource || undefined,
    ports,
    port_ranges: portRanges,
    authorized_groups: authorizedGroups,
  } as PolicyRule;
};

export const buildPolicyRulesPayload = (
  rules: RuleState[],
  groups: Group[],
): PolicyRule[] => rules.map((rule) => buildPolicyRulePayload(rule, groups));

export const buildEditablePolicyRule = (rule: RuleState): PolicyRule => {
  let sources = rule.sources;
  let destinations = rule.destinations;
  if (rule.direction === "out") {
    [sources, destinations] = [destinations, sources];
  }

  const [ports, portRanges] = parseAccessControlPorts(
    rule.ports,
    rule.port_ranges,
  );

  return {
    id: rule.id,
    bidirectional: rule.direction === "bi",
    description: rule.description,
    name: rule.name,
    sources: rule.sourceResource ? undefined : sources,
    destinations: rule.destinationResource ? undefined : destinations,
    sourceResource: rule.sourceResource || undefined,
    destinationResource: rule.destinationResource || undefined,
    action: rule.action,
    protocol: rule.protocol,
    enabled: rule.enabled,
    ports,
    port_ranges: portRanges,
    authorized_groups: rule.sshAuthorizedGroups,
  } as PolicyRule;
};

export const buildEditablePolicyRules = (rules: RuleState[]): PolicyRule[] =>
  rules.map(buildEditablePolicyRule);

export const getPostureChecksWithoutId = (
  postureChecks: PostureCheck[],
): PostureCheck[] =>
  postureChecks.filter((check) => check?.id === undefined || check?.id === "");

export const mergeCreatedPostureChecks = (
  postureChecks: PostureCheck[],
  createdChecks: PostureCheck[],
): PostureCheck[] => [
  ...postureChecks.filter((check) => !!check.id),
  ...createdChecks,
];

export const serializePostureCheckIds = (
  postureChecks?: PostureCheck[],
): string[] | undefined => postureChecks?.map((check) => check.id);

export const buildPolicyPayload = ({
  name,
  description,
  enabled,
  postureChecks,
  rules,
  groups,
}: PolicyPayloadInput): Policy =>
  ({
    name,
    description,
    enabled,
    source_posture_checks: serializePostureCheckIds(postureChecks),
    rules: buildPolicyRulesPayload(rules, groups),
  }) as Policy;

export const parsePortsToStrings = (rule?: PolicyRule): string[] => {
  if (!rule) return [];
  const ports = rule?.ports ?? [];
  const portRanges =
    rule?.port_ranges?.map((r) => {
      if (r.start === r.end) return `${r.start}`;
      return `${r.start}-${r.end}`;
    }) ?? [];
  return orderBy(
    [...portRanges, ...ports],
    [(p) => Number(p.split("-")[0])],
    ["asc"],
  );
};
