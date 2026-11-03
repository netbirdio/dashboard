import { NetBirdLogo } from "@components/NetBirdLogo";
import SquareIcon from "@components/SquareIcon";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { UserAvatar } from "@components/ui/UserAvatar";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FolderGit2 } from "lucide-react";
import { GroupIssued } from "@/interfaces/Group";
import { padded, Row, Stack } from "@/storybook/components";

/* Stands in for an operator's NETBIRD_BRAND_LOGO_URL: wider than the NetBird
   logo, to show it being fitted to the same height. */
const customLogo =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40"><rect width="40" height="40" rx="8" fill="#3b82f6"/><rect x="52" y="12" width="148" height="16" rx="4" fill="#e5e7eb"/></svg>',
  );

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
      <Row label={"custom logo"}>
        <NetBirdLogo mobile={false} logoUrl={customLogo} />
        <NetBirdLogo size={"large"} mobile={false} logoUrl={customLogo} />
        <NetBirdLogo logoUrl={customLogo} />
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
