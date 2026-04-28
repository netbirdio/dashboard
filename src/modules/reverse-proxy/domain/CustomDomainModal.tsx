import Button from "@components/Button";
import { Callout } from "@components/Callout";
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
import Paragraph from "@components/Paragraph";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { validator } from "@utils/helpers";
import { ExternalLinkIcon, GlobeIcon, ServerIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import {
  AutoConfigureError,
  AutoConfigureRequest,
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  REVERSE_PROXY_CUSTOM_DOMAINS_DOCS_LINK,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import { CredentialProviderType } from "@/interfaces/Credential";
import HelpText from "@components/HelpText";
import Separator from "@components/Separator";
import { isNetBirdHosted } from "@/utils/netbird";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  CredentialPicker,
  CredentialPickerState,
  initialCredentialPickerState,
} from "@/modules/reverse-proxy/cert/CredentialPicker";

// CustomDomainModal supports two flows. The default is "manual": the user
// adds a CNAME record in their DNS UI after submitting, then clicks
// Verify in the next modal. The opt-in alternative is "auto-configure":
// NetBird uses a stored DNS provider credential to write the wildcard
// CNAME on the user's behalf, skipping the verification step.
//
// The auto-configure tab is disabled when no credentials of supported
// providers exist — there's nothing useful to pick. A tooltip explains
// where to add one.

type SubmitMode = "manual" | "auto-configure";

const SUPPORTED_AUTO_CONFIGURE_PROVIDERS: ReadonlyArray<CredentialProviderType> = [
  "cloudflare",
  "route53",
  "digitalocean",
  "rfc2136",
];

type ManualSubmit = (domain: string, targetCluster: string) => void;
type AutoConfigureSubmit = (
  domain: string,
  targetCluster: string,
  autoConfigure: AutoConfigureRequest,
  // pickerState lets the modal re-render the credential creation flow
  // if the credential picker was in "create new credential" mode and we
  // need to POST a fresh /credentials before submitting the domain.
  pickerState: CredentialPickerState,
) => Promise<AutoConfigureError | null>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDomainSubmit: ManualSubmit;
  // Optional: if supplied, enables the auto-configure tab. Returns an
  // AutoConfigureError when the backend rejects the write so the modal
  // can render structured per-error_code messaging inline.
  onAutoConfigureSubmit?: AutoConfigureSubmit;
};

