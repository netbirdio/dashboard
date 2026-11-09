import Button from "@components/Button";
import Card from "@components/Card";
import CardTable from "@components/CardTable";
import { DeviceCard } from "@components/DeviceCard";
import { DropdownInfoText } from "@components/DropdownInfoText";
import FeatureCard, { FeatureCardStatus } from "@components/FeatureCard";
import { ListItem } from "@components/ListItem";
import SettingCard from "@components/SettingCard";
import { TooltipListItem } from "@components/TooltipListItem";
import { MinimalList } from "@components/ui/MinimalList";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  FolderGit2,
  GlobeIcon,
  KeyRound,
  NetworkIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { padded, Row, Stack, withAppProviders } from "@/storybook/components";
import { peers, resources } from "@/storybook/fixtures";

const meta: Meta = {
  title: "Components/Card",
  decorators: [padded],
};
export default meta;

export const Lists: StoryObj = {
  render: () => (
    <Stack>
      <Row label={"card list"} className={"w-[480px]"}>
        <Card className={"w-full"}>
          <Card.List>
            <Card.ListItem
              label={"Domain"}
              value={"macbook-pro.netbird.cloud"}
              copy
            />
            <Card.ListItem
              label={
                <>
                  <NetworkIcon size={16} />
                  NetBird IP
                </>
              }
              value={"100.92.14.3"}
            />
            <Card.ListItem
              label={"Long value"}
              value={
                "a-very-long-value-that-needs-a-tooltip-because-it-is-long.netbird.cloud"
              }
              tooltip
            />
            <Card.ListItem label={"Created"} value={"3 days ago"} />
          </Card.List>
        </Card>
      </Row>
      <Row label={"card table"} className={"w-[520px]"}>
        <CardTable>
          <CardTable.Header>
            <CardTable.HeaderCell>Port</CardTable.HeaderCell>
            <CardTable.HeaderCell>Protocol</CardTable.HeaderCell>
          </CardTable.Header>
          <CardTable.Body>
            <CardTable.Row>
              <CardTable.Cell>443</CardTable.Cell>
              <CardTable.Cell copy copyText={"TCP"}>
                TCP
              </CardTable.Cell>
            </CardTable.Row>
            <CardTable.Row>
              <CardTable.Cell>53</CardTable.Cell>
              <CardTable.Cell>UDP</CardTable.Cell>
            </CardTable.Row>
          </CardTable.Body>
        </CardTable>
      </Row>
      <Row label={"list items"} className={"w-[420px]"}>
        <div className={"w-full"}>
          <ListItem
            icon={<GlobeIcon size={14} />}
            label={"Region"}
            value={"Berlin, Germany"}
          />
          <ListItem
            icon={<KeyRound size={14} />}
            label={"Key"}
            value={"Reusable"}
          />
        </div>
      </Row>
      <Row label={"tooltip list items"} className={"w-[320px]"}>
        <div className={"w-full bg-nb-gray-940 rounded-md"}>
          <TooltipListItem
            icon={<Users size={12} />}
            label={"Users"}
            value={"12"}
          />
          <TooltipListItem
            icon={<FolderGit2 size={12} />}
            label={"Groups"}
            value={"4"}
          />
        </div>
      </Row>
      <Row label={"minimal list"} className={"w-[420px]"}>
        <MinimalList
          data={[
            { label: "Hostname", value: "macbook-pro" },
            { label: "Version", value: "0.60.0", noCopy: true },
          ]}
        />
      </Row>
      <Row label={"dropdown info text"}>
        <DropdownInfoText>No more items to show.</DropdownInfoText>
      </Row>
    </Stack>
  ),
};

/* DeviceCard resolves the country name through CountryProvider. */
export const Devices: StoryObj = {
  decorators: [withAppProviders],
  render: () => (
    <div className={"flex flex-col gap-3 w-[360px]"}>
      <DeviceCard device={peers[0] as never} />
      <DeviceCard device={peers[1] as never} />
      <DeviceCard device={peers[5] as never} />
      <DeviceCard device={peers[3] as never} />
      <DeviceCard resource={resources[0] as never} />
      <DeviceCard resource={resources[2] as never} />
    </div>
  ),
};

export const Features: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"flex flex-col gap-4 w-[560px]"}>
      <FeatureCard
        icon={<ShieldCheck size={16} />}
        title={"Identity Provider Sync"}
        description={"Users and groups are synced from Okta."}
        action={<FeatureCardStatus enabled={true} />}
        onClick={() => {}}
        aria-label={"capture"}
      />
      <FeatureCard
        icon={<KeyRound size={16} />}
        title={"Single Sign-On"}
        description={"Not configured yet."}
        action={<FeatureCardStatus enabled={false} />}
        trailing={
          <Button variant={"secondary"} size={"xs"}>
            Configure
          </Button>
        }
      />
      <FeatureCard
        variant={"plain"}
        title={"API base URL"}
        description={"https://api.netbird.io"}
        action={<FeatureCardStatus enabled={false} />}
      />
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[aria-label=capture]")
      ?.setAttribute("data-capture", "");
  },
};

export const Settings: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"w-[640px]"}>
      <SettingCard>
        <SettingCard.Item
          label={"Event streaming"}
          description={"Stream activity events to Datadog."}
          enabled={true}
          onClick={() => {}}
          data-testid={"setting-1"}
        />
        <SettingCard.Item
          label={"Email notifications"}
          description={"Notify admins about new peers."}
          enabled={false}
          onClick={() => {}}
        />
        <SettingCard.Item
          label={"Disabled setting"}
          description={"Not available on this plan."}
          enabled={false}
          disabled
          onClick={() => {}}
        />
      </SettingCard>
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=setting-1]")
      ?.setAttribute("data-capture", "");
  },
};
