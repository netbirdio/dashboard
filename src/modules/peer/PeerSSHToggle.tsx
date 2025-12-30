import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CirclePlusIcon,
  ExternalLinkIcon,
  LockIcon,
  ShieldIcon,
  SquarePenIcon,
  TerminalSquare,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PeerSSHPolicyInfo } from "@/modules/peer/PeerSSHPolicyInfo";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import Button from "@components/Button";
import useFetchApi from "@utils/api";
import { Policy } from "@/interfaces/Policy";
import { Group } from "@/interfaces/Group";
import { orderBy } from "lodash";
import CircleIcon from "@/assets/icons/CircleIcon";
import Badge from "@components/Badge";
import { cn, singularize } from "@utils/helpers";
import { Modal } from "@components/modal/Modal";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { PeerSSHPolicyModal } from "@/modules/peer/PeerSSHPolicyModal";
import { Callout } from "@components/Callout";
import { useDialog } from "@/contexts/DialogProvider";
import InlineLink from "@components/InlineLink";
import { isNetbirdSSHProtocolSupported } from "@utils/version";

export const PeerSSHToggle = () => {
  const { permission } = usePermissions();
  const { peer, toggleSSH, setSSHInstructionsModal } = usePeer();
  const { data: policies, isLoading } = useFetchApi<Policy[]>("/policies");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [policyModal, setPolicyModal] = useState(false);
  const [sshPolicyModal, setSshPolicyModal] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<Policy>();
  const { confirm } = useDialog();

  const isSSHDashboardEnabled = peer?.ssh_enabled;
  const isSSHClientEnabled = peer?.local_flags?.server_ssh_allowed;

  const assignedPolicies = useMemo(() => {
    const peerGroups = peer?.groups as Group[];
    return orderBy(
      policies?.filter((policy) => {
        const rule = policy?.rules?.[0];
        const isSSHProtocol = rule?.protocol === "netbird-ssh";
        if (!isSSHProtocol) return false;
        const destinationResource = policy.rules
          ?.map((rule) => rule?.destinationResource?.id === peer?.id)
          .some((id) => id);
        if (destinationResource) return true;
        const destinationPolicyGroups = policy.rules
          ?.map((rule) => rule?.destinations)
          .flat() as Group[];
        const policyGroups = [...destinationPolicyGroups];
        return peerGroups?.some((peerGroup) =>
          policyGroups.some((policyGroup) => policyGroup?.id === peerGroup.id),
        );
      }),
      "enabled",
      "desc",
    );
  }, [policies, peer]);

  const enabledPolicies = assignedPolicies?.filter((policy) => policy?.enabled);

  const disableDashboardSSH = async () => {
    const choice = await confirm({
      title: `Disable SSH Access?`,
      description: (
        <div>
          Starting from NetBird v0.61.0, once SSH access is disabled, you cannot
          re-enable it again from the dashboard. You&apos;ll need to create an
          explicit access control policy and update your NetBird client to
          restore SSH functionality.{" "}
          <InlineLink
            href={"https://docs.netbird.io/manage/peers/ssh"}
            target={"_blank"}
            onClick={(e) => e.stopPropagation()}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </div>
      ),
      confirmText: "Disable",
      cancelText: "Cancel",
      type: "warning",
      maxWidthClass: "max-w-xl",
    });
    if (!choice) return;
    toggleSSH(false);
  };

  return isSSHDashboardEnabled ? (
    <>
      <FullTooltip
        content={
          <div className={"flex gap-2 items-center !text-nb-gray-300 text-xs"}>
            <LockIcon size={14} />
            <span>
              {`You don't have the required permissions to update this setting.`}
            </span>
          </div>
        }
        interactive={false}
        className={"w-full block"}
        disabled={permission.peers.update}
      >
        <FancyToggleSwitch
          value={peer.ssh_enabled}
          disabled={!permission.peers.update}
          onChange={(enable) =>
            enable ? setSSHInstructionsModal(true) : disableDashboardSSH()
          }
          label={
            <>
              <TerminalSquare size={16} />
              SSH Access
            </>
          }
          helpText={
            "Enable the SSH server on this peer to access the machine via an secure shell."
          }
        />
      </FullTooltip>
      <PeerSSHPolicyInfo peer={peer} />
    </>
  ) : (
    <div>
      <div className={"flex gap-2 items-center w-full"}>
        <Label>SSH Access</Label>
      </div>

      <HelpText>
        Set up SSH and create an explicit access control policy defining which
        users can access specific local usernames of this machine via SSH.
      </HelpText>

      {!isNetbirdSSHProtocolSupported(peer.version) &&
        enabledPolicies?.length > 0 &&
        isSSHClientEnabled && (
          <Callout
            variant={"warning"}
            icon={
              <AlertCircleIcon
                size={14}
                className={"shrink-0 relative top-[3px] text-netbird"}
              />
            }
            className="my-3"
          >
            You have SSH access configured but your client runs on an older
            NetBird version. Please update your NetBird client to v.0.61.0+ in
            order to allow SSH connections.
          </Callout>
        )}

      {!isSSHClientEnabled && enabledPolicies?.length > 0 && (
        <Callout
          variant={"warning"}
          icon={
            <AlertCircleIcon
              size={14}
              className={"shrink-0 relative top-[3px] text-netbird"}
            />
          }
          className="my-3"
        >
          You have an SSH access policy configured, but the SSH server
          isn&apos;t enabled on this client. Enable the SSH server to allow SSH
          connections.
        </Callout>
      )}

      {isSSHClientEnabled && enabledPolicies?.length === 0 && (
        <Callout
          variant={"warning"}
          icon={
            <AlertCircleIcon
              size={14}
              className={"shrink-0 relative top-[3px] text-netbird"}
            />
          }
          className="my-3"
        >
          Your SSH server is enabled, but starting from NetBird v0.61.0, SSH
          requires an explicit access control policy. Please create an SSH
          access control policy in order to allow SSH connections.
        </Callout>
      )}

      <div className={"flex gap-3"}>
        {isSSHClientEnabled ? (
          <Button variant={"secondary"} onClick={() => setSshPolicyModal(true)}>
            <CirclePlusIcon size={14} />
            Create SSH Policy
          </Button>
        ) : (
          <Button
            variant={"secondary"}
            onClick={() => setSSHInstructionsModal(true)}
          >
            Enable SSH Access <ArrowUpRightIcon size={14} />
          </Button>
        )}

        {enabledPolicies?.length > 0 && (
          <FullTooltip
            contentClassName={"p-0"}
            delayDuration={200}
            skipDelayDuration={200}
            customOpen={tooltipOpen}
            customOnOpenChange={setTooltipOpen}
            className={"border-nb-gray-800"}
            content={
              <div className={"text-xs flex flex-col p-1"}>
                {assignedPolicies?.map((policy: Policy) => {
                  const rule = policy?.rules?.[0];
                  if (!rule) return;
                  return (
                    <button
                      key={policy.id}
                      className={
                        "m-0 pl-3 py-2.5 leading-none flex justify-between group hover:bg-nb-gray-900 rounded-md"
                      }
                      onClick={() => {
                        setTooltipOpen(false);
                        setCurrentPolicy(policy);
                        setPolicyModal(true);
                      }}
                    >
                      <div
                        className={
                          " flex items-center gap-2 leading-none font-medium text-nb-gray-300 group-hover:text-nb-gray-200 whitespace-nowrap"
                        }
                      >
                        <CircleIcon
                          size={8}
                          active={policy.enabled}
                          className={"shrink-0"}
                        />
                        {policy.name}
                      </div>

                      <div
                        className={
                          "text-nb-gray-300 px-2 ml-4 uppercase font-mono opacity-0 group-hover:opacity-100"
                        }
                      >
                        <SquarePenIcon size={12} />
                      </div>
                    </button>
                  );
                })}
              </div>
            }
            interactive={true}
            align={"start"}
            alignOffset={0}
            sideOffset={8}
          >
            <Badge
              variant={"gray"}
              useHover={false}
              className={"select-none hover:bg-nb-gray-910 px-4"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!tooltipOpen) setTooltipOpen(true);
              }}
            >
              <ShieldIcon
                size={14}
                className={cn(
                  enabledPolicies?.length > 0
                    ? "text-green-500"
                    : "text-nb-gray-300",
                )}
              />
              <div>
                <span className={"font-medium text-xs"}>
                  {singularize(
                    "Active Policies",
                    enabledPolicies?.length,
                    true,
                  )}
                </span>
              </div>
            </Badge>
          </FullTooltip>
        )}
      </div>

      <PoliciesProvider>
        <Modal
          open={policyModal}
          onOpenChange={(state) => {
            setPolicyModal(state);
            setCurrentPolicy(undefined);
          }}
        >
          <AccessControlModalContent
            key={policyModal ? "1" : "0"}
            policy={currentPolicy}
            onSuccess={async (p) => {
              setPolicyModal(false);
              setCurrentPolicy(undefined);
            }}
          />
        </Modal>
        <PeerSSHPolicyModal
          open={sshPolicyModal}
          onOpenChange={setSshPolicyModal}
          peer={peer}
        />
      </PoliciesProvider>
    </div>
  );
};
