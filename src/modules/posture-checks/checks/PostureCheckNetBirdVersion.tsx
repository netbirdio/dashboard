import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { isEmpty } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { NetBirdVersionCheck } from "@/interfaces/PostureCheck";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  value?: NetBirdVersionCheck;
  onChange: (value: NetBirdVersionCheck | undefined) => void;
};

export const PostureCheckNetBirdVersion = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      active={value?.min_version !== undefined}
      title={"NetBird Client Version"}
      description={
        "Restrict access to peers with a specific NetBird client version."
      }
      icon={<NetBirdIcon size={18} />}
      modalWidthClass={"max-w-lg"}
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

const CheckContent = ({ value, onChange }: Props) => {
  const [version, setVersion] = useState(value?.min_version || "");

  return (
    <>
      <div className={"flex flex-col px-8 gap-3 pb-6"}>
        <div>
          <Label>Minimum required version</Label>
          <HelpText>
            Only peers with the minimum specified NetBird client version will
            have access to the network.
          </HelpText>
          <div>
            <Input
              className={"max-w-[200px]"}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder={"e.g., 0.25.0"}
              customPrefix={"Version"}
            />
          </div>
        </div>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={"#"} target={"_blank"}>
              Client Version Check
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
            onClick={() => {
              if (isEmpty(version)) {
                onChange(undefined);
              } else {
                onChange({ min_version: version });
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
