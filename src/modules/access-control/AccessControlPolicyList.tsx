import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MiniTable, MiniTableHead } from "@components/ui/MiniTable";
import TruncatedText from "@components/ui/TruncatedText";
import { cn } from "@utils/helpers";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Policy } from "@/interfaces/Policy";
import AccessControlPortsCell from "@/modules/access-control/table/AccessControlPortsCell";
import AccessControlProtocolCell from "@/modules/access-control/table/AccessControlProtocolCell";
import AccessControlSourcesCell from "@/modules/access-control/table/AccessControlSourcesCell";

type Props = {
  policies: Policy[];
  onEdit: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
};

/**
 * The policies that grant access to one destination (a resource, an exit
 * node), listed in its modal: name, source groups, protocol and ports.
 */
export default function AccessControlPolicyList({
  policies,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  if (policies.length === 0) return null;

  return (
    <MiniTable>
      <thead>
        <tr>
          <MiniTableHead className={"px-4"}>Name</MiniTableHead>
          <MiniTableHead className={"pl-5 pr-2"}>Source Groups</MiniTableHead>
          <MiniTableHead className={"px-4"}>Protocol & Ports</MiniTableHead>
          <MiniTableHead className={"pr-4 pl-2"} />
        </tr>
      </thead>
      <tbody>
        {policies.map((policy, index) => {
          return (
            <tr
              key={policy.id || `new-${index}`}
              onClick={() => onEdit(policy)}
              className="rounded-md hover:bg-nb-gray-900/30 cursor-pointer transition-all"
            >
              <td className="py-2.5 px-4 align-middle">
                <div
                  className={
                    "text-[13px] mt-1 flex items-center gap-2 leading-none font-medium text-nb-gray-300 group-hover:text-nb-gray-200 whitespace-nowrap"
                  }
                >
                  <div className={"self-start flex"}>
                    <CircleIcon
                      size={8}
                      active={policy.enabled}
                      className={cn("shrink-0 relative top-[5px]")}
                    />
                  </div>
                  <div className={"flex flex-col items-start justify-start"}>
                    <TruncatedText
                      text={policy.name}
                      maxWidth={"130px"}
                      className={"leading-normal"}
                    />
                    {policy.description && (
                      <div className={"text-nb-gray-400 text-xs"}>
                        <TruncatedText
                          text={policy.description}
                          maxWidth={"130px"}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-2.5 pl-5 pr-2 align-middle">
                <AccessControlSourcesCell
                  policy={policy}
                  hideEdit
                  disableRedirect
                />
              </td>
              <td className="py-2.5 pl-3 pr-2 align-middle">
                <div className={"flex items-center gap-2"}>
                  <AccessControlProtocolCell policy={policy} />
                  <AccessControlPortsCell policy={policy} visiblePorts={1} />
                </div>
              </td>

              <td className="py-2.5 pl-2 pr-3">
                <div
                  className="flex items-center gap-6 justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default-outline"
                        className="!px-3"
                        aria-label={`Actions for policy ${policy.name}`}
                      >
                        <MoreVertical size={16} className="shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-auto min-w-[200px]"
                      align="end"
                    >
                      <DropdownMenuItem onClick={() => onEdit(policy)}>
                        <div className="flex gap-3 items-center">
                          <Edit2 size={14} className="shrink-0" />
                          Edit Policy
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant={"danger"}
                        onClick={() => onDelete(policy)}
                      >
                        <div className="flex gap-3 items-center">
                          <Trash2 size={14} className="shrink-0" />
                          Delete Policy
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </MiniTable>
  );
}
