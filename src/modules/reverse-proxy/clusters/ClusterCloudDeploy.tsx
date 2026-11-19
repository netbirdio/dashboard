import Button from "@components/Button";
import { Callout } from "@components/Callout";
import CardTable from "@components/CardTable";
import Code from "@components/Code";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { SelectDropdown } from "@components/select/SelectDropdown";
import {
  CheckCircle2,
  ExternalLinkIcon,
  Loader2,
  RocketIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { englishTranslations } from "@/i18n/translate";
import { isClusterConnected } from "@/interfaces/ReverseProxy";
import { useProxyCluster } from "@/modules/reverse-proxy/clusters/useProxyCluster";

// Synced from templates/reverse-proxy/netbird-proxy-cfn.yaml by the
// sync-deploy-templates workflow.
const CFN_TEMPLATE_URL =
  "https://netbird-deploy-templates.s3.eu-central-1.amazonaws.com/templates/netbird-proxy-cfn.yaml";

const DEFAULT_WIREGUARD_PORT = 51820;

export type CloudProvider = "hetzner" | "digitalocean" | "aws";

type Props = {
  provider: CloudProvider;
  domain: string;
  token: string;
  managementUrl: string;
  isGeneratingToken: boolean;
  // Fires once the deployed proxy registers and connects, so the modal can
  // gate its "Finish Setup" action on real completion.
  onRegistered?: () => void;
};

// buildCloudInit renders the canonical bootstrap with the same environment as
// the Docker snippet in the cluster modal, for use as VM user data. When a
// root password is given, it is set for provider web-console access while
// SSH password login stays disabled.
const buildCloudInit = (
  domain: string,
  token: string,
  managementUrl: string,
  rootPassword?: string,
) => `#cloud-config
${
  rootPassword
    ? `ssh_pwauth: false
chpasswd:
  expire: false
  users:
    - name: root
      password: ${rootPassword}
      type: text
`
    : ""
}write_files:
  - path: /opt/netbird-proxy/env
    permissions: "0600"
    content: |
      NB_PROXY_TOKEN=${token}
      NB_PROXY_DOMAIN=${domain}
      NB_PROXY_MANAGEMENT_ADDRESS=${managementUrl}
      NB_PROXY_ACME_CERTIFICATES=true
      NB_PROXY_CERTIFICATE_DIRECTORY=/certs
      NB_PROXY_ALLOW_INSECURE=true
      NB_PROXY_PRIVATE=true
      NB_PROXY_LOG_LEVEL=info
      NB_PROXY_ADDRESS=:443
      NB_PROXY_WG_PORT=${DEFAULT_WIREGUARD_PORT}
  - path: /opt/netbird-proxy/docker-compose.yml
    permissions: "0644"
    content: |
      services:
        reverse-proxy:
          image: netbirdio/reverse-proxy:latest
          restart: unless-stopped
          logging:
            driver: json-file
            options:
              max-size: "500m"
              max-file: "2"
          ports:
            - "80:80"
            - "443:443"
            - "${DEFAULT_WIREGUARD_PORT}:${DEFAULT_WIREGUARD_PORT}/udp"
          env_file:
            - /opt/netbird-proxy/env
          volumes:
            - proxy_certs:/certs
      volumes:
        proxy_certs:
runcmd:
  - curl -fsSL https://get.docker.com | sh
  - docker compose -f /opt/netbird-proxy/docker-compose.yml up -d
`;

export const ClusterCloudDeploy = ({ provider, ...props }: Props) => {
  if (provider === "hetzner") return <HetznerDeploy {...props} />;
  if (provider === "digitalocean") return <DigitalOceanDeploy {...props} />;
  return <AWSDeploy {...props} />;
};

type ProviderProps = Omit<Props, "provider">;

type HetznerServerType = {
  id: number;
  name: string;
  cores: number;
  memory: number;
  deprecated: boolean;
};

type HetznerCatalog = {
  locations: { name: string; label: string }[];
  availableTypeIds: Record<string, number[]>;
  serverTypes: HetznerServerType[];
  sshKeys: { id: number; name: string }[];
};

// fetchHetznerCatalog loads the current locations, server types, and
// per-location availability from the Hetzner API, excluding deprecated
// server types, so the dropdowns always offer valid combinations.
const fetchHetznerCatalog = async (
  token: string,
  translate = englishTranslations,
): Promise<HetznerCatalog> => {
  const headers = { Authorization: `Bearer ${token}` };
  const [typesRes, dcsRes, keysRes] = await Promise.all([
    fetch("https://api.hetzner.cloud/v1/server_types?per_page=50", { headers }),
    fetch("https://api.hetzner.cloud/v1/datacenters?per_page=50", { headers }),
    fetch("https://api.hetzner.cloud/v1/ssh_keys?per_page=50", { headers }),
  ]);
  const typesBody = await typesRes.json().catch(() => null);
  if (!typesRes.ok) {
    throw new Error(
      typesBody?.error?.message ??
        translate("reverseProxy.clusterHetznerApiError", {
          status: typesRes.status,
        }),
    );
  }
  const dcsBody = await dcsRes.json().catch(() => null);
  if (!dcsRes.ok) {
    throw new Error(
      dcsBody?.error?.message ??
        translate("reverseProxy.clusterHetznerApiError", {
          status: dcsRes.status,
        }),
    );
  }
  const keysBody = await keysRes.json().catch(() => null);
  if (!keysRes.ok) {
    throw new Error(
      keysBody?.error?.message ??
        translate("reverseProxy.clusterHetznerApiError", {
          status: keysRes.status,
        }),
    );
  }

  const serverTypes = ((typesBody?.server_types ?? []) as HetznerServerType[])
    .filter((t) => !t.deprecated)
    .sort((a, b) => a.memory - b.memory || a.cores - b.cores);

  type Datacenter = {
    location?: { name?: string; city?: string; country?: string };
    server_types?: { available?: number[] };
  };
  const locationLabels = new Map<string, string>();
  const availableTypeIds: Record<string, number[]> = {};
  for (const dc of (dcsBody?.datacenters ?? []) as Datacenter[]) {
    const name = dc.location?.name;
    if (!name) continue;
    locationLabels.set(
      name,
      `${dc.location?.city}, ${dc.location?.country} (${name})`,
    );
    const ids = new Set(availableTypeIds[name] ?? []);
    for (const id of dc.server_types?.available ?? []) {
      ids.add(id);
    }
    availableTypeIds[name] = Array.from(ids);
  }

  const locations = Array.from(locationLabels.entries())
    .map(([name, label]) => ({ name, label }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sshKeys = (
    (keysBody?.ssh_keys ?? []) as { id: number; name: string }[]
  ).map((k) => ({ id: k.id, name: k.name }));

  return { locations, availableTypeIds, serverTypes, sshKeys };
};

type DeploySuccessProps = {
  resourceLabel: string;
  name: string;
  ip: string;
  isStaticIP: boolean;
  domain: string;
  ipPendingNote?: string;
  onRegistered?: () => void;
  children?: React.ReactNode;
};

// RegistrationCheck polls the management API until the cluster for the given
// domain reports a connected proxy.
const RegistrationCheck = ({
  domain,
  onRegistered,
}: {
  domain: string;
  onRegistered?: () => void;
}) => {
  const translate = useTranslations();
  const cluster = useProxyCluster(domain, {
    done: isClusterConnected,
    maxAttempts: 120,
  });
  const registered = isClusterConnected(cluster);

  useEffect(() => {
    if (registered) onRegistered?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registered]);

  return (
    <div className={"flex items-center gap-2 text-sm"}>
      {registered ? (
        <>
          <CheckCircle2 size={16} className={"text-green-500 shrink-0"} />
          <span className={"text-nb-gray-100"}>
            {translate("reverseProxy.proxyRegisteredWithNetBirdAndConnected")}
          </span>
        </>
      ) : (
        <>
          <Loader2 size={16} className={"animate-spin shrink-0"} />
          <span className={"text-nb-gray-300"}>
            {translate("reverseProxy.waitingForTheProxyToRegisterWithNetBird")}
          </span>
        </>
      )}
    </div>
  );
};

// DeploySuccess shows the deployment result: the DNS records to create for
// the new instance IP and a live check that the proxy registered with the
// NetBird management service.
const DeploySuccess = ({
  resourceLabel,
  name,
  ip,
  isStaticIP,
  domain,
  ipPendingNote,
  onRegistered,
  children,
}: DeploySuccessProps) => {
  const translate = useTranslations();
  return (
    <div className={"flex flex-col gap-4"}>
      <Callout variant={"info"}>
        {ip
          ? translate.rich("reverseProxy.clusterCreatedWithAddress", {
              resource: resourceLabel,
              resourceName: name,
              ipType: isStaticIP
                ? translate("reverseProxy.staticIPText")
                : "IP",
              ip,
              name: (chunks) => (
                <span className="text-white font-medium">{chunks}</span>
              ),
              address: (chunks) => (
                <span className="text-netbird font-medium">{chunks}</span>
              ),
            })
          : translate.rich("reverseProxy.clusterCreatedPending", {
              resource: resourceLabel,
              resourceName: name,
              note: ipPendingNote ?? "",
              name: (chunks) => (
                <span className="text-white font-medium">{chunks}</span>
              ),
            })}
      </Callout>
      {ip && (
        <div>
          <Label>{translate("reverseProxy.createDNSRecords")}</Label>
          <HelpText>
            {translate.rich("reverseProxy.clusterDnsPointHelp", {
              resource: resourceLabel.toLowerCase(),
            })}
          </HelpText>
          <CardTable>
            <CardTable.Header>
              <CardTable.HeaderCell width={100}>
                {translate("common.type")}
              </CardTable.HeaderCell>
              <CardTable.HeaderCell>
                {translate("common.name")}
              </CardTable.HeaderCell>
              <CardTable.HeaderCell>
                {translate("reverseProxy.contentColumn")}
              </CardTable.HeaderCell>
            </CardTable.Header>
            <CardTable.Body>
              <CardTable.Row>
                <CardTable.Cell>A</CardTable.Cell>
                <CardTable.Cell copy copyText={domain}>
                  {domain}
                </CardTable.Cell>
                <CardTable.Cell copy copyText={ip}>
                  {ip}
                </CardTable.Cell>
              </CardTable.Row>
              <CardTable.Row>
                <CardTable.Cell>CNAME</CardTable.Cell>
                <CardTable.Cell copy copyText={`*.${domain}`}>
                  {`*.${domain}`}
                </CardTable.Cell>
                <CardTable.Cell copy copyText={domain}>
                  {domain}
                </CardTable.Cell>
              </CardTable.Row>
            </CardTable.Body>
          </CardTable>
        </div>
      )}
      {children}
      <RegistrationCheck domain={domain} onRegistered={onRegistered} />
    </div>
  );
};

const HetznerDeploy = ({
  domain,
  token,
  managementUrl,
  isGeneratingToken,
  onRegistered,
}: ProviderProps) => {
  const translate = useTranslations();
  const [hetznerToken, setHetznerToken] = useState("");
  const [catalog, setCatalog] = useState<HetznerCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [location, setLocation] = useState("");
  const [serverType, setServerType] = useState("");
  const [sshKeyId, setSshKeyId] = useState("");
  const [staticIP, setStaticIP] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [serverIP, setServerIP] = useState("");

  const serverName = useMemo(() => {
    const label = domain.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    return `netbird-proxy-${label}`.slice(0, 63).replace(/-+$/, "");
  }, [domain]);

  // Load the live catalog once a plausible token is entered, debounced so we
  // don't call the API on every keystroke.
  useEffect(() => {
    const apiToken = hetznerToken.trim();
    if (apiToken.length < 32) {
      setCatalog(null);
      setCatalogError("");
      return;
    }
    const timer = setTimeout(() => {
      setIsLoadingCatalog(true);
      setCatalogError("");
      fetchHetznerCatalog(apiToken, translate)
        .then(setCatalog)
        .catch((err) => {
          setCatalog(null);
          setCatalogError(
            err instanceof Error
              ? err.message
              : translate("reverseProxy.requestFailed"),
          );
        })
        .finally(() => setIsLoadingCatalog(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [hetznerToken, translate]);

  const locationOptions = useMemo(
    () =>
      catalog?.locations.map((l) => ({ value: l.name, label: l.label })) ?? [],
    [catalog],
  );

  const serverTypeOptions = useMemo(() => {
    if (!catalog || !location) return [];
    const ids = catalog.availableTypeIds[location] ?? [];
    return catalog.serverTypes
      .filter((t) => ids.includes(t.id))
      .map((t) => ({
        value: t.name,
        label: `${t.name.toUpperCase()} - ${t.cores} vCPU / ${Math.round(
          t.memory,
        )} GB`,
      }));
  }, [catalog, location]);

  useEffect(() => {
    if (!catalog) return;
    if (!catalog.locations.some((l) => l.name === location)) {
      const preferred =
        catalog.locations.find((l) => l.name === "nbg1") ??
        catalog.locations[0];
      setLocation(preferred?.name ?? "");
    }
  }, [catalog, location]);

  useEffect(() => {
    if (!catalog || !location) return;
    if (!serverTypeOptions.some((o) => o.value === serverType)) {
      setServerType(serverTypeOptions[0]?.value ?? "");
    }
  }, [catalog, location, serverTypeOptions, serverType]);

  useEffect(() => {
    if (!catalog) return;
    if (!catalog.sshKeys.some((k) => String(k.id) === sshKeyId)) {
      setSshKeyId(catalog.sshKeys[0] ? String(catalog.sshKeys[0].id) : "");
    }
  }, [catalog, sshKeyId]);

  const deploy = async () => {
    setIsDeploying(true);
    const apiToken = hetznerToken.trim();
    const promise = fetch("https://api.hetzner.cloud/v1/servers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: serverName,
        server_type: serverType,
        image: "ubuntu-24.04",
        location,
        ssh_keys: sshKeyId ? [Number(sshKeyId)] : [],
        user_data: buildCloudInit(domain, token, managementUrl),
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.error?.message ??
              translate("reverseProxy.clusterHetznerApiError", {
                status: res.status,
              }),
          );
        }
        setServerIP(body?.server?.public_net?.ipv4?.ip ?? "");
        const primaryIPId = body?.server?.public_net?.ipv4?.id;
        if (staticIP && primaryIPId) {
          const ipRes = await fetch(
            `https://api.hetzner.cloud/v1/primary_ips/${primaryIPId}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ auto_delete: false }),
            },
          );
          if (!ipRes.ok) {
            const ipBody = await ipRes.json().catch(() => null);
            throw new Error(
              translate("reverseProxy.clusterStaticIpError", {
                error: ipBody?.error?.message ?? `HTTP ${ipRes.status}`,
              }),
            );
          }
        }
      })
      .finally(() => setIsDeploying(false));

    notify({
      title: translate("reverseProxy.hetznerDeployment"),
      description: translate("reverseProxy.failedToCreateTheHetznerServer"),
      promise,
      loadingMessage: translate("reverseProxy.creatingHetznerServer"),
      showOnlyError: true,
      preventSuccessToast: true,
    });
  };

  if (serverIP) {
    return (
      <DeploySuccess
        resourceLabel={translate("reverseProxy.server")}
        name={serverName}
        ip={serverIP}
        isStaticIP={staticIP}
        domain={domain}
        onRegistered={onRegistered}
      />
    );
  }

  return (
    <div className={"flex flex-col gap-4"}>
      <div>
        <Label>
          {translate("reverseProxy.hetznerAPIToken")}
          <HelpTooltip
            interactive={true}
            content={
              <>
                {translate(
                  "reverseProxy.theTokenGoesStraightFromYourBrowserToHetznerAndNeverTouches",
                )}{" "}
                <InlineLink
                  href={
                    "https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/"
                  }
                  target={"_blank"}
                >
                  {translate("reverseProxy.howToCreateAToken")}
                </InlineLink>
              </>
            }
          />
        </Label>
        <HelpText>
          {translate(
            "reverseProxy.createAReadWriteAPITokenItIsNeverStoredByNetBird",
          )}
        </HelpText>
        <Input
          type={"password"}
          placeholder={translate(
            "reverseProxy.pasteYourHetznerCloudAPITokenHere",
          )}
          value={hetznerToken}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setHetznerToken(e.target.value)
          }
        />
      </div>
      {catalogError && (
        <Callout variant={"warning"}>
          {translate("reverseProxy.couldNotLoadHetznerOptions")}
          {catalogError}
        </Callout>
      )}
      {catalog ? (
        <>
          <div className={"flex gap-4"}>
            <div className={"w-1/2"}>
              <Label>{translate("reverseProxy.location")}</Label>
              <SelectDropdown
                value={location}
                onChange={(v) => setLocation(v as string)}
                options={locationOptions}
              />
            </div>
            <div className={"w-1/2"}>
              <Label>{translate("reverseProxy.serverType")}</Label>
              <SelectDropdown
                value={serverType}
                onChange={(v) => setServerType(v as string)}
                options={serverTypeOptions}
              />
            </div>
          </div>
          <div>
            <Label>{translate("reverseProxy.sSHKey")}</Label>
            {catalog.sshKeys.length > 0 ? (
              <SelectDropdown
                value={sshKeyId}
                onChange={(v) => setSshKeyId(v as string)}
                options={catalog.sshKeys.map((k) => ({
                  value: String(k.id),
                  label: k.name,
                }))}
              />
            ) : (
              <HelpText className={"mb-0"}>
                {translate(
                  "reverseProxy.noSSHKeysFoundInThisHetznerProjectAddOneInThe",
                )}
              </HelpText>
            )}
          </div>
          <FancyToggleSwitch
            value={staticIP}
            onChange={setStaticIP}
            label={translate("reverseProxy.staticIPText")}
            helpText={translate(
              "reverseProxy.keepTheServerSIPWhenTheServerIsDeletedOrRebuilt",
            )}
          />
        </>
      ) : (
        <HelpText className={"mb-0"}>
          {isLoadingCatalog
            ? translate("reverseProxy.loadingAvailableLocationsAndServerTypes")
            : translate(
                "reverseProxy.enterYourAPITokenToLoadTheAvailableLocationsAndServerTypes",
              )}
        </HelpText>
      )}
      <Button
        variant={"primary"}
        disabled={
          !catalog ||
          !location ||
          !serverType ||
          isDeploying ||
          isGeneratingToken ||
          !token
        }
        onClick={deploy}
      >
        {isDeploying || isGeneratingToken ? (
          <Loader2 size={16} className={"animate-spin"} />
        ) : (
          <RocketIcon size={16} />
        )}
        {isGeneratingToken
          ? translate("reverseProxy.preparingProxyToken")
          : translate("reverseProxy.deployServer")}
      </Button>
    </div>
  );
};

// waitForDropletIP polls the droplet until its public IPv4 is assigned.
const waitForDropletIP = async (dropletId: number, doToken: string) => {
  for (let attempt = 0; attempt < 18; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const res = await fetch(
      `https://api.digitalocean.com/v2/droplets/${dropletId}`,
      { headers: { Authorization: `Bearer ${doToken}` } },
    );
    const body = await res.json().catch(() => null);
    const ip = body?.droplet?.networks?.v4?.find(
      (net: { type: string }) => net.type === "public",
    )?.ip_address;
    if (ip) return ip as string;
  }
  return "";
};

// generateRootPassword creates a random droplet password from an alphanumeric
// set without ambiguous characters.
const generateRootPassword = () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const values = new Uint32Array(20);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
};

const DigitalOceanDeploy = ({
  domain,
  token,
  managementUrl,
  isGeneratingToken,
  onRegistered,
}: ProviderProps) => {
  const translate = useTranslations();
  const DIGITALOCEAN_SIZES = [
    { value: "s-1vcpu-1gb", label: translate("reverseProxy.basic1VCPU1GB") },
    { value: "s-1vcpu-2gb", label: translate("reverseProxy.basic1VCPU2GB") },
    { value: "s-2vcpu-2gb", label: translate("reverseProxy.basic2VCPU2GB") },
    { value: "s-2vcpu-4gb", label: translate("reverseProxy.basic2VCPU4GB") },
  ];
  const DIGITALOCEAN_REGIONS = [
    { value: "fra1", label: translate("reverseProxy.frankfurtGermanyFra1") },
    {
      value: "ams3",
      label: translate("reverseProxy.amsterdamNetherlandsAms3"),
    },
    { value: "lon1", label: translate("reverseProxy.londonUKLon1") },
    { value: "nyc3", label: translate("reverseProxy.newYorkUSANyc3") },
    { value: "sfo3", label: translate("reverseProxy.sanFranciscoUSASfo3") },
    { value: "tor1", label: translate("reverseProxy.torontoCanadaTor1") },
    { value: "sgp1", label: translate("reverseProxy.singaporeSgp1") },
    { value: "blr1", label: translate("reverseProxy.bangaloreIndiaBlr1") },
    { value: "syd1", label: translate("reverseProxy.sydneyAustraliaSyd1") },
  ];
  const [rootPassword] = useState(generateRootPassword);
  const [doToken, setDoToken] = useState("");
  const [region, setRegion] = useState("fra1");
  const [size, setSize] = useState("s-1vcpu-2gb");
  const [staticIP, setStaticIP] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [dropletIP, setDropletIP] = useState("");
  const [reservedIP, setReservedIP] = useState("");

  const dropletName = useMemo(() => {
    const label = domain.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
    return `netbird-proxy-${label}`.slice(0, 63).replace(/[-.]+$/, "");
  }, [domain]);

  const deploy = async () => {
    setIsDeploying(true);
    const promise = fetch("https://api.digitalocean.com/v2/droplets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${doToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: dropletName,
        region,
        size,
        image: "ubuntu-24-04-x64",
        user_data: buildCloudInit(domain, token, managementUrl, rootPassword),
        tags: ["netbird-proxy"],
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.message ??
              translate("reverseProxy.clusterDigitalOceanApiError", {
                status: res.status,
              }),
          );
        }
        setIsCreated(true);
        const dropletId = body?.droplet?.id;
        const ip = await waitForDropletIP(dropletId, doToken);
        setDropletIP(ip);
        if (staticIP && dropletId) {
          const ipRes = await fetch(
            "https://api.digitalocean.com/v2/reserved_ips",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${doToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ droplet_id: dropletId }),
            },
          );
          const ipBody = await ipRes.json().catch(() => null);
          if (!ipRes.ok) {
            throw new Error(
              translate("reverseProxy.clusterReservedIpError", {
                error: ipBody?.message ?? `HTTP ${ipRes.status}`,
              }),
            );
          }
          setReservedIP(ipBody?.reserved_ip?.ip ?? "");
        }
      })
      .finally(() => setIsDeploying(false));

    notify({
      title: translate("reverseProxy.digitalOceanDeployment"),
      description: translate(
        "reverseProxy.failedToCreateTheDigitalOceanDroplet",
      ),
      promise,
      loadingMessage: translate("reverseProxy.creatingDigitalOceanDroplet"),
      showOnlyError: true,
      preventSuccessToast: true,
    });
  };

  if (isCreated) {
    return (
      <DeploySuccess
        resourceLabel={"Droplet"}
        name={dropletName}
        ip={reservedIP || dropletIP}
        isStaticIP={!!reservedIP}
        domain={domain}
        onRegistered={onRegistered}
        ipPendingNote={
          isDeploying
            ? translate("reverseProxy.andIsProvisioningWaitingForItsPublicIP")
            : translate(
                "reverseProxy.butWaitingForItsPublicIPTimedOutFindTheIPIn",
              )
        }
      >
        <div>
          <Label>{translate("reverseProxy.dropletRootPassword")}</Label>
          <HelpText>
            {translate(
              "reverseProxy.useItWithTheDropletWebConsoleCopyItNowItIs",
            )}
          </HelpText>
          <Code codeToCopy={rootPassword}>
            <Code.Line>{rootPassword}</Code.Line>
          </Code>
        </div>
      </DeploySuccess>
    );
  }

  return (
    <div className={"flex flex-col gap-4"}>
      <div>
        <Label>
          {translate("reverseProxy.digitalOceanAPIToken")}
          <HelpTooltip
            interactive={true}
            content={
              <>
                {translate.rich("reverseProxy.clusterDigitalOceanTokenHelp", {
                  tagScope: (chunks) => (
                    <span className="font-mono text-netbird">{chunks}</span>
                  ),
                  dropletScope: (chunks) => (
                    <span className="font-mono text-netbird">{chunks}</span>
                  ),
                  ipScope: (chunks) => (
                    <span className="font-mono text-netbird">{chunks}</span>
                  ),
                  link: (chunks) => (
                    <InlineLink
                      href="https://docs.digitalocean.com/reference/api/create-personal-access-token/"
                      target="_blank"
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </>
            }
          />
        </Label>
        <HelpText>
          {translate(
            "reverseProxy.createATokenWithWriteAccessItIsNeverStoredByNetBird",
          )}
        </HelpText>
        <Input
          type={"password"}
          placeholder={translate(
            "reverseProxy.pasteYourDigitalOceanAPITokenHere",
          )}
          value={doToken}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDoToken(e.target.value)
          }
        />
      </div>
      <div className={"flex gap-4"}>
        <div className={"w-1/2"}>
          <Label>{translate("reverseProxy.region")}</Label>
          <SelectDropdown
            value={region}
            onChange={(v) => setRegion(v as string)}
            options={DIGITALOCEAN_REGIONS}
          />
        </div>
        <div className={"w-1/2"}>
          <Label>{translate("reverseProxy.dropletSize")}</Label>
          <SelectDropdown
            value={size}
            onChange={(v) => setSize(v as string)}
            options={DIGITALOCEAN_SIZES}
          />
        </div>
      </div>
      <FancyToggleSwitch
        value={staticIP}
        onChange={setStaticIP}
        label={translate("reverseProxy.staticIPText")}
        helpText={translate(
          "reverseProxy.reserveAStaticIPSoDNSRecordsRemainValidAfterRebuildsFree",
        )}
      />
      <Button
        variant={"primary"}
        disabled={!doToken || isDeploying || isGeneratingToken || !token}
        onClick={deploy}
      >
        {isDeploying || isGeneratingToken ? (
          <Loader2 size={16} className={"animate-spin"} />
        ) : (
          <RocketIcon size={16} />
        )}
        {isGeneratingToken
          ? translate("reverseProxy.preparingProxyToken")
          : translate("reverseProxy.deployDroplet")}
      </Button>
    </div>
  );
};

const AWSDeploy = ({
  domain,
  token,
  managementUrl,
  isGeneratingToken,
  onRegistered,
}: ProviderProps) => {
  const translate = useTranslations();
  const AWS_REGIONS = [
    { value: "us-east-1", label: translate("reverseProxy.uSEastNVirginia") },
    { value: "us-east-2", label: translate("reverseProxy.uSEastOhio") },
    { value: "us-west-2", label: translate("reverseProxy.uSWestOregon") },
    { value: "eu-central-1", label: translate("reverseProxy.europeFrankfurt") },
    { value: "eu-west-1", label: translate("reverseProxy.europeIreland") },
    { value: "eu-west-2", label: translate("reverseProxy.europeLondon") },
    {
      value: "ap-southeast-1",
      label: translate("reverseProxy.asiaPacificSingapore"),
    },
    {
      value: "ap-northeast-1",
      label: translate("reverseProxy.asiaPacificTokyo"),
    },
  ];
  const [region, setRegion] = useState("eu-central-1");
  const [launched, setLaunched] = useState(false);

  const launchUrl = useMemo(() => {
    const params = new URLSearchParams({
      templateURL: CFN_TEMPLATE_URL,
      stackName: "netbird-proxy",
      param_ProxyDomain: domain,
      param_ManagementURL: managementUrl,
    });
    return `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/quickcreate?${params.toString()}`;
  }, [region, domain, managementUrl]);

  return (
    <div className={"flex flex-col gap-4"}>
      <div>
        <Label>{translate("reverseProxy.proxyAccessToken")}</Label>
        <HelpText>
          {translate(
            "reverseProxy.copyThisTokenForAWSStackCreationItIsExcludedFromOutputs",
          )}
        </HelpText>
        <Code codeToCopy={token} showCopyIcon={!isGeneratingToken}>
          <Code.Line>
            {isGeneratingToken
              ? translate("reverseProxy.generatingProxyToken")
              : token}
          </Code.Line>
        </Code>
      </div>
      <div>
        <Label>{translate("reverseProxy.region")}</Label>
        <SelectDropdown
          value={region}
          onChange={(v) => setRegion(v as string)}
          options={AWS_REGIONS}
        />
      </div>
      <Button
        variant={"primary"}
        disabled={isGeneratingToken || !token}
        onClick={() => {
          window.open(launchUrl, "_blank", "noopener,noreferrer");
          setLaunched(true);
        }}
      >
        <RocketIcon size={16} />
        {translate("reverseProxy.launchStackInAWSConsole")}
        <ExternalLinkIcon size={14} />
      </Button>
      <HelpText className={"mb-0"}>
        {translate(
          "reverseProxy.theAWSConsoleOpensWithAPrefilledFormPasteTheTokenCreate",
        )}
      </HelpText>
      {launched && (
        <RegistrationCheck domain={domain} onRegistered={onRegistered} />
      )}
    </div>
  );
};
