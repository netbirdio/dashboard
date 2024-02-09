import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { HoverModalCard } from "@components/ui/HoverModalCard";
import { Disc3Icon, ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import {
  androidVersions,
  iOSVersions,
  macOSVersions,
  windowsKernelVersions,
} from "@/interfaces/PostureCheck";
import { OperatingSystemPostureCheck } from "@/modules/access-control/posture-checks/OperatingSystemPostureCheck";

type Props = {
  value?: string;
  onChange: (value: string | undefined) => void;
};
export const OperatingSystemCheck = ({}: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <HoverModalCard
      open={open}
      setOpen={setOpen}
      value={"os"}
      icon={<Disc3Icon size={16} />}
      title={"Operating System"}
      modalWidthClass={"max-w-4xl"}
      description={
        "Restrict access in your network based on the operating system."
      }
      iconClass={"bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300"}
    >
      <CheckContent onChange={() => {}} value={""} />
    </HoverModalCard>
  );
};

const CheckContent = ({ value, onChange }: Props) => {
  const [windowsVersion, setWindowsVersion] = useState<string | undefined>("0");
  const [macOSVersion, setMacOSVersion] = useState<string | undefined>("0");
  const [androidVersion, setAndroidVersion] = useState<string | undefined>("0");
  const [iOSVersion, setIOSVersion] = useState<string | undefined>("0");
  const [linuxVersion, setLinuxVersion] = useState<string | undefined>("0");

  return (
    <>
      <div className={"flex flex-col px-8 gap-4 pt-4 py-6"}>
        <OperatingSystemPostureCheck
          versionList={windowsKernelVersions}
          value={windowsVersion}
          onChange={setWindowsVersion}
        >
          <Label>Windows</Label>
        </OperatingSystemPostureCheck>
        <OperatingSystemPostureCheck
          versionList={macOSVersions}
          value={macOSVersion}
          onChange={setMacOSVersion}
        >
          <Label>macOS</Label>
        </OperatingSystemPostureCheck>
        <OperatingSystemPostureCheck
          versionList={iOSVersions}
          value={iOSVersion}
          onChange={setIOSVersion}
        >
          <Label>iOS</Label>
        </OperatingSystemPostureCheck>
        <OperatingSystemPostureCheck
          versionList={androidVersions}
          value={androidVersion}
          onChange={setAndroidVersion}
        >
          <Label>Android</Label>
        </OperatingSystemPostureCheck>
        <OperatingSystemPostureCheck
          value={linuxVersion}
          onChange={setLinuxVersion}
        >
          <Label>Linux</Label>
        </OperatingSystemPostureCheck>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={"#"} target={"_blank"}>
              Operating System Check
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button variant={"primary"}>Save</Button>
        </div>
      </ModalFooter>
    </>
  );
};
