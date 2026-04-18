import Badge from "@components/Badge";
import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import useFetchApi from "@utils/api";
import { ShieldCheck } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { InspectionPolicy } from "@/interfaces/Network";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (policies: InspectionPolicy[]) => void;
  existingIds: string[];
};

export const InspectionPolicyBrowseModal = ({
  open,
  onOpenChange,
  onSuccess,
  existingIds,
}: Props) => {
  const { data: allPolicies } =
    useFetchApi<InspectionPolicy[]>("/inspection-policies");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = (allPolicies ?? []).filter(
    (p) => p.id && !existingIds.includes(p.id),
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const selectedPolicies = available.filter(
      (p) => p.id && selected.has(p.id),
    );
    onSuccess(selectedPolicies);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-md">
        <ModalHeader
          icon={<ShieldCheck size={20} />}
          title="Browse Inspection Policies"
          description="Select inspection policies to attach to this access control policy."
          color="netbird"
        />

        <div className="px-8 py-4">
          {available.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-nb-gray-400">
                No inspection policies available. Create one from the
                Inspection Policies page first.
              </p>
            </div>
          ) : (
            <div
              className="rounded-md overflow-hidden border border-nb-gray-900
                         bg-nb-gray-920/30 py-1 px-1 max-h-[400px] overflow-y-auto"
            >
              {available.map((policy) => {
                const isSelected = policy.id
                  ? selected.has(policy.id)
                  : false;
                const ruleCount = policy.rules?.length ?? 0;
                const domains = (policy.rules ?? []).flatMap(
                  (r) => r.domains ?? [],
                );

                return (
                  <button
                    key={policy.id}
                    className={`flex items-center gap-3 w-full py-2.5 px-4
                               hover:bg-nb-gray-900/30 rounded-md transition-all text-left
                               ${isSelected ? "bg-nb-gray-900/40" : ""}`}
                    onClick={() => policy.id && toggleSelect(policy.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm text-nb-gray-100 truncate">
                        {policy.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-nb-gray-500">
                          {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
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
                            {policy.default_action}
                          </Badge>
                        )}
                        {domains.slice(0, 2).map((d) => (
                          <Badge
                            key={d}
                            variant="gray"
                            className="text-[10px] font-mono"
                          >
                            {d}
                          </Badge>
                        ))}
                        {domains.length > 2 && (
                          <span className="text-[10px] text-nb-gray-500">
                            +{domains.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ModalFooter className="items-center" separator={true}>
          <div className="flex gap-3 justify-end w-full">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button
              variant="primary"
              size="sm"
              disabled={selected.size === 0}
              onClick={handleAdd}
            >
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
