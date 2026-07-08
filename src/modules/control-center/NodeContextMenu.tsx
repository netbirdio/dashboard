import React, { useCallback, useEffect, useRef } from "react";
import { MinusCircleIcon, TrashIcon } from "lucide-react";
import { cn } from "@utils/helpers";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";

type MenuPosition = {
  x: number;
  y: number;
};

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

interface NodeContextMenuProps {
  position: MenuPosition | null;
  nodeId: string;
  onClose: () => void;
}

export const NodeContextMenu = ({
  position,
  nodeId,
  onClose,
}: NodeContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { setNodes } = useCanvasState();

  const handleRemove = useCallback(() => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }, [nodeId, setNodes]);

  const handleDelete = useCallback(() => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }, [nodeId, setNodes]);

  const items: MenuItem[] = [
    {
      label: "Remove",
      icon: <MinusCircleIcon size={14} />,
      onClick: handleRemove,
    },
    {
      label: "Delete",
      icon: <TrashIcon size={14} />,
      onClick: handleDelete,
      danger: true,
    },
  ];

  useEffect(() => {
    if (!position) return;
    document.addEventListener("click", onClose);
    document.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("click", onClose);
      document.removeEventListener("scroll", onClose, true);
    };
  }, [position, onClose]);

  if (!position) return null;

  return (
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
            onClose();
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer",
            item.danger
              ? "text-red-500 hover:bg-red-900/20 hover:text-red-500"
              : "text-nb-gray-300 hover:bg-nb-gray-900 hover:text-gray-50",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};
