import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import { merge } from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { Policy, PolicyRuleResource, Protocol } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { usePostureCheck } from "@/modules/posture-checks/usePostureCheck";
import {
  buildEditablePolicyRules,
  buildGroupCreatePayload,
  buildInitialRules,
  buildPolicyPayload,
  createDefaultRule,
  getPostureChecksWithoutId,
  getUniqueRuleGroups,
  mergeCreatedPostureChecks,
  parsePortsToStrings,
  RuleState,
} from "@/modules/access-control/useAccessControl.helpers";
export type { RuleState } from "@/modules/access-control/useAccessControl.helpers";

type Props = {
  policy?: Policy;
  postureCheckTemplates?: PostureCheck[];
  onSuccess?: (policy: Policy) => void;
  initialDestinationGroups?: Group[] | string[];
  initialName?: string;
  initialDescription?: string;
  initialProtocol?: Protocol;
  initialPorts?: number[];
  initialDestinationResource?: PolicyRuleResource;
};

export const useAccessControl = ({
  policy,
  postureCheckTemplates,
  initialDestinationGroups,
  initialName,
  initialDescription,
  onSuccess,
  initialProtocol,
  initialPorts,
  initialDestinationResource,
}: Props = {}) => {
  const { data: allPostureChecks, isLoading: isPostureChecksLoading } =
    useFetchApi<PostureCheck[]>("/posture-checks");
  const { groups } = useGroups();

  const [postureChecks, setPostureChecks] = useState<PostureCheck[]>([]);
  const postureChecksLoaded = useRef(false);

  const initialPostureChecks = useMemo(() => {
    const foundChecks =
      allPostureChecks?.filter((check) => {
        if (policy?.source_posture_checks) {
          if (
            policy.source_posture_checks.every((id) => typeof id === "string")
          ) {
            let checks = policy.source_posture_checks as string[];
            return checks.includes(check.id);
          } else {
            return policy.source_posture_checks.some((c) => {
              let policyCheck = c as PostureCheck;
              return policyCheck.id === check.id;
            });
          }
        }
        return false;
      }) || [];

    const templates = postureCheckTemplates || [];

    return merge(foundChecks, templates);
  }, [policy, allPostureChecks, postureCheckTemplates]);

  useEffect(() => {
    if (postureChecksLoaded.current) return;

    if (initialPostureChecks.length > 0) {
      postureChecksLoaded.current = true;
      setPostureChecks(initialPostureChecks);
    }
  }, [initialPostureChecks]);

  const { updatePolicy } = usePolicies();

  const initRules = useMemo((): RuleState[] => {
    return buildInitialRules({
      policy,
      groups,
      initialDestinationGroups,
      initialProtocol,
      initialPorts,
      initialDestinationResource,
    });
  }, [
    policy,
    groups,
    initialDestinationGroups,
    initialProtocol,
    initialPorts,
    initialDestinationResource,
  ]);

  const [rules, setRules] = useState<RuleState[]>(initRules);
  const initializedRulesKey = useRef<string | undefined>(
    policy || !groups ? undefined : "__create__",
  );

  useEffect(() => {
    if (!groups) return;

    const key = policy?.id ?? "__create__";
    if (initializedRulesKey.current === key) return;

    initializedRulesKey.current = key;
    setRules(initRules);
  }, [policy, groups, initRules]);

  const [policyName, setPolicyName] = useState(
    policy?.name || initialName || "",
  );
  const [policyDescription, setPolicyDescription] = useState(
    policy?.description || initialDescription || "",
  );
  const [policyEnabled, setPolicyEnabled] = useState<boolean>(
    policy?.enabled ?? true,
  );

  // 当 policy 变化时更新 policyName 和 policyDescription
  useEffect(() => {
    if (policy) {
      setPolicyName(policy.name || initialName || "");
      setPolicyDescription(policy.description || initialDescription || "");
      setPolicyEnabled(policy.enabled ?? true);
    }
  }, [policy, initialName, initialDescription]);
  const { mutate } = useSWRConfig();

  const policyRequest = useApiCall<Policy>("/policies");
  const groupRequest = useApiCall<Group>("/groups");

  const addRule = () => {
    setRules((prev) => [...prev, createDefaultRule()]);
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) return;
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<RuleState>) => {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...updates } : rule)),
    );
  };

  const { updateOrCreateAndNotify: checkToCreate } = usePostureCheck({});
  const createPostureChecksWithoutID = async () => {
    const checks = getPostureChecksWithoutId(postureChecks);
    const createChecks = checks.map((check) => checkToCreate(check));
    return Promise.all(createChecks);
  };

  const getPolicyData = () => {
    return {
      name: policyName,
      description: policyDescription,
      enabled: policyEnabled,
      source_posture_checks: postureChecks,
      rules: buildEditablePolicyRules(rules),
    } as Policy;
  };

  const submit = async () => {
    const uniqueGroups = getUniqueRuleGroups(rules);

    const groupPromises = uniqueGroups.map(async (group) => {
      if (group.id) {
        return group;
      }
      return groupRequest.post(buildGroupCreatePayload(group));
    });

    const groups = await Promise.all(groupPromises).then((groups) => {
      mutate("/groups");
      return groups;
    });

    let hasError = false;
    let allChecks = postureChecks;
    await createPostureChecksWithoutID()
      .then((checks) => {
        allChecks = mergeCreatedPostureChecks(
          postureChecks,
          checks as PostureCheck[],
        );
      })
      .catch((e) => {
        hasError = true;
        console.error(e);
      });
    if (hasError) return;

    const policyObj = buildPolicyPayload({
      name: policyName,
      description: policyDescription,
      enabled: policyEnabled,
      postureChecks: allChecks,
      rules,
      groups,
    });

    if (policy && policy?.id !== undefined) {
      updatePolicy(
        policy,
        policyObj,
        (p) => {
          mutate("/policies");
          onSuccess && onSuccess(p);
        },
        "The policy was successfully saved",
      );
    } else {
      notify({
        title: "Create Access Control Policy",
        description: "Policy was created successfully.",
        loadingMessage: "Creating your policy...",
        promise: policyRequest.post(policyObj).then((policy) => {
          mutate("/policies");
          onSuccess && onSuccess(policy);
        }),
      });
    }
  };

  const hasPortSupport = (p: Protocol) => p === "tcp" || p === "udp";

  return {
    rules,
    addRule,
    removeRule,
    updateRule,
    policyName,
    setPolicyName,
    policyDescription,
    setPolicyDescription,
    policyEnabled,
    setPolicyEnabled,
    postureChecks,
    setPostureChecks,
    submit,
    getPolicyData,
    isPostureChecksLoading,
    hasPortSupport,
  } as const;
};

export { parsePortsToStrings };
