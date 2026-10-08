import { SkeletonDeviceCard } from "@components/skeletons/SkeletonDeviceCard";
import SkeletonHeader from "@components/skeletons/SkeletonHeader";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import { SkeletonNetwork } from "@components/skeletons/SkeletonNetwork";
import { SkeletonNotificationSettings } from "@components/skeletons/SkeletonNotificationSettings";
import SkeletonPeerDetail from "@components/skeletons/SkeletonPeerDetail";
import PricingTableSkeleton from "@components/skeletons/SkeletonPricingTable";
import { SkeletonSettings } from "@components/skeletons/SkeletonSettings";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { padded } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Skeletons",
  decorators: [padded],
};
export default meta;

export const Table: StoryObj = { render: () => <SkeletonTable /> };

export const HeaderAndCards: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-8"}>
      <div className={"w-[600px]"}>
        <SkeletonHeader />
      </div>
      <div className={"w-[320px]"}>
        <SkeletonDeviceCard />
      </div>
      <div className={"w-[420px]"}>
        <SkeletonIntegration />
      </div>
    </div>
  ),
};

export const PeerDetail: StoryObj = { render: () => <SkeletonPeerDetail /> };

export const Settings: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-10 w-[800px]"}>
      <SkeletonSettings />
      <SkeletonNotificationSettings delay={0} />
    </div>
  ),
};

export const Network: StoryObj = {
  render: () => <SkeletonNetwork delay={0} />,
};

export const PricingTable: StoryObj = {
  render: () => <PricingTableSkeleton />,
};
