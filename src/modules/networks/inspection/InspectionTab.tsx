import Badge from "@components/Badge";
import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import { TabsContent } from "@components/Tabs";
import { cn } from "@utils/helpers";
import useFetchApi from "@utils/api";
import {
  Edit,
  Eye,
  FolderSearch,
  MinusCircleIcon,
  MoreVertical,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { InspectionPolicy } from "@/interfaces/Network";
import { InspectionPolicyBrowseModal } from "@/modules/networks/inspection/InspectionPolicyBrowseModal";
import { InspectionPolicyModal } from "@/modules/networks/inspection/InspectionPolicyModal";

type Props = {
  inspectionPolicies: InspectionPolicy[];
  setInspectionPolicies: React.Dispatch<
    React.SetStateAction<InspectionPolicy[]>
  >;
  isLoading: boolean;
};

export const InspectionTab = ({
  inspectionPolicies,
  setInspectionPolicies,
  isLoading,
}: Props) => {
  const { permission } = usePermissions();
  const [browseModal, setBrowseModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<
    InspectionPolicy | undefined
  >();

  const { data: allInspectionPolicies } =
    useFetchApi<InspectionPolicy[]>("/inspection-policies");

  const addPolicies = (policies: InspectionPolicy[]) => {
    setInspectionPolicies((prev) => {
      const allPolicies = [...prev, ...policies];
      return allPolicies.filter(
        (p, index, self) => self.findIndex((c) => c.id === p.id) === index,
      );
    });
  };

  const removePolicy = (policy: InspectionPolicy) => {
    setInspectionPolicies((prev) => prev.filter((p) => p.id !== policy.id));
  };

  return (
    <TabsContent value={"inspection"} className={"px-8 pb-8 mt-3 relative"}>
      {isLoading && (
        <div className={"flex flex-col gap-2"}>
          <Skeleton width={"100%"} height={41} />
          <Skeleton width={"100%"} height={42} />
        </div>
      )}

      {!isLoading && (
        <>
          {browseModal && (
            <InspectionPolicyBrowseModal
              open={browseModal}
              onOpenChange={setBrowseModal}
              onSuccess={(policies) => addPolicies(policies)}
              existingIds={inspectionPolicies
                .map((p) => p.id)
                .filter(Boolean) as string[]}
            />
          )}

          {editModal && (
            <InspectionPolicyModal
              policy={editingPolicy}
              onClose={() => {
                setEditModal(false);
                setEditingPolicy(undefined);
              }}
            />
          )}

          {inspectionPolicies.length > 0 ? (
            <div>
              <div className="flex justify-between gap-10 mb-5 items-end">
                <div>
                  <Label>
                    {inspectionPolicies.length} Inspection{" "}
                    {inspectionPolicies.length === 1 ? "Policy" : "Policies"}
                  </Label>
                  <HelpText className="mb-0">
                    Attached inspection policies define how traffic through this
                    policy is inspected by the transparent proxy.
                  </HelpText>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setBrowseModal(true)}
                    disabled={
                      !permission.policies.create || !permission.policies.update
                    }
                  >
                    <FolderSearch size={14} />
                    Browse Policies
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      setEditingPolicy(undefined);
                      setEditModal(true);
                    }}
                    disabled={
                      !permission.policies.create || !permission.policies.update
                    }
                  >
                    <PlusCircle size={14} />
                    New Policy
                  </Button>
                </div>
              </div>

              <div
                className="rounded-md overflow-hidden border border-nb-gray-900
                           bg-nb-gray-920/30 py-1 px-1"
              >
                {inspectionPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className="flex justify-between py-2 items-center
                               hover:bg-nb-gray-900/30 rounded-md cursor-pointer px-4
                               transition-all"
                    onClick={() => {
                      if (
                        permission.policies.update ||
                        permission.policies.create
                      ) {
                        setEditingPolicy(policy);
                        setEditModal(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-[350px]">
                      <div className="flex flex-col gap-0.5 min-w-0 max-w-[300px]">
                        <div className="text-sm text-nb-gray-100 truncate">
                          {policy.name}
                        </div>
                        <div className="text-xs text-nb-gray-500 flex gap-2 items-center">
                          <span>
                            {policy.rules?.length ?? 0} rule
                            {(policy.rules?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                          {policy.default_action && (
                            <Badge
                              variant={
                                policy.default_action === "block"
                                  ? "red"
                                  : policy.default_action === "inspect"
                                    ? "yellow"
                                    : "green"
                              }
                              className="text-[10px]"
                            >
                              default: {policy.default_action}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 items-center">
                      {/* Domain preview badges */}
                      <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                        {(policy.rules ?? [])
                          .flatMap((r) => r.domains ?? [])
                          .slice(0, 2)
                          .map((d) => (
                            <Badge
                              key={d}
                              variant="gray"
                              className="text-[10px] font-mono"
                            >
                              {d}
                            </Badge>
                          ))}
                      </div>

                      {(permission.policies.update ||
                        permission.policies.create) && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <Button
                              variant="default-outline"
                              className="!px-3"
                            >
                              <MoreVertical size={16} className="shrink-0" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-auto min-w-[200px]"
                            align="end"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingPolicy(policy);
                                setEditModal(true);
                              }}
                              disabled={!permission.policies.update}
                            >
                              <div className="flex gap-3 items-center">
                                <Edit size={14} className="shrink-0" />
                                Edit Policy
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => removePolicy(policy)}
                              disabled={!permission.policies.delete}
                            >
                              <div className="flex gap-3 items-center">
                                <MinusCircleIcon
                                  size={14}
                                  className="shrink-0"
                                />
                                Remove from Policy
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mx-auto text-center flex flex-col items-center justify-center">
                <h2 className="text-lg my-0 leading-[1.5] text-center">
                  No inspection policies attached
                </h2>
                <Paragraph className={cn("text-sm text-center max-w-md mt-1")}>
                  Attach inspection policies to enable transparent proxy traffic
                  inspection. Rules define which domains to block, allow, or
                  inspect via MITM.
                </Paragraph>
              </div>
              <div className="flex items-center justify-center gap-4 mt-5">
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={
                    allInspectionPolicies?.length === 0 ||
                    !permission.policies.create ||
                    !permission.policies.update
                  }
                  onClick={() => setBrowseModal(true)}
                >
                  <FolderSearch size={14} />
                  Browse Policies
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    setEditingPolicy(undefined);
                    setEditModal(true);
                  }}
                  disabled={
                    !permission.policies.create || !permission.policies.update
                  }
                >
                  <PlusCircle size={14} />
                  New Inspection Policy
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </TabsContent>
  );
};
