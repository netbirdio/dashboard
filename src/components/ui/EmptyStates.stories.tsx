import Button from "@components/Button";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import GetStarted from "@components/ui/GetStarted";
import GetStartedTest from "@components/ui/GetStartedTest";
import NoResults from "@components/ui/NoResults";
import NoResultsCard from "@components/ui/NoResultsCard";
import { PageNotFound } from "@components/ui/PageNotFound";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Cog,
  ExternalLinkIcon,
  MonitorSmartphoneIcon,
  PlusCircle,
} from "lucide-react";
import {
  padded,
  pauseSvgAnimations,
  withAppProviders,
} from "@/storybook/components";

const meta: Meta = {
  title: "Components/EmptyStates",
  decorators: [padded],
};
export default meta;

export const NoResultsVariants: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-8 w-[720px]"}>
      <NoResults
        title={"No peers found"}
        description={"Try another search term."}
      />
      <NoResults
        title={"No matching peers"}
        description={"No peers match the current filters."}
        hasFiltersApplied
        onResetFilters={() => {}}
      />
      <NoResultsCard
        icon={<MonitorSmartphoneIcon size={20} />}
        title={"No resources"}
        description={"Add a resource to this network."}
      >
        <Button variant={"primary"} size={"xs"}>
          <PlusCircle size={14} />
          Add resource
        </Button>
      </NoResultsCard>
    </div>
  ),
};

export const GetStartedCards: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-8 w-[900px]"}>
      <GetStarted
        icon={<Cog size={20} />}
        title={"Get started"}
        description={"Set up your first network route."}
        button={<Button variant={"primary"}>Add route</Button>}
        learnMore={
          <span
            className={
              "text-sm text-nb-gray-400 inline-flex items-center gap-1"
            }
          >
            Learn more <ExternalLinkIcon size={12} />
          </span>
        }
      />
      <GetStartedTest
        icon={<Cog size={20} />}
        title={"Create your first policy"}
        description={"Policies control which peers can reach each other."}
        button={<Button variant={"primary"}>Add policy</Button>}
        showBackground
      />
    </div>
  ),
};

export const NoPeers: StoryObj = {
  decorators: [withAppProviders],
  parameters: { api: { "GET /peers": [] } },
  render: () => (
    <div className={"w-[1000px]"}>
      <NoPeersGettingStarted showBackground />
    </div>
  ),
};

export const Loading: StoryObj = {
  render: () => (
    <div className={"w-[400px] h-[200px] relative"}>
      <FullScreenLoading fullScreen={false} />
    </div>
  ),
  play: pauseSvgAnimations,
};

export const NotFound: StoryObj = {
  render: () => (
    <PageNotFound
      title={"Peer not found"}
      description={"The peer you are looking for does not exist."}
    />
  ),
};

export const Restricted: StoryObj = {
  render: () => (
    <div className={"relative h-[500px] w-[1000px]"}>
      <RestrictedAccess page={"Peers"} />
    </div>
  ),
};
