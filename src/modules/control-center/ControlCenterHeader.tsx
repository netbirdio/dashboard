import Button from "@components/Button";
import {
  SelectDropdown,
} from "@components/select/SelectDropdown";
import { SmallBadge } from "@components/ui/SmallBadge";
import { ArrowLeftIcon, MessageSquareShareIcon } from "lucide-react";
import React from "react";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
import { ControlCenterCurrentUserBadge } from "@/modules/control-center/user/ControlCenterCurrentUserBadge";
import { DraftModeSwitcher } from "@/modules/control-center/draft/DraftModeSwitcher";
import { CanvasToolbar } from "@/modules/control-center/draft/CanvasToolbar";
import { DraftModeTitle } from "@/modules/control-center/draft/DraftModeTitle";
import { useCanvasState, useControlCenterUI } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

function HeaderTopLeft() {
  const { currentView, selectedNetwork, previousSelectedUser } =
    useCanvasState();
  const { isDraft } = useDraftMode();
  const {
    networkOptions,
    currentNetwork,
    onViewChange,
    onNetworkSelect,
    onForceSingleUserView,
  } = useControlCenterUI();

  return (
    <div className={"absolute left-0 top-0 z-10"}>
      <div
        className={
          "flex justify-between px-6 py-4 text-sm w-full"
        }
      >
        <div className={"flex gap-4"}>
          {selectedNetwork !== "" && (
            <Button
              variant={"secondary"}
              size={"xs"}
              className={"!bg-nb-gray-930"}
              onClick={() => onNetworkSelect("")}
            >
              <ArrowLeftIcon size={14} />
            </Button>
          )}

          {previousSelectedUser !== "" && (
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

          <DraftModeTitle />

          {currentView === "networks" && (
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

          {selectedNetwork && currentNetwork && (
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

  return (
    <>
      {isDraft && (
        <div className={"absolute bottom-0 left-1/2 -translate-x-1/2 z-10"}>
          <div className={"py-4"}>
            <CanvasToolbar />
          </div>
        </div>
      )}

      <div className={"absolute left-0 bottom-0 z-10"}>
        <div className={"px-6 py-4"}>
          <SmallBadge
            text={"Beta"}
            variant={"sky"}
            className={"text-[12px] leading-none py-[3px] px-[6px]"}
            textClassName={"top-0"}
          />
        </div>
      </div>

      <div className={"absolute right-0 bottom-0 z-10"}>
        <div className={"px-6 py-4"}>
          <a href={"https://forms.gle/MKJnVXCiUM1KtxLy6"} target={"_blank"}>
            <Button variant={"secondary"} size={"xs"}>
              <MessageSquareShareIcon size={12} />
              Feedback
            </Button>
          </a>
        </div>
      </div>
    </>
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
