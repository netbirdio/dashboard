import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import {
  Edit,
  FolderSearch,
  MinusCircleIcon,
  MoreVertical,
  PlusCircle,
} from "lucide-react";
import React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckChecksCell } from "@/modules/posture-checks/table/cells/PostureCheckChecksCell";
import { PostureCheckNameCell } from "@/modules/posture-checks/table/cells/PostureCheckNameCell";
import { PostureCheckNoChecksInfo } from "@/modules/posture-checks/ui/PostureCheckNoChecksInfo";

type Props = {
  data: PostureCheck[];
  onAddClick: () => void;
  onBrowseClick: () => void;
  onRemoveClick: (check: PostureCheck) => void;
  onEditClick: (check: PostureCheck) => void;
};

export default function PostureCheckMinimalTable({
  data,
  onAddClick,
  onBrowseClick,
  onRemoveClick,
  onEditClick,
}: Props) {
  return data && data.length > 0 ? (
    <div className={""}>
      <div className={"flex justify-between gap-10 mb-5 items-end"}>
        <div>
          <Label>
            {data.length}{" "}
            {data.length == 1 ? "Posture Check" : "Posture Checks"}
          </Label>
          <HelpText className={"mb-0"}>
            Use posture checks to further restrict access in your network.
          </HelpText>
        </div>
        <div className={"flex items-center justify-center gap-4"}>
          <Button variant={"secondary"} size={"xs"} onClick={onBrowseClick}>
            <FolderSearch size={14} />
            Browse Checks
          </Button>
          <Button variant={"primary"} size={"xs"} onClick={onAddClick}>
            <PlusCircle size={14} />
            New Posture Check
          </Button>
        </div>
      </div>

      <div
        className={
          "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1"
        }
      >
        {data.map((check) => {
          return (
            <div
              key={check.id}
              className={
                "flex justify-between py-2 items-center hover:bg-nb-gray-900/30 rounded-md cursor-pointer px-4 transition-all"
              }
              onClick={() => onEditClick(check)}
            >
              <PostureCheckNameCell small={true} check={check} />
              <div className={"flex gap-4 items-center"}>
                <PostureCheckChecksCell check={check} />
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    asChild={true}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Button variant={"default-outline"} className={"!px-3"}>
                      <MoreVertical size={16} className={"shrink-0"} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-auto min-w-[200px]"
                    align="end"
                  >
                    <DropdownMenuItem onClick={() => onEditClick(check)}>
                      <div className={"flex gap-3 items-center"}>
                        <Edit size={14} className={"shrink-0"} />
                        Edit Posture Check
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRemoveClick(check)}>
                      <div className={"flex gap-3 items-center"}>
                        <MinusCircleIcon size={14} className={"shrink-0"} />
                        Remove Posture Check
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <PostureCheckNoChecksInfo
      onAddClick={onAddClick}
      onBrowseClick={onBrowseClick}
    />
  );
}
