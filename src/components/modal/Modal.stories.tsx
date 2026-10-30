import Button from "@components/Button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@components/Command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  SidebarModalContent,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ExternalLinkIcon,
  FolderGit2,
  GlobeIcon,
  MonitorSmartphoneIcon,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import * as React from "react";
import { useEffect } from "react";
import DialogProvider, { useDialog } from "@/contexts/DialogProvider";
import { waitForOverlay } from "@/storybook/components";

/* Modals render open from the start (controlled `open`), so no play
   function is needed; the overlay covers the whole viewport. */
const meta: Meta = {
  title: "Components/Modal",
  play: async () => {
    await waitForOverlay("[role=dialog], [role=alertdialog]");
  },
};
export default meta;

function FormBody() {
  return (
    <div className={"px-8 flex flex-col gap-6 pb-6"}>
      <div>
        <Label>Name</Label>
        <HelpText>Set an easily identifiable name.</HelpText>
        <Input placeholder={"e.g. Developers"} />
      </div>
      <div>
        <Label>Description</Label>
        <HelpText>Optional, shown in the table.</HelpText>
        <Input defaultValue={"Engineering laptops"} />
      </div>
    </div>
  );
}

function Footer({
  variant,
  separator,
}: {
  variant?: "setup" | "default";
  separator?: boolean;
}) {
  return (
    <ModalFooter
      className={"items-center"}
      variant={variant}
      separator={separator}
    >
      <div className={"w-full"}>
        <Paragraph className={"text-sm mt-auto"}>
          Learn more about{" "}
          <a
            href={"#"}
            className={"text-netbird inline-flex items-center gap-1"}
          >
            Groups <ExternalLinkIcon size={12} />
          </a>
        </Paragraph>
      </div>
      <div className={"flex gap-3 w-full justify-end"}>
        <ModalClose asChild>
          <Button variant={"secondary"}>Cancel</Button>
        </ModalClose>
        <Button variant={"primary"}>Create Group</Button>
      </div>
    </ModalFooter>
  );
}

export const Default: StoryObj = {
  render: () => (
    <Modal open>
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<FolderGit2 size={18} />}
          title={"Create group"}
          description={"Groups bundle peers for access control."}
          color={"netbird"}
        />
        <FormBody />
        <Footer />
      </ModalContent>
    </Modal>
  ),
};

/*
  A modal opened while the assistant panel is open: the overlay covers the
  dashboard only, the chat beside it stays usable (click, type, scroll), and a
  click on the dimmed dashboard still closes the modal.
*/
export const BesideAssistantPanel: StoryObj = {
  render: () => <BesideAssistant />,
};

function BesideAssistant() {
  // Opened by the button, as in the dashboard, where the panel is there before any modal.
  const [open, setOpen] = React.useState(false);
  // What AssistantSidebarProvider sets while its panel is open on the right.
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--nb-overlay-right", "360px");
    return () => {
      root.style.removeProperty("--nb-overlay-right");
    };
  }, []);
  return (
    <>
      <aside
        data-assistant-panel="open"
        aria-label="NetBird Assistant"
        className="fixed right-0 top-0 flex h-screen w-[360px] flex-col gap-3 overflow-y-auto border-l border-nb-gray-800 bg-nb-gray-950 p-4 text-sm text-nb-gray-200"
      >
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i}>Assistant message {i + 1}</p>
        ))}
        <textarea
          aria-label="Chat"
          className="sticky bottom-0 min-h-20 rounded-lg border border-nb-gray-700 bg-nb-gray-900 p-2"
          placeholder="How can I help you today?"
        />
      </aside>
      {!open && <Button onClick={() => setOpen(true)}>Open modal</Button>}
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent maxWidthClass={"max-w-xl"}>
          <ModalHeader
            icon={<FolderGit2 size={18} />}
            title={"Create group"}
            description={"Groups bundle peers for access control."}
            color={"netbird"}
          />
          <FormBody />
          <Footer />
        </ModalContent>
      </Modal>
    </>
  );
}

