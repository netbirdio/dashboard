import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Code from "@components/Code";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { ExternalLinkIcon, Loader2, RocketIcon } from "lucide-react";
import React, { useMemo, useState } from "react";

// TODO(PoC): replace with the final public S3 location of
// proxy/deploy/aws/netbird-proxy-cfn.yaml from the netbird repository.
const CFN_TEMPLATE_URL =
  "https://netbird-deploy-templates.s3.amazonaws.com/netbird-proxy-cfn.yaml";

const DEFAULT_WIREGUARD_PORT = 51820;

const HETZNER_LOCATIONS = [
  { value: "nbg1", label: "Nuremberg, Germany (nbg1)" },
  { value: "fsn1", label: "Falkenstein, Germany (fsn1)" },
  { value: "hel1", label: "Helsinki, Finland (hel1)" },
  { value: "ash", label: "Ashburn, VA, USA (ash)" },
  { value: "hil", label: "Hillsboro, OR, USA (hil)" },
  { value: "sin", label: "Singapore (sin)" },
];

const HETZNER_SERVER_TYPES = [
  { value: "cx22", label: "CX22 - 2 vCPU / 4 GB (EU locations only)" },
  { value: "cpx11", label: "CPX11 - 2 vCPU / 2 GB" },
  { value: "cpx21", label: "CPX21 - 3 vCPU / 4 GB" },
  { value: "cpx31", label: "CPX31 - 4 vCPU / 8 GB" },
];

const DIGITALOCEAN_REGIONS = [
  { value: "fra1", label: "Frankfurt, Germany (fra1)" },
  { value: "ams3", label: "Amsterdam, Netherlands (ams3)" },
  { value: "lon1", label: "London, UK (lon1)" },
  { value: "nyc3", label: "New York, USA (nyc3)" },
  { value: "sfo3", label: "San Francisco, USA (sfo3)" },
  { value: "tor1", label: "Toronto, Canada (tor1)" },
  { value: "sgp1", label: "Singapore (sgp1)" },
  { value: "blr1", label: "Bangalore, India (blr1)" },
  { value: "syd1", label: "Sydney, Australia (syd1)" },
];

const DIGITALOCEAN_SIZES = [
  { value: "s-1vcpu-1gb", label: "Basic - 1 vCPU / 1 GB" },
  { value: "s-1vcpu-2gb", label: "Basic - 1 vCPU / 2 GB" },
  { value: "s-2vcpu-2gb", label: "Basic - 2 vCPU / 2 GB" },
  { value: "s-2vcpu-4gb", label: "Basic - 2 vCPU / 4 GB" },
];

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
];

export type CloudProvider = "hetzner" | "digitalocean" | "aws";

type Props = {
  provider: CloudProvider;
  domain: string;
  token: string;
  managementUrl: string;
  isGeneratingToken: boolean;
};

// buildCloudInit renders the canonical bootstrap with the same environment as
// the Docker snippet in the cluster modal, for use as VM user data.
const buildCloudInit = (
  domain: string,
  token: string,
  managementUrl: string,
) => `#cloud-config
write_files:
  - path: /etc/netbird-proxy/env
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
runcmd:
  - curl -fsSL https://get.docker.com | sh
  - >-
    docker run -d --name netbird-proxy --restart unless-stopped
    -p 443:443 -p 80:80
    -p ${DEFAULT_WIREGUARD_PORT}:${DEFAULT_WIREGUARD_PORT}/udp
    --env-file /etc/netbird-proxy/env
    -v proxy_certs:/certs
    netbirdio/reverse-proxy:latest
`;

export const ClusterCloudDeploy = ({ provider, ...props }: Props) => {
  if (provider === "hetzner") return <HetznerDeploy {...props} />;
  if (provider === "digitalocean") return <DigitalOceanDeploy {...props} />;
  return <AWSDeploy {...props} />;
};

type ProviderProps = Omit<Props, "provider">;

const HetznerDeploy = ({
  domain,
  token,
  managementUrl,
  isGeneratingToken,
}: ProviderProps) => {
  const [hetznerToken, setHetznerToken] = useState("");
  const [location, setLocation] = useState("nbg1");
  const [serverType, setServerType] = useState("cx22");
  const [isDeploying, setIsDeploying] = useState(false);
  const [serverIP, setServerIP] = useState("");

  const serverName = useMemo(() => {
    const label = domain.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    return `netbird-proxy-${label}`.slice(0, 63).replace(/-+$/, "");
  }, [domain]);

  const deploy = async () => {
    setIsDeploying(true);
    const promise = fetch("https://api.hetzner.cloud/v1/servers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hetznerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: serverName,
        server_type: serverType,
        image: "ubuntu-24.04",
        location,
        user_data: buildCloudInit(domain, token, managementUrl),
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.error?.message ?? `Hetzner API error (HTTP ${res.status})`,
          );
        }
        setServerIP(body?.server?.public_net?.ipv4?.ip ?? "");
      })
      .finally(() => setIsDeploying(false));

    notify({
      title: "Hetzner Deployment",
      description: "Failed to create the Hetzner server",
      promise,
      loadingMessage: "Creating Hetzner server...",
      showOnlyError: true,
      preventSuccessToast: true,
    });
  };

  if (serverIP) {
    return (
      <Callout variant={"info"}>
        Server <span className={"text-white font-medium"}>{serverName}</span>{" "}
        was created with IP{" "}
        <span className={"text-netbird font-medium"}>{serverIP}</span>. Update
        the DNS records from the previous step to point to this IP. The proxy
        will request its certificate and connect within a minute or two.
      </Callout>
    );
  }

  return (
    <div className={"flex flex-col gap-4"}>
      <div>
        <Label>Hetzner API Token</Label>
        <HelpText>
          Create a read &amp; write API token in your Hetzner Cloud project. It
          is sent directly from your browser to the Hetzner API and never stored
          by NetBird.
        </HelpText>
        <Input
          type={"password"}
          placeholder={"Paste your Hetzner Cloud API token"}
          value={hetznerToken}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setHetznerToken(e.target.value)
          }
        />
      </div>
      <div className={"flex gap-4"}>
        <div className={"w-1/2"}>
          <Label>Location</Label>
          <SelectDropdown
            value={location}
            onChange={(v) => setLocation(v as string)}
            options={HETZNER_LOCATIONS}
          />
        </div>
        <div className={"w-1/2"}>
          <Label>Server Type</Label>
          <SelectDropdown
            value={serverType}
            onChange={(v) => setServerType(v as string)}
            options={HETZNER_SERVER_TYPES}
          />
        </div>
      </div>
      <Button
        variant={"primary"}
        disabled={!hetznerToken || isDeploying || isGeneratingToken || !token}
        onClick={deploy}
      >
        {isDeploying || isGeneratingToken ? (
          <Loader2 size={16} className={"animate-spin"} />
        ) : (
          <RocketIcon size={16} />
        )}
        {isGeneratingToken ? "Preparing proxy token..." : "Deploy Server"}
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

