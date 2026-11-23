"use client";

import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { IconDirectionSign } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import {
  ExternalLinkIcon,
  MonitorSmartphoneIcon,
  PlusCircle,
  Settings2,
  ShieldCheck,
  Text,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { ExitNode, ExitNodeRequest } from "@/interfaces/ExitNode";
import { Policy } from "@/interfaces/Policy";
import {
  arePeersValid,
  EXIT_NODES_DOCS_URL,
  getExitNodeNameError,
  getNextMetric,
  getPeersUsedByOtherExitNodes,
  sortPeersByMetric,
} from "@/modules/exit-nodes/exitNodeHelpers";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import ExitNodeAccessControl from "@/modules/exit-nodes/modal/ExitNodeAccessControl";
import ExitNodePeersTab, {
  DraftExitNodePeer,
} from "@/modules/exit-nodes/modal/ExitNodePeersTab";

export type ExitNodeModalTab =
  | "peers"
  | "general"
  | "settings"
  | "access-control";

// The create flow steps through the tabs in this order.
const TAB_ORDER: ExitNodeModalTab[] = [
  "peers",
  "general",
  "settings",
  "access-control",
];

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  exitNode?: ExitNode;
  initialTab?: ExitNodeModalTab;
  openPeerSelector?: boolean;
  // Peers a new exit node starts with, e.g. when set up from a peer.
  initialPeerIds?: string[];
  onSaved?: (exitNode: ExitNode) => void;
  // Draft mode (Control Center): hands the request over instead of saving,
  // without the Access Control tab, since the canvas draws the policies.
  onDraftSubmit?: (request: ExitNodeRequest) => void;
  // The exit nodes names and peers are checked against; defaults to the
  // live ones. A draft passes its own, so draft-created ones count.
  otherExitNodes?: ExitNode[];
};

export default function ExitNodeModal({
  open,
  setOpen,
  exitNode,
  initialTab,
  openPeerSelector,
  initialPeerIds,
  onSaved,
  onDraftSubmit,
  otherExitNodes,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      {open && (
        <ExitNodeModalContent
          key={exitNode?.id ?? "new"}
          exitNode={exitNode}
          initialTab={initialTab}
          openPeerSelector={openPeerSelector}
          initialPeerIds={initialPeerIds}
          onSaved={onSaved}
          onDraftSubmit={onDraftSubmit}
          otherExitNodes={otherExitNodes}
        />
      )}
    </Modal>
  );
}

type ContentProps = Omit<Props, "open" | "setOpen">;

