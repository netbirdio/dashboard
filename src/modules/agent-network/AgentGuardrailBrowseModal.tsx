"use client";

import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { cn } from "@utils/helpers";
import { ShieldHalf } from "lucide-react";
import React, { useState } from "react";
import { AgentGuardrail } from "@/modules/agent-network/data/mockData";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAttached: string[];
  onSuccess: (ids: string[]) => void;
};

export default function AgentGuardrailBrowseModal({
  open,
  onOpenChange,
  alreadyAttached,
  onSuccess,
}: Readonly<Props>) {
  const { guardrails } = useAIProviders();
  const [selected, setSelected] = useState<string[]>([]);

  React.useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const available = guardrails.filter((g) => !alreadyAttached.includes(g.id));

  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<ShieldHalf size={19} />}
          title={"Browse Guardrails"}
          description={"Pick one or more existing guardrails to attach."}
          color={"netbird"}
        />
        <div className={"px-8 pb-2"}>
          {available.length === 0 ? (
            <div className={"text-sm text-nb-gray-300 py-6 text-center"}>
              No more guardrails available — all defined guardrails are already
              attached.
            </div>
          ) : (
            <div className={"space-y-1.5 max-h-[420px] overflow-y-auto"}>
              {available.map((g) => (
                <GuardrailRow
                  key={g.id}
                  guardrail={g}
                  checked={selected.includes(g.id)}
                  onToggle={() => toggle(g.id)}
                />
              ))}
            </div>
          )}
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
            <Button
              variant={"primary"}
              onClick={() => onSuccess(selected)}
              disabled={selected.length === 0}
            >
              Attach{" "}
              {selected.length > 0
                ? `${selected.length} Guardrail${selected.length === 1 ? "" : "s"}`
                : "Guardrails"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function GuardrailRow({
  guardrail,
  checked,
  onToggle,
}: {
  guardrail: AgentGuardrail;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors",
        checked
          ? "border-netbird/40 bg-netbird/5"
          : "border-nb-gray-800 bg-nb-gray-900/20 hover:border-nb-gray-700",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <div className={"flex-1 min-w-0"}>
        <div className={"text-sm text-white"}>{guardrail.name}</div>
        {guardrail.description && (
          <div className={"text-[11px] text-nb-gray-400 mt-0.5"}>
            {guardrail.description}
          </div>
        )}
      </div>
    </label>
  );
}
