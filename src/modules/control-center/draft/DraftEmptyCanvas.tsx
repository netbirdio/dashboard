import * as React from "react";
import { useContext } from "react";
import { cn } from "@utils/helpers";
import Paragraph from "@components/Paragraph";
import Button from "@components/Button";
import DragAndDropContext from "@/modules/control-center/DragAndDropProvider";
import SquareIcon from "@components/SquareIcon";
import {
  BoxesIcon,
  Building2Icon,
  CirclePlusIcon,
  HouseIcon,
  LaptopIcon,
  LucideIcon,
} from "lucide-react";
import { useStore } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

export type DraftTemplateId = "remote-access" | "business-vpn" | "homelab";

type DraftTemplate = {
  id: DraftTemplateId;
  title: string;
  description: string;
  icon: LucideIcon;
};

const TEMPLATES: DraftTemplate[] = [
  {
    id: "remote-access",
    title: "Remote Access",
    description: "Give your team secure access to internal apps and servers.",
    icon: LaptopIcon,
  },
  {
    id: "business-vpn",
    title: "Business VPN",
    description: "Route company traffic through trusted exit nodes.",
    icon: Building2Icon,
  },
  {
    id: "homelab",
    title: "Homelab",
    description: "Reach the services running at home from anywhere.",
    icon: HouseIcon,
  },
];

// Shown on the draft canvas when it has no nodes. Mirrors the GetStartedTest
// layout/spacing used by the live empty states (so it sits at the same place)
// but without the Card background, then adds the start actions below.
export const DraftEmptyCanvas = () => {
  const { isDraft, componentsPanelOpen, setComponentsPanelOpen, startedBlank } =
    useDraftMode();
  // Only emptiness matters — a nodes-array subscription re-rendered this on
  // every drag tick.
  const isEmpty = useStore((s) => s.nodes.length === 0);
  // Only read isDragging from the context — the useDragAndDrop() hook
  // registers its own drop listener and would double-fire the drop action.
  const dragContext = useContext(DragAndDropContext);
  const isDragging = dragContext?.isDragging ?? false;

  // Start screen: only while the draft canvas is empty. Once the components
  // picker opens (and while dragging) it dims and lets pointer events
  // through so drops land on the canvas beneath.
  const dimmed = componentsPanelOpen || isDragging;

  // Suppressed for a blank draft — the user explicitly chose an empty canvas.
  if (!isDraft || !isEmpty || startedBlank) return null;

  // Both the button and the templates open the components panel. TODO:
  // templates should prefill a starter topology instead.
  const handleStart = (_id?: DraftTemplateId) => {
    setComponentsPanelOpen(true);
  };

  return (
    <div
      className={cn(
        // draft-empty-canvas marks the overlay for CanvasContextMenu — a
        // right-click here counts as a canvas right-click.
        "draft-empty-canvas absolute left-0 top-0 w-full mt-28 z-10 pointer-events-none",
        // Fade matches the components panel animation (0.1s ease-out).
        "transition-opacity duration-100 ease-out",
        dimmed && "opacity-0",
      )}
    >
      <div
        className={cn(
          "px-8 mt-8",
          dimmed ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        <div className={"flex flex-col items-center py-8"}>
          {/* Header — mirrors GetStartedTest spacing (mt-8 + py-8 + p-8). */}
          <div
            className={
              "max-w-lg text-center flex flex-col gap-2 px-8 pt-8 pb-4"
            }
          >
            <div className={"mx-auto"}>
              <SquareIcon
                icon={<BoxesIcon className={"text-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            </div>
            <div className={"text-center"}>
              <h1 className={"text-3xl font-medium max-w-lg mx-auto mt-3"}>
                Draft your changes
              </h1>
              <Paragraph className={"justify-center mt-3 mb-3"}>
                Add, connect, and edit peers, groups, policies, and networks on
                the canvas. Nothing goes live until you review and deploy your
                changes together.
              </Paragraph>
            </div>
          </div>

          {/* Primary action — build from scratch. */}
          <div className={"flex justify-center"}>
            <Button
              variant={"primary"}
              size={"sm"}
              onClick={() => handleStart()}
              data-testid={"cc-draft-start-blank"}
            >
              <CirclePlusIcon size={16} />
              Build your own
            </Button>
          </div>

          {/* Templates. */}
          <div className={"max-w-2xl w-full flex flex-col"}>
            <div className={"flex items-center gap-3 mt-8 mb-4"}>
              <div className={"h-px flex-1 bg-nb-gray-900"} />
              <span className={"text-xs text-nb-gray-400 whitespace-nowrap"}>
                Or pick a starting point
              </span>
              <div className={"h-px flex-1 bg-nb-gray-900"} />
            </div>
            <div className={"grid grid-cols-3 gap-3 w-full"}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleStart(tpl.id)}
                  className={cn(
                    "flex flex-col items-start justify-between text-left rounded-lg border border-nb-gray-900 bg-nb-gray-940 px-4 py-4 min-h-[132px] transition-colors",
                    "hover:border-nb-gray-700 hover:bg-nb-gray-930",
                  )}
                >
                  <tpl.icon size={18} className={"text-nb-gray-300"} />
                  <div>
                    <div className={"text-sm text-nb-gray-100"}>
                      {tpl.title}
                    </div>
                    <div
                      className={
                        "text-xs text-nb-gray-400 mt-1 leading-relaxed"
                      }
                    >
                      {tpl.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
