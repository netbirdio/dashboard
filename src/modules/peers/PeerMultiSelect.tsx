import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { IconX } from "@tabler/icons-react";
import { RowSelectionState } from "@tanstack/react-table";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import { uniq, uniqBy } from "lodash";
import {
  CheckCircle,
  CirclePlus,
  FolderGit2,
  Loader2,
  MonitorSmartphoneIcon,
  RedoDot,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Group, GroupPeer } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  selectedPeers?: RowSelectionState;
  onCanceled?: () => void;
};
export const PeerMultiSelect = ({ selectedPeers = {}, onCanceled }: Props) => {
  return (
    <AnimatePresence>
      {Object.keys(selectedPeers).length > 0 && (
        <PeerGroupMassAssignmentContent
          selectedPeers={selectedPeers}
          onCanceled={onCanceled}
        />
      )}
    </AnimatePresence>
  );
};

const PeerGroupMassAssignmentContent = ({
  selectedPeers = {},
  onCanceled,
}: Props) => {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { peers } = usePeers();

  const groupCall = useApiCall<Group>("/groups");
  const getAllGroups = useApiCall<Group[]>("/groups").get;
  const peerCall = useApiCall<Peer>("/peers", true);

  const [showGroupAssignment, setShowGroupAssignment] = useState(false);
  const groupAssignmentRef = React.useRef<HTMLDivElement>(null);

  const [selectedGroups, setSelectedGroups, { getAllGroupCalls }] =
    useGroupHelper({
      initial: [],
    });
  const [replaceAllGroups, setReplaceAllGroups] = useState(false);

  const peerCount = useMemo(
    () => Object.keys(selectedPeers).length,
    [selectedPeers],
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isLoadingOrSuccess = isLoading || isSuccess;

  useEffect(() => {
    const timeout = setTimeout(() => {
      isSuccess && setIsSuccess(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [isSuccess]);

  const addGroupsToPeers = async () => {
    if (replaceAllGroups) {
      const choice = await confirm({
        title: t("peerMultiSelect.overwriteGroupsTitle"),
        description: t("peerMultiSelect.overwriteGroupsDescription", {
          count: peerCount,
        }),
        confirmText: t("peerMultiSelect.overwrite"),
        cancelText: t("common.cancel"),
        type: "warning",
      });
      if (!choice) return;
    }
    setIsSuccess(false);
    setIsLoading(true);

    try {
      const allGroups = await getAllGroups();
      const selectedGroupCalls = getAllGroupCalls();
      const selectedPeerIDs = Object.keys(selectedPeers);
      let currentSelectedGroups = await Promise.all(selectedGroupCalls);
      currentSelectedGroups = currentSelectedGroups
        .map((g) => {
          let findGroup = allGroups?.find((group) => group.id === g.id);
          if (findGroup) return findGroup;
          return g;
        })
        .filter((g) => g !== undefined);
      let selectedPeerGroups: Group[] = [];

      if (replaceAllGroups) {
        // Get all the groups of the selected peers
        selectedPeerGroups = uniqBy(
          Object.keys(selectedPeers)
            .map((id) => {
              return peers?.find((p) => p.id === id)?.groups ?? [];
            })
            .flat()
            .filter((g) => g !== undefined),
          "id",
        );

        // Find the groups
        selectedPeerGroups =
          allGroups?.filter((group) =>
            selectedPeerGroups.find((g) => g.id === group.id),
          ) ?? [];

        // Remove the peers from the groups
        selectedPeerGroups = selectedPeerGroups.map((group) => {
          let previousPeers = group?.peers as GroupPeer[];
          let previousPeerIDs = previousPeers?.map((p) => p.id);
          previousPeerIDs = previousPeerIDs
            .filter((id) => !selectedPeerIDs.includes(id))
            .filter((id) => id !== "" && id !== null && id !== undefined);

          return {
            ...group,
            peers: previousPeerIDs,
          };
        }) as Group[];
      }

      // Add selected peers to the selected groups
      currentSelectedGroups = currentSelectedGroups
        .map((group) => {
          let previousPeers = (group?.peers as GroupPeer[]) ?? [];
          let previousPeerIDs = previousPeers.map((p) => p.id);

          let peers = uniq(
            [...previousPeerIDs, ...selectedPeerIDs].filter(
              (p) => p !== "" && p !== null && p !== undefined,
            ),
          );
          return {
            ...group,
            peers,
          };
        })
        .filter((g) => g !== undefined) as Group[];

      // Merge the groups from the peers and the selected groups and remove duplicates
      currentSelectedGroups = uniqBy(
        [...currentSelectedGroups, ...selectedPeerGroups],
        "id",
      );

      // Remove 'All' group if it exists
      currentSelectedGroups = currentSelectedGroups.filter(
        (group) => group.name !== "All",
      );

      // Create the update calls for each group
      let updateGroupCalls = () =>
        Promise.all(
          currentSelectedGroups.map((group) => {
            return groupCall.put(
              {
                name: group.name,
                peers: group.peers,
                resources: group.resources,
              },
              "/" + group.id,
            );
          }),
        );

      notify({
        title: t("peerMultiSelect.assignGroupsTitle"),
        description: t("peerMultiSelect.assignGroupsDescription"),
        promise: updateGroupCalls()
          .then(() => {
            if (currentSelectedGroups.length > 0) {
              mutate("/groups");
              mutate("/peers");
              setIsSuccess(true);
            }
          })
          .finally(() => {
            setIsLoading(false);
          }),
        loadingMessage: t("peerMultiSelect.updatingGroups"),
      });
    } catch (e) {
      setIsLoading(false);
    }
  };

  const deleteAllPeers = async () => {
    const choice = await confirm({
      title: t("peerMultiSelect.deletePeersTitle", {
        count: peerCount,
        peerWord: peerCount > 1 ? t("peers.title") : t("peers.title").replace(/s$/, ""),
      }),
      description: t("peerMultiSelect.deletePeersDescription"),
      confirmText: t("peerMultiSelect.deleteAll"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;

    let batchDeleteCalls = () =>
      Object.keys(selectedPeers).map((id) => {
        return peerCall.del({}, `/${id}`);
      });

    notify({
      title: t("peerMultiSelect.deletePeersNotifyTitle"),
      description: t("peerMultiSelect.deletePeersNotifyDescription"),
      promise: Promise.all(batchDeleteCalls()).then(() => {
        mutate("/peers");
        onCanceled?.();
      }),
      loadingMessage: t("peerMultiSelect.deletingPeers"),
    });
  };

  return (
    <div className={"fixed -bottom-16 z-50 w-full left-0 pointer-events-none"}>
      <motion.div
        exit={{
          y: showGroupAssignment
            ? (groupAssignmentRef?.current?.clientHeight ?? 0) + 55 || 370
            : 100,
        }}
      >
        <AnimatePresence>
          {showGroupAssignment && (
            <motion.div
              ref={groupAssignmentRef}
              animate={{ y: 0 }}
              initial={{ y: 100 }}
              exit={{
                y: (groupAssignmentRef?.current?.clientHeight ?? 0) + 55 || 370,
              }}
              transition={{
                type: "spring",
                stiffness: 276,
                damping: 25,
                duration: 0.35,
              }}
              className={
                "max-w-xl mx-auto rounded-t-lg -bottom-14 relative z-[49] flex gap-4 flex-col px-6 pt-6 pb-20 bg-nb-gray-920 border border-nb-gray-900 shadow-2xl border-b-0 overflow-hidden pointer-events-auto"
              }
            >
              <AnimatePresence>
                {isLoadingOrSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      duration: 0.25,
                    }}
                    className={
                      "absolute w-full h-full flex items-center justify-center bg-nb-gray-920/70  z-50 top-0 left-0"
                    }
                  >
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        duration: 0.25,
                      }}
                      className={
                        "flex items-center justify-center gap-2 mb-14 font-normal text-nb-gray-100 text-sm"
                      }
                    >
                      {isLoading && (
                        <>
                          <Loader2 size={14} className={"animate-spin"} />
                          <span>{t("peerMultiSelect.assigningGroups")}</span>
                        </>
                      )}
                      {!isLoading && isSuccess && (
                        <>
                          <CheckCircle size={14} className={"text-green-400"} />
                          <span>{t("peerMultiSelect.groupsAssigned")}</span>
                        </>
                      )}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div>
                <Label>{t("peerMultiSelect.assignGroupsLabel")}</Label>
                <HelpText>
                  {t("peerMultiSelect.assignGroupsHelp")}
                </HelpText>
                <PeerGroupSelector
                  onChange={setSelectedGroups}
                  values={selectedGroups}
                />
              </div>

              <FancyToggleSwitch
                value={replaceAllGroups}
                onChange={setReplaceAllGroups}
                label={
                  <div className={"flex gap-2"}>
                    <RedoDot size={14} />
                    {t("peerMultiSelect.overwriteExistingGroups")}
                  </div>
                }
                helpText={
                  <div>
                    {t("peerMultiSelect.overwriteExistingGroupsHelp")}
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          <motion.div
            animate={{ y: 0 }}
            initial={{ y: 100 }}
            exit={{ y: showGroupAssignment ? 370 : 100 }}
            transition={{
              type: "spring",
              stiffness: 270,
              damping: 25,
              duration: 0.35,
            }}
            className={cn(
              "max-w-xl mx-auto border relative z-[50] bg-nb-gray-800 border-nb-gray-900 shadow-2xl border-b-0 overflow-hidden pointer-events-auto",
              !showGroupAssignment && "rounded-t-lg",
            )}
          >
            <AnimatePresence mode={"popLayout"}>
              <div
                className={
                  "flex gap-2 items-center text-sm px-6 pt-3.5 pb-20 bg-nb-gray-920/90 text-nb-gray-200 justify-between"
                }
              >
                <div className={"flex gap-2 items-center"}>
                  <MonitorSmartphoneIcon size={16} className={""} />
                  <span>
                    <span className={"font-medium text-white"}>
                      {peerCount}
                    </span>{" "}
                    {t("peerMultiSelect.peersSelected", { count: peerCount })}
                  </span>
                </div>
                <div className={"flex gap-2 items-center"}>
                  {!showGroupAssignment ? (
                    <>
                      <FullTooltip
                        content={
                          <span className={"text-xs"}>{t("peerMultiSelect.assignGroupsLabel")}</span>
                        }
                      >
                        <Button
                          onClick={() =>
                            setShowGroupAssignment(!showGroupAssignment)
                          }
                          variant={"default-outline"}
                          size={"xs"}
                          className={"!h-9 !w-9"}
                          disabled={
                            !permission.peers.read || !permission.groups.update
                          }
                        >
                          <FolderGit2 size={16} className={"shrink-0"} />
                        </Button>
                      </FullTooltip>
                      <FullTooltip
                        content={<span className={"text-xs"}>{t("peerMultiSelect.deleteAll")}</span>}
                      >
                        <Button
                          variant={"danger-outline"}
                          size={"xs"}
                          className={"!h-9 !w-9"}
                          onClick={deleteAllPeers}
                          disabled={!permission.peers.delete}
                        >
                          <Trash2 size={16} className={"shrink-0"} />
                        </Button>
                      </FullTooltip>
                      <FullTooltip
                        content={<span className={"text-xs"}>{t("common.cancel")}</span>}
                      >
                        <Button
                          onClick={onCanceled}
                          variant={"default-outline"}
                          size={"xs"}
                          className={"!h-9 !w-9"}
                        >
                          <IconX size={16} className={"shrink-0"} />
                        </Button>
                      </FullTooltip>
                    </>
                  ) : (
                    <>
                      <Button
                        size={"xs"}
                        variant={"secondary"}
                        className={"!h-9 !px-3.5"}
                        onClick={onCanceled}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        size={"xs"}
                        variant={"primary"}
                        className={"!h-9 !px-3.5"}
                        disabled={
                          selectedGroups.length == 0 ||
                          Object.keys(selectedPeers).length == 0 ||
                          isLoadingOrSuccess
                        }
                        onClick={addGroupsToPeers}
                      >
                        {replaceAllGroups ? (
                          <RedoDot size={14} />
                        ) : (
                          <CirclePlus size={14} />
                        )}
                        {replaceAllGroups ? t("peerMultiSelect.overwriteGroups") : t("peerMultiSelect.addGroups")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
