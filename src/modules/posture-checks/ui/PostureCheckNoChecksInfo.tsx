import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { IconCirclePlus } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { FolderSearch } from "lucide-react";
import * as React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";

export function PostureCheckNoChecksInfo({
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
      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          {"You haven't added any posture checks yet"}
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
          New Posture Check
        </Button>
      </div>
    </div>
  );
}
