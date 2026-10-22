import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import AddPeerDropdown from "@components/ui/AddPeerDropdown";
import DarkModeToggle from "@components/ui/DarkModeToggle";
import HelpAndSupportButton from "@components/ui/HelpAndSupportButton";
import UserDropdown from "@components/ui/UserDropdown";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ChevronDown,
  Edit,
  FolderGit2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { clickOpen, padded, withAppProviders } from "@/storybook/components";

const meta: Meta = {
  title: "Components/DropdownMenu",
  decorators: [padded],
};
export default meta;

function ActionsMenu() {
  const [checked, setChecked] = useState(true);
  const [role, setRole] = useState("admin");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"secondary"} size={"sm"} data-capture={""}>
          Actions
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={"start"} className={"w-56"}>
        <DropdownMenuLabel>Peer actions</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Edit size={14} />
            Rename
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FolderGit2 size={14} />
            Assign groups
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={checked}
          onCheckedChange={setChecked}
        >
          SSH access
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={role} onValueChange={setRole}>
          <DropdownMenuRadioItem value={"admin"}>Admin</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={"user"}>User</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant={"danger"}>
          <Trash2 size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Closed: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => <ActionsMenu />,
};

export const Open: StoryObj = {
  render: () => <ActionsMenu />,
  play: clickOpen("[data-capture]", "[role=menu]"),
};

/* Keyboard navigation highlights an item the same way hover does. */
export const OpenItemHighlighted: StoryObj = {
  render: () => <ActionsMenu />,
  play: async (ctx) => {
    await clickOpen("[data-capture]", "[role=menu]")(ctx);
    const items = document.querySelectorAll<HTMLElement>("[role=menuitem]");
    items[0]?.focus();
  },
};

export const RowActionMenuOpen: StoryObj = {
  render: () => (
    <div className={"flex justify-end w-[480px]"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"default-outline"}
            size={"xs"}
            className={"!px-3"}
            data-testid={"row-actions"}
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={"end"} className={"w-auto"}>
          <DropdownMenuItem>
            <Edit size={14} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant={"danger"}>
            <Trash2 size={14} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
  play: clickOpen("[data-testid=row-actions]", "[role=menu]"),
};

export const HelpAndSupportOpen: StoryObj = {
  render: () => (
    <div className={"flex justify-end w-[480px]"}>
      <HelpAndSupportButton />
    </div>
  ),
  play: clickOpen("button", "[role=menu]"),
};

export const UserDropdownOpen: StoryObj = {
  decorators: [withAppProviders],
  render: () => (
    <div className={"flex justify-end w-[480px]"}>
      <UserDropdown />
    </div>
  ),
  play: clickOpen("[data-testid=user-dropdown]", "[role=menu]"),
};

export const AddPeerDropdownOpen: StoryObj = {
  decorators: [withAppProviders],
  render: () => (
    <div className={"flex justify-end w-[480px]"}>
      <AddPeerDropdown />
    </div>
  ),
  play: clickOpen("button", "[role=menu]"),
};

/* The toggle changed from a dropdown to a segmented control on this branch,
   so the story only renders it and leaves interaction out. */
export const ThemeToggle: StoryObj = {
  render: () => <DarkModeToggle />,
};
