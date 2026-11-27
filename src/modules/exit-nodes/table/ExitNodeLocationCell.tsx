import * as React from "react";
import { useMemo } from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import { getExitNodeLocations } from "@/modules/exit-nodes/exitNodeHelpers";
import ExitNodeLocations from "@/modules/exit-nodes/ExitNodeLocations";
import { useExitNodes } from "@/modules/exit-nodes/ExitNodesProvider";

type Props = {
  exitNode: ExitNode;
};

/** Overlapping flags of the countries where traffic exits, primary first. */
export default function ExitNodeLocationCell({ exitNode }: Readonly<Props>) {
  const { peers } = useExitNodes();
  const { countries, locations } = useMemo(
    () => getExitNodeLocations(exitNode, peers),
    [exitNode, peers],
  );
  if (countries.length === 0) return null;

  return (
    <div className={"flex"} onClick={(e) => e.stopPropagation()}>
      <ExitNodeLocations countries={countries} locations={locations} />
    </div>
  );
}
