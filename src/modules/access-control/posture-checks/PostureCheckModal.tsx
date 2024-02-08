import Button from "@components/Button";
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
import Paragraph from "@components/Paragraph";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { HoverModalCard } from "@components/ui/HoverModalCard";
import { cn } from "@utils/helpers";
import { iso31661 } from "iso-3166";
import {
  Disc3Icon,
  ExternalLinkIcon,
  FlagIcon,
  PlusCircle,
  Shield,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import React, { createElement, useState } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import {
  androidVersions,
  iOSVersions,
  macOSVersions,
  windowsKernelVersions,
} from "@/interfaces/PostureCheck";
import { OperatingSystemPostureCheck } from "@/modules/access-control/posture-checks/OperatingSystemPostureCheck";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function PostureCheckModal({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <CheckContent
          onSuccess={() => {
            onOpenChange(false);
            onSuccess && onSuccess();
          }}
        />
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
};

export function CheckContent({ onSuccess }: ModalProps) {
  const [osCheck, setOsCheck] = useState<boolean>(false);
  const [country, setCountry] = useState("DE");
  const [state, setState] = useState("");

  const datadogRegions = iso31661.map((entry) => {
    const flag = (props: { size?: number; width?: number; country?: string }) =>
      createElement(RoundedFlag, {
        country: entry.alpha2,
        ...props,
      });

    return {
      label: entry.name + " (" + entry.alpha3 + ")",
      value: entry.alpha2,
      icon: flag,
    } as SelectOption;
  });

  const states: SelectOption[] = [
    {
      label: "Berlin",
      value: "test",
    },
    {
      label: "Dietenheim",
      value: "test2",
    },
    {
      label: "Ulm",
      value: "test3",
    },
  ];

  const [tab, setTab] = useState("checks");
  const [allowDenyLocation, setAllowDenyLocation] = useState("all");
  const [restrictOs, setRestrictOs] = useState(false);

  const allowDenyOptions = [
    {
      label: "Allow all locations",
      value: "all",
      icon: Shield,
    },
    {
      label: "Only allow access from specific locations",
      value: "allow",
      icon: ShieldCheck,
    },
    {
      label: "Block access from specific locations",
      value: "deny",
      icon: ShieldXIcon,
    },
  ] as SelectOption[];

  const [windowsVersion, setWindowsVersion] = useState<string | undefined>("0");
  const [macOSVersion, setMacOSVersion] = useState<string | undefined>("0");
  const [androidVersion, setAndroidVersion] = useState<string | undefined>("0");
  const [iOSVersion, setIOSVersion] = useState<string | undefined>("0");
  const [linuxVersion, setLinuxVersion] = useState<string | undefined>("0");

  return (
    <ModalContent maxWidthClass={cn("relative", "max-w-xl")} showClose={true}>
      <PostureCheckIcons />

      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center mt-6"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          Create New Posture Check
        </h2>
        <Paragraph className={cn("text-sm text-center max-w-lg")}>
          Use posture checks to further restrict access in your network.
        </Paragraph>
      </div>
      <GradientFadedBackground />

      <div className={"mb-6 flex-col gap-3 flex mt-5"}>
        <div className={"px-4 z-10"}>
          <HoverModalCard
            value={"version"}
            title={"NetBird Client Version"}
            description={
              "Restrict access to peers with a specific NetBird client version."
            }
            icon={<NetBirdIcon size={18} />}
          >
            <div className={"flex flex-col px-8 gap-3"}>
              <HelpText className={"max-w-[340px] mb-0"}>
                Only peers with the minimum specified NetBird client version
                will have access to the network.
              </HelpText>
              <Input
                min={1}
                maxWidthClass={"max-w-[260px]"}
                type={"number"}
                placeholder={"e.g., 0.25.0"}
                customPrefix={"Min. Version"}
              />
            </div>
          </HoverModalCard>
          <HoverModalCard
            value={"location"}
            icon={<FlagIcon size={16} />}
            title={"Country & Region"}
            description={
              "Restrict access in your network based on country or region."
            }
            iconClass={"bg-gradient-to-tr from-indigo-500 to-indigo-400"}
            modalWidthClass={"max-w-xl"}
          >
            <div className={"flex flex-col px-8 gap-2"}>
              <HelpText>
                Choose whether to allow or block access from specific locations.
                Only peers matching the criteria will have access to the
                network.
              </HelpText>
              <SelectDropdown
                value={allowDenyLocation}
                onChange={setAllowDenyLocation}
                placeholder={"Search for a country..."}
                options={allowDenyOptions}
              />
              <Button variant={"dotted"} size={"sm"}>
                <PlusCircle size={16} />
                Add Location
              </Button>
            </div>
          </HoverModalCard>
          <HoverModalCard
            value={"os"}
            icon={<Disc3Icon size={16} />}
            title={"Operating System"}
            modalWidthClass={"max-w-3xl"}
            description={
              "Restrict access in your network based on the operating system."
            }
            iconClass={"bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300"}
          >
            <div className={"flex flex-col px-8 gap-4"}>
              <OperatingSystemPostureCheck
                versionList={windowsKernelVersions}
                value={windowsVersion}
                onChange={setWindowsVersion}
              >
                <Label>
                  <OSLogo os={"windows"} />
                  Windows
                </Label>
              </OperatingSystemPostureCheck>
              <OperatingSystemPostureCheck
                versionList={macOSVersions}
                value={macOSVersion}
                onChange={setMacOSVersion}
              >
                <Label>
                  <OSLogo os={"mac"} />
                  macOS
                </Label>
              </OperatingSystemPostureCheck>
              <OperatingSystemPostureCheck
                versionList={iOSVersions}
                value={macOSVersion}
                onChange={setMacOSVersion}
              >
                <Label>
                  <OSLogo os={"ios"} />
                  iOS
                </Label>
              </OperatingSystemPostureCheck>
              <OperatingSystemPostureCheck
                versionList={androidVersions}
                value={macOSVersion}
                onChange={setMacOSVersion}
              >
                <Label>
                  <OSLogo os={"android"} />
                  Android
                </Label>
              </OperatingSystemPostureCheck>
              <OperatingSystemPostureCheck
                versionList={macOSVersions}
                value={macOSVersion}
                onChange={setMacOSVersion}
              >
                <Label>
                  <OSLogo os={"linux"} />
                  Linux
                </Label>
              </OperatingSystemPostureCheck>
            </div>
          </HoverModalCard>
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
              }
              target={"_blank"}
            >
              Posture Checks
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>

          <Button variant={"primary"}>
            <PlusCircle size={16} />
            Create & Add
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
