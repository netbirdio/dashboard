import Button from "@components/Button";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Separator from "@components/Separator";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconLoader2 } from "@tabler/icons-react";
import {
  ChevronsLeftRightEllipsis,
  MonitorIcon,
  ScreenShareIcon,
  ServerIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  User2,
  UserIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import {
  DEFAULT_EXTERNAL_VNC_PORT,
  type VNCMode,
  type VNCTarget,
} from "@/modules/remote-access/vnc/useVNC";

// VNCConnectChoice is everything the viewer needs decided before it dials.
export type VNCConnectChoice = {
  target: VNCTarget;
  port: number;
  mode: VNCMode;
  username: string;
  // ipVersion is "4", "6", or "" to let the dialer pick.
  ipVersion: string;
};

type Props = {
  open: boolean;
  peer: Peer;
  // netbirdSupported is whether the client ships a screen capturer for the
  // peer's operating system; netbirdEnabled whether the peer switched the
  // server on. Both are needed, and they are separate because the remedy is.
  netbirdSupported: boolean;
  netbirdEnabled: boolean;
  initial: VNCConnectChoice;
  error?: string;
  loading?: boolean;
  onConnect: (choice: VNCConnectChoice) => void;
};

export const VNCConnectModal = ({
  open,
  peer,
  netbirdSupported,
  netbirdEnabled,
  initial,
  error,
  loading,
  onConnect,
}: Props) => {
  const netbirdAvailable = netbirdSupported && netbirdEnabled;
  const [target, setTarget] = useState<VNCTarget>(
    netbirdAvailable ? initial.target : "external",
  );
  const [port, setPort] = useState(String(initial.port));
  const [mode, setMode] = useState<VNCMode>(initial.mode);
  const [username, setUsername] = useState(initial.username);
  const [ipVersion, setIpVersion] = useState(initial.ipVersion);

  const isExternal = target === "external";
  const peerOS = getOperatingSystem(peer?.os);
  // Only NetBird's server can start a second desktop, and only where the
  // client can bring one up.
  const supportsSessionMode =
    !isExternal &&
    (peerOS === OperatingSystem.LINUX || peerOS === OperatingSystem.FREEBSD);
  const effectiveMode: VNCMode = supportsSessionMode ? mode : "attach";

  const portError = useMemo(() => {
    if (!isExternal) return undefined;
    const parsed = Number(port);
    const valid = Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
    if (!valid) return "Port must be a number between 1 and 65535";
  }, [isExternal, port]);

  const usernameError = useMemo(() => {
    if (effectiveMode !== "session") return undefined;
    if (!username.trim()) return "Username cannot be empty";
  }, [effectiveMode, username]);

  const hasError = portError !== undefined || usernameError !== undefined;

  const handleConnect = () => {
    if (hasError || loading) return;
    onConnect({
      target,
      port: Number(port),
      mode: effectiveMode,
      username,
      ipVersion,
    });
  };

  return (
    <Modal open={open} onOpenChange={undefined}>
      <ModalContent maxWidthClass={"max-w-xl"} showClose={false}>
        <ModalHeader
          icon={<ScreenShareIcon className={"text-netbird"} size={18} />}
          title={peer.name}
          description={`Connect to ${peer.ip} via VNC`}
          color={"netbird"}
        />
        <Separator />

        <form
          className={"px-8 py-6 flex flex-col gap-8"}
          onSubmit={(e) => {
            e.preventDefault();
            handleConnect();
          }}
        >
          {error && (
            <Callout variant={"error"} icon={<TriangleAlertIcon size={14} />}>
              {error}
            </Callout>
          )}

          <div>
            <Label>Server</Label>
            <HelpText>
              {isExternal
                ? "Requires a VNC server already running on the peer. Not authenticated by NetBird, and its user is not asked to approve."
                : "Built into the client. Authenticated, and the peer's user is asked to approve."}
            </HelpText>
            <SegmentedTabs
              value={target}
              onChange={(value) => setTarget(value as VNCTarget)}
            >
              <SegmentedTabs.List className="rounded-lg border">
                <SegmentedTabs.Trigger
                  value="netbird"
                  disabled={!netbirdAvailable}
                >
                  <ShieldCheckIcon size={16} />
                  NetBird
                </SegmentedTabs.Trigger>
                <SegmentedTabs.Trigger value="external">
                  <ServerIcon size={16} />
                  External
                </SegmentedTabs.Trigger>
              </SegmentedTabs.List>
            </SegmentedTabs>
            {!netbirdAvailable && (
              <HelpText className={"mt-3"}>
                {netbirdSupported
                  ? "Not enabled on this peer. Turn it on with netbird up --allow-server-vnc."
                  : "Not available on this peer's operating system."}
              </HelpText>
            )}
          </div>

          {isExternal && (
            <div>
              <Label>Port</Label>
              <HelpText>The port the VNC server listens on.</HelpText>
              <Input
                maxWidthClass={""}
                placeholder={String(DEFAULT_EXTERNAL_VNC_PORT)}
                min={1}
                max={65535}
                value={port}
                type={"number"}
                error={portError}
                errorTooltip={true}
                errorTooltipPosition={"top-right"}
                onChange={(e) => setPort(e.target.value)}
                customPrefix={
                  <ChevronsLeftRightEllipsis
                    size={16}
                    className={"text-nb-gray-300"}
                  />
                }
              />
            </div>
          )}

          {supportsSessionMode && (
            <div>
              <Label>Session</Label>
              <HelpText>
                Attach to the screen in use, or start a new desktop.
              </HelpText>
              <SegmentedTabs
                value={mode}
                onChange={(value) => setMode(value as VNCMode)}
              >
                <SegmentedTabs.List className="rounded-lg border">
                  <SegmentedTabs.Trigger value="attach">
                    <MonitorIcon size={16} />
                    Current screen
                  </SegmentedTabs.Trigger>
                  <SegmentedTabs.Trigger value="session">
                    <UserIcon size={16} />
                    New desktop
                  </SegmentedTabs.Trigger>
                </SegmentedTabs.List>
              </SegmentedTabs>
            </div>
          )}

          {effectiveMode === "session" && (
            <div>
              <Label>User</Label>
              <HelpText>The account to start the desktop as.</HelpText>
              <Input
                placeholder={"root"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                name="username"
                autoComplete={"username"}
                error={usernameError}
                errorTooltip={true}
                errorTooltipPosition={"top-right"}
                customPrefix={
                  <User2 size={16} className={"text-nb-gray-300"} />
                }
              />
            </div>
          )}

          <div>
            <Label>IP Version</Label>
            <HelpText>The IP version used to reach the peer.</HelpText>
            <SelectDropdown
              value={ipVersion}
              onChange={setIpVersion}
              options={[
                { value: "", label: "Automatic" },
                { value: "4", label: "IPv4" },
                { value: "6", label: "IPv6", disabled: !peer.ipv6 },
              ]}
            />
          </div>
        </form>

        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <Button
              type="submit"
              variant={"primary"}
              disabled={hasError || loading}
              onClick={handleConnect}
            >
              {loading && <IconLoader2 size={16} className={"animate-spin"} />}
              Connect
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
