import { NetBirdLogo } from "@components/NetBirdLogo";
import SquareIcon from "@components/SquareIcon";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { UserAvatar } from "@components/ui/UserAvatar";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FolderGit2 } from "lucide-react";
import { GroupIssued } from "@/interfaces/Group";
import { padded, Row, Stack } from "@/storybook/components";

const colors = [
  "netbird",
  "blue",
  "blue-darker",
  "red",
  "gray",
  "green",
  "purple",
  "indigo",
  "yellow",
] as const;

const meta: Meta = {
  title: "Components/Icons",
  decorators: [padded],
};
export default meta;

export const SquareIcons: StoryObj = {
  render: () => (
    <Stack>
      {colors.map((color) => (
        <Row key={color} label={color}>
          <SquareIcon
            color={color}
            icon={<FolderGit2 size={14} />}
            size={"small"}
            margin={""}
          />
          <SquareIcon
            color={color}
            icon={<FolderGit2 size={16} />}
            margin={""}
          />
          <SquareIcon
            color={color}
            icon={<FolderGit2 size={18} />}
            size={"large"}
            margin={""}
            rounded
          />
        </Row>
      ))}
    </Stack>
  ),
};

export const LogoAndAvatar: StoryObj = {
  render: () => (
    <Stack>
      <Row label={"logo"}>
        <NetBirdLogo mobile={false} />
        <NetBirdLogo size={"large"} mobile={false} />
        <NetBirdLogo />
      </Row>
      <Row label={"avatar"}>
        <UserAvatar size={"small"} />
        <UserAvatar size={"medium"} />
        <UserAvatar />
        <UserAvatar size={"large"} />
      </Row>
      <Row label={"group icon"}>
        <GroupBadgeIcon id={"grp-developers"} issued={GroupIssued.API} />
        <GroupBadgeIcon id={"grp-jwt"} issued={GroupIssued.JWT} />
        <GroupBadgeIcon id={"grp-idp"} issued={GroupIssued.INTEGRATION} />
      </Row>
    </Stack>
  ),
};
