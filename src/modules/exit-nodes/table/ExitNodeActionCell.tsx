import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MoreVertical, PowerIcon, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  exitNode: ExitNode;
};

export default function ExitNodeActionCell({ exitNode }: Readonly<Props>) {
  const permission = useExitNodePermissions();
  const { openExitNodeModal, updateExitNode, deleteExitNode } = useExitNodes();
  const [open, setOpen] = useState(false);
  const canUpdate = !!permission?.update;
  const canDelete = !!permission?.delete;

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled={!canUpdate && !canDelete}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            disabled={!canUpdate && !canDelete}
            aria-label={"Exit node actions"}
            data-testid={"exit-node-actions"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-auto"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={() => openExitNodeModal(exitNode)}
            disabled={!canUpdate}
          >
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit
            </div>
          </DropdownMenuItem>
          {/* The Active column hides on narrow screens; this keeps the toggle reachable. */}
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              updateExitNode(
                exitNode,
                { enabled: !exitNode.enabled },
                exitNode.enabled
                  ? "The exit node was successfully disabled"
                  : "The exit node was successfully enabled",
              );
            }}
            disabled={!canUpdate}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {exitNode.enabled ? "Disable" : "Enable"}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => deleteExitNode(exitNode)}
            data-testid={"exit-node-delete"}
            variant={"danger"}
            disabled={!canDelete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
