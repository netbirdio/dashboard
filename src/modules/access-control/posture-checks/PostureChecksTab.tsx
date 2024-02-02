import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { TabsContent, TabsTrigger } from "@components/Tabs";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import {
  FolderSearch,
  Globe2Icon,
  ListTodo,
  MonitorSmartphoneIcon,
  PlusCircle,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";
import PostureCheckModal from "@/modules/access-control/posture-checks/PostureCheckModal";

type Props = {};

export const PostureChecksTabTrigger = ({}: Props) => {
  return (
    <TabsTrigger value={"posture-checks"}>
      <ListTodo size={16} />
      Posture Checks
    </TabsTrigger>
  );
};
export const PostureChecksTab = ({}: Props) => {
  const [nbVersionModal, setNbVersionModal] = useState(false);

  return (
    <TabsContent value={"posture-checks"} className={"px-8 pb-8 mt-3"}>
      <NoChecksCard />
      <div
        className={
          "bg-nb-gray-920 border border-nb-gray-900 rounded-md px-5 py-3 flex gap-3 justify-between mb-6 mt-10"
        }
      >
        <div className={"text-sm"}>
          <div className={"font-medium"}>Version check</div>
          <div className={"text-xs text-nb-gray-300"}>
            <TextWithTooltip
              text={
                "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam voluptatum."
              }
              maxChars={40}
            />
          </div>
        </div>
        <div className={"flex gap-2"}>
          <div
            className={
              "h-8  bg-nb-gray-700 flex items-center justify-center rounded-md gap-1 px-2"
            }
          >
            <NetBirdIcon size={16} />
            <div className={"text-[11px] text-nb-gray-300 font-medium"}>
              {"> 0.25"}
            </div>
          </div>
          <div
            className={cn(
              "h-8 w-8 bg-nb-gray-700 flex items-center justify-center rounded-md",
              "opacity-25",
            )}
          >
            <Globe2Icon size={16} />
          </div>
          <div
            className={cn(
              "h-8 w-8 bg-nb-gray-700 flex items-center justify-center rounded-md",
              "opacity-25",
            )}
          >
            <MonitorSmartphoneIcon size={16} />
          </div>
        </div>
      </div>
      <PostureCheckModal
        open={nbVersionModal}
        onOpenChange={setNbVersionModal}
      />
      <div className={"flex items-center gap-4 mt-5"}>
        <Button variant={"secondary"} size={"sm"}>
          <FolderSearch size={14} />
          Add existing check
        </Button>
        <Button
          variant={"dotted"}
          size={"sm"}
          className={"w-full"}
          onClick={() => setNbVersionModal(true)}
        >
          <PlusCircle size={14} />
          Add new check
        </Button>
      </div>
    </TabsContent>
  );
};

export function NoChecksCard() {
  const [nbVersionModal, setNbVersionModal] = useState(false);

  return (
    <>
      <PostureCheckModal
        open={nbVersionModal}
        onOpenChange={setNbVersionModal}
      />
      <PostureCheckIcons />

      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center mt-5"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          You haven't added any posture checks yet
        </h2>
        <Paragraph className={cn("text-sm text-center max-w-md mt-1")}>
          Add various posture checks to further restrict access in your network.
          E.g., only clients with a specific NetBird client version, operating
          system or location are allowed to connect.
        </Paragraph>
      </div>
      <div className={"flex items-center justify-center gap-4 mt-5"}>
        <Button variant={"secondary"} size={"xs"} disabled={true}>
          <FolderSearch size={14} />
          Add existing check
        </Button>
        <Button
          variant={"primary"}
          size={"xs"}
          onClick={() => setNbVersionModal(true)}
        >
          Create new check
        </Button>
      </div>
    </>
  );
}
