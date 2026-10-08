import Badge from "@components/Badge";
import GroupBadge from "@components/ui/GroupBadge";
import LoginExpiredBadge from "@components/ui/LoginExpiredBadge";
import MultipleGroups from "@components/ui/MultipleGroups";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import PeerCountBadge from "@components/ui/PeerCountBadge";
import ResourceBadge from "@components/ui/ResourceBadge";
import ResourceCountBadge from "@components/ui/ResourceCountBadge";
import { SmallBadge } from "@components/ui/SmallBadge";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShieldCheck } from "lucide-react";
import {
  hoverOpen,
  padded,
  Row,
  Stack,
  withAppProviders,
} from "@/storybook/components";
import { GROUP } from "@/storybook/fixtures";
import { group, groups, peers, resources } from "@/storybook/fixtures";

const badgeVariants = [
  "blue",
  "blueDark",
  "blue-darker",
  "red",
  "purple",
  "yellow",
  "gray",
  "lightGray",
  "grayer",
  "gray-ghost",
  "green",
  "netbird",
] as const;
const smallBadgeVariants = [
  "green",
  "blue",
  "white",
  "sky",
  "netbird",
  "yellow",
] as const;

const meta: Meta = {
  title: "Components/Badge",
  decorators: [padded],
};
export default meta;

export const Variants: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Stack>
      {badgeVariants.map((variant, i) => (
        <Row key={variant} label={variant}>
          <Badge
            variant={variant}
            useHover={true}
            data-capture={i === 0 ? "" : undefined}
          >
            <ShieldCheck size={12} />
            {variant}
          </Badge>
          <Badge variant={variant}>Without icon</Badge>
          <Badge variant={variant} size={"xs"}>
            xs
          </Badge>
          <Badge variant={variant} disabled>
            disabled
          </Badge>
        </Row>
      ))}
    </Stack>
  ),
};

export const GrayGhostHover: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Badge variant={"gray-ghost"} useHover={true} data-capture={""}>
      <ShieldCheck size={12} />
      gray-ghost
    </Badge>
  ),
};

export const Small: StoryObj = {
  render: () => (
    <Stack>
      {smallBadgeVariants.map((variant) => (
        <Row key={variant} label={variant}>
          <SmallBadge variant={variant} text={variant.toUpperCase()} />
          <SmallBadge variant={variant} size={"md"} text={"MD"} />
        </Row>
      ))}
      <Row label={"notification count"}>
        <NotificationCountBadge count={3} />
        <NotificationCountBadge count={128} />
      </Row>
      <Row label={"login expired"}>
        <LoginExpiredBadge loginExpired={true} />
      </Row>
    </Stack>
  ),
};

export const LoginExpiredTooltip: StoryObj = {
  render: () => <LoginExpiredBadge loginExpired={true} />,
  play: hoverOpen("button"),
};

export const Groups: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Stack>
      <Row
        label={"group badges"}
        className={"flex flex-wrap items-center gap-2 max-w-[700px]"}
      >
        {groups.slice(0, 8).map((g, i) => (
          <GroupBadge
            key={g.id}
            group={g}
            onClick={() => {}}
            data-capture={i === 1 ? "" : undefined}
          />
        ))}
      </Row>
      <Row label={"removable (showX)"}>
        <GroupBadge group={group(GROUP.devops)} showX onClick={() => {}} />
        <GroupBadge group={group(GROUP.kubernetes)} showX onClick={() => {}} />
      </Row>
      <Row label={"new, unsaved"}>
        <GroupBadge group={{ name: "New unsaved group" }} showNewBadge />
      </Row>
      <Row label={"truncated"}>
        <GroupBadge group={group(GROUP.officeBerlin)} maxWidth={"180px"} />
      </Row>
      <Row label={"resources"}>
        <ResourceBadge resource={resources[0] as never} />
        <ResourceBadge resource={resources[1] as never} />
        <ResourceBadge resource={resources[2] as never} showX />
        <ResourceBadge peer={peers[0] as never} showX />
      </Row>
    </Stack>
  ),
};

/* MultipleGroups and the count badges read permissions and groups from context. */
export const GroupLists: StoryObj = {
  decorators: [withAppProviders],
  render: () => (
    <Stack>
      <Row label={"multiple groups"}>
        <MultipleGroups groups={groups.slice(1, 7)} />
      </Row>
      <Row label={"single group"}>
        <MultipleGroups groups={groups.slice(1, 2)} />
      </Row>
      <Row label={"no groups"}>
        <MultipleGroups groups={[]} />
      </Row>
      <Row label={"peer / resource count"}>
        <PeerCountBadge group={group(GROUP.servers)} />
        <ResourceCountBadge group={group(GROUP.servers)} />
        <PeerCountBadge group={group(GROUP.empty)} />
      </Row>
    </Stack>
  ),
};

export const MultipleGroupsOpen: StoryObj = {
  decorators: [withAppProviders],
  render: () => <MultipleGroups groups={groups.slice(1, 9)} />,
  play: hoverOpen("[data-testid=multiple-groups]"),
};
