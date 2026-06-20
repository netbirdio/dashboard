import { TabsContent } from "@components/Tabs";
import { cn } from "@utils/helpers";
import { Trash2Icon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useIsFeatureLocked } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { LockedFeatureBadge } from "@/modules/billing/locked-feature/LockedFeatureBadge";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
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

  const isLocked = useIsFeatureLocked("POSTURE_CHECKS");

  const removeAllChecks = () => {
    setPostureChecks([]);
  };

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
      {isLocked && !isLoading && (
        <div
          className={cn(
            "relative flex  mb-3 justify-center items-center",
            postureChecks.length > 0
              ? "absolute left-0 top-0 w-full h-full z-10"
              : "",
          )}
        >
          <div className={"flex items-center flex-col"}>
            <LockedFeatureBadge
              position={"relative"}
              side={"bottom"}
              featureText={"Posture Checks"}
              feature={"POSTURE_CHECKS"}
            />
            {postureChecks.length > 0 && (
              <button
                onClick={removeAllChecks}
                className={
                  "text-center mt-4 text-xs text-red-500 flex items-center leading-none hover:bg-red-900/40 py-2 px-3 rounded-full transition-all border border-transparent hover:border-red-500"
                }
              >
                <Trash2Icon size={13} className={"mr-1"} />
                Remove Checks
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && (
        <LockedFeatureOverlay
          opacity={postureChecks.length > 0 ? 35 : 60}
          feature={"POSTURE_CHECKS"}
        >
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
        </LockedFeatureOverlay>
      )}
    </TabsContent>
  );
};
