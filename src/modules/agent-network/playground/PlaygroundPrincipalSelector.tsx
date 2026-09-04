"use client";

import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import { Callout } from "@components/Callout";
import Card from "@components/Card";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Label } from "@components/Label";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { UserListItem } from "@components/UserSelector";
import { Check, ChevronDown } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { User } from "@/interfaces/User";
import { PlaygroundPrincipalKind } from "./api";

export type PlaygroundPrincipalSelection = {
  mode: PlaygroundPrincipalKind;
  user?: User;
  peer?: Peer;
  group?: Group;
};

type Props = {
  value: PlaygroundPrincipalSelection;
  onChange: (value: PlaygroundPrincipalSelection) => void;
  users: User[];
  peers: Peer[];
  groups: Group[];
  canUsePeer: boolean;
  canUseGroup: boolean;
  disabled: boolean;
};

function UserPicker({
  value,
  users,
  disabled,
  onSelect,
}: Readonly<{
  value?: User;
  users: User[];
  disabled: boolean;
  onSelect: (user: User) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email ?? ""}`.toLowerCase().includes(normalizedQuery),
  );

  const triggerLabel =
    value?.name || (users.length ? "Select a user..." : "No users available.");
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="playground-user"
          variant="input"
          aria-label={triggerLabel}
          disabled={disabled}
          className="w-full min-w-0 justify-between text-left"
        >
          {value ? (
            <UserListItem user={value} variant="selected" />
          ) : (
            <span className="min-w-0 truncate">{triggerLabel}</span>
          )}
          <ChevronDown
            aria-hidden
            size={15}
            className="shrink-0 text-nb-gray-500"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <DropdownInput
          aria-label="Search users"
          value={query}
          onChange={(nextQuery: string | ChangeEvent<HTMLInputElement>) =>
            setQuery(
              typeof nextQuery === "string"
                ? nextQuery
                : nextQuery.target.value,
            )
          }
          placeholder="Search users..."
          hideEnterIcon
        />
        <div
          role="listbox"
          aria-label="Users"
          className="max-h-64 overflow-y-auto p-1"
        >
          {filteredUsers.length ? (
            filteredUsers.map((user) => {
              const selected = user.id === value?.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(user);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none hover:bg-nb-gray-910 focus-visible:bg-nb-gray-910"
                >
                  <UserListItem user={user} />
                  {selected && (
                    <Check
                      aria-hidden
                      size={15}
                      className="shrink-0 text-netbird"
                    />
                  )}
                </button>
              );
            })
          ) : (
            <DropdownInfoText className="mb-4 px-3">
              No users available.
            </DropdownInfoText>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GroupPicker({
  value,
  groups,
  disabled,
  onSelect,
}: Readonly<{
  value?: Group;
  groups: Group[];
  disabled: boolean;
  onSelect: (group: Group) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const selectableGroups = groups.filter((group) => Boolean(group.id));
  const filteredGroups = selectableGroups.filter((group) =>
    group.name.toLowerCase().includes(normalizedQuery),
  );
  const triggerLabel = value?.name
    ? value.name
    : selectableGroups.length
    ? "Select a group..."
    : "No groups available.";

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="playground-group"
          variant="input"
          aria-label={triggerLabel}
          disabled={disabled}
          className="w-full min-w-0 justify-between text-left"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {value && (
              <GroupBadgeIcon id={value.id} issued={value.issued} size={14} />
            )}
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown
            aria-hidden
            size={15}
            className="shrink-0 text-nb-gray-500"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <DropdownInput
          aria-label="Search groups"
          value={query}
          onChange={(nextQuery: string | ChangeEvent<HTMLInputElement>) =>
            setQuery(
              typeof nextQuery === "string"
                ? nextQuery
                : nextQuery.target.value,
            )
          }
          placeholder="Search groups..."
          hideEnterIcon
        />
        <div
          role="listbox"
          aria-label="Groups"
          className="max-h-64 overflow-y-auto p-1"
        >
          {filteredGroups.length ? (
            filteredGroups.map((group) => {
              const selected = group.id === value?.id;
              const peerCount = group.peers_count ?? group.peers?.length ?? 0;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(group);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none hover:bg-nb-gray-910 focus-visible:bg-nb-gray-910"
                >
                  <GroupBadgeIcon
                    id={group.id}
                    issued={group.issued}
                    size={14}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-nb-gray-100">
                    {group.name}
                  </span>
                  <span className="shrink-0 text-xs text-nb-gray-500">
                    {peerCount} {peerCount === 1 ? "peer" : "peers"}
                  </span>
                  {selected && (
                    <Check
                      aria-hidden
                      size={15}
                      className="shrink-0 text-netbird"
                    />
                  )}
                </button>
              );
            })
          ) : (
            <DropdownInfoText className="mb-4 px-3">
              No groups available.
            </DropdownInfoText>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function PlaygroundPrincipalSelector({
  value,
  onChange,
  users,
  peers,
  groups,
  canUsePeer,
  canUseGroup,
  disabled,
}: Readonly<Props>) {
  const userPeers = value.user
    ? peers.filter((peer) => peer.user_id === value.user?.id)
    : [];

  return (
    <section className="min-w-0" aria-labelledby="playground-identity-heading">
      <Card className="w-full">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2
              id="playground-identity-heading"
              className="shrink-0 text-sm font-semibold text-nb-gray-100"
            >
              Identity
            </h2>
            <div role="radiogroup" aria-label="Identity mode">
              <ButtonGroup>
                <ButtonGroup.Button
                  role="radio"
                  aria-checked={value.mode === "peer"}
                  aria-describedby="peer-mode-description"
                  variant={value.mode === "peer" ? "tertiary" : "secondary"}
                  disabled={disabled || !canUsePeer}
                  onClick={() =>
                    onChange({
                      mode: "peer",
                      user: value.user,
                      peer: value.peer,
                    })
                  }
                >
                  Peer-backed user
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  role="radio"
                  aria-checked={value.mode === "group"}
                  aria-describedby="group-mode-description"
                  variant={value.mode === "group" ? "tertiary" : "secondary"}
                  disabled={disabled || !canUseGroup}
                  onClick={() =>
                    onChange({ mode: "group", group: value.group })
                  }
                >
                  Synthetic group
                </ButtonGroup.Button>
              </ButtonGroup>
            </div>
            <span id="peer-mode-description" className="sr-only">
              Applies per-user and group policy limits.
            </span>
            <span id="group-mode-description" className="sr-only">
              Exercises one group without a user identity.
            </span>
          </div>

          <div className="border-t border-nb-gray-900 pt-4">
            {value.mode === "peer" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <Label htmlFor="playground-user">User</Label>
                  <UserPicker
                    value={value.user}
                    users={users}
                    disabled={disabled || !canUsePeer || users.length === 0}
                    onSelect={(user) =>
                      onChange({ mode: "peer", user, peer: undefined })
                    }
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="playground-peer">Peer</Label>
                  <Select
                    value={value.peer?.id ?? ""}
                    disabled={disabled || !value.user || userPeers.length === 0}
                    onValueChange={(peerID) =>
                      onChange({
                        mode: "peer",
                        user: value.user,
                        peer: userPeers.find((peer) => peer.id === peerID),
                      })
                    }
                  >
                    <SelectTrigger id="playground-peer" aria-label="Peer">
                      <SelectValue
                        placeholder={
                          value.user && userPeers.length === 0
                            ? "This user has no peers"
                            : "Select a peer..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {userPeers.map((peer) => (
                        <SelectItem
                          key={peer.id}
                          value={peer.id!}
                          description={peer.ip}
                        >
                          {peer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {value.user && userPeers.length === 0 && (
                  <div className="sm:col-span-2">
                    <Callout variant="warning">
                      This user has no peers to emulate.
                    </Callout>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-0">
                <Label htmlFor="playground-group">Group</Label>
                <GroupPicker
                  value={value.group}
                  groups={groups}
                  disabled={
                    disabled ||
                    !canUseGroup ||
                    !groups.some((group) => Boolean(group.id))
                  }
                  onSelect={(group) => onChange({ mode: "group", group })}
                />
              </div>
            )}
          </div>

          {value.mode === "group" && (
            <Callout variant="info">
              Synthetic group identity: per-user limits do not apply.
            </Callout>
          )}
        </div>
      </Card>
    </section>
  );
}
