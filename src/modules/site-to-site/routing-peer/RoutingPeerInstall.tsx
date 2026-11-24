import Code from "@components/Code";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { renderHighlightedCommand } from "@components/ui/HighlightedCommand";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { CheckCircle2, Loader2 } from "lucide-react";
import * as React from "react";
import { useCallback } from "react";
import DockerIcon from "@/assets/icons/DockerIcon";
import { IconProps } from "@/assets/icons/IconProperties";
import { LinuxIcon } from "@/assets/icons/LinuxIcon";
import { Group } from "@/interfaces/Group";
import {
  INSTALL_METHODS,
  installCommand,
  InstallMethod,
  newGroupPeer,
  SETUP_KEY_PLACEHOLDER,
} from "@/modules/site-to-site/routing-peer/routingPeerDeploy";
import { GRPC_API_ORIGIN } from "@/utils/netbird";

// DockerIcon carries no fill of its own, so the brand blue is applied here.
export const DockerBrandIcon = (props: Readonly<IconProps>) => (
  <DockerIcon {...props} className={"fill-[#2496ED]"} />
);

// LinuxIcon is filled black by default, which disappears on the dark menu.
export const LinuxBrandIcon = (props: Readonly<IconProps>) => (
  <LinuxIcon {...props} className={"fill-nb-gray-200 shrink-0"} />
);

export const INSTALL_METHOD_OPTIONS = [
  { value: "linux", label: "Linux", icon: LinuxBrandIcon },
  { value: "docker", label: "Docker", icon: DockerBrandIcon },
  { value: "compose", label: "Docker Compose", icon: DockerBrandIcon },
];

type Props = {
  method: InstallMethod;
  hostname: string;
  setupKey: string;
  isPreparing: boolean;
  group?: Group;
  knownPeerIds: string[];
  showTitle?: boolean;
};

/** The install command with its setup key, and a live check for the peer. */
export const RoutingPeerInstall = ({
  method,
  hostname,
  setupKey,
  isPreparing,
  group,
  knownPeerIds,
  showTitle = true,
}: Props) => {
  const managementUrl = GRPC_API_ORIGIN || undefined;
  const deployment = INSTALL_METHODS[method];
  const keyValue = setupKey || SETUP_KEY_PLACEHOLDER;
  const command = installCommand(method, keyValue, hostname, managementUrl);

  return (
    <div className={"flex flex-col gap-4"}>
      {showTitle && (
        <div>
          <Label>{deployment.title}</Label>
          <HelpText className={"mb-0"}>{deployment.description}</HelpText>
        </div>
      )}
      <Code
        key={method}
        codeToCopy={command}
        className={cn("overflow-hidden", isPreparing && "!border-nb-gray-930")}
        showCopyIcon={!isPreparing}
      >
        {isPreparing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-nb-gray-100 bg-nb-gray-950/90">
            <Loader2 size={16} className="animate-spin" />
            Generating setup key...
          </div>
        )}
        {renderHighlightedCommand(command, [
          keyValue,
          hostname,
          managementUrl ?? "",
        ])}
      </Code>
      <HelpText className={"mb-0"}>
        The setup key works once and expires in 24 hours.
      </HelpText>
      {group && (
        <RegistrationCheck
          groupId={group.id as string}
          knownPeerIds={knownPeerIds}
        />
      )}
    </div>
  );
};

// Polls the routing peer group until a peer that was not in it when the
// setup key was made shows up.
const RegistrationCheck = ({
  groupId,
  knownPeerIds,
}: {
  groupId: string;
  knownPeerIds: string[];
}) => {
  const registered = useCallback(
    (group?: Group) => newGroupPeer(group, knownPeerIds),
    [knownPeerIds],
  );
  const { data: group } = useFetchApi<Group>(
    `/groups/${groupId}`,
    true,
    false,
    true,
    { refreshInterval: (latest?: Group) => (registered(latest) ? 0 : 3000) },
  );
  const peerName = registered(group);

  return (
    <div className={"flex items-center gap-2 text-sm"}>
      {peerName ? (
        <>
          <CheckCircle2 size={16} className={"text-green-500 shrink-0"} />
          <span className={"text-nb-gray-100"}>
            Routing peer {peerName} registered with NetBird.
          </span>
        </>
      ) : (
        <>
          <Loader2 size={16} className={"animate-spin shrink-0"} />
          <span className={"text-nb-gray-300"}>
            Waiting for the routing peer to register with NetBird...
          </span>
        </>
      )}
    </div>
  );
};
