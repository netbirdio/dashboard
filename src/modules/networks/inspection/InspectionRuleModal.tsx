import Button from "@components/Button";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import {
  InspectionAction,
  InspectionRule,
  NetworkRouter,
} from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  router: NetworkRouter;
  rule?: InspectionRule;
  onClose: () => void;
};

export const InspectionRuleModal = ({ router, rule, onClose }: Props) => {
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();
  const isEdit = !!rule?.id;

  const [name, setName] = useState(rule?.name ?? "");
  const [domains, setDomains] = useState(rule?.domains?.join(", ") ?? "");
  const [networks, setNetworks] = useState(rule?.networks?.join(", ") ?? "");
  const [ports, setPorts] = useState(rule?.ports?.join(", ") ?? "");
  const [action, setAction] = useState<InspectionAction>(
    rule?.action ?? "block",
  );
  const [priority, setPriority] = useState(String(rule?.priority ?? 1));

  const update = useApiCall<NetworkRouter>(
    `/networks/${network?.id}/routers/${router?.id}`,
  ).put;

  const handleSubmit = async () => {
    const newRule: InspectionRule = {
      id: rule?.id,
      name,
      enabled: rule?.enabled ?? true,
      domains: domains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      networks: networks
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
      ports: ports
        .split(",")
        .map((p) => parseInt(p.trim()))
        .filter((p) => !isNaN(p)),
      action,
      priority: parseInt(priority) || 1,
    };

    let updatedRules: InspectionRule[];
    if (isEdit) {
      updatedRules =
        router.inspection?.rules?.map((r) =>
          r.id === rule?.id ? newRule : r,
        ) ?? [];
    } else {
      updatedRules = [...(router.inspection?.rules ?? []), newRule];
    }

    notify({
      title: "Inspection Rule",
      description: isEdit ? "Rule updated" : "Rule created",
      loadingMessage: isEdit ? "Updating rule..." : "Creating rule...",
      promise: update({
        ...router,
        inspection: { ...router.inspection!, rules: updatedRules },
      }).then(() => {
        mutate(`/networks/${network?.id}/routers`);
        onClose();
      }),
    });
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent maxWidthClass="max-w-md">
        <ModalHeader
          title={isEdit ? "Edit Inspection Rule" : "Add Inspection Rule"}
          description="Define a domain-based inspection rule for traffic passing through this routing peer."
          color="netbird"
        />

        <div className="px-8 flex flex-col gap-4 py-4">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Block gambling sites"
            />
          </div>

          <div>
            <Label>
              Domains{" "}
              <span className="text-nb-gray-500 font-normal">
                (comma-separated, supports *.example.com)
              </span>
            </Label>
            <Input
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              placeholder="*.gambling.com, *.betting.com"
            />
          </div>

          <div>
            <Label>
              Destination Networks{" "}
              <span className="text-nb-gray-500 font-normal">
                (optional CIDRs)
              </span>
            </Label>
            <Input
              value={networks}
              onChange={(e) => setNetworks(e.target.value)}
              placeholder="10.0.0.0/8"
            />
          </div>

          <div>
            <Label>
              Ports{" "}
              <span className="text-nb-gray-500 font-normal">
                (optional, comma-separated)
              </span>
            </Label>
            <Input
              value={ports}
              onChange={(e) => setPorts(e.target.value)}
              placeholder="443, 8443"
            />
          </div>

          <div>
            <Label>Action</Label>
            <div className="flex gap-2">
              {(["allow", "block", "inspect"] as InspectionAction[]).map(
                (a) => (
                  <button
                    key={a}
                    onClick={() => setAction(a)}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      action === a
                        ? a === "block"
                          ? "bg-red-500/10 border-red-500 text-red-400"
                          : a === "inspect"
                            ? "bg-yellow-500/10 border-yellow-500 text-yellow-400"
                            : "bg-green-500/10 border-green-500 text-green-400"
                        : "border-nb-gray-700 text-nb-gray-400 hover:border-nb-gray-500"
                    }`}
                  >
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <Label>Priority</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="1"
              min={1}
            />
            <p className="text-xs text-nb-gray-500 mt-1">
              Lower values are evaluated first.
            </p>
          </div>
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
              disabled={!name}
              onClick={handleSubmit}
            >
              {isEdit ? "Save Rule" : "Add Rule"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
