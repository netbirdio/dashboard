import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { TabsContent, TabsTrigger } from "@components/Tabs";
import { IconCirclePlus } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { FolderSearch, ShieldCheck } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";
import PostureCheckModal from "@/modules/access-control/posture-checks/PostureCheckModal";
import { PostureChecksSelectionModal } from "@/modules/access-control/posture-checks/PostureChecksSelectionModal";
import PostureCheckMinimalTable from "@/modules/access-control/posture-checks/table/PostureCheckMinimalTable";

type Props = {
  postureChecks: PostureCheck[];
  setPostureChecks: React.Dispatch<React.SetStateAction<PostureCheck[]>>;
};

export const PostureChecksTabTrigger = () => {
  return (
    <TabsTrigger value={"posture-checks"}>
      <ShieldCheck size={16} />
      Posture Checks
    </TabsTrigger>
  );
};
export const PostureChecksTab = ({
  postureChecks,
  setPostureChecks,
}: Props) => {
  const addPostureChecks = (checks: PostureCheck[]) => {
    setPostureChecks((prev) => {
      const previous = prev.map((check) => {
        const find = checks.find((c) => c.id === check.id);
        if (find) return find;
        return check;
      });

      const allChecks = [...previous, ...checks];

      return allChecks.filter(
        (check, index, self) =>
          self.findIndex((c) => c.id === check.id) === index,
      );
    });
  };

  const removePostureCheck = (check: PostureCheck) => {
    setPostureChecks((prev) => {
      return prev.filter((c) => c.id !== check.id);
    });
  };

  const [checkModal, setCheckModal] = useState(false);
  const [browseModal, setBrowseModal] = useState(false);
  const [currentEditCheck, setCurrentEditCheck] = useState<PostureCheck>();

  return (
    <TabsContent value={"posture-checks"} className={"px-8 pb-8 mt-3"}>
      {checkModal && (
        <PostureCheckModal
          open={checkModal}
          onOpenChange={setCheckModal}
          onSuccess={(check) => addPostureChecks([check])}
          postureCheck={currentEditCheck}
        />
      )}

      {browseModal && (
        <PostureChecksSelectionModal
          open={browseModal}
          onOpenChange={setBrowseModal}
          onSuccess={(check) => addPostureChecks(check)}
        />
      )}

      <div className={"flex flex-col gap-3"}>
        <PostureCheckMinimalTable
          data={postureChecks}
          onEditClick={(check) => {
            setCurrentEditCheck(check);
            setCheckModal(true);
          }}
          onAddClick={() => {
            setCurrentEditCheck(undefined);
            setCheckModal(true);
          }}
          onBrowseClick={() => {
            setCurrentEditCheck(undefined);
            setBrowseModal(true);
          }}
          onRemoveClick={removePostureCheck}
        />
      </div>
    </TabsContent>
  );
};

export function NoChecksCard({
  onAddClick,
  onBrowseClick,
}: {
  onAddClick: () => void;
  onBrowseClick: () => void;
}) {
  const { data: postureChecks } =
    useFetchApi<PostureCheck[]>("/posture-checks");

  return (
    <div>
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
        <Button
          variant={"secondary"}
          size={"xs"}
          disabled={postureChecks?.length == 0}
          onClick={onBrowseClick}
        >
          <FolderSearch size={14} />
          Browse Checks
        </Button>
        <Button variant={"primary"} size={"xs"} onClick={onAddClick}>
          <IconCirclePlus size={14} />
          New Check
        </Button>
      </div>
    </div>
  );
}
