import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { RadioGroup, RadioGroupItem } from "@components/RadioGroup";
import cidr from "ip-cidr";
import { isEmpty, uniqueId } from "lodash";
import {
  ExternalLinkIcon,
  MinusCircleIcon,
  NetworkIcon,
  PlusCircle,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { PeerNetworkRangeCheck } from "@/interfaces/PostureCheck";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  value?: PeerNetworkRangeCheck;
  onChange: (value: PeerNetworkRangeCheck | undefined) => void;
};

export const PostureCheckPeerNetworkRange = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      icon={<NetworkIcon size={16} />}
      title={"Peer Network Range"}
      modalWidthClass={"max-w-xl"}
      description={
        "Restrict access by allowing or blocking peer network ranges."
      }
      iconClass={"bg-gradient-to-tr from-blue-500 to-blue-400"}
      active={value !== undefined}
      onReset={() => onChange(undefined)}
    >
      <CheckContent
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </PostureCheckCard>
  );
};

interface NetworkRange {
  id: string;
  value: string;
}

const CheckContent = ({ value, onChange }: Props) => {
  const [allowOrDeny, setAllowOrDeny] = useState<string>(
    value?.action ? value.action : "allow",
  );

  const [networkRanges, setNetworkRanges] = useState<NetworkRange[]>(
    value?.ranges
      ? value.ranges.map((r) => {
          return {
            id: uniqueId("range"),
            value: r,
          };
        })
      : [],
  );

  const handleNetworkRangeChange = (id: string, value: string) => {
    const newRanges = networkRanges.map((r) =>
      r.id === id ? { ...r, value } : r,
    );
    setNetworkRanges(newRanges);
  };

  const removeNetworkRange = (id: string) => {
    const newRanges = networkRanges.filter((r) => r.id !== id);
    setNetworkRanges(newRanges);
  };

  const addNetworkRange = () => {
    setNetworkRanges([...networkRanges, { id: uniqueId("range"), value: "" }]);
  };

  const validateNetworkRange = (networkRange: string) => {
    if (networkRange == "") return "";
    const validCIDR = cidr.isValidAddress(networkRange);
    if (!validCIDR) return "Please enter a valid CIDR, e.g., 192.168.1.0/24";
    return "";
  };

  const cidrErrors = useMemo(() => {
    if (networkRanges && networkRanges.length > 0) {
      return networkRanges.map((r) => {
        return {
          id: r.id,
          error: validateNetworkRange(r.value),
        };
      });
    } else {
      return [];
    }
  }, [networkRanges]);

  const hasErrorsOrIsEmpty = useMemo(() => {
    if (networkRanges.length === 0) return true;
    return cidrErrors.some((e) => e.error !== "");
  }, [networkRanges, cidrErrors]);

  return (
    <>
      <div className={"flex flex-col px-8 gap-2 pb-6"}>
        <div className={"flex justify-between items-start gap-10 mt-2"}>
          <div>
            <Label>Allow or Block Ranges</Label>
            <HelpText className={""}>
              Choose whether you want to allow or block specific peer network
              ranges
            </HelpText>
          </div>
          <RadioGroup value={allowOrDeny} onChange={setAllowOrDeny}>
            <RadioGroupItem value={"allow"} variant={"green"}>
              <ShieldCheck size={16} />
              Allow
            </RadioGroupItem>
            <RadioGroupItem value={"deny"} variant={"red"}>
              <ShieldXIcon size={16} />
              Block
            </RadioGroupItem>
          </RadioGroup>
        </div>
        {networkRanges.length > 0 && (
          <div className={"mb-2 flex flex-col gap-2 w-full "}>
            {networkRanges.map((ipRange) => {
              return (
                <div key={ipRange.id} className={"flex gap-2"}>
                  <div className={"w-full"}>
                    <Input
                      customPrefix={<NetworkIcon size={16} />}
                      placeholder={"e.g., 172.16.0.0/16"}
                      value={ipRange.value}
                      error={cidrErrors.find((e) => e.id === ipRange.id)?.error}
                      errorTooltip={false}
                      className={"font-mono !text-[13px] w-full"}
                      onChange={(e) =>
                        handleNetworkRangeChange(ipRange.id, e.target.value)
                      }
                    />
                  </div>

                  <Button
                    className={"h-[42px]"}
                    variant={"default-outline"}
                    onClick={() => removeNetworkRange(ipRange.id)}
                  >
                    <MinusCircleIcon size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <Button variant={"dotted"} size={"sm"} onClick={addNetworkRange}>
          <PlusCircle size={16} />
          Add Network Range
        </Button>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/manage-posture-checks#peer-network-range-check"
              }
              target={"_blank"}
            >
              Peer Network Range Check
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            disabled={hasErrorsOrIsEmpty}
            onClick={() => {
              if (isEmpty(networkRanges)) {
                onChange(undefined);
              } else {
                onChange({
                  action: allowOrDeny as "allow" | "deny",
                  ranges: networkRanges
                    .map((r) => r.value)
                    .filter((r) => r !== ""),
                });
              }
            }}
          >
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
};