export function ExitNodeModalContent({
  exitNode,
  initialTab,
  openPeerSelector = false,
  initialPeerIds = [],
  onSaved,
  onDraftSubmit,
  otherExitNodes,
}: Readonly<ContentProps>) {
  const isEdit = !!exitNode;
  const isDraft = !!onDraftSubmit;
  const { exitNodes: liveExitNodes, peers, getPolicies } = useExitNodes();
  const exitNodes = otherExitNodes ?? liveExitNodes;
  // In draft the Access Control step doesn't exist: the canvas has it.
  const tabOrder = isDraft
    ? TAB_ORDER.filter((t) => t !== "access-control")
    : TAB_ORDER;
  const { createPoliciesForResource } = usePolicies();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const request = useApiCall<ExitNode>("/exit-nodes");

  const [tab, setTab] = useState<ExitNodeModalTab>(initialTab ?? "peers");
  const [draftPeers, setDraftPeers] = useState<DraftExitNodePeer[]>(() => {
    if (exitNode)
      return sortPeersByMetric(exitNode.peers).map((p) => ({
        peer_id: p.peer_id,
        metric: String(p.metric),
        enabled: p.enabled,
      }));
    // Each next peer gets a higher metric, as when added one by one.
    const drafts: DraftExitNodePeer[] = [];
    initialPeerIds.forEach((peer_id) =>
      drafts.push({
        peer_id,
        metric: String(
          getNextMetric(drafts.map((p) => ({ metric: Number(p.metric) }))),
        ),
        enabled: true,
      }),
    );
    return drafts;
  });
  const [name, setName] = useState(exitNode?.name ?? "");
  const [description, setDescription] = useState(exitNode?.description ?? "");
  const [autoApply, setAutoApply] = useState(exitNode?.auto_apply ?? true);
  const [newPolicies, setNewPolicies] = useState<Policy[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // A new exit node that was saved while one of its policies failed. Retrying
  // updates it instead of creating a second one.
  const [savedNode, setSavedNode] = useState<ExitNode>();

  // A save that finishes after this modal was closed must not close the
  // modal opened since (possibly for another exit node).
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const existingPolicies = useMemo(
    () => getPolicies(exitNode),
    [getPolicies, exitNode],
  );
  const usedPeers = useMemo(
    () => getPeersUsedByOtherExitNodes(exitNodes, exitNode?.id),
    [exitNodes, exitNode?.id],
  );

  const peersValid = arePeersValid(draftPeers);
  const nameError = getExitNodeNameError(name, exitNodes, exitNode?.id);
  const nameValid = name.trim().length > 0 && nameError === "";
  const allValid = peersValid && nameValid;

  const tabIndex = tabOrder.indexOf(tab);
  const isLastTab = tabIndex === tabOrder.length - 1;

  // While creating, a tab opens once the ones before it are complete.
  const isTabDisabled = (t: ExitNodeModalTab) => {
    if (isEdit) return false;
    if (t === "peers") return false;
    if (t === "general") return !peersValid;
    return !allValid;
  };

  const canContinue =
    tab === "peers" ? peersValid : tab === "general" ? nameValid : allValid;

  const toRequest = (): ExitNodeRequest => ({
    name: name.trim(),
    description,
    enabled: exitNode?.enabled ?? true,
    auto_apply: autoApply,
    peers: draftPeers.map((p) => ({
      peer_id: p.peer_id,
      metric: Number(p.metric),
      enabled: p.enabled,
    })),
  });

  const confirmMissingPolicies = async () => {
    if (existingPolicies.length + newPolicies.length > 0) return true;
    return confirm({
      title: "No Access Control Policies Configured",
      description:
        "Without access control policies, no peer can use this exit node. You can also create policies later. Are you sure you want to continue?",
      type: "warning",
      confirmText: isEdit ? "Save Changes" : "Add Exit Node",
      cancelText: "Cancel",
      maxWidthClass: "max-w-lg",
    });
  };

  // Creates the draft policies one by one and drops the ones that were
  // created, so a retry only sends what is still missing.
  const createDraftPolicies = async (node: ExitNode) => {
    const target = { id: node.id, type: "exit_node" as const };
    const results = await Promise.allSettled(
      newPolicies.map((policy) => createPoliciesForResource([policy], target)),
    );
    const failed = newPolicies.filter(
      (_, i) => results[i].status === "rejected",
    );
    if (isMounted.current) setNewPolicies(failed);
    const error = results.find((r) => r.status === "rejected");
    if (error) throw (error as PromiseRejectedResult).reason;
  };

  const save = async () => {
    if (!allValid || isSaving) return;
    if (onDraftSubmit) {
      onDraftSubmit(toRequest());
      return;
    }
    setIsSaving(true);
    try {
      if (!(await confirmMissingPolicies())) return;
      const body = toRequest();
      const target = exitNode ?? savedNode;
      const promise = (async () => {
        const saved = target
          ? await request.put(body, `/${target.id}`)
          : await request.post(body);
        mutate("/exit-nodes");
        if (!isEdit && isMounted.current) setSavedNode(saved);
        await createDraftPolicies(saved);
        if (isMounted.current) onSaved?.(saved);
      })();

      notify({
        title: body.name,
        description: isEdit
          ? "The exit node was successfully updated"
          : "The exit node was successfully created",
        loadingMessage: isEdit
          ? "Updating exit node..."
          : "Creating exit node...",
        promise,
      });
      await promise.catch(() => undefined);
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const tabIcon =
    "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all";

  return (
    <ModalContent
      // The Peers tab has no input to focus; Radix would focus (and outline)
      // the first tab instead.
      onOpenAutoFocus={(e) => e.preventDefault()}
      maxWidthClass={
        tab === "access-control" ? "max-w-[790px]" : "max-w-[680px]"
      }
    >
      <ModalHeader
        icon={<IconDirectionSign size={20} />}
        title={isEdit ? "Edit Exit Node" : "Add Exit Node"}
        description={
          isEdit
            ? exitNode.name
            : "Route all internet traffic through one or more peers"
        }
        color={"yellow"}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ExitNodeModalTab)}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"peers"}>
            <MonitorSmartphoneIcon size={16} className={tabIcon} />
            Peers
          </TabsTrigger>
          <TabsTrigger value={"general"} disabled={isTabDisabled("general")}>
            <Text size={16} className={tabIcon} />
            Name & Description
          </TabsTrigger>
          <TabsTrigger value={"settings"} disabled={isTabDisabled("settings")}>
            <Settings2 size={16} className={tabIcon} />
            Additional Settings
          </TabsTrigger>
          {!isDraft && (
            <TabsTrigger
              value={"access-control"}
              disabled={isTabDisabled("access-control")}
            >
              <ShieldCheck size={16} />
              Access Control
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={"peers"} className={"pb-8"}>
          <ExitNodePeersTab
            value={draftPeers}
            onChange={setDraftPeers}
            peers={peers}
            usedPeers={usedPeers}
            openPeerSelector={openPeerSelector}
          />
        </TabsContent>

        <TabsContent value={"general"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div>
              <Label>Name</Label>
              <HelpText>
                Set an easily identifiable name for your exit node. The NetBird
                client shows it in the exit node list.
              </HelpText>
              <Input
                autoFocus={true}
                placeholder={"e.g., EU Egress"}
                value={name}
                error={nameError}
                onChange={(e) => setName(e.target.value)}
                data-testid={"exit-node-name-input"}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this exit node.
              </HelpText>
              <Input
                placeholder={
                  "e.g., Internet egress for EU teams through Frankfurt."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid={"exit-node-description-input"}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value={"settings"} className={"pb-4"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <FancyToggleSwitch
              value={autoApply}
              onChange={setAutoApply}
              data-testid={"exit-node-auto-apply"}
              label={
                <>
                  <IconDirectionSign size={15} />
                  Auto Apply
                </>
              }
              helpText={
                "Automatically apply this exit node to the peers that its access control policies allow. This requires NetBird client v0.55.0 or higher."
              }
            />
          </div>
        </TabsContent>

        <TabsContent value={"access-control"} className={"pb-8"}>
          <ExitNodeAccessControl
            exitNodeId={exitNode?.id}
            exitNodeName={name}
            existingPolicies={existingPolicies}
            newPolicies={newPolicies}
            onNewPoliciesChange={setNewPolicies}
          />
        </TabsContent>
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={EXIT_NODES_DOCS_URL} target={"_blank"}>
              Exit Nodes
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {isEdit ? (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={save}
                disabled={!allValid || isSaving}
                data-testid={"submit-exit-node"}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {tabIndex === 0 ? (
                <ModalClose asChild={true}>
                  <Button variant={"secondary"}>Cancel</Button>
                </ModalClose>
              ) : (
                <Button
                  variant={"secondary"}
                  onClick={() => setTab(tabOrder[tabIndex - 1])}
                >
                  Back
                </Button>
              )}
              {isLastTab ? (
                <Button
                  variant={"primary"}
                  onClick={save}
                  disabled={!allValid || isSaving}
                  data-testid={"submit-exit-node"}
                >
                  <PlusCircle size={16} />
                  Add Exit Node
                </Button>
              ) : (
                <Button
                  variant={"primary"}
                  onClick={() => setTab(tabOrder[tabIndex + 1])}
                  disabled={!canContinue}
                  data-testid={"exit-node-continue"}
                >
                  Continue
                </Button>
              )}
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
