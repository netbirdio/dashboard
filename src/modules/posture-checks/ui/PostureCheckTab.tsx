import { TabsContent } from "@components/Tabs";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckBrowseModal } from "@/modules/posture-checks/modal/PostureCheckBrowseModal";
import PostureCheckModal from "@/modules/posture-checks/modal/PostureCheckModal";
import PostureCheckMinimalTable from "@/modules/posture-checks/table/PostureCheckMinimalTable";

type Props = {
  postureChecks: PostureCheck[];
  setPostureChecks: React.Dispatch<React.SetStateAction<PostureCheck[]>>;
  isLoading: boolean;
};

export const PostureCheckTab = ({
  postureChecks,
  setPostureChecks,
  isLoading,
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
    <TabsContent value={"posture_checks"} className={"px-8 pb-8 mt-3 relative"}>
      {isLoading && (
        <div className={"flex flex-col gap-2"}>
          <Skeleton width={"100%"} height={41} />
          <Skeleton width={"100%"} height={42} />
          <Skeleton width={"100%"} height={42} />
          <Skeleton width={"100%"} height={41} />
        </div>
      )}

      {!isLoading && (
        <>
          {checkModal && (
            <PostureCheckModal
              open={checkModal}
              onOpenChange={setCheckModal}
              onSuccess={(check) => {
                addPostureChecks([check]);
                setCheckModal(false);
              }}
              postureCheck={currentEditCheck}
            />
          )}

          {browseModal && (
            <PostureCheckBrowseModal
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
        </>
      )}
    </TabsContent>
  );
};
