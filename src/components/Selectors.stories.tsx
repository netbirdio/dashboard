import { JSONFileUpload } from "@components/JSONFileUpload";
import { NetworkRouteSelector } from "@components/NetworkRouteSelector";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PeerSelector } from "@components/PeerSelector";
import { PortSelector } from "@components/PortSelector";
import { CitySelector } from "@components/ui/CitySelector";
import { CountrySelector } from "@components/ui/CountrySelector";
import { UserSelector } from "@components/UserSelector";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Peer } from "@/interfaces/Peer";
import {
  clickOpen,
  Controlled,
  padded,
  Row,
  Stack,
  withAppProviders,
} from "@/storybook/components";
import { GROUP } from "@/storybook/fixtures";
import { group, peers, users } from "@/storybook/fixtures";

/* The selectors fetch groups, peers, users, routes and countries, and read
   permissions and groups from context, so every story gets the provider
   stack and the component fixtures. */
const meta: Meta = {
  title: "Components/Selectors",
  decorators: [padded, withAppProviders],
};
export default meta;

const selected = [
  group(GROUP.developers),
  group(GROUP.servers),
  group(GROUP.kubernetes),
  group(GROUP.officeBerlin),
];

export const GroupSelector: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Stack>
      <Row label={"with groups"} className={"w-[560px]"}>
        <Controlled initial={selected}>
          {(v, set) => (
            <PeerGroupSelector
              values={v}
              onChange={set as never}
              saveGroupAssignments={false}
            />
          )}
        </Controlled>
      </Row>
      <Row label={"empty"} className={"w-[560px]"}>
        <PeerGroupSelector
          values={[]}
          onChange={() => {}}
          saveGroupAssignments={false}
          data-testid={"empty-selector"}
        />
      </Row>
      <Row label={"disabled"} className={"w-[560px]"}>
        <PeerGroupSelector
          values={selected.slice(0, 2) as never[]}
          onChange={() => {}}
          disabled
          saveGroupAssignments={false}
          data-testid={"disabled-selector"}
        />
      </Row>
    </Stack>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=group-selector-dropdown]")
      ?.setAttribute("data-capture", "");
  },
};

export const GroupSelectorOpen: StoryObj = {
  render: () => (
    <div className={"w-[560px]"}>
      <Controlled initial={selected.slice(0, 2)}>
        {(v, set) => (
          <PeerGroupSelector
            values={v}
            onChange={set as never}
            saveGroupAssignments={false}
            showPeerCount
          />
        )}
      </Controlled>
    </div>
  ),
  /* No wait for the group rows: they appear after a lodash debounce, which
     never fires while capture.mjs freezes Date.now(). */
  play: clickOpen("[data-testid=group-selector-dropdown]"),
};

export const GroupSelectorPeersTabOpen: StoryObj = {
  render: () => (
    <div className={"w-[560px]"}>
      <PeerGroupSelector
        values={[]}
        onChange={() => {}}
        saveGroupAssignments={false}
        showPeers
        showResources
        initialTab={"peers"}
      />
    </div>
  ),
  play: clickOpen(
    "[data-testid=group-selector-dropdown]",
    undefined,
    /DESKTOP-ADMIN-01|admin-macbook-air|auditor-workstation|contractor-laptop/,
  ),
};

export const GroupSelectorResourcesTabOpen: StoryObj = {
  render: () => (
    <div className={"w-[560px]"}>
      <PeerGroupSelector
        values={[]}
        onChange={() => {}}
        saveGroupAssignments={false}
        showPeers
        showResources
        initialTab={"resources"}
      />
    </div>
  ),
  play: clickOpen(
    "[data-testid=group-selector-dropdown]",
    undefined,
    "Office LAN",
  ),
};

export const Single: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Stack>
      <Row label={"peer, empty"} className={"w-[420px]"}>
        <Controlled initial={undefined as Peer | undefined}>
          {(v, set) => <PeerSelector value={v} onChange={set} />}
        </Controlled>
      </Row>
      <Row label={"peer, selected"} className={"w-[420px]"}>
        <PeerSelector value={peers[0] as never} onChange={() => {}} />
      </Row>
      <Row label={"peer, disabled"} className={"w-[420px]"}>
        <PeerSelector value={peers[5] as never} onChange={() => {}} disabled />
      </Row>
      <Row label={"user"} className={"w-[420px]"}>
        <UserSelector
          value={users[2] as never}
          onChange={() => {}}
          options={users as never[]}
        />
      </Row>
      <Row label={"user, empty"} className={"w-[420px]"}>
        <UserSelector
          onChange={() => {}}
          options={users as never[]}
          placeholder={"Select a user..."}
        />
      </Row>
      <Row label={"network route"} className={"w-[420px]"}>
        <NetworkRouteSelector onChange={() => {}} />
      </Row>
      <Row label={"ports"} className={"w-[420px]"}>
        <Controlled initial={[22, 80, 443]}>
          {(v, set) => (
            <PortSelector
              ports={v}
              onPortsChange={set as never}
              portRanges={[{ start: 8000, end: 8080 }]}
              onPortRangesChange={() => {}}
            />
          )}
        </Controlled>
      </Row>
      <Row label={"ports, disabled"} className={"w-[420px]"}>
        <PortSelector ports={[443]} onPortsChange={() => {}} disabled />
      </Row>
      <Row label={"country"} className={"w-[300px]"}>
        <CountrySelector value={"DE"} onChange={() => {}} />
      </Row>
      <Row label={"city"} className={"w-[300px]"}>
        <CitySelector value={"Berlin"} onChange={() => {}} country={"DE"} />
      </Row>
    </Stack>
  ),
  play: ({ canvasElement }) => {
    canvasElement.querySelector("button")?.setAttribute("data-capture", "");
  },
};

export const UserSelectorOpen: StoryObj = {
  render: () => (
    <div className={"w-[420px]"}>
      <UserSelector
        value={users[0] as never}
        onChange={() => {}}
        options={users as never[]}
      />
    </div>
  ),
  play: clickOpen("button", undefined, "Adam Admin"),
};

export const NetworkRouteSelectorOpen: StoryObj = {
  render: () => (
    <div className={"w-[420px]"}>
      <NetworkRouteSelector onChange={() => {}} />
    </div>
  ),
  play: clickOpen("button", undefined, /Exit Node/),
};

export const PortSelectorOpen: StoryObj = {
  render: () => (
    <div className={"w-[420px]"}>
      <PortSelector
        ports={[22, 80, 443]}
        onPortsChange={() => {}}
        portRanges={[{ start: 8000, end: 8080 }]}
        onPortRangesChange={() => {}}
      />
    </div>
  ),
  play: clickOpen("button"),
};

export const CountrySelectorOpen: StoryObj = {
  render: () => (
    <div className={"w-[300px]"}>
      <CountrySelector value={"DE"} onChange={() => {}} />
    </div>
  ),
  play: clickOpen("button", undefined, /France/),
};

export const FileUpload: StoryObj = {
  render: () => (
    <div className={"w-[480px]"}>
      <JSONFileUpload value={""} onChange={() => {}} />
    </div>
  ),
};
