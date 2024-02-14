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
import { NoChecksCard } from "@/modules/access-control/posture-checks/PostureChecksTab";
import { PostureCheckChecksCell } from "@/modules/access-control/posture-checks/table/PostureCheckChecksCell";
import { PostureCheckNameCell } from "@/modules/access-control/posture-checks/table/PostureCheckNameCell";

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
          <Label> {data.length} Posture Checks</Label>
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
            New Check
          </Button>
        </div>
      </div>

      <div
        className={
          "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-2 px-6"
        }
      >
        {data.map((check) => {
          return (
            <div
              key={check.id}
              className={"flex justify-between py-2 items-center"}
            >
              <PostureCheckNameCell check={check} />
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
                        Edit Check
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRemoveClick(check)}>
                      <div className={"flex gap-3 items-center"}>
                        <MinusCircleIcon size={14} className={"shrink-0"} />
                        Remove Check
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
    <NoChecksCard onAddClick={onAddClick} onBrowseClick={onBrowseClick} />
  );
}
