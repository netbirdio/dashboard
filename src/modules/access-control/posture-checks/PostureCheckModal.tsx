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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { cn } from "@utils/helpers";
import { iso31661 } from "iso-3166";
import {
  Disc3Icon,
  ExternalLinkIcon,
  FlagIcon,
  Globe2Icon,
  MonitorSmartphoneIcon,
  PlusCircle,
  PlusIcon,
  Text,
} from "lucide-react";
import React, { createElement, useState } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";
import { ClientVersionCheck } from "@/modules/posture-checks/ClientVersionCheck";

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

  const [tab, setTab] = useState("nb-client-check");

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

      <div className={"px-8 mb-10 flex-col gap-3 flex mt-8"}>
        {/*Client Version Check*/}
        <ClientVersionCheck />

        <div
          className={
            "bg-nb-gray-940 border border-nb-gray-900 py-3 pl-4 pr-4 rounded-md flex gap-4 items-center"
          }
        >
          <div
            className={
              "h-9 w-9 shrink-0 bg-gradient-to-tr shadow-xl from-indigo-500 to-indigo-400 rounded-md flex items-center justify-center"
            }
          >
            <FlagIcon size={16} />
          </div>
          <div>
            <div className={"text-sm font-medium"}>Location & Region</div>
            <div className={"text-xs mt-0.5 text-nb-gray-300"}>
              Restrict access in your network based on location or region.
            </div>
          </div>
          <div className={"ml-auto"}>
            <Button variant={"secondary"} size={"xs"}>
              <PlusIcon size={12} />
              Add Check
            </Button>
          </div>
        </div>
        <div
          className={
            "bg-nb-gray-940 border border-nb-gray-900 py-3 pl-4 pr-4 rounded-md flex gap-4 items-center"
          }
        >
          <div
            className={
              "h-9 w-9 shrink-0 bg-gradient-to-tr shadow-xl from-nb-gray-500 to-nb-gray-300 rounded-md flex items-center justify-center"
            }
          >
            <Disc3Icon size={16} />
          </div>
          <div>
            <div className={"text-sm font-medium"}>Operating System</div>
            <div className={"text-xs mt-0.5 text-nb-gray-300"}>
              Restrict access in your network based on the operating system of a
              peer.
            </div>
          </div>
          <div className={"ml-auto"}>
            <Button variant={"secondary"} size={"xs"}>
              <PlusIcon size={12} />
              Add Check
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"nb-client-check"}>
            <NetBirdIcon size={16} />
            Client Version
          </TabsTrigger>
          <TabsTrigger value={"location-check"}>
            <Globe2Icon size={16} />
            Location
          </TabsTrigger>
          <TabsTrigger value={"os-check"}>
            <MonitorSmartphoneIcon size={16} />
            Operating System
          </TabsTrigger>

          <TabsTrigger value={"general"}>
            <Text
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Name & Description
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"nb-client-check"} className={" px-8"}>
          <div className={cn("flex justify-between pb-4 gap-3")}>
            <div>
              <Label>NetBird Client Version</Label>
              <HelpText className={"max-w-[340px]"}>
                Only peers with the minimum specified NetBird client version
                will have access to the network.
              </HelpText>
            </div>

            <Input
              min={1}
              maxWidthClass={"max-w-[260px] mt-2"}
              type={"number"}
              placeholder={"All Versions"}
              customPrefix={"Min. Version"}
            />
          </div>
        </TabsContent>
        <TabsContent value={"location-check"} className={"pb-6 px-8"}>
          <div className={"mb-3"}>
            <div>
              <Label>Location & Region</Label>
              <HelpText>
                Add a location or region to restrict access in your network.
                Only peers that match the specified condition will be allowed to
                access the network.
              </HelpText>
            </div>

            <div className={"flex gap-2 mt-4"}>
              <SelectDropdown
                showSearch={true}
                value={country}
                onChange={setCountry}
                placeholder={"Search for a country..."}
                options={datadogRegions}
              />

              <SelectDropdown
                showSearch={true}
                placeholder={"Search for a state..."}
                value={state}
                onChange={setState}
                options={states}
              />
            </div>
            <Button variant={"dotted"} size={"sm"} className={"w-full mt-6"}>
              <PlusCircle size={16} />
              Add Location
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
