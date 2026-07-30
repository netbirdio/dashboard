import React, { useMemo, useRef } from "react";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { Accordion } from "@components/Accordion";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import {
  ExternalLinkIcon,
  GitPullRequestArrowIcon,
  ListTodoIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  getCanvasWarnings,
  getDraftWarnings,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDeployChangeset } from "@/modules/control-center/hooks/useDeployChangeset";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useStructuralNodes } from "@/modules/control-center/utils/helpers";
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
  const nodes = useStructuralNodes();
  const warnings = useMemo(
    () => [...getDraftWarnings(changes), ...getCanvasWarnings(nodes, changes)],
    [changes, nodes],
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
          {warnings.length > 0 && (
            <div
              className={
                "rounded-md border border-amber-500/25 bg-amber-900/20 px-3.5 py-2.5 mb-3 flex flex-col gap-1.5"
              }
            >
              {warnings.map((warning) => (
                <div
                  key={warning}
                  className={"flex items-start gap-2 text-xs text-amber-300"}
                >
                  <TriangleAlertIcon size={13} className={"shrink-0 mt-[1px]"} />
                  {warning}
                </div>
              ))}
            </div>
          )}

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
              defaultValue={changes[0] ? [changes[0].id] : []}
              className={"flex flex-col gap-3"}
            >
              {changes.map((change) => (
                <ChangeAccordionItem
                  key={change.id}
                  change={change}
                  live={live}
                  view={view}
                  onDiscard={() => removeChange(change.id)}
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
            <Button
              variant={"primary"}
              disabled={deployableCount === 0 || isDeploying}
              onClick={handleDeploy}
              data-testid={"cc-deploy"}
            >
              <ListTodoIcon size={16} />
              {isDeploying ? "Deploying..." : "Approve & Deploy"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
