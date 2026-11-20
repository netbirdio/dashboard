import { ToggleSwitch } from "@components/ToggleSwitch";
import * as React from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  exitNode: ExitNode;
};

export default function ExitNodeAutoApplyCell({ exitNode }: Readonly<Props>) {
  const permission = useExitNodePermissions();
  const { updateExitNode } = useExitNodes();

  const toggle = (auto_apply: boolean) =>
    updateExitNode(
      exitNode,
      { auto_apply },
      auto_apply
        ? "Auto Apply was enabled for the exit node"
        : "Auto Apply was disabled for the exit node",
    );

  return (
    <div className={"flex items-center"} onClick={(e) => e.stopPropagation()}>
      <ToggleSwitch
        checked={exitNode.auto_apply}
        size={"small"}
        onClick={() => toggle(!exitNode.auto_apply)}
        disabled={!permission?.update}
        aria-label={`Auto Apply ${exitNode.name}`}
      />
    </div>
  );
}