const DigitalOceanDeploy = ({
  domain,
  token,
  managementUrl,
  isGeneratingToken,
}: ProviderProps) => {
  const [doToken, setDoToken] = useState("");
  const [region, setRegion] = useState("fra1");
  const [size, setSize] = useState("s-1vcpu-2gb");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [dropletIP, setDropletIP] = useState("");

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
        user_data: buildCloudInit(domain, token, managementUrl),
        tags: ["netbird-proxy"],
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.message ?? `DigitalOcean API error (HTTP ${res.status})`,
          );
        }
        setIsCreated(true);
        const ip = await waitForDropletIP(body?.droplet?.id, doToken);
        setDropletIP(ip);
      })
      .finally(() => setIsDeploying(false));

    notify({
      title: "DigitalOcean Deployment",
      description: "Failed to create the DigitalOcean droplet",
      promise,
      loadingMessage: "Creating DigitalOcean droplet...",
      showOnlyError: true,
      preventSuccessToast: true,
    });
  };

  if (isCreated) {
    return (
      <Callout variant={"info"}>
        Droplet <span className={"text-white font-medium"}>{dropletName}</span>{" "}
        was created
        {dropletIP ? (
          <>
            {" "}
            with IP{" "}
            <span className={"text-netbird font-medium"}>{dropletIP}</span>.
            Update the DNS records from the previous step to point to this IP.
            The proxy will request its certificate and connect within a minute
            or two.
          </>
        ) : (
          <>
            {" "}
            and is provisioning. Waiting for its public IP
            {isDeploying
              ? "..."
              : " timed out - find the IP in the DigitalOcean control panel and update the DNS records from the previous step."}
          </>
        )}
      </Callout>
    );
  }

  return (
    <div className={"flex flex-col gap-4"}>
      <div>
        <Label>DigitalOcean API Token</Label>
        <HelpText>
          Create a token with write scope in your DigitalOcean account. It is
          sent directly from your browser to the DigitalOcean API and never
          stored by NetBird.
        </HelpText>
        <Input
          type={"password"}
          placeholder={"Paste your DigitalOcean API token"}
          value={doToken}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDoToken(e.target.value)
          }
        />
      </div>
      <div className={"flex gap-4"}>
        <div className={"w-1/2"}>
          <Label>Region</Label>
          <SelectDropdown
            value={region}
            onChange={(v) => setRegion(v as string)}
            options={DIGITALOCEAN_REGIONS}
          />
        </div>
        <div className={"w-1/2"}>
          <Label>Droplet Size</Label>
          <SelectDropdown
            value={size}
            onChange={(v) => setSize(v as string)}
            options={DIGITALOCEAN_SIZES}
          />
        </div>
      </div>
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
        {isGeneratingToken ? "Preparing proxy token..." : "Deploy Droplet"}
      </Button>
    </div>
  );
};

const AWSDeploy = ({
  domain,
  token,
  managementUrl,
  isGeneratingToken,
}: ProviderProps) => {
  const [region, setRegion] = useState("eu-central-1");

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
        <Label>Proxy Access Token</Label>
        <HelpText>
          Copy this token first. AWS asks for it in the stack creation form (the
          field is masked and excluded from stack outputs and logs).
        </HelpText>
        <Code codeToCopy={token} showCopyIcon={!isGeneratingToken}>
          <Code.Line>
            {isGeneratingToken ? "Generating proxy token..." : token}
          </Code.Line>
        </Code>
      </div>
      <div>
        <Label>Region</Label>
        <SelectDropdown
          value={region}
          onChange={(v) => setRegion(v as string)}
          options={AWS_REGIONS}
        />
      </div>
      <Button
        variant={"primary"}
        disabled={isGeneratingToken || !token}
        onClick={() => window.open(launchUrl, "_blank", "noopener,noreferrer")}
      >
        <RocketIcon size={16} />
        Launch Stack in AWS Console
        <ExternalLinkIcon size={14} />
      </Button>
      <HelpText className={"mb-0"}>
        The AWS console opens with a pre-filled CloudFormation form: paste the
        token, review, and create the stack. Point the DNS records from the
        previous step to the PublicIP stack output afterwards.
      </HelpText>
    </div>
  );
};
