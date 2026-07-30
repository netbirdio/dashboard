import React, { useCallback, useMemo, useRef } from "react";
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
import {
  ExternalLinkIcon,
  GitPullRequestArrowIcon,
  ListTodoIcon,
} from "lucide-react";
import {
  DraftChange,
  getChangeIssue,
  hasBlockingIssues,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDeployChangeset } from "@/modules/control-center/hooks/useDeployChangeset";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { ChangeAccordionItem } from "@/modules/control-center/draft/changeset/ChangeAccordionItem";
import { FieldLiveData } from "@/modules/control-center/utils/changeset-fields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after every change was applied successfully.
  onDeployed: () => void;
};

export const ReviewDeployModal = ({ open, onOpenChange, onDeployed }: Props) => {
  const { changes, removeChange } = useDraftChangeset();
  const { deploy, isDeploying } = useDeployChangeset();
  const { policies, groups, networks, networkResources, peers } =
    useControlCenterData();
  const { setResourceNetworkPicker, setInstallModal, setUserDeviceModal } =
    useDraftMode();
  const reactFlow = useReactFlow();

  const live: FieldLiveData = useMemo(
    () => ({ policies, groups, networks, networkResources, peers }),
    [policies, groups, networks, networkResources, peers],
  );

  // Visual view is hidden for now — every change shows its Diff.
  const view = "code";

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
  // Hard issues BLOCK deploy (a change that can't be POSTed / completed
  // as-is, e.g. a resource with no network or an uninstalled placeholder peer).
  const hasIssues = hasBlockingIssues(changes);

  // Sort priority: install steps first, then other blocking issues, then the
  // rest — so the actions the user must take are up top (stable within a rank).
  const sortedChanges = useMemo(() => {
    const rank = (c: DraftChange) =>
      c.type === "install-peer" ? 0 : getChangeIssue(c) ? 1 : 2;
    return [...changes].sort((a, b) => rank(a) - rank(b));
  }, [changes]);

  // Resolve a change's blocking issue: open the same fix the canvas offers —
  // the network picker for a no-network resource, the install/setup modal for
  // a placeholder peer. Closes this modal so the fix isn't stacked on top.
  const resolveIssue = useCallback(
    (change: DraftChange) => {
      if (change.type === "create-resource") {
        onOpenChange(false);
        setResourceNetworkPicker({ nodeId: `resource-${change.clientId}` });
        return;
      }
      if (change.type === "install-peer") {
        const nodeId = `peer-${change.clientId}`;
        onOpenChange(false);
        if (change.kind === "user-device") {
          setUserDeviceModal({ nodeId, name: change.name });
          return;
        }
        const node = reactFlow.getNodes().find((n) => n.id === nodeId);
        const setupKey = (node?.data as { setupKey?: string })?.setupKey;
        setInstallModal({
          isUserDevice: false,
          setupKey,
          placeholderKind: change.kind,
          nodeId,
        });
      }
    },
    [
      onOpenChange,
      setResourceNetworkPicker,
      setInstallModal,
      setUserDeviceModal,
      reactFlow,
    ],
  );

  const description = useMemo(
    () =>
      `Review ${deployableCount} change${
        deployableCount !== 1 ? "s" : ""
      } before deploying to your network.`,
    [deployableCount],
  );

  const handleDeploy = async () => {
    const ok = await deploy();
    // A partial failure keeps the modal open: applied changes were already
    // removed from the list, so what remains is exactly what still needs to
    // deploy — the user can fix the cause and hit Deploy again to resume.
    if (!ok) return;
    onOpenChange(false);
    onDeployed();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
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
              // Remount when the modal (re)opens so the first change is
              // expanded by default every time (but not on close — see above).
              key={openKeyRef.current}
              type={"multiple"}
              defaultValue={sortedChanges[0] ? [sortedChanges[0].id] : []}
              className={"flex flex-col gap-3"}
            >
              {sortedChanges.map((change) => (
                <ChangeAccordionItem
                  key={change.id}
                  change={change}
                  live={live}
                  view={view}
                  onDiscard={() => removeChange(change.id)}
                  onResolveIssue={
                    getChangeIssue(change) ? resolveIssue : undefined
                  }
                  disabled={isDeploying}
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
                disabled={deployableCount === 0 || isDeploying || hasIssues}
                onClick={handleDeploy}
                data-testid={"cc-deploy"}
              >
                <ListTodoIcon size={16} />
                {isDeploying ? "Deploying..." : "Approve & Deploy"}
              </Button>
            </FullTooltip>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
