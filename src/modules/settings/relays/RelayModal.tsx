import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Code from "@components/Code";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { CountrySelector } from "@components/ui/CountrySelector";
import useFetchApi, { useApiCall } from "@utils/api";
import { isNetBirdCloud } from "@utils/netbird";
import { trim, uniqueId } from "lodash";
import {
  CloudOffIcon,
  ExternalLinkIcon,
  FlagIcon,
  FolderGit2Icon,
  KeyRoundIcon,
  LifeBuoyIcon,
  MinusCircleIcon,
  PlusCircle,
  RadioTowerIcon,
  RefreshCwIcon,
  RocketIcon,
  SaveIcon,
  Settings2Icon,
  ShareIcon,
  TagIcon,
  TimerResetIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import { Relay, RelayRequest } from "@/interfaces/Relay";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import {
  countMatchingPeers,
  CREDENTIALS_TTL_OPTIONS,
  DEFAULT_CREDENTIALS_TTL,
  formatCredentialsTTL,
  generateRelaySecret,
  isInsecureRelayAddress,
  relayAddressError,
  relayDeployCommand,
  secretError,
} from "@/modules/settings/relays/relayHelpers";

export const RELAYS_DOCS_LINK =
  "https://docs.netbird.io/manage/settings/custom-relays";

type Props = {
  open: boolean;
  onClose: () => void;
  relay?: Relay | null;
  initialTab?: RelayModalTab;
};

export type RelayModalTab = "general" | "distribution" | "deploy";

type AddressRow = { id: string; value: string };
type LocationRow = { id: string; country_code: string };

const tabIconClass =
  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all";

export const instanceRelaysLabel = () =>
  isNetBirdCloud() ? "NetBird Cloud relays" : "instance relays";

export default function RelayModal({
  open,
  onClose,
  relay,
  initialTab = "general",
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={(state) => !state && onClose()}>
      {open && (
        <RelayModalContent
          relay={relay}
          onClose={onClose}
          initialTab={initialTab}
        />
      )}
    </Modal>
  );
}

function RelayModalContent({
  relay,
  onClose,
  initialTab,
}: Readonly<Omit<Props, "open">>) {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { data: peers } = useFetchApi<Peer[]>("/peers", true);
  const isEditing = !!relay;
  const canSave = permission.settings.update;

  const createRequest = useApiCall<Relay>("/relays");
  const updateRequest = useApiCall<Relay>("/relays/" + relay?.id);

  const [tab, setTab] = useState<string>(initialTab ?? "general");
  const [name, setName] = useState(relay?.name ?? "");
  const [description, setDescription] = useState(relay?.description ?? "");
  const [addresses, setAddresses] = useState<AddressRow[]>(
    (relay?.addresses?.length ? relay.addresses : [""]).map((value) => ({
      id: uniqueId("address"),
      value,
    })),
  );
  const [secret, setSecret] = useState(isEditing ? "" : generateRelaySecret());
  const [ttl, setTTL] = useState<number>(
    relay?.credentials_ttl ?? DEFAULT_CREDENTIALS_TTL,
  );
  const [groups, setGroups, { save: saveGroups }] = useGroupHelper({
    initial: relay?.distribution.groups ?? [],
  });
  const [locations, setLocations] = useState<LocationRow[]>(
    (relay?.distribution.locations ?? []).map((l) => ({
      id: uniqueId("location"),
      country_code: l.country_code,
    })),
  );
  const [fallback, setFallback] = useState(relay?.instance_fallback ?? true);

  const addressErrors = addresses.map((a) => relayAddressError(a.value));
  const filledAddresses = addresses
    .map((a) => trim(a.value))
    .filter((a) => a !== "");
  const hasInsecureAddress = filledAddresses.some(isInsecureRelayAddress);
  const secretValidation = secretError(trim(secret), !isEditing);

  const distribution = useMemo(
    () => ({
      groups: groups.map((g) => g.id ?? "").filter(Boolean),
      locations: locations
        .filter((l) => l.country_code)
        .map((l) => ({ country_code: l.country_code })),
    }),
    [groups, locations],
  );
  const hasDistribution =
    groups.length > 0 || distribution.locations.length > 0;
  const matchingPeers = countMatchingPeers(peers, distribution);

  const generalInvalid =
    trim(name) === "" ||
    filledAddresses.length === 0 ||
    addressErrors.some(Boolean) ||
    !!secretValidation;
  const isDisabled = generalInvalid || !hasDistribution || !canSave;

  const updateAddress = (id: string, value: string) =>
    setAddresses((rows) =>
      rows.map((r) => (r.id === id ? { ...r, value } : r)),
    );

  const updateLocation = (id: string, country_code: string) =>
    setLocations((rows) =>
      rows.map((r) => (r.id === id ? { ...r, country_code } : r)),
    );

  const submit = async () => {
    const savedGroups = await saveGroups();
    const payload: RelayRequest = {
      name: trim(name),
      description: trim(description),
      enabled: relay?.enabled ?? true,
      addresses: filledAddresses,
      credentials_ttl: ttl,
      distribution: {
        ...distribution,
        groups: savedGroups.map((g) => g.id).filter(Boolean) as string[],
      },
      instance_fallback: fallback,
    };
    if (trim(secret) !== "") payload.auth_secret = trim(secret);

    const request = isEditing
      ? updateRequest.put(payload)
      : createRequest.post(payload);

    notify({
      title: isEditing ? "Update Relay" : "Add Relay",
      description: `Relay '${payload.name}' was ${
        isEditing ? "updated" : "added"
      } successfully.`,
      promise: request.then(() => {
        mutate("/relays");
        onClose?.();
      }),
      loadingMessage: isEditing ? "Updating relay..." : "Adding relay...",
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-2xl"}>
      <ModalHeader
        icon={<RadioTowerIcon size={18} />}
        title={isEditing ? "Edit Relay" : "Add Relay"}
        description={
          "Run your own relay servers and choose which peers use them."
        }
        color={"netbird"}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"general"} data-testid="relay-tab-general">
            <Settings2Icon size={16} className={tabIconClass} />
            General
          </TabsTrigger>
          <TabsTrigger
            value={"distribution"}
            data-testid="relay-tab-distribution"
          >
            <ShareIcon size={16} className={tabIconClass} />
            Distribution
          </TabsTrigger>
          <TabsTrigger value={"deploy"} data-testid="relay-tab-deploy">
            <RocketIcon size={16} className={tabIconClass} />
            Deploy
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"general"} className={"pb-8"}>
          <div className={"px-8 flex flex-col gap-6"}>
            <div className={"flex gap-4"}>
              <div className={"w-full"}>
                <Label>Name</Label>
                <HelpText>A name to identify this relay.</HelpText>
                <Input
                  placeholder={"e.g., Frankfurt Relay"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  customPrefix={
                    <TagIcon size={16} className={"text-nb-gray-300"} />
                  }
                  data-testid="relay-name-input"
                />
              </div>
              <div className={"w-full"}>
                <Label>Description (optional)</Label>
                <HelpText>Where it runs or who owns it.</HelpText>
                <Input
                  placeholder={"e.g., Hetzner FSN1, owned by Infra"}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Addresses</Label>
              <HelpText>
                The exposed address of each relay instance sharing this secret.
                Peers race them and keep the fastest.
              </HelpText>
              <div className={"flex flex-col gap-2"}>
                {addresses.map((row, i) => (
                  <div key={row.id} className={"flex gap-2"}>
                    <div className={"w-full"}>
                      <Input
                        placeholder={"rels://relay.example.com:443"}
                        value={row.value}
                        error={addressErrors[i]}
                        errorTooltip={true}
                        onChange={(e) => updateAddress(row.id, e.target.value)}
                        customPrefix={
                          <RadioTowerIcon
                            size={16}
                            className={"text-nb-gray-300"}
                          />
                        }
                        data-testid="relay-address-input"
                      />
                    </div>
                    <Button
                      className={"h-[42px]"}
                      variant={"default-outline"}
                      disabled={addresses.length === 1}
                      onClick={() =>
                        setAddresses((rows) =>
                          rows.filter((r) => r.id !== row.id),
                        )
                      }
                    >
                      <MinusCircleIcon size={15} />
                    </Button>
                  </div>
                ))}
                <Button
                  variant={"dotted"}
                  size={"sm"}
                  onClick={() =>
                    setAddresses((rows) => [
                      ...rows,
                      { id: uniqueId("address"), value: "" },
                    ])
                  }
                >
                  <PlusCircle size={16} />
                  Add Address
                </Button>
              </div>
              {hasInsecureAddress && (
                <Callout variant={"warning"} className={"mt-3"}>
                  rel:// connections are not encrypted at the transport layer.
                  Peer traffic stays end-to-end encrypted, but relay credentials
                  are sent in clear text. Prefer rels://.
                </Callout>
              )}
            </div>

            <div>
              <Label>Auth Secret</Label>
              <HelpText>
                {isEditing
                  ? "Leave empty to keep the current secret, or enter a new one to rotate it. Update your relay servers with the same value."
                  : "Shared with your relay servers. NetBird signs short-lived peer credentials with it and never shows it again after saving."}
              </HelpText>
              <div className={"flex gap-2"}>
                <div className={"w-full"}>
                  <Input
                    type={"password"}
                    showPasswordToggle={true}
                    placeholder={isEditing ? "••••••••••••••••" : ""}
                    value={secret}
                    error={secretValidation}
                    errorTooltip={true}
                    onChange={(e) => setSecret(e.target.value)}
                    customPrefix={
                      <KeyRoundIcon size={16} className={"text-nb-gray-300"} />
                    }
                    data-testid="relay-secret-input"
                  />
                </div>
                <Button
                  variant={"secondary"}
                  className={"h-[42px] shrink-0"}
                  onClick={() => setSecret(generateRelaySecret())}
                >
                  <RefreshCwIcon size={14} />
                  Generate
                </Button>
              </div>
            </div>

            <div className={"flex justify-between items-center gap-10"}>
              <div>
                <Label>Credential Rotation Interval</Label>
                <HelpText margin={false}>
                  How long a peer credential stays valid. Peers fetch a new one
                  before it expires.
                </HelpText>
              </div>
              <Select
                value={String(ttl)}
                onValueChange={(v) => setTTL(Number(v))}
              >
                <SelectTrigger className={"w-[200px] shrink-0"}>
                  <div className={"flex items-center gap-2"}>
                    <TimerResetIcon size={15} className={"text-nb-gray-300"} />
                    <SelectValue>{formatCredentialsTTL(ttl)}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {CREDENTIALS_TTL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value={"distribution"} className={"pb-8"}>
          <div className={"px-8 flex flex-col gap-6"}>
            <div>
              <Label>
                <FolderGit2Icon size={14} />
                Distribution Groups
              </Label>
              <HelpText>
                Peers in any of these groups receive this relay.
              </HelpText>
              <PeerGroupSelector
                values={groups}
                onChange={setGroups}
                placeholder={"Select groups..."}
                showResourceCounter={false}
                data-testid="relay-groups-selector"
              />
            </div>

            <div>
              <Label>
                <FlagIcon size={14} />
                Distribution by Location
              </Label>
              <HelpText>
                Peers connecting from any of these countries receive this relay,
                based on the public IP they reach NetBird from.
              </HelpText>
              <div className={"flex flex-col gap-2"}>
                {locations.map((row) => (
                  <div key={row.id} className={"flex gap-2"}>
                    <CountrySelector
                      value={row.country_code}
                      onChange={(v) => updateLocation(row.id, v)}
                    />
                    <Button
                      className={"h-[42px]"}
                      variant={"default-outline"}
                      onClick={() =>
                        setLocations((rows) =>
                          rows.filter((r) => r.id !== row.id),
                        )
                      }
                    >
                      <MinusCircleIcon size={15} />
                    </Button>
                  </div>
                ))}
                <Button
                  variant={"dotted"}
                  size={"sm"}
                  onClick={() =>
                    setLocations((rows) => [
                      ...rows,
                      { id: uniqueId("location"), country_code: "" },
                    ])
                  }
                  data-testid="relay-add-location"
                >
                  <PlusCircle size={16} />
                  Add Location
                </Button>
              </div>
            </div>

            <Callout
              variant={hasDistribution ? "info" : "warning"}
              data-testid="relay-distribution-summary"
            >
              {hasDistribution ? (
                <>
                  Currently applies to{" "}
                  <span className={"font-medium text-white"}>
                    {matchingPeers} {matchingPeers === 1 ? "peer" : "peers"}
                  </span>
                  . Peers matched by more than one relay receive all of them.
                </>
              ) : (
                "Select at least one group or location. Peers that match no custom relay keep using the " +
                instanceRelaysLabel() +
                "."
              )}
            </Callout>

            <FancyToggleSwitch
              value={fallback}
              onChange={setFallback}
              data-testid="relay-fallback-toggle"
              label={
                <>
                  {fallback ? (
                    <LifeBuoyIcon size={15} />
                  ) : (
                    <CloudOffIcon size={15} />
                  )}
                  Allow fallback to {instanceRelaysLabel()}
                </>
              }
              helpText={
                fallback
                  ? `If this relay is unreachable, peers connect through the ${instanceRelaysLabel()} instead.`
                  : `Relayed traffic never leaves your infrastructure. If this relay is unreachable, relayed connections fail. Also applies to peers matched by other relays.`
              }
            />
          </div>
        </TabsContent>

        <TabsContent value={"deploy"} className={"pb-8"}>
          <div className={"px-8 flex flex-col gap-4"}>
            <div>
              <Label>Run the relay</Label>
              <HelpText margin={false}>
                Start a relay on a host reachable by your peers. The relay
                listens on 443 and gets a certificate from Let&apos;s Encrypt
                for its domain.
              </HelpText>
            </div>
            <Code
              codeToCopy={relayDeployCommand(
                filledAddresses[0] ?? "",
                trim(secret),
              ).join("\n")}
              message={"Command was copied to your clipboard!"}
            >
              {relayDeployCommand(filledAddresses[0] ?? "", trim(secret)).map(
                (line) => (
                  <Code.Line key={line}>{line}</Code.Line>
                ),
              )}
            </Code>
            {isEditing && trim(secret) === "" && (
              <HelpText margin={false}>
                The stored secret is never shown. Replace{" "}
                <code>&lt;auth-secret&gt;</code> with the value you saved, or
                generate a new one on the General tab.
              </HelpText>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={RELAYS_DOCS_LINK} target={"_blank"}>
              Custom Relays
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          {tab === "general" && !isEditing ? (
            <Button
              variant={"primary"}
              disabled={generalInvalid}
              onClick={() => setTab("distribution")}
              data-testid="relay-continue"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant={"primary"}
              disabled={isDisabled}
              onClick={submit}
              data-testid="relay-submit"
            >
              {isEditing ? (
                <>
                  <SaveIcon size={16} />
                  Save Changes
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Add Relay
                </>
              )}
            </Button>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
