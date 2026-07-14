import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@utils/helpers";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import {
  BoxesIcon,
  Building2Icon,
  LaptopIcon,
  LucideIcon,
  WaypointsIcon,
} from "lucide-react";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

export type DraftTemplateId = "remote-access" | "business-vpn" | "site-to-site";

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
    id: "site-to-site",
    title: "Site-to-Site",
    description: "Connect two networks over an encrypted tunnel.",
    icon: WaypointsIcon,
  },
];

// Shown on the draft canvas when it has no nodes. Mirrors the GetStartedTest
// layout/spacing used by the live empty states (so it sits at the same place)
// but without the Card background, then adds template cards below.
export const DraftEmptyCanvas = () => {
  const { isDraft, componentsPanelOpen, setComponentsPanelOpen } =
    useDraftMode();
  const { nodes } = useCanvasState();

  // Start screen: only while the draft canvas is empty. When the components
  // panel is open it stays visible but dimmed (see opacity below).
  if (!isDraft || nodes.length > 0) return null;

  // TODO: build the starter topology per template. For now every entry just
  // opens the components panel.
  const handleSelectTemplate = (_id: DraftTemplateId) => {
    setComponentsPanelOpen(true);
  };

  return (
    <AnimatePresence>
      {!componentsPanelOpen && (
        <motion.div
          className={"absolute left-0 top-0 w-full mt-28 z-10 pointer-events-none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={"pointer-events-auto px-8 mt-8"}>
            <div className={"flex flex-col items-center py-8"}>
              {/* Header — mirrors GetStartedTest spacing (mt-8 + py-8 + p-8). */}
              <div className={"max-w-lg text-center flex flex-col gap-2 p-8"}>
                <div className={"mx-auto"}>
                  <SquareIcon
                    icon={<BoxesIcon className={"text-nb-gray-200"} size={20} />}
                    color={"gray"}
                    size={"large"}
                  />
                </div>
                <div className={"text-center"}>
                  <h1 className={"text-3xl font-medium max-w-lg mx-auto mt-3"}>
                    Start building your network
                  </h1>
                  <Paragraph className={"justify-center mt-3 mb-3"}>
                    Add components to design your network yourself, or pick a
                    template to start from a common setup.
                  </Paragraph>
                </div>
              </div>

              {/* Templates */}
              <div className={"max-w-2xl w-full flex flex-col items-center"}>
                <div className={"grid grid-cols-3 gap-3 w-full"}>
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};
