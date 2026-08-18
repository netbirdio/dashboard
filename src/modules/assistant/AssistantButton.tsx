"use client";

import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { AssistantIcon } from "@/assets/icons/AssistantIcon";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";

export function AssistantButton() {
  const { available, open, toggle } = useAssistantSidebar();

  if (!available) return null;

  return (
    <Button
      size={"xs"}
      variant={"default-outline"}
      onClick={toggle}
      aria-expanded={open}
      aria-label={open ? "Close the assistant" : "Open the NetBird assistant"}
      className={cn(
        "h-[38px] px-3 text-[0.95rem]",
        open &&
          "!border-white !bg-white !text-nb-gray-950 hover:!bg-nb-gray-100",
      )}
    >
      <AssistantIcon size={16} />
      <span className="hidden sm:inline">Ask</span>
    </Button>
  );
}

export default AssistantButton;
