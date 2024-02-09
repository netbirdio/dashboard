import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { TabsContent, TabsTrigger } from "@components/Tabs";
import { cn } from "@utils/helpers";
import { FolderSearch, ShieldCheck } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";
import PostureCheckModal from "@/modules/access-control/posture-checks/PostureCheckModal";

type Props = {};

export const PostureChecksTabTrigger = ({}: Props) => {
  return (
    <TabsTrigger value={"posture-checks"}>
      <ShieldCheck size={16} />
      Posture Checks
    </TabsTrigger>
  );
};
export const PostureChecksTab = ({}: Props) => {
  const [nbVersionModal, setNbVersionModal] = useState(false);

  return (
    <TabsContent value={"posture-checks"} className={"px-8 pb-8 mt-3"}>
      <NoChecksCard />
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
