"use client";

import Button from "@components/Button";
import Code from "@components/Code";
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
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import Separator from "@components/Separator";
import { IconRepeat } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { trim } from "lodash";
import {
  AlarmClock,
  CopyIcon,
  ExternalLinkIcon,
  MonitorSmartphoneIcon,
  PlusCircle,
  PowerOffIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { SetupKey } from "@/interfaces/SetupKey";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  children: React.ReactNode;
};
const copyMessage = "Setup-Key was copied to your clipboard!";
export default function SetupKeyModal({ children }: Props) {
  const [modal, setModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [setupKey, setSetupKey] = useState<SetupKey>();
  const [, copy] = useCopyToClipboard(setupKey?.key);

  const handleSuccess = (setupKey: SetupKey) => {
    setSetupKey(setupKey);
    setSuccessModal(true);
  };

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        <ModalTrigger asChild>{children}</ModalTrigger>
        <SetupKeyModalContent onSuccess={handleSuccess} />
      </Modal>
      <Modal
        open={successModal}
        onOpenChange={(open) => {
          setSuccessModal(open);
          setModal(open);
        }}
      >
        <ModalContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          maxWidthClass={"max-w-md"}
          className={"mt-20"}
          showClose={false}
        >
          <div className={"pb-6 px-8"}>
            <div className={"flex flex-col items-center justify-center gap-3"}>
              <div>
                <h2 className={"text-2xl text-center mb-2"}>
                  Setup key created successfully!
                </h2>
                <Paragraph className={"mt-0 text-sm text-center"}>
                  This key will not be shown again, so be sure to copy it and
                  store in a secure location.
                </Paragraph>
              </div>
            </div>
          </div>

          <div className={"px-8 pb-6"}>
            <Code message={copyMessage}>
              <Code.Line>
                {setupKey?.key || "Setup key could not be created..."}
              </Code.Line>
            </Code>
          </div>
          <ModalFooter className={"items-center"}>
            <div className={"flex gap-3 w-full"}>
              <ModalClose asChild={true}>
                <Button
                  variant={"secondary"}
                  className={"w-full"}
                  tabIndex={-1}
                >
                  Close
                </Button>
              </ModalClose>
              <Button
                variant={"primary"}
                className={"w-full"}
                onClick={() => copy(copyMessage)}
              >
                <CopyIcon size={14} />
                Copy to clipboard
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: (setupKey: SetupKey) => void;
};

export function SetupKeyModalContent({ onSuccess }: ModalProps) {
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys");
  const { mutate } = useSWRConfig();

  const [name, setName] = useState("");
  const [reusable, setReusable] = useState(false);
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  const [ephemeralPeers, setEphemeralPeers] = useState(false);
  const [selectedGroups, setSelectedGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: [],
    });

  const usageLimitPlaceholder = useMemo(() => {
    return reusable ? "Unlimited" : "1";
  }, [reusable]);

  const isDisabled = useMemo(() => {
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name]);

  const submit = () => {
    if (!selectedGroups) return;

    notify({
      title: "Create Setup Key",
      description:
        "Setup key created successfully. You can now enroll peers with your new key.",
      promise: saveGroups().then(async (groups) => {
        return setupKeyRequest
          .post({
            name,
            type: reusable ? "reusable" : "one-off",
            expires_in: parseInt(expiresIn ? expiresIn : "7") * 24 * 60 * 60, // Days to seconds, defaults to 7 days
            revoked: false,
            auto_groups: groups.map((group) => group.id),
            usage_limit: reusable ? parseInt(usageLimit) : 1,
            ephemeral: ephemeralPeers,
          })
          .then((setupKey) => {
            onSuccess && onSuccess(setupKey);
            mutate("/setup-keys");
            mutate("/groups");
          });
      }),
      loadingMessage: "Creating your setup key...",
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<SetupKeysIcon className={"fill-netbird"} />}
        title={"Create New Setup Key"}
        description={"Use this key to register new machines in your network"}
        color={"netbird"}
      />

      <Separator />

      <div className={"px-8 py-6 flex flex-col gap-8"}>
        <div>
          <Label>Name</Label>
          <HelpText>Set an easily identifiable name for your key</HelpText>
          <Input
            placeholder={"e.g., AWS Servers"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <FancyToggleSwitch
            value={reusable}
            onChange={setReusable}
            label={
              <>
                <IconRepeat size={15} />
                Make this key reusable
              </>
            }
            helpText={"Use this type to enroll multiple peers"}
          />
        </div>

        <div className={cn("flex justify-between", !reusable && "opacity-50")}>
          <div>
            <Label>Usage limit</Label>
            <HelpText className={"max-w-[200px]"}>
              For example, set to 30 if you want to enroll 30 peers
            </HelpText>
          </div>

          <Input
            min={1}
            maxWidthClass={"max-w-[200px]"}
            disabled={!reusable}
            value={usageLimit}
            type={"number"}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder={usageLimitPlaceholder}
            customPrefix={
              <MonitorSmartphoneIcon size={16} className={"text-nb-gray-300"} />
            }
            customSuffix={"Peer(s)"}
          />
        </div>

        <div className={"flex justify-between"}>
          <div>
            <Label>Expires in</Label>
            <HelpText>Should be between 1 and 365 days.</HelpText>
          </div>
          <Input
            maxWidthClass={"max-w-[200px]"}
            placeholder={"7"}
            min={1}
            max={365}
            value={expiresIn}
            type={"number"}
            onChange={(e) => setExpiresIn(e.target.value)}
            customPrefix={
              <AlarmClock size={16} className={"text-nb-gray-300"} />
            }
            customSuffix={"Day(s)"}
          />
        </div>

        <div>
          <FancyToggleSwitch
            value={ephemeralPeers}
            onChange={setEphemeralPeers}
            label={
              <>
                <PowerOffIcon size={15} />
                Ephemeral Peers
              </>
            }
            helpText={
              "Peers that are offline for over 10 minutes will be removed automatically"
            }
          />
        </div>
        <div>
          <Label>Auto-assigned groups</Label>
          <HelpText>
            These groups will be automatically assigned to peers enrolled with
            this key
          </HelpText>
          <PeerGroupSelector
            onChange={setSelectedGroups}
            values={selectedGroups}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
              }
              target={"_blank"}
            >
              Setup Keys
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>

          <Button variant={"primary"} onClick={submit} disabled={isDisabled}>
            <PlusCircle size={16} />
            Create Setup Key
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
