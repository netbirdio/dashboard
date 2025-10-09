import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import useFetchApi from "@utils/api";
import { Handle, type Node, Position } from "@xyflow/react";
import { sortBy } from "lodash";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { Group } from "@/interfaces/Group";

type NodeProps = Node<
  {
    currentGroup: string;
    onChange: (id: string) => void;
  },
  "selectGroupNode"
>;

export const SelectGroupNode = ({ data, id }: NodeProps) => {
  const { data: groups, isLoading: isGroupsLoading } =
    useFetchApi<Group[]>("/groups");

  const groupOptions: SelectOption[] = sortBy(
    groups?.map(
      (g) =>
        ({
          value: g.id,
          label: g.name,
          icon: () => (
            <GroupBadgeIcon id={g?.id} issued={g?.issued} size={14} />
          ),
        }) as SelectOption,
    ) || [],
    "label",
    "asc",
  );

  const group = groups?.find((g) => g.id === data.currentGroup);

  const countLabel = useMemo(() => {
    const peerCount = group?.peers_count || 0;
    const resourceCount = group?.resources_count || 0;
    if (resourceCount === 0) {
      return `${peerCount} Peer(s)`;
    }
    if (peerCount === 0) {
      return `${resourceCount} Resource(s)`;
    }
    return `${peerCount} Peer(s), ${resourceCount} Resource(s)`;
  }, [group]);

  return (
    <div
      className={
        "bg-nb-gray-930 border hover:bg-nb-gray-910 cursor-pointer border-nb-gray-800 rounded-lg overflow-hidden transition-all"
      }
    >
      <SelectDropdown
        variant={"secondary"}
        value={data.currentGroup}
        onChange={data.onChange}
        options={groupOptions}
        showSearch={true}
        searchPlaceholder={"Search groups..."}
        popoverWidth={280}
        className={"!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300"}
        size={"xs"}
        maxHeight={300}
      >
        <div className={"flex items-center justify-between gap-8 pr-3"}>
          {group && (
            <div
              className={
                "flex w-full items-center justify-between text-nb-gray-300 gap-2 text-sm pl-3 pr-5 py-3 font-normal"
              }
            >
              <div className={"flex items-center gap-3 font-normal text-sm"}>
                <div
                  className={
                    "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"
                  }
                >
                  <GroupBadgeIcon
                    id={group?.id}
                    issued={group?.issued}
                    size={14}
                  />
                </div>
                <div>
                  <div
                    className={
                      " text-nb-gray-200 font-normal whitespace-nowrap text-left"
                    }
                  >
                    {group.name}
                  </div>
                  <div
                    className={
                      "text-nb-gray-400 whitespace-nowrap text-xs text-left"
                    }
                  >
                    {countLabel}
                  </div>
                </div>
              </div>
            </div>
          )}
          <ChevronsUpDown size={18} className={"shrink-0"} />
        </div>
      </SelectDropdown>
      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        style={{
          height: 20,
          width: "1px",
          border: "none",
          backgroundColor: "#3f444b",
          borderRadius: "0px 4px 4px 0px",
          right: -2,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
      />
    </div>
  );
};
