/**
 * The header's "Agent" toggle. Reveals the assistant panel by shrinking the
 * dashboard card — see `AssistantPanelContext`.
 */
"use client";

import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { AssistantIcon } from "./AssistantIcon";
import { useAssistantPanel } from "./AssistantPanelContext";

export function AssistantButton() {
  const { available, open, toggle } = useAssistantPanel();

  if (!available) return null;

  return (
    <Button
      size={"xs"}
      variant={"default-outline"}
      onClick={toggle}
      aria-expanded={open}
      aria-label={open ? "Close the agent" : "Open the NetBird agent"}
      className={cn(
        "h-[38px] px-3 text-[0.88rem]",
        // Held state while the panel is open — the button is a toggle, and
        // `default-outline`'s hover styling alone doesn't show that.
        open &&
          "!border-white !bg-white !text-nb-gray-950 hover:!bg-nb-gray-100",
      )}
    >
      <AssistantIcon size={16} />
      <span className="hidden sm:inline">Agent</span>
    </Button>
  );
}

export default AssistantButton;