export const CustomDomainModal = ({
  open,
  onOpenChange,
  onDomainSubmit,
  onAutoConfigureSubmit,
}: Props) => {
  const { domains, credentials } = useReverseProxies();
  const [domain, setDomain] = useState("");
  const [selectedCluster, setSelectedCluster] = useState("");
  const [submitMode, setSubmitMode] = useState<SubmitMode>("manual");
  const [pickerState, setPickerState] = useState<CredentialPickerState>(
    initialCredentialPickerState,
  );
  const [submitting, setSubmitting] = useState(false);
  const [autoError, setAutoError] = useState<AutoConfigureError | null>(null);

  // Get available proxy clusters (free domains)
  const availableClusters = useMemo(() => {
    return domains?.filter((d) => d.type === ReverseProxyDomainType.FREE) || [];
  }, [domains]);

  // Auto-select first cluster if only one available
  React.useEffect(() => {
    if (availableClusters.length === 1 && !selectedCluster) {
      setSelectedCluster(availableClusters[0].domain);
    }
  }, [availableClusters, selectedCluster]);

  const error = useMemo(() => {
    if (!domain) return "";
    const isValid = validator.isValidDomain(domain, {
      allowWildcard: false,
      allowOnlyTld: false,
      preventLeadingAndTrailingDots: true,
    });
    if (!isValid) {
      return "Please enter a valid TLD domain, e.g., company.com";
    }
    return "";
  }, [domain]);

  // Has the user got at least one credential of a supported provider?
  // If not, the auto-configure tab is disabled with a tooltip hint.
  const hasSupportedCredential = useMemo(() => {
    if (!credentials) return false;
    return credentials.some((c) =>
      SUPPORTED_AUTO_CONFIGURE_PROVIDERS.includes(c.provider_type),
    );
  }, [credentials]);

  const autoConfigureAvailable =
    onAutoConfigureSubmit !== undefined && hasSupportedCredential;

  const isValidDomain = !error && domain.length > 0;

  const canSubmitManual = isValidDomain && !!selectedCluster;
  const canSubmitAuto =
    isValidDomain &&
    !!selectedCluster &&
    pickerState.dnsProvider !== "" &&
    (pickerState.credentialId !== "" ||
      Object.values(pickerState.secretFields).some((v) => v !== ""));
  const canSubmit =
    submitMode === "manual" ? canSubmitManual : canSubmitAuto && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (submitMode === "manual") {
      onDomainSubmit(domain, selectedCluster);
      return;
    }
    if (!onAutoConfigureSubmit) return;
    if (pickerState.credentialId === "") {
      // The "create new credential then submit" path isn't supported in
      // v1 — keep the auto-configure flow simple. Surface a hint and
      // ask the user to save the credential first.
      setAutoError({
        error_code: "PROVIDER_UNAVAILABLE",
        message:
          "Save the credential first via the DNS Credentials page, then return here to auto-configure the domain.",
      });
      return;
    }
    setAutoError(null);
    setSubmitting(true);
    try {
      const err = await onAutoConfigureSubmit(
        domain,
        selectedCluster,
        {
          credential_id: pickerState.credentialId,
          provider: pickerState.dnsProvider as AutoConfigureRequest["provider"],
        },
        pickerState,
      );
      if (err) {
        setAutoError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchToManual = () => {
    setSubmitMode("manual");
    setAutoError(null);
  };

  const availableClusterOptions = availableClusters.map((cluster) => {
    return {
      label: cluster.domain,
      value: cluster.domain,
      icon: ServerIcon,
    } as SelectOption;
  });

  const headerDescription =
    submitMode === "auto-configure"
      ? "NetBird will create the CNAME record automatically using your saved credential."
      : "You will need to verify the domain with DNS records";

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"relative max-w-lg"} showClose={true}>
        <ModalHeader
          icon={<GlobeIcon size={20} />}
          title={"Add Custom Domain"}
          description={headerDescription}
          color={"netbird"}
        />

        <Separator />

        <div className={"px-8 flex flex-col gap-6 pt-6 pb-8"}>
          {availableClusters.length === 0 ? (
            isNetBirdHosted() ? (
              <Callout variant={"warning"}>
                No proxy clusters are currently connected. Please try again in a
                few minutes. If the issue persists, check{" "}
                <InlineLink
                  href={"https://status.netbird.io/"}
                  target={"_blank"}
                >
                  NetBird Status
                </InlineLink>{" "}
                or reach out to{"  "}
                <InlineLink href={"mailto:support@netbird.io"}>
                  support@netbird.io
                </InlineLink>
              </Callout>
            ) : (
              <Callout variant="warning">
                No proxy clusters are currently connected. Please ensure at
                least one proxy is running before adding a domain. <br /> Learn
                more about{" "}
                <InlineLink
                  href={REVERSE_PROXY_CLUSTERS_DOCS_LINK}
                  target={"_blank"}
                >
                  Proxy Clusters
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Callout>
            )
          ) : (
            <>
              <div>
                <Label>Domain</Label>
                <Input
                  autoFocus
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.toLowerCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) {
                      handleSubmit();
                    }
                  }}
                  placeholder="e.g., company.com"
                  error={error || undefined}
                />
              </div>

              {onAutoConfigureSubmit !== undefined && (
                <div>
                  <Label>Setup Method</Label>
                  <SegmentedTabs
                    value={submitMode}
                    onChange={(v) => setSubmitMode(v as SubmitMode)}
                  >
                    <SegmentedTabs.List>
                      <SegmentedTabs.Trigger value={"manual"}>
                        Manual CNAME
                      </SegmentedTabs.Trigger>
                      <SegmentedTabs.Trigger
                        value={"auto-configure"}
                        disabled={!autoConfigureAvailable}
                      >
                        Auto-configure
                      </SegmentedTabs.Trigger>
                    </SegmentedTabs.List>
                  </SegmentedTabs>
                  {!hasSupportedCredential && (
                    <HelpText className={"!mt-2"}>
                      Auto-configure requires a saved DNS provider credential.
                      Add one from the DNS Credentials page to enable it.
                    </HelpText>
                  )}
                </div>
              )}

              <div>
                <Label>Target Proxy Cluster</Label>
                <HelpText>
                  {submitMode === "auto-configure"
                    ? "NetBird will point the wildcard CNAME at this cluster."
                    : "Select the cluster your CNAME record should point to"}
                </HelpText>
                <SelectDropdown
                  showSearch={false}
                  value={selectedCluster}
                  onChange={setSelectedCluster}
                  options={availableClusterOptions}
                  placeholder={"Select a proxy cluster..."}
                />
              </div>

              {submitMode === "auto-configure" && (
                <div className={"flex flex-col gap-4"}>
                  <Separator />
                  <CredentialPicker
                    state={pickerState}
                    onStateChange={setPickerState}
                    editingExisting={false}
                    scopeContext={"auto-configure"}
                  />

                  {autoError && (
                    <Callout variant={"error"}>
                      <div className={"flex flex-col gap-2"}>
                        <div className={"font-medium"}>
                          {humanizeAutoConfigureError(autoError.error_code)}
                        </div>
                        <div>{autoError.message}</div>
                        <div className={"flex gap-2 mt-1"}>
                          <Button
                            variant={"secondary"}
                            size={"xs"}
                            onClick={switchToManual}
                          >
                            Switch to Manual
                          </Button>
                        </div>
                      </div>
                    </Callout>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                href={REVERSE_PROXY_CUSTOM_DOMAINS_DOCS_LINK}
                target={"_blank"}
              >
                Custom Domains
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>

            <Button
              variant={"primary"}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitMode === "auto-configure"
                ? submitting
                  ? "Configuring..."
                  : "Add & Configure"
                : "Add Domain"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// humanizeAutoConfigureError maps the backend's error_code to a short
// headline. The full message string from the backend is shown beneath
// it; the headline gives the user a fast read of which class of failure
// they're seeing.
function humanizeAutoConfigureError(
  code: AutoConfigureError["error_code"],
): string {
  switch (code) {
    case "CREDENTIAL_INSUFFICIENT_SCOPE":
      return "Credential lacks zone-write access";
    case "ZONE_NOT_FOUND":
      return "Zone not found in your DNS provider";
    case "RECORD_ALREADY_EXISTS":
      return "Conflicting CNAME already exists";
    case "PROVIDER_RATE_LIMITED":
      return "DNS provider rate-limited the request";
    case "PROVIDER_UNAVAILABLE":
      return "DNS provider unreachable";
    default:
      return "Auto-configure failed";
  }
}
