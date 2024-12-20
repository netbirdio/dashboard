import MultipleGroups from "@components/ui/MultipleGroups";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";

type Props = {
  resource?: NetworkResource;
};
export const ResourceGroupCell = ({ resource }: Props) => {
  return (
    <div className={"flex"}>
      <MultipleGroups groups={resource?.groups as Group[]} />
    </div>
  );
};
