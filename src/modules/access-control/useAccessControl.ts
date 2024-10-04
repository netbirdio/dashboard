import { notify } from "@components/Notification";
import { Direction } from "@components/ui/PolicyDirection";
import useFetchApi, { useApiCall } from "@utils/api";
import { merge, uniqBy } from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Policy, Protocol } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { usePostureCheck } from "@/modules/posture-checks/usePostureCheck";

type Props = {
  policy?: Policy;
  postureCheckTemplates?: PostureCheck[];
  onSuccess?: (policy: Policy) => void;
};

// TODO add reducer

export const useAccessControl = ({
  policy,
  postureCheckTemplates,
  onSuccess,
}: Props = {}) => {
  const { data: allPostureChecks, isLoading: isPostureChecksLoading } =
    useFetchApi<PostureCheck[]>("/posture-checks");

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
  const firstRule = policy?.rules ? policy.rules[0] : undefined;

  const [enabled, setEnabled] = useState<boolean>(policy?.enabled ?? true);

  const [ports, setPorts] = useState<number[]>(() => {
    if (!firstRule) return [];
    if (firstRule.ports == undefined) return [];
    if (firstRule.ports.length > 0) {
      return firstRule.ports.map((p) => Number(p));
    }
    return [];
  });

  const [protocol, setProtocol] = useState<Protocol>(
    firstRule ? firstRule.protocol : "all",
  );
  const [direction, setDirection] = useState<Direction>(() => {
    if (firstRule && firstRule?.bidirectional) return "bi";
    if (firstRule && firstRule?.bidirectional == false) return "in";
    return "bi";
  });
  const [name, setName] = useState(policy?.name || "");
  const [description, setDescription] = useState(policy?.description || "");
  const { mutate } = useSWRConfig();

  const policyRequest = useApiCall<Policy>("/policies");

  const [
    sourceGroups,
    setSourceGroups,
    { getGroupsToUpdate: getSourceGroupsToUpdate },
  ] = useGroupHelper({
    initial: firstRule ? (firstRule.sources as Group[]) : [],
  });

  const [
    destinationGroups,
    setDestinationGroups,
    { getGroupsToUpdate: getDestinationGroupsToUpdate },
  ] = useGroupHelper({
    initial: firstRule ? (firstRule.destinations as Group[]) : [],
  });

  const { updateOrCreateAndNotify: checkToCreate } = usePostureCheck({});
  const createPostureChecksWithoutID = async () => {
    const checks = postureChecks.filter(
      (check) => check?.id === undefined || check?.id === "",
    );
    const createChecks = checks.map((check) => checkToCreate(check));
    return Promise.all(createChecks);
  };

  const getPolicyData = () => {
    let sources = sourceGroups;
    let destinations = destinationGroups;
    if (direction == "out") {
      const tmp = sourceGroups;
      sources = destinations;
      destinations = tmp;
    }

    return {
      name,
      description,
      enabled,
      source_posture_checks: postureChecks,
      rules: [
        {
          bidirectional: direction == "bi",
          description,
          name,
          sources: sources,
          destinations: destinations,
          action: "accept",
          protocol,
          enabled,
          ports: ports.length > 0 ? ports.map((p) => p.toString()) : undefined,
        },
      ],
    } as Policy;
  };

  const submit = async () => {
    const g1 = getSourceGroupsToUpdate();
    const g2 = getDestinationGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g1, ...g2], "name").map(
      (g) => g.promise,
    );
    const groups = await Promise.all(
      createOrUpdateGroups.map((call) => call()),
    );

    // Create posture checks if they don't have an ID
    let hasError = false;
    let allChecks = postureChecks;
    await createPostureChecksWithoutID()
      .then((checks) => {
        allChecks = [...allChecks, ...(checks as PostureCheck[])];
      })
      .catch((e) => {
        hasError = true;
        console.error(e);
      });
    if (hasError) return;

    let sources = sourceGroups
      .map((g) => {
        const find = groups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];
    let destinations = destinationGroups
      .map((g) => {
        const find = groups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];

    if (direction == "out") {
      const tmp = sources;
      sources = destinations;
      destinations = tmp;
    }

    const policyObj = {
      name,
      description,
      enabled,
      source_posture_checks: postureChecks
        ? postureChecks.map((c) => c.id)
        : undefined,
      rules: [
        {
          bidirectional: direction == "bi",
          description,
          name,
          action: "accept",
          protocol,
          enabled,
          sources,
          destinations,
          ports: ports.length > 0 ? ports.map((p) => p.toString()) : undefined,
        },
      ],
    } as Policy;

    if (policy && policy?.id !== undefined) {
      updatePolicy(
        policy,
        policyObj,
        () => {
          mutate("/policies");
          onSuccess && onSuccess(policy);
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

  const portAndDirectionDisabled = protocol == "icmp" || protocol == "all";

  return {
    protocol,
    setProtocol,
    direction,
    setDirection,
    name,
    setName,
    description,
    setDescription,
    enabled,
    setEnabled,
    ports,
    setPorts,
    sourceGroups,
    setSourceGroups,
    destinationGroups,
    setDestinationGroups,
    postureChecks,
    setPostureChecks,
    submit,
    getPolicyData,
    portAndDirectionDisabled,
    isPostureChecksLoading,
  } as const;
};
