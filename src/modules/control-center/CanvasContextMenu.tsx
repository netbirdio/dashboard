import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FolderGit2,
  Globe,
  MonitorSmartphoneIcon,
  NetworkIcon,
  UserPlusIcon,
} from "lucide-react";
import { useOidcUser } from "@axa-fr/react-oidc";
import { useReactFlow } from "@xyflow/react";
import { Modal } from "@components/modal/Modal";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCreateGroupOnCanvas } from "@/modules/control-center/hooks/useCreateGroupOnCanvas";
import { CreateGroupNameModal } from "@/modules/control-center/draft/CreateGroupNameModal";

type MenuPosition = {
  x: number;
  y: number;
};

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

interface CanvasContextMenuProps {
  onOpenChange?: (open: boolean) => void;
}

export const CanvasContextMenu = ({ onOpenChange }: CanvasContextMenuProps) => {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [createAtPosition, setCreateAtPosition] = useState<MenuPosition | null>(null);
  const [addPeerModal, setAddPeerModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();
  const { groups } = useControlCenterData();
  const { createGroup, modalOpen, setModalOpen } = useCreateGroupOnCanvas();
  const { oidcUser: user } = useOidcUser();

  const handleCreateGroup = useCallback(() => {
    if (!position) return;
    setCreateAtPosition(position);
    setModalOpen(true);
  }, [position, setModalOpen]);

  const handleSaveGroup = useCallback(
    async (groupName: string) => {
      setModalOpen(false);
      if (!createAtPosition) return;

      const canvasPos = reactFlow.screenToFlowPosition({
        x: createAtPosition.x,
        y: createAtPosition.y,
      });

      await createGroup({
        name: groupName,
        position: canvasPos,
      });
    },
    [createGroup, createAtPosition, reactFlow, setModalOpen],
  );

  const items: MenuItem[] = [
    {
      label: "Add Peer",
      icon: <MonitorSmartphoneIcon size={14} />,
      onClick: () => setAddPeerModal(true),
    },
    {
      label: "Create Group",
      icon: <FolderGit2 size={14} />,
      onClick: handleCreateGroup,
    },
    {
      label: "Create Network",
      icon: <NetworkIcon size={14} />,
    },
    {
      label: "Create Resource",
      icon: <Globe size={14} />,
    },
    {
      label: "Invite User",
      icon: <UserPlusIcon size={14} />,
    },
  ];

  const open = useCallback(
    (pos: MenuPosition) => {
      setPosition(pos);
      onOpenChange?.(true);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    setPosition(null);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isCanvas = target.closest(".react-flow__pane");
      if (!isCanvas) {
        close();
        return;
      }
      e.preventDefault();
      open({ x: e.clientX, y: e.clientY });
    },
    [open, close],
  );

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [handleContextMenu, close]);

  return (
    <>
      {position && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-md border border-nb-gray-900 bg-nb-gray-940 p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ top: position.y, left: position.x }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick?.();
                close();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm text-nb-gray-300 transition-colors hover:bg-nb-gray-900 hover:text-gray-50 cursor-pointer"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      <CreateGroupNameModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSaveGroup}
        groups={groups}
      />

      <Modal open={addPeerModal} onOpenChange={setAddPeerModal}>
        <SetupModal user={user} />
      </Modal>
    </>
  );
};
