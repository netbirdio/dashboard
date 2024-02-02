import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { IconCircleFilled } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { MinusIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";

type Props = {};
export const ClientVersionCheck = ({}: Props) => {
  const [active, setActive] = useState(false);

  return (
    <div
      className={
        "bg-nb-gray-920/80 border border-nb-gray-900 rounded-md flex flex-col items-center"
      }
    >
      <div className={"flex gap-4 items-center w-full px-4 py-3"}>
        <div
          className={
            "h-9 w-9 shrink-0 bg-gradient-to-tr shadow-xl from-netbird-200 to-netbird-100 rounded-md flex items-center justify-center"
          }
        >
          <NetBirdIcon size={18} />
        </div>
        <div>
          <div className={"text-sm font-medium flex gap-2 items-center"}>
            NetBird Client Version
            <IconCircleFilled
              size={10}
              className={cn(active ? "text-green-500" : "text-nb-gray-500")}
            />
          </div>
          <div className={"text-xs mt-0.5 text-nb-gray-300"}>
            Restrict access to peers with a specific NetBird client version.
          </div>
        </div>
        <div className={"ml-auto"}>
          {active ? (
            <Button
              variant={"default-outline"}
              size={"xs"}
              onClick={() => setActive(false)}
            >
              <MinusIcon size={12} />
              Remove
            </Button>
          ) : (
            <Button
              variant={"secondary"}
              size={"xs"}
              onClick={() => setActive(true)}
            >
              <PlusIcon size={12} />
              Add Check
            </Button>
          )}
        </div>
      </div>

      {active && (
        <div
          className={
            "flex justify-between border-t border-nb-gray-800/70 bg-nb-gray-920 px-4 w-full py-4 items-center"
          }
        >
          <HelpText className={"max-w-[340px] mb-0"}>
            Only peers with the minimum specified NetBird client version will
            have access to the network.
          </HelpText>
          <Input
            min={1}
            maxWidthClass={"max-w-[260px]"}
            type={"number"}
            placeholder={"All Versions"}
            customPrefix={"Min. Version"}
          />
        </div>
      )}
    </div>
  );
};
