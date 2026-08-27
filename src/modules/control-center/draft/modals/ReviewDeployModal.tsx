import { Accordion } from "@components/Accordion";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { useReactFlow } from "@xyflow/react";
import {
  ExternalLinkIcon,
  GitPullRequestArrowIcon,
  ListTodoIcon,
  Loader2,
} from "lucide-react";
import React, { useCallback, useMemo, useRef } from "react";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { ChangeAccordionItem } from "@/modules/control-center/draft/changeset/ChangeAccordionItem";
import {
  CHANGE_DEPLOY_ORDER,
  DraftChange,
  getChangeIssue,
  hasBlockingIssues,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDeployChangeset } from "@/modules/control-center/hooks/useDeployChangeset";
import { useRemoveChange } from "@/modules/control-center/hooks/useRemoveChange";
import { LiveData } from "@/modules/control-center/utils/changeset-request";
import { getPlaceholderSetupKey } from "@/modules/control-center/utils/helpers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
};

export const ReviewDeployModal = ({ open, onOpenChange, onDeployed }: Props) => {
  const { changes, clearChanges } = useDraftChangeset();
  const { removeWithCascade, previewRemove } = useRemoveChange();
  const { deploy, isDeploying, deployStatus } = useDeployChangeset();
  const { policies, groups, networks, networkResources } =
    useControlCenterData();
  const { setResourceNetworkPicker, setInstallModal, setUserDeviceModal } =
    useDraftMode();
  const { setSelectedPolicy, setPolicyModalOpen } = useControlCenterPolicy();
  const reactFlow = useReactFlow();

  const live: LiveData = useMemo(
    () => ({ policies, groups, networks, networkResources, draftChanges: changes }),
    [policies, groups, networks, networkResources, changes],
  );

  // Freeze the snapshot the rows render against during a deploy: the SWR mutate
  // that runs as changes land would recompute each row's diff and flip its badge.
  // Released when the RUN ends, not when the changeset empties: the deploy's own
  // `finally` revalidation is what makes the snapshot stale. Derived in render on purpose.
  const frozenLive = useRef<LiveData | null>(null);
  if (!isDeploying) frozenLive.current = null;
  else if (!frozenLive.current) frozenLive.current = live;
  const renderLive = frozenLive.current ?? live;

  // Remount the accordion only when the modal OPENS; doing it on close flashes
  // the first accordion open during the fade-out.
  const openKeyRef = useRef(0);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) openKeyRef.current += 1;
  wasOpenRef.current = open;

  // install-peer rows are user steps, not API calls.
  const deployableCount = changes.filter(
    (c) => c.type !== "install-peer",
  ).length;
  const installedCount = changes.filter(
    (c) => c.type === "install-peer" && !!c.installedPeerId,
  ).length;
  const hasIssues = hasBlockingIssues(changes);

  // Order mirrors CHANGE_DEPLOY_ORDER so the list tells the truth. install-peer
  // is a manual prerequisite, so those rows sort to the very top.
  const sortedChanges = useMemo(() => {
    const rank = (c: DraftChange) =>
      c.type === "install-peer" ? -1 : CHANGE_DEPLOY_ORDER.indexOf(c.type);
    return [...changes].sort((a, b) => rank(a) - rank(b));
  }, [changes]);

  // Opens the same fix the canvas offers. Review & Deploy stays open behind it,
  // so the user returns to the changeset when the fix closes.
  const resolveIssue = useCallback(
    (change: DraftChange) => {
      if (change.type === "create-policy") {
        // Same pair the policy node's own Edit item uses.
        setSelectedPolicy(change.clientId);
        setPolicyModalOpen(true);
        return;
      }
      if (change.type === "update-policy") {
        setSelectedPolicy(change.policyId);
        setPolicyModalOpen(true);
        return;
      }
      if (change.type === "create-resource") {
        setResourceNetworkPicker({ nodeId: `resource-${change.clientId}` });
        return;
      }
      if (change.type === "install-peer") {
        const nodeId = `peer-${change.clientId}`;
        if (change.kind === "user-device") {
          setUserDeviceModal({ nodeId, name: change.name });
          return;
        }
        const setupKey = getPlaceholderSetupKey(
          reactFlow.getNodes(),
          change.clientId,
        );
        setInstallModal({
          isUserDevice: false,
          setupKey,
          placeholderKind: change.kind,
          nodeId,
        });
      }
    },
    [
      setResourceNetworkPicker,
      setInstallModal,
      setUserDeviceModal,
      setSelectedPolicy,
      setPolicyModalOpen,
      reactFlow,
    ],
  );

  // Counts install steps too, so the header matches the button badge.
  const totalCount = changes.length;
  const description = `Review ${totalCount} change${
    totalCount !== 1 ? "s" : ""
  } before deploying to your network.`;

  const handleDeploy = async () => {
    const ok = await deploy();
    // A partial failure keeps the modal open; deployed items are skipped on
    // retry.
    if (!ok) return;
    notify({
      title: "Deploy complete",
      description:
        deployableCount > 0
          ? `Your ${deployableCount} change${
              deployableCount !== 1 ? "s were" : " was"
            } applied to your network.`
          : "Your installed peers are already live — no API changes were needed.",
    });
    // Reset the changeset only AFTER the modal closed, or it flashes an empty
    // "no changes" state on the way out.
    onDeployed();
    onOpenChange(false);
    window.setTimeout(() => clearChanges(), 400);
  };

  return (
    <Modal
      open={open}
      // Can't dismiss mid-deploy: the run must finish.
      onOpenChange={(o) => {
        if (isDeploying && !o) return;
        onOpenChange(o);
      }}
    >
      <ModalContent maxWidthClass={"max-w-[45rem]"}>
        <ModalHeader
          icon={<GitPullRequestArrowIcon size={18} className={"text-netbird"} />}
          title={"Review & Deploy"}
          description={description}
          color={"netbird"}
        />

        {/* min-w-0: as a grid item of ModalContent it would otherwise grow to
            the code's min-content width and overflow the modal. */}
        <div className={"px-8 pb-6 border-t border-nb-gray-910 pt-6 min-w-0"}>
          {changes.length === 0 ? (
            <div className={"text-sm text-nb-gray-400 text-center py-10"}>
              No pending changes.
            </div>
          ) : (
            <Accordion
              key={openKeyRef.current}
              type={"multiple"}
              defaultValue={sortedChanges[0] ? [sortedChanges[0].id] : []}
              className={"flex flex-col gap-3"}
            >
              {sortedChanges.map((change) => (
                <ChangeAccordionItem
                  key={change.id}
                  change={change}
                  changes={changes}
                  live={renderLive}
                  onDiscard={() => removeWithCascade(change)}
                  previewRemove={previewRemove}
                  onResolveIssue={
                    // An issue about a group deleted elsewhere has no fix on this row.
                    getChangeIssue(change, changes)?.resolvable
                      ? resolveIssue
                      : undefined
                  }
                  disabled={isDeploying}
                  status={deployStatus[change.id]}
                />
              ))}
            </Accordion>
          )}
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                // TODO: point at the Control Center / Review & Deploy docs
                // page once it exists.
                href={"https://docs.netbird.io/"}
                target={"_blank"}
              >
                Review & Deploy
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} disabled={isDeploying}>
                Cancel
              </Button>
            </ModalClose>
            {/* A disabled button emits no hover, so the wrapper div FullTooltip
                adds carries the tooltip. */}
            <FullTooltip
              content={"Resolve issues before deploying"}
              disabled={!hasIssues}
              side={"top"}
            >
              <Button
                variant={"primary"}
                disabled={
                  (deployableCount === 0 && installedCount === 0) ||
                  isDeploying ||
                  hasIssues
                }
                onClick={handleDeploy}
                data-testid={"cc-deploy"}
                className={"relative"}
              >
                {/* Hiding the label instead of removing it keeps the button's
                    width while the spinner shows. */}
                <span
                  className={cn(
                    "flex items-center gap-2",
                    isDeploying && "invisible",
                  )}
                >
                  <ListTodoIcon size={16} />
                  Approve & Deploy
                </span>
                {isDeploying && (
                  <span
                    className={
                      "absolute inset-0 flex items-center justify-center"
                    }
                  >
                    <Loader2 size={16} className={"animate-spin"} />
                  </span>
                )}
              </Button>
            </FullTooltip>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
