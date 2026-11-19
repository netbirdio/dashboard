import { ToggleSwitch } from "@components/ToggleSwitch";
import * as React from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  exitNode: ExitNode;
};

export default function ExitNodeActiveCell({ exitNode }: Readonly<Props>) {
  const permission = useExitNodePermissions();
  const { updateExitNode } = useExitNodes();

  const toggle = (enabled: boolean) =>
    updateExitNode(
      exitNode,
      { enabled },
      enabled
        ? "The exit node was successfully enabled"
        : "The exit node was successfully disabled",
    );

  return (
    <div className={"flex"} onClick={(e) => e.stopPropagation()}>
      <ToggleSwitch
        checked={exitNode.enabled}
        size={"small"}
        onClick={() => toggle(!exitNode.enabled)}
        disabled={!permission?.update}
        aria-label={`Enable ${exitNode.name}`}
      />
    </div>
  );
}
