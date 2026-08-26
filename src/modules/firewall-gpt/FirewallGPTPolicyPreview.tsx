import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { IconCircleX, IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { motion } from "framer-motion";
import { concat, merge } from "lodash";
import { BrickWall, Edit, Loader2, PlusCircle } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { AccessControlUpdateModal } from "@/modules/access-control/AccessControlModal";
import { FirewallGptResponseMessage } from "@/modules/firewall-gpt/FirewallGPTResponseMessage";
import PostureCheckModal from "@/modules/posture-checks/modal/PostureCheckModal";
import { PostureCheckChecksCell } from "@/modules/posture-checks/table/cells/PostureCheckChecksCell";
import { usePostureCheck } from "@/modules/posture-checks/usePostureCheck";

type Props = {
  policy: Policy;
  initialPostureCheck?: PostureCheck;
  sourceGroupsToBeCreated?: Group[];
  destinationGroupsToBeCreated?: Group[];
  onSuccess?: (policy: Policy) => void;
};
export const FirewallGptPolicyPreview = ({
  policy,
  initialPostureCheck,
  sourceGroupsToBeCreated,
  destinationGroupsToBeCreated,
  onSuccess,
}: Props) => {
  const {
    createOrUpdate: createOrUpdateGroups,
    reset: resetGroups,
    addDropdownOptions,
    groups,
  } = useGroups();
  const [sourceGroups, setSourceGroups] = useState<Group[]>([]);
  const [destinationGroups, setDestinationGroups] = useState<Group[]>([]);
  const [editPolicyModal, setEditPolicyModal] = useState(false);
  const [policyToBeCreated, setPolicyToBeCreated] = useState(policy);
  const [postureChecks, setPostureChecks] = useState<PostureCheck[]>(
    initialPostureCheck ? [initialPostureCheck] : [],
  );
  const initial = useRef(false);
  const [selectedCheck, setSelectedCheck] = useState<PostureCheck>();

  const hasAnyPostureCheck = useMemo(() => {
    return postureChecks?.some((check) => {
      return check?.checks && Object.keys(check.checks).length > 0;
    });
  }, [postureChecks]);

  const rule = useMemo(() => {
    try {
      return policyToBeCreated.rules[0];
    } catch (error) {
      return undefined;
    }
  }, [policyToBeCreated]);

  useEffect(() => {
    if (rule && !initial.current && groups) {
      let sources = rule.sources as Group[];
      let destinations = rule.destinations as Group[];

      // Add peers to sources and destinations
      sources = sources.map((sourceGroup) => {
        const peers = groups?.find((group) => group.name === sourceGroup.name)
          ?.peers;
        return {
          ...sourceGroup,
          peers: peers ?? [],
          peers_count: peers?.length ?? 0,
        } as Group;
      });

      destinations = destinations.map((destinationGroup) => {
        const peers = groups?.find(
          (group) => group.name === destinationGroup.name,
        )?.peers;
        return {
          ...destinationGroup,
          peers: peers ?? [],
          peers_count: peers?.length ?? 0,
        } as Group;
      });

      // Add peers count to the groups
      let sourcesToBeCreated = sourceGroupsToBeCreated?.map((g) => {
        return {
          ...g,
          peers_count: g?.peers?.length ?? 0,
        } as Group;
      });

      let destinationsToBeCreated = destinationGroupsToBeCreated?.map((g) => {
        return {
          ...g,
          peers_count: g?.peers?.length ?? 0,
        } as Group;
      });

      // Merge the groups
      if (sourceGroupsToBeCreated) {
        sources = merge(sources, sourcesToBeCreated);
      }
      if (destinationGroupsToBeCreated) {
        destinations = merge(destinations, destinationsToBeCreated);
      }

      // Set the groups of the dropdown
      setSourceGroups(sources);
      setDestinationGroups(destinations);

      // Add the groups to the dropdown options
      const currentGroups = concat(sources, destinations);
      currentGroups && addDropdownOptions(currentGroups);
      initial.current = true;
    }
  }, [rule, groups]);

  useEffect(() => {
    try {
      setPolicyToBeCreated((prev) => {
        return {
          ...prev,
          rules: [
            {
              ...prev.rules[0],
              sources: sourceGroups,
              destinations: destinationGroups,
            },
          ],
          source_posture_checks:
            postureChecks
              ?.map((check) => check?.id)
              .filter((v) => v !== undefined) ?? undefined,
        };
      });
    } catch (error) {
      console.log(error);
    }
  }, [sourceGroups, destinationGroups, postureChecks]);

  const memoizedPolicy = useMemo(() => {
    return policyToBeCreated;
  }, [policyToBeCreated]);

  const [editPostureCheckModal, setEditPostureCheckModal] = useState(false);

  const [createGroupsLoading, setCreateGroupsLoading] = useState(false);
  const [createPostureChecksLoading, setCreatePostureChecksLoading] =
    useState(false);
  const [createPolicyLoading, setCreatePolicyLoading] = useState(false);

  const isLoading = useMemo(() => {
    return (
      createGroupsLoading || createPostureChecksLoading || createPolicyLoading
    );
  }, [createGroupsLoading, createPostureChecksLoading, createPolicyLoading]);

  const { updateOrCreate: createOrUpdatePostureCheck } = usePostureCheck();
  const { createPolicy: createPolicyRequest } = usePolicies();
  const { mutate } = useSWRConfig();

  const createPolicy = async () => {
    /**
     * Create group if not id, otherwise update the peers of the group
     */
    const sourceCalls = sourceGroups.map(
      (group) => () => createOrUpdateGroups(group),
    );
    const destinationCalls = destinationGroups.map(
      (group) => () => createOrUpdateGroups(group),
    );
    setCreateGroupsLoading(true);
    const sources = await Promise.all(sourceCalls.map((c) => c()));
    const destinations = await Promise.all(destinationCalls.map((c) => c()));
    setCreateGroupsLoading(false);

    /**
     * Create or update posture checks
     */
    setCreatePostureChecksLoading(true);
    const postureCheckCalls = postureChecks?.map(
      (c) => () => createOrUpdatePostureCheck(c),
    );
    Promise.all(postureCheckCalls.map((c) => c()))
      .then((checks) => {
        /**
         * Create policy
         */
        let createdPolicy: Policy | undefined = undefined;
        setCreatePolicyLoading(true);

        const policyObj = {
          ...policyToBeCreated,
          rules: [
            {
              ...policyToBeCreated.rules[0],
              sources: sources ? sources.map((s) => s.id) : undefined,
              destinations: destinations
                ? destinations.map((d) => d.id)
                : undefined,
            },
          ],
          source_posture_checks: checks ? checks.map((c) => c.id) : undefined,
        } as Policy;

        notify({
          title: "NetBird's Smart Firewall",
          preventSuccessToast: true,
          description: `Policy ${policyObj?.name} was successfully created.`,
          promise: createPolicyRequest(policyObj)
            .then((p) => {
              createdPolicy = p;
              mutate("/policies");
              onSuccess?.(createdPolicy);
            })
            .finally(() => {
              setCreatePolicyLoading(false);
            }),
          loadingMessage: "Creating policy...",
        });
      })
      .catch((e) => {
        notify({
          title: `Posture Check failed to create.`,
          description: `${e.message}`,
          icon: <IconCircleX size={24} />,
          backgroundColor: "bg-red-500",
          duration: 10000,
        });
      })
      .finally(() => {
        setCreatePostureChecksLoading(false);
      });
  };

  return (
    <>
      <FirewallGptResponseMessage policy={policyToBeCreated} />
      <motion.div
        className={"flex w-full gap-4"}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        initial={{
          opacity: 0,
          scale: 0.99,
        }}
        transition={{
          delay: 0.3,
        }}
      >
        <div
          className={
            "text-xs text-netbird/90 bg-netbird/10 border border-netbird/30 py-3 px-4 w-full rounded-md"
          }
        >
          <IconInfoCircle
            size={15}
            className={"inline-flex mr-2 -top-[1px] relative"}
          />
          Please review new groups, assigned peers, policy settings and posture
          checks before creating the policy
        </div>
      </motion.div>
      <motion.div
        className={"block"}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        initial={{
          opacity: 0,
          scale: 0.98,
        }}
        transition={{
          delay: 0.4,
        }}
      >
        <div className={"flex gap-2"}>
          <div className={"w-full"}>
            <PeerGroupSelector
              popoverWidth={500}
              onChange={setSourceGroups}
              values={sourceGroups}
              saveGroupAssignments={false}
              disableInlineRemoveGroup={true}
              showPeerCount={true}
            />
          </div>

          <div className={"w-1/2 flex items-center justify-center relative"}>
            <motion.div
              animate={{
                width: "100%",
              }}
              initial={{
                width: "0%",
              }}
              className={
                "absolute w-full h-[2px] bg-netbird/100 rounded-full left-0"
              }
            ></motion.div>
            <motion.div
              className={"absolute w-full flex items-center justify-center"}
            >
              <div
                className={
                  "relative z-10 bg-nb-gray-950 px-2 flex flex-col items-center justify-center"
                }
              >
                <BrickWall size={20} className={"text-nb-gray-300"} />
                <span
                  className={cn(
                    "text-xs mt-2.5 font-normal text-nb-gray-300 uppercase bg-nb-gray-920 rounded-md  hover:bg-nb-gray-900/50 cursor-default transition-all",
                    "cursor-help group",
                  )}
                >
                  <FullTooltip
                    interactive={false}
                    content={
                      <div className={"text-nb-gray-300 text-xs"}>
                        {!rule?.ports?.length ? (
                          "Allow connections through all ports"
                        ) : (
                          <>
                            Allow connections through port
                            <div
                              className={"inline-flex flex-wrap gap-1.5 ml-1.5"}
                            >
                              {rule?.ports?.map((port) => {
                                return (
                                  <span
                                    key={port}
                                    className={
                                      "bg-nb-gray-800 px-2 py-1 rounded font-medium text-xs"
                                    }
                                  >
                                    {port}
                                  </span>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    }
                    className={"block"}
                  >
                    <span
                      className={
                        "flex items-center justify-center px-3 leading-[0] py-1.5 font-medium text-nb-gray-300 group-hover:text-nb-gray-200 transition-all"
                      }
                    >
                      {rule?.protocol}
                      <IconInfoCircle
                        size={12}
                        className={cn("ml-1 transition-all", "")}
                      />
                    </span>
                  </FullTooltip>
                </span>
              </div>
            </motion.div>
          </div>

          <div className={"w-full"}>
            <PeerGroupSelector
              saveGroupAssignments={false}
              popoverWidth={500}
              onChange={setDestinationGroups}
              values={destinationGroups}
              disableInlineRemoveGroup={true}
              showPeerCount={true}
            />
          </div>
        </div>
      </motion.div>

      {postureChecks && hasAnyPostureCheck && (
        <motion.div
          className={"flex items-center justify-center w-full gap-4"}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          initial={{
            opacity: 0,
            scale: 0.98,
          }}
          transition={{
            delay: 0.6,
          }}
        >
          {postureChecks.map((check) => {
            return (
              <div className={"mt-5"} key={check?.id ?? check.name}>
                <PostureCheckChecksCell
                  check={check}
                  className={"cursor-pointer"}
                  onClick={() => {
                    setSelectedCheck(check);
                    setEditPostureCheckModal(true);
                  }}
                >
                  <span className={"text-[12px] pr-3 text-nb-gray-300"}>
                    {check?.name ?? "Posture Check"}
                  </span>
                </PostureCheckChecksCell>
              </div>
            );
          })}
        </motion.div>
      )}

      <motion.div
        className={"flex w-full gap-4 mt-6"}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        initial={{
          opacity: 0,
          scale: 0.98,
        }}
        transition={{
          duration: 0.5,
          delay: 0.8,
        }}
      >
        <Button
          variant={"secondary"}
          className={"w-full"}
          size={"sm"}
          disabled={isLoading}
          onClick={() => setEditPolicyModal(true)}
        >
          <Edit size={15} />
          Edit Policy
        </Button>
        <Button
          variant={"primary"}
          className={cn("w-full", isLoading && "pointer-events-none")}
          size={"sm"}
          onClick={createPolicy}
        >
          {isLoading ? (
            <Loader2 size={15} className={cn("animate-spin")} />
          ) : (
            <PlusCircle size={15} />
          )}
          Create Policy
        </Button>
      </motion.div>

      {editPostureCheckModal && selectedCheck && (
        <PostureCheckModal
          open={editPostureCheckModal}
          onOpenChange={setEditPostureCheckModal}
          onSuccess={(check) => {
            setEditPostureCheckModal(false);
            setPostureChecks((prev) => {
              return prev.map((prevCheck) => {
                if (prevCheck?.id === check?.id) {
                  return check;
                }
                return prevCheck;
              });
            });
          }}
          useSave={false}
          postureCheck={selectedCheck}
        />
      )}

      {editPolicyModal && (
        <AccessControlUpdateModal
          policy={memoizedPolicy}
          useSave={false}
          allowEditPeers={true}
          open={editPolicyModal}
          onSuccess={(policy) => {
            try {
              setSourceGroups(policy.rules[0].sources as Group[]);
              setDestinationGroups(policy.rules[0].destinations as Group[]);
              setPolicyToBeCreated(policy);
              setPostureChecks(policy.source_posture_checks as PostureCheck[]);
            } catch (error) {
              console.log(error);
            }
          }}
          onOpenChange={setEditPolicyModal}
          postureCheckTemplates={postureChecks}
        />
      )}
    </>
  );
};
