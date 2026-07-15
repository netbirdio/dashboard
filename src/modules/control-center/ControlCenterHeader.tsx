import Button from "@components/Button";
import { AnimatePresence, motion } from "framer-motion";
import {
  SelectDropdown,
} from "@components/select/SelectDropdown";
import { ArrowLeftIcon } from "lucide-react";
import React from "react";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
import { ControlCenterCurrentUserBadge } from "@/modules/control-center/user/ControlCenterCurrentUserBadge";
import { DraftModeSwitcher } from "@/modules/control-center/draft/DraftModeSwitcher";
import { CanvasToolbar } from "@/modules/control-center/draft/CanvasToolbar";
import { useCanvasState, useControlCenterUI } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

function HeaderTopLeft() {
  const { currentView, selectedNetwork, previousSelectedUser } =
    useCanvasState();
  const { isDraft, setIsDraft } = useDraftMode();
  const {
    networkOptions,
    currentNetwork,
    onViewChange,
    onNetworkSelect,
    onForceSingleUserView,
  } = useControlCenterUI();
  const { networks } = useControlCenterData();
  const hasNetworks = (networks?.length ?? 0) > 0;

  return (
    <div className={"absolute left-0 top-0 z-10"}>
      <div
        className={
          "flex justify-between px-6 py-4 text-sm w-full"
        }
      >
        <div className={"flex gap-4"}>
          {!isDraft && selectedNetwork !== "" && (
            <Button
              variant={"secondary"}
              size={"xs"}
              className={"!bg-nb-gray-930"}
              onClick={() => onNetworkSelect("")}
            >
              <ArrowLeftIcon size={14} />
            </Button>
          )}

          {!isDraft && previousSelectedUser !== "" && (
            <>
              <Button
                variant={"secondary"}
                size={"xs"}
                className={"!bg-nb-gray-930"}
                onClick={() => {
                  onForceSingleUserView(previousSelectedUser);
                }}
              >
                <ArrowLeftIcon size={14} />
              </Button>
              <ControlCenterCurrentUserBadge
                userId={previousSelectedUser}
              />
            </>
          )}

          {selectedNetwork === "" &&
            previousSelectedUser === "" &&
            !isDraft && (
              <FlowSelector value={currentView} onChange={onViewChange} />
            )}

          {isDraft && (
            <Button
              variant={"secondary"}
              size={"xs"}
              className={
                "!px-0 !bg-nb-gray-930 h-[40px] !w-[40px] !min-w-[40px]"
              }
              onClick={() => setIsDraft(false)}
            >
              <ArrowLeftIcon size={14} />
            </Button>
          )}

          {/* Draft title (Untitled Draft dropdown + three-dots menu) hidden for now */}
          {/* {isDraft && <DraftModeTitle />} */}

          {!isDraft && currentView === "networks" && hasNetworks && (
            <div className={"w-64"}>
              <SelectDropdown
                variant={"secondary"}
                value={selectedNetwork}
                onChange={onNetworkSelect}
                options={networkOptions}
                showSearch={true}
                className={
                  "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300"
                }
                size={"xs"}
              />
            </div>
          )}

          {!isDraft && selectedNetwork && currentNetwork && (
            <NetworkRoutingPeerCount network={currentNetwork} />
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderTopRight() {
  return (
    <div className={"absolute right-0 top-0 z-10"}>
      <div className={"px-6 py-4"}>
        <DraftModeSwitcher />
      </div>
    </div>
  );
}

function HeaderBottom() {
  const { isDraft } = useDraftMode();

  // Always visible in draft (slides in/out with draft via framer-motion).
  const showToolbar = isDraft;

  return (
    <AnimatePresence>
      {showToolbar && (
        <motion.div
          className={"absolute bottom-0 left-1/2 z-10"}
          initial={{ x: "-50%", y: 80, opacity: 0 }}
          animate={{ x: "-50%", y: 0, opacity: 1 }}
          exit={{ x: "-50%", y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          <div className={"py-4"}>
            <CanvasToolbar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ControlCenterHeader() {
  return (
    <>
      <HeaderTopLeft />
      <HeaderTopRight />
      <HeaderBottom />
    </>
  );
}
