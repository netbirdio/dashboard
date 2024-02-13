import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { TabsContent, TabsTrigger } from "@components/Tabs";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Disc3Icon, FlagIcon, FolderSearch, ShieldCheck } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";
import PostureCheckModal from "@/modules/access-control/posture-checks/PostureCheckModal";
import { PostureChecksSelectionModal } from "@/modules/access-control/posture-checks/PostureChecksSelectionModal";

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
  const [postureChecks, setPostureChecks] = useState<PostureCheck[]>([]);

  const addPostureChecks = (checks: PostureCheck[]) => {
    setPostureChecks((prev) => {
      const allChecks = [...prev, ...checks];
      return allChecks.filter(
        (check, index, self) =>
          self.findIndex((c) => c.id === check.id) === index,
      );
    });
  };

  return (
    <TabsContent value={"posture-checks"} className={"px-8 pb-8 mt-3"}>
      <div className={"flex flex-col gap-3"}>
        {postureChecks?.map((postureCheck) => (
          <div
            key={postureCheck.id}
            className={
              "bg-nb-gray-920 rounded-md border border-nb-gray-900 flex py-3 px-4 items-center justify-between gap-10"
            }
          >
            <div className={"flex flex-col gap-0.5 min-w-0"}>
              <div className={"text-sm text-nb-gray-100 truncate"}>
                {postureCheck.name}
              </div>
              <div className={"text-xs text-nb-gray-400 truncate "}>
                {postureCheck.description}
              </div>
            </div>
            <div className={"flex items-center gap-2"}>
              <div
                className={cn(
                  "bg-nb-gray-700 h-8 w-8 rounded-md flex items-center justify-center border border-nb-gray-600",
                  !postureCheck.checks.nb_version_check &&
                    "opacity-30 pointer-events-none",
                )}
              >
                <NetBirdIcon size={14} />
              </div>
              <div
                className={cn(
                  "bg-nb-gray-700 h-8 w-8 rounded-md flex items-center justify-center border border-nb-gray-600",
                  !postureCheck.checks.geo_location_check &&
                    "opacity-30 pointer-events-none",
                )}
              >
                <FlagIcon size={14} />
              </div>
              <div
                className={cn(
                  "bg-nb-gray-700 h-8 w-8 rounded-md flex items-center justify-center border border-nb-gray-600",
                  !postureCheck.checks.os_version_check &&
                    "opacity-30 pointer-events-none",
                )}
              >
                <Disc3Icon size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <NoChecksCard onAdd={addPostureChecks} />
    </TabsContent>
  );
};

export function NoChecksCard({
  onAdd,
}: {
  onAdd: (check: PostureCheck[]) => void;
}) {
  const [modal, setModal] = useState(false);
  const { data: postureChecks } =
    useFetchApi<PostureCheck[]>("/posture-checks");

  const addChecks = (checks: PostureCheck[]) => {
    setModal(false);
    onAdd(checks);
  };

  return (
    <>
      <PostureCheckModal
        open={modal}
        onOpenChange={setModal}
        onSuccess={(check) => addChecks([check])}
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
        <PostureChecksSelectionModal onAdd={onAdd}>
          <Button
            variant={"secondary"}
            size={"xs"}
            disabled={postureChecks?.length == 0}
          >
            <FolderSearch size={14} />
            Add existing check
          </Button>
        </PostureChecksSelectionModal>
        <Button variant={"primary"} size={"xs"} onClick={() => setModal(true)}>
          Create new check
        </Button>
      </div>
    </>
  );
}
