import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { AlertCircle, AlertTriangle } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

const DialogContext = React.createContext(
  {} as {
    confirm: (data: DialogOptions) => Promise<boolean>;
  },
);

type DialogOptions = {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: "default" | "warning" | "danger" | "center";
  children?: React.ReactNode;
  maxWidthClass?: string;
};

export default function DialogProvider({ children }: Props) {
  const [state, setState] = useState({
    isOpen: false,
  });
  const [dialogOptions, setDialogOptions] = useState<DialogOptions>();
  const fn = useRef<Function>();

  const confirm = useCallback((data: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true });
      setDialogOptions(data);
      fn.current = (choice: boolean) => {
        resolve(choice);
        setDialogOptions(undefined);
        setState({ isOpen: false });
      };
    });
  }, []);

  const dialogTypes = {
    default: "",
    warning: <AlertCircle size={18} />,
    danger: <AlertTriangle size={18} />,
    center: "",
  };

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={state.isOpen}
        onOpenChange={(open) => fn.current && fn.current(open)}
      >
        {dialogOptions && (
          <ModalContent
            maxWidthClass={dialogOptions.maxWidthClass || "max-w-[400px]"}
            showClose={false}
          >
            <ModalHeader
              center={dialogOptions.type == "center"}
              title={dialogOptions.title || "Confirmation"}
              margin={"mt-1"}
              description={
                dialogOptions.description ||
                "Are you sure you want to continue? This action cannot be undone."
              }
              icon={dialogTypes[dialogOptions.type || "default"]}
              color={
                dialogOptions.type == "default"
                  ? "blue"
                  : dialogOptions.type == "warning"
                  ? "netbird"
                  : "red"
              }
              className={"px-8"}
            />

            {dialogOptions.children && (
              <div className={"px-8 pt-0"}>{dialogOptions.children}</div>
            )}

            <ModalFooter
              className={"items-center gap-2 pt-5"}
              separator={false}
            >
              <ModalClose asChild={true}>
                <Button
                  variant={"secondary"}
                  className={"w-full"}
                  size={"sm"}
                  tabIndex={-1}
                  data-cy={"confirmation.cancel"}
                  onClick={() => fn.current && fn.current(false)}
                >
                  {dialogOptions.cancelText || "Cancel"}
                </Button>
              </ModalClose>
              <Button
                variant={
                  dialogOptions.type == "default"
                    ? "primary"
                    : dialogOptions.type == "warning"
                    ? "primary"
                    : "danger"
                }
                className={"w-full"}
                size={"sm"}
                data-cy={"confirmation.confirm"}
                onClick={() => fn.current && fn.current(true)}
              >
                {dialogOptions.confirmText || "Confirm"}
              </Button>
            </ModalFooter>
          </ModalContent>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export const useDialog = () => React.useContext(DialogContext);