export const SetupFooterNoSeparator: StoryObj = {
  render: () => (
    <Modal open>
      <ModalContent maxWidthClass={"max-w-lg"} showClose={false}>
        <ModalHeader
          icon={<MonitorSmartphoneIcon size={18} />}
          color={"blue"}
          title={"Install NetBird"}
          description={"Footer in the setup variant, without a separator."}
        />
        <FormBody />
        <Footer variant={"setup"} separator={false} />
      </ModalContent>
    </Modal>
  ),
};

export const HeaderVariants: StoryObj = {
  render: () => (
    <Modal open>
      <ModalContent maxWidthClass={"max-w-2xl"}>
        <div className={"flex flex-col gap-2 pb-6"}>
          {(
            [
              "netbird",
              "blue",
              "red",
              "gray",
              "green",
              "purple",
              "indigo",
              "yellow",
            ] as const
          ).map((color) => (
            <ModalHeader
              key={color}
              icon={<Settings size={18} />}
              color={color}
              title={`Header with ${color} icon`}
              description={
                "A description that is long enough to need truncation in narrow modals."
              }
              truncate
            />
          ))}
          <ModalHeader
            title={"Centered header without icon"}
            description={"Used by confirmation dialogs."}
            center
          />
        </div>
      </ModalContent>
    </Modal>
  ),
};

export const Sidebar: StoryObj = {
  render: () => (
    <Modal open>
      <SidebarModalContent maxWidthClass={"max-w-md"}>
        <ModalHeader
          icon={<GlobeIcon size={18} />}
          title={"Sidebar modal"}
          description={"Slides in from the right."}
          color={"blue"}
        />
        <FormBody />
      </SidebarModalContent>
    </Modal>
  ),
};

export const PlainDialog: StoryObj = {
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description text.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant={"secondary"} size={"sm"}>
            Cancel
          </Button>
          <Button variant={"primary"} size={"sm"}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

function Confirm({
  type,
}: {
  type: "default" | "warning" | "danger" | "center";
}) {
  const { confirm } = useDialog();
  useEffect(() => {
    confirm({
      title:
        type === "danger"
          ? "Delete 'macbook-pro-olivia'?"
          : `A ${type} confirmation`,
      description:
        "Are you sure you want to continue? This action cannot be undone.",
      confirmText: type === "danger" ? "Delete" : "Continue",
      cancelText: "Cancel",
      type,
    });
  }, [confirm, type]);
  return null;
}

export const ConfirmDanger: StoryObj = {
  render: () => (
    <DialogProvider>
      <Confirm type={"danger"} />
    </DialogProvider>
  ),
};

export const ConfirmWarning: StoryObj = {
  render: () => (
    <DialogProvider>
      <Confirm type={"warning"} />
    </DialogProvider>
  ),
};

export const ConfirmDefault: StoryObj = {
  render: () => (
    <DialogProvider>
      <Confirm type={"default"} />
    </DialogProvider>
  ),
};

export const ConfirmCenter: StoryObj = {
  render: () => (
    <DialogProvider>
      <Confirm type={"center"} />
    </DialogProvider>
  ),
};

export const CommandPalette: StoryObj = {
  render: () => (
    <CommandDialog open>
      <DialogTitle className={"sr-only"}>Command palette</DialogTitle>
      <CommandInput placeholder={"Type a command or search..."} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading={"Navigation"}>
          <CommandItem>
            <MonitorSmartphoneIcon />
            Peers
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <FolderGit2 />
            Groups
          </CommandItem>
          <CommandItem>
            <Users />
            Team
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={"Actions"}>
          <CommandItem>
            <Trash2 />
            Delete peer
          </CommandItem>
          <CommandItem disabled>
            <Settings />
            Disabled action
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  ),
};
