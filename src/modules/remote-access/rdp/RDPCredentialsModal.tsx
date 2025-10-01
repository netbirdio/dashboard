import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { Peer } from "@/interfaces/Peer";
import {
  ChevronsLeftRightEllipsis,
  ExternalLinkIcon,
  KeyRoundIcon,
  MonitorIcon,
  User2,
} from "lucide-react";
import Separator from "@components/Separator";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";
import Button from "@components/Button";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import {
  RDP_DOCS_LINK,
  RDPCredentials,
} from "@/modules/remote-access/rdp/useRemoteDesktop";
import { IconLoader2 } from "@tabler/icons-react";

type Props = {
  open: boolean;
  peer: Peer;
  onConnect?: (credentials: RDPCredentials) => void;
  error?: string;
  loading?: boolean;
};

export const RDPCredentialsModal = ({
  open,
  peer,
  onConnect,
  error,
  loading,
}: Props) => {
  const [username, setUsername] = useState("Administrator");
  const [password, setPassword] = useState("");

  const [port, setPort] = useState("3389");

  const userNameError = useMemo(() => {
    if (username?.length === 0) return "Username cannot be empty";
  }, [username]);

  const portError = useMemo(() => {
    const portNumber = Number(port);
    const isValid =
      Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535;
    if (!isValid) return "Port must be a number between 1 and 65535";
  }, [port]);

  const hasAnyError = useMemo(() => {
    if (userNameError !== undefined) return true;
    return portError !== undefined;
  }, [userNameError, portError]);

  const handleConnect = useCallback(() => {
    if (hasAnyError || !onConnect) return;
    onConnect({
      username,
      password,
      port: Number(port),
    });
  }, [hasAnyError, onConnect, username, password, port]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !hasAnyError && !loading) {
        handleConnect();
      }
    },
    [handleConnect, hasAnyError, loading],
  );

  return (
    <Modal open={open} onOpenChange={undefined}>
      <ModalContent maxWidthClass={"max-w-xl"} showClose={false}>
        <ModalHeader
          icon={<MonitorIcon className={"text-netbird"} size={18} />}
          title={peer.name}
          description={`Connect to ${peer.ip} via RDP`}
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
            <div className={"bg-red-50 border border-red-200 rounded-md p-4"}>
              <div
                className={
                  "flex items-center gap-2 text-red-800 font-medium mb-1"
                }
              >
                Error
              </div>
              <p className={"text-sm text-red-700"}>{error}</p>
            </div>
          )}
          <div>
            <Label>Username & Password</Label>
            <HelpText>
              Enter the credentials required to authenticate with the remote
              host.
            </HelpText>
            <div className={"flex flex-col gap-2 w-full"}>
              <Input
                placeholder={"Administrator"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                name="username"
                autoComplete={"username"}
                error={userNameError}
                errorTooltip={true}
                errorTooltipPosition={"top-right"}
                customPrefix={
                  <User2 size={16} className={"text-nb-gray-300"} />
                }
              />
              <Input
                value={password}
                placeholder={"Enter password"}
                type={"password"}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                name="password"
                autoComplete={"current-password"}
                error={undefined}
                errorTooltip={true}
                errorTooltipPosition={"top-right"}
                customPrefix={
                  <KeyRoundIcon size={16} className={"text-nb-gray-300"} />
                }
              />
            </div>
          </div>
          <div>
            <Label>Port</Label>
            <HelpText>
              Specify the RDP port for your remote connection.
            </HelpText>
            <Input
              maxWidthClass={""}
              placeholder={"3389"}
              min={1}
              max={65535}
              value={port}
              type={"number"}
              error={portError}
              errorTooltip={true}
              errorTooltipPosition={"top-right"}
              onChange={(e) => setPort(e.target.value)}
              onKeyDown={handleKeyDown}
              customPrefix={
                <ChevronsLeftRightEllipsis
                  size={16}
                  className={"text-nb-gray-300"}
                />
              }
            />
          </div>
        </form>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink href={RDP_DOCS_LINK} target={"_blank"}>
                RDP
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <Button
              type="submit"
              variant={"primary"}
              disabled={hasAnyError || loading}
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
