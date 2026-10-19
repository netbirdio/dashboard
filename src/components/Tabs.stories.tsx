import { SegmentedTabs } from "@components/SegmentedTabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import {
  SlidingTabs,
  SlidingTabsList,
  SlidingTabsTrigger,
} from "@components/ui/SlidingTabs";
import { VerticalTabs } from "@components/VerticalTabs";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  AlertOctagon,
  Cog,
  FolderGit2,
  GlobeIcon,
  MonitorSmartphoneIcon,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { Controlled, padded } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Tabs",
  decorators: [padded],
};
export default meta;

export const Horizontal: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"w-[720px]"}>
      <Tabs defaultValue={"peer-approval"}>
        <TabsList justify={"start"} className={"px-4"}>
          <TabsTrigger value={"peer-approval"}>
            <FolderGit2 size={14} />
            Peer Approval
          </TabsTrigger>
          <TabsTrigger value={"settings"} data-capture={""}>
            <Cog size={14} />
            Settings
          </TabsTrigger>
          <TabsTrigger value={"danger"}>
            <AlertOctagon size={14} />
            Danger Zone
          </TabsTrigger>
          <TabsTrigger value={"disabled"} disabled>
            Disabled
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"peer-approval"} className={"px-4 text-sm"}>
          Tab content for peer approval.
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const Segmented: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"w-[480px]"}>
      <Controlled initial={"cli"}>
        {(v, set) => (
          <SegmentedTabs value={v} onChange={set}>
            <SegmentedTabs.List className={"rounded-lg border"}>
              <SegmentedTabs.Trigger value={"cli"}>
                <TerminalSquare size={16} />
                CLI
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger
                value={"gui"}
                data-testid={"segmented-gui"}
              >
                <MonitorSmartphoneIcon size={16} />
                Desktop Client
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"off"} disabled>
                Disabled
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
            <SegmentedTabs.Content value={"cli"}>
              <div className={"text-sm p-4"}>Segmented content</div>
            </SegmentedTabs.Content>
          </SegmentedTabs>
        )}
      </Controlled>
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=segmented-gui]")
      ?.setAttribute("data-capture", "");
  },
};

export const Vertical: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"w-[720px] h-[300px] overflow-hidden relative"}>
      <VerticalTabs value={"authentication"} onChange={() => {}}>
        <VerticalTabs.List>
          <VerticalTabs.Trigger value={"authentication"}>
            <ShieldCheck size={14} />
            Authentication
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger
            value={"networks"}
            data-testid={"vertical-networks"}
          >
            <GlobeIcon size={14} />
            Networks
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value={"danger"}>
            <AlertOctagon size={14} />
            Danger Zone
          </VerticalTabs.Trigger>
          <VerticalTabs.Trigger value={"disabled"} disabled>
            Disabled
          </VerticalTabs.Trigger>
        </VerticalTabs.List>
        <div className={"p-6 text-sm"}>Vertical tab content</div>
      </VerticalTabs>
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=vertical-networks]")
      ?.setAttribute("data-capture", "");
  },
};

export const Sliding: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <div className={"w-[480px]"}>
      <SlidingTabs>
        <SlidingTabsList>
          <SlidingTabsTrigger
            value={"peer"}
            title={"Routing peer"}
            description={"Route traffic through one peer."}
            icon={<MonitorSmartphoneIcon size={16} />}
            iconClass={"bg-gradient-to-tr from-netbird-500 to-netbird-400"}
          />
          <SlidingTabsTrigger
            value={"group"}
            title={"Peer group"}
            description={"Route through every peer in a group."}
            icon={<FolderGit2 size={16} />}
            iconClass={"bg-gradient-to-tr from-sky-500 to-sky-400"}
          />
        </SlidingTabsList>
      </SlidingTabs>
    </div>
  ),
};
