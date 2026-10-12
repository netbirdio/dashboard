"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import { TabsContent } from "@components/Tabs";
import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { cn } from "@utils/helpers";
import { IconCirclePlus } from "@tabler/icons-react";
import {
  Edit,
  FolderSearch,
  MinusCircleIcon,
  MoreVertical,
  PlusCircle,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { AgentGuardrail } from "@/modules/agent-network/data/mockData";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import AgentGuardrailModal from "@/modules/agent-network/AgentGuardrailModal";
import AgentGuardrailBrowseModal from "@/modules/agent-network/AgentGuardrailBrowseModal";
import AgentGuardrailChecksCell from "@/modules/agent-network/AgentGuardrailChecksCell";

type Props = {
  guardrailIds: string[];
  setGuardrailIds: React.Dispatch<React.SetStateAction<string[]>>;
  // destinationProviderIds is the list of providers selected in the
  // policy. Forwarded to the guardrail modal so the Model Allowlist
  // restricts its options to models exposed by those providers.
  destinationProviderIds: string[];
};

export default function AgentPolicyGuardrailsTab({
  guardrailIds,
  setGuardrailIds,
  destinationProviderIds,
}: Readonly<Props>) {
  const { guardrails } = useAIProviders();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentGuardrail | undefined>(
    undefined,
  );
  const [browseOpen, setBrowseOpen] = useState(false);

  const attached = guardrailIds
    .map((id) => guardrails.find((g) => g.id === id))
    .filter((g): g is AgentGuardrail => Boolean(g));

  const removeAttached = (id: string) =>
    setGuardrailIds((prev) => prev.filter((gid) => gid !== id));

  return (
    <TabsContent value={"guardrails"} className={"px-8 pb-8 mt-3 relative"}>
      {createOpen && (
        <AgentGuardrailModal
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) setEditTarget(undefined);
          }}
          guardrail={editTarget}
          providerIds={destinationProviderIds}
          onSuccess={(g) => {
            setGuardrailIds((prev) =>
              prev.includes(g.id) ? prev : [...prev, g.id],
            );
            setCreateOpen(false);
            setEditTarget(undefined);
          }}
        />
      )}
      {browseOpen && (
        <AgentGuardrailBrowseModal
          open={browseOpen}
          onOpenChange={setBrowseOpen}
          alreadyAttached={guardrailIds}
          onSuccess={(ids) => {
            setGuardrailIds((prev) => Array.from(new Set([...prev, ...ids])));
            setBrowseOpen(false);
          }}
        />
      )}

      {attached.length > 0 ? (
        <div>
          <div className={"flex justify-between gap-10 mb-5 items-end"}>
            <div>
              <Label>
                {attached.length}{" "}
                {attached.length === 1 ? "Guardrail" : "Guardrails"}
              </Label>
              <HelpText className={"mb-0"}>
                Guardrails enforce model allowlists and prompt capture per
                request.
              </HelpText>
            </div>
            <div className={"flex items-center justify-center gap-4"}>
              <Button
                variant={"secondary"}
                size={"xs"}
                onClick={() => setBrowseOpen(true)}
              >
                <FolderSearch size={14} />
                Browse Guardrails
              </Button>
              <Button
                variant={"primary"}
                size={"xs"}
                onClick={() => {
                  setEditTarget(undefined);
                  setCreateOpen(true);
                }}
              >
                <PlusCircle size={14} />
                New Guardrail
              </Button>
            </div>
          </div>

          <div
            className={
              "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1"
            }
          >
            {attached.map((g) => (
              <div
                key={g.id}
                className={
                  "flex justify-between py-2 items-center hover:bg-nb-gray-900/30 rounded-md cursor-pointer px-4 transition-all"
                }
                onClick={() => {
                  setEditTarget(g);
                  setCreateOpen(true);
                }}
              >
                <GuardrailNameCell guardrail={g} />
                <div className={"flex gap-4 items-center"}>
                  <AgentGuardrailChecksCell guardrail={g} />
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger
                      asChild={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <Button variant={"default-outline"} className={"!px-3"}>
                        <MoreVertical size={16} className={"shrink-0"} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className={"w-auto min-w-[200px]"}
                      align={"end"}
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          setEditTarget(g);
                          setCreateOpen(true);
                        }}
                      >
                        <div className={"flex gap-3 items-center"}>
                          <Edit size={14} className={"shrink-0"} />
                          Edit Guardrail
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => removeAttached(g.id)}>
                        <div className={"flex gap-3 items-center"}>
                          <MinusCircleIcon size={14} className={"shrink-0"} />
                          Detach
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <NoGuardrailsInfo
          hasGuardrails={guardrails.length > 0}
          onBrowseClick={() => setBrowseOpen(true)}
          onAddClick={() => {
            setEditTarget(undefined);
            setCreateOpen(true);
          }}
        />
      )}
    </TabsContent>
  );
}

function GuardrailNameCell({ guardrail }: { guardrail: AgentGuardrail }) {
  return (
    <div className={"flex items-center gap-4 min-w-[350px]"}>
      <div className={"flex flex-col gap-0.5 min-w-0 max-w-[300px]"}>
        <div className={"text-sm text-nb-gray-100 truncate"}>
          {guardrail.name}
        </div>
        <DescriptionWithTooltip
          className={"text-xs"}
          text={guardrail.description}
          maxChars={30}
        />
      </div>
    </div>
  );
}

function NoGuardrailsInfo({
  hasGuardrails,
  onAddClick,
  onBrowseClick,
}: {
  hasGuardrails: boolean;
  onAddClick: () => void;
  onBrowseClick: () => void;
}) {
  return (
    <div>
      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          {"You haven't added any guardrails yet"}
        </h2>
        <Paragraph className={cn("text-sm text-center max-w-md mt-1")}>
          Add guardrails to enforce model allowlists and prompt capture per
          request.
        </Paragraph>
      </div>
      <div className={"flex items-center justify-center gap-4 mt-5"}>
        <Button
          variant={"secondary"}
          size={"xs"}
          disabled={!hasGuardrails}
          onClick={onBrowseClick}
        >
          <FolderSearch size={14} />
          Browse Guardrails
        </Button>
        <Button variant={"primary"} size={"xs"} onClick={onAddClick}>
          <IconCirclePlus size={14} />
          New Guardrail
        </Button>
      </div>
    </div>
  );
}
