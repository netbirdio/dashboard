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
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { ExitNode, ExitNodeRequest } from "@/interfaces/ExitNode";
import { Policy } from "@/interfaces/Policy";
import {
  arePeersValid,
  EXIT_NODES_DOCS_URL,
  getExitNodeNameError,
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
  onSaved?: (exitNode: ExitNode) => void;
};

export default function ExitNodeModal({
  open,
  setOpen,
  exitNode,
  initialTab,
  openPeerSelector,
  onSaved,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      {open && (
        <ExitNodeModalContent
          key={exitNode?.id ?? "new"}
          exitNode={exitNode}
          initialTab={initialTab}
          openPeerSelector={openPeerSelector}
          onSaved={onSaved}
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
  onSaved,
}: Readonly<ContentProps>) {
  const isEdit = !!exitNode;
  const { exitNodes, peers, getPolicies } = useExitNodes();
  const { createPoliciesForResource } = usePolicies();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const request = useApiCall<ExitNode>("/exit-nodes");

  const [tab, setTab] = useState<ExitNodeModalTab>(initialTab ?? "peers");
  const [draftPeers, setDraftPeers] = useState<DraftExitNodePeer[]>(() =>
    sortPeersByMetric(exitNode?.peers).map((p) => ({
      peer_id: p.peer_id,
      metric: String(p.metric),
      enabled: p.enabled,
    })),
  );
  const [name, setName] = useState(exitNode?.name ?? "");
  const [description, setDescription] = useState(exitNode?.description ?? "");
  const [autoApply, setAutoApply] = useState(exitNode?.auto_apply ?? true);
  const [newPolicies, setNewPolicies] = useState<Policy[]>([]);

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

  const tabIndex = TAB_ORDER.indexOf(tab);
  const isLastTab = tabIndex === TAB_ORDER.length - 1;

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

  const save = async () => {
    if (!allValid) return;
    if (!(await confirmMissingPolicies())) return;
    const body = toRequest();
    const promise = (
      isEdit ? request.put(body, `/${exitNode.id}`) : request.post(body)
    ).then(async (saved) => {
      await createPoliciesForResource(newPolicies, {
        id: saved.id,
        type: "exit_node",
      });
      mutate("/exit-nodes");
      onSaved?.(saved);
    });

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
          <TabsTrigger
            value={"access-control"}
            disabled={isTabDisabled("access-control")}
          >
            <ShieldCheck size={16} />
            Access Control
          </TabsTrigger>
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
                disabled={!allValid}
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
                  onClick={() => setTab(TAB_ORDER[tabIndex - 1])}
                >
                  Back
                </Button>
              )}
              {isLastTab ? (
                <Button
                  variant={"primary"}
                  onClick={save}
                  disabled={!allValid}
                  data-testid={"submit-exit-node"}
                >
                  <PlusCircle size={16} />
                  Add Exit Node
                </Button>
              ) : (
                <Button
                  variant={"primary"}
                  onClick={() => setTab(TAB_ORDER[tabIndex + 1])}
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
