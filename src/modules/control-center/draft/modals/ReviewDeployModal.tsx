import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { Accordion } from "@components/Accordion";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { notify } from "@components/Notification";
import {
  ExternalLinkIcon,
  GitPullRequestArrowIcon,
  ListTodoIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@utils/helpers";
import {
  CHANGE_DEPLOY_ORDER,
  DraftChange,
  getChangeIssue,
  hasBlockingIssues,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDeployChangeset } from "@/modules/control-center/hooks/useDeployChangeset";
import { useRemoveChange } from "@/modules/control-center/hooks/useRemoveChange";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { ChangeAccordionItem } from "@/modules/control-center/draft/changeset/ChangeAccordionItem";
import { getPlaceholderSetupKey } from "@/modules/control-center/utils/helpers";
import { LiveData } from "@/modules/control-center/utils/changeset-request";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after every change was applied successfully.
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
  const reactFlow = useReactFlow();

  const live: LiveData = useMemo(
    () => ({ policies, groups, networks, networkResources, draftChanges: changes }),
    [policies, groups, networks, networkResources, changes],
  );

  // Freeze the live snapshot the rows render against from the moment a deploy
  // starts until the changeset is reset. Without this, the SWR mutate that runs
  // as changes land recomputes each row's diff mid-deploy — a deployed row's
  // diff collapses to empty and briefly flips to the "Modify" kind badge, which
  // reads as the changeset changing under the user. Cleared once the changeset
  // empties (after a successful deploy's modal closes).
  const frozenLive = useRef<LiveData | null>(null);
  if (isDeploying && !frozenLive.current) frozenLive.current = live;
  useEffect(() => {
    if (changes.length === 0) frozenLive.current = null;
  }, [changes.length]);
  const renderLive = frozenLive.current ?? live;

  // Remount the accordion (re-opening the first change) only when the modal
  // OPENS — never on close, which would otherwise flash the first accordion
  // open during the dialog's fade-out.
  const openKeyRef = useRef(0);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) openKeyRef.current += 1;
  wasOpenRef.current = open;

  // install-peer rows are user steps, not API calls — Deploy needs at least
  // one actual change.
  const deployableCount = changes.filter(
    (c) => c.type !== "install-peer",
  ).length;
  const installedCount = changes.filter(
    (c) => c.type === "install-peer" && !!c.installedPeerId,
  ).length;
  // Hard issues BLOCK deploy (a change that can't be POSTed / completed
  // as-is, e.g. a resource with no network or an uninstalled placeholder peer).
  const hasIssues = hasBlockingIssues(changes);

  // Order mirrors the real deploy sequence (CHANGE_DEPLOY_ORDER) so the list
  // always tells the truth — a network is listed before the resources that
  // depend on it, deletes last, etc. install-peer is a manual prerequisite
  // (not part of the deploy order), so those rows sort to the very top.
  const sortedChanges = useMemo(() => {
    const rank = (c: DraftChange) =>
      c.type === "install-peer" ? -1 : CHANGE_DEPLOY_ORDER.indexOf(c.type);
    return [...changes].sort((a, b) => rank(a) - rank(b));
  }, [changes]);

  // Resolve a change's blocking issue: open the same fix the canvas offers —
  // the network picker for a no-network resource, the install/setup modal for
  // a placeholder peer. Review & Deploy stays OPEN behind the fix (it stacks
  // on top) so the user returns to the changeset when it closes.
  const resolveIssue = useCallback(
    (change: DraftChange) => {
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
      reactFlow,
    ],
  );

  // Count ALL pending rows (install steps included) so the header matches the
  // "Review & Deploy" button badge and the number of rows shown below.
  const totalCount = changes.length;
  const description = useMemo(
    () =>
      `Review ${totalCount} change${
        totalCount !== 1 ? "s" : ""
      } before deploying to your network.`,
    [totalCount],
  );

  const handleDeploy = async () => {
    const ok = await deploy();
    // A partial failure keeps the modal open: the deployed items keep their
    // green check and are skipped on retry, so the user can fix the cause and
    // hit Deploy again to finish.
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
    // Everything deployed. Switch to live first (the canvas rebuilds behind
    // the modal), then close. Reset the changeset only AFTER the modal has
    // closed, so the deployed items stay visible (green checks) and the modal
    // never flashes an empty "no changes" state on the way out.
    onDeployed();
    onOpenChange(false);
    window.setTimeout(() => clearChanges(), 400);
  };

  return (
    <Modal
      open={open}
      // Can't dismiss (outside click / Esc) mid-deploy — the run must finish.
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

        {/* min-w-0: this is a grid item of ModalContent; without it the item
            grows to the code's min-content width and overflows the modal. */}
        <div className={"px-8 pb-6 border-t border-nb-gray-910 pt-6 min-w-0"}>
          {/* No inner scroll box — the modal auto-sizes to its content and the
              overlay scrolls when it's taller than the viewport. */}
          {changes.length === 0 ? (
            <div className={"text-sm text-nb-gray-400 text-center py-10"}>
              No pending changes.
            </div>
          ) : (
            <Accordion
              // Remount so the FIRST change (as sorted: install-peer / server
              // / agent rows lead the list) opens by default on each (re)open.
              key={openKeyRef.current}
              type={"multiple"}
              defaultValue={sortedChanges[0] ? [sortedChanges[0].id] : []}
              className={"flex flex-col gap-3"}
            >
              {sortedChanges.map((change) => (
                <ChangeAccordionItem
                  key={change.id}
                  change={change}
                  live={renderLive}
                  onDiscard={() => removeWithCascade(change)}
                  previewRemove={previewRemove}
                  onResolveIssue={
                    getChangeIssue(change) ? resolveIssue : undefined
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
            {/* Tooltip only while blocked by issues — explains the disabled
                Deploy (a disabled button emits no hover, so the wrapper div
                that FullTooltip adds carries it). */}
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
                {/* While deploying, show only a centered spinner but keep the
                    button's width: the label stays in place, just invisible. */}
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
