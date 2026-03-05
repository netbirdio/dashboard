import Badge from "@components/Badge";
import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
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
import Separator from "@components/Separator";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import SquareIcon from "@components/SquareIcon";
import GetStartedTest from "@components/ui/GetStartedTest";
import * as Tabs from "@radix-ui/react-tabs";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { CACertificate } from "@/interfaces/CertificateAuthority";

type Props = {
  account: Account;
};

const validityOptions: SelectOption[] = [
  { label: "1 year", value: "365" },
  { label: "2 years", value: "730" },
  { label: "5 years", value: "1825" },
  { label: "10 years", value: "3650" },
  { label: "20 years", value: "7300" },
];

function InitCAModal({
  open,
  setOpen,
  dnsDomain,
  onSuccess,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  dnsDomain: string;
  onSuccess: () => void;
}) {
  const initRequest = useApiCall<CACertificate>("/ca");

  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("NetBird Self-Hosted");
  const [validityDays, setValidityDays] = useState("3650");

  const handleSubmit = () => {
    const body: Record<string, unknown> = {};
    if (displayName.trim()) {
      body.display_name = displayName.trim();
    }
    if (organization.trim() && organization.trim() !== "NetBird Self-Hosted") {
      body.organization = organization.trim();
    }
    const days = parseInt(validityDays);
    if (days && days !== 3650) {
      body.validity_days = days;
    }

    notify({
      title: "Initialize CA",
      description: "Certificate Authority was initialized successfully.",
      promise: initRequest.post(body).then(() => {
        onSuccess();
        setOpen(false);
      }),
      loadingMessage: "Initializing Certificate Authority...",
    });
  };

  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<ShieldCheckIcon size={18} />}
          title={"Initialize Certificate Authority"}
          description={
            "Configure the root CA certificate for your network. All fields are optional and have sensible defaults."
          }
          color={"netbird"}
        />
        <Separator />
        <div className={"px-8 py-6 flex flex-col gap-6"}>
          <div>
            <Label>Display Name</Label>
            <HelpText>
              Used in the certificate CommonName. Leave empty for automatic
              naming.
            </HelpText>
            <Input
              placeholder={`${dnsDomain} Internal CA`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <Label>Organization</Label>
            <HelpText>
              The organization name embedded in the CA certificate.
            </HelpText>
            <Input
              placeholder={"NetBird Self-Hosted"}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
          <div>
            <Label>Validity</Label>
            <HelpText>
              How long the CA certificate will be valid. Longer is typical for
              root CAs.
            </HelpText>
            <SelectDropdown
              value={validityDays}
              onChange={setValidityDays}
              options={validityOptions}
            />
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button variant={"primary"} onClick={handleSubmit}>
            <ShieldCheckIcon size={16} />
            Initialize CA
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function CAStatusCard({ ca }: { ca: CACertificate }) {
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const rotateRequest = useApiCall<CACertificate>("/ca/rotate");
  const { permission } = usePermissions();

  const handleRotate = async () => {
    const choice = await confirm({
      title: "Rotate Certificate Authority?",
      description:
        "This will create a new CA and deactivate the current one. Existing certificates will remain valid until they expire. New certificates will be signed by the new CA.",
      confirmText: "Rotate",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!choice) return;

    notify({
      title: "Rotate CA",
      description: "Certificate Authority was rotated successfully.",
      promise: rotateRequest.post({}).then(() => {
        mutate("/ca");
        mutate("/ca/certificates");
      }),
      loadingMessage: "Rotating Certificate Authority...",
    });
  };

  const handleDownload = () => {
    if (!ca.certificate_pem) return;
    const blob = new Blob([ca.certificate_pem], {
      type: "application/x-pem-file",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ca.pem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={"px-8 mt-3"}>
      <Card className={"w-full"}>
        <Card.List>
          {ca.display_name && (
            <Card.ListItem label={"Name"} value={ca.display_name} />
          )}
          {ca.organization && (
            <Card.ListItem label={"Organization"} value={ca.organization} />
          )}
          <Card.ListItem
            label={"Fingerprint"}
            value={ca.fingerprint}
            copy={true}
          />
          <Card.ListItem
            label={"Created"}
            value={dayjs(ca.created_at).format("MMM D, YYYY HH:mm")}
          />
          <Card.ListItem
            label={"Expires"}
            value={dayjs(ca.not_after).format("MMM D, YYYY HH:mm")}
          />
          <Card.ListItem
            label={"Status"}
            value={
              ca.is_active ? (
                <Badge variant={"green"} size={"xs"}>
                  Active
                </Badge>
              ) : (
                <Badge variant={"gray"} size={"xs"}>
                  Inactive
                </Badge>
              )
            }
            tooltip={false}
          />
        </Card.List>
      </Card>
      <div className={"flex gap-3 mt-4"}>
        {ca.certificate_pem && (
          <Button variant={"secondary"} onClick={handleDownload}>
            <DownloadIcon size={14} />
            Download CA Certificate
          </Button>
        )}
        <Button
          variant={"secondary"}
          onClick={handleRotate}
          disabled={!permission.certificate_authority?.update}
        >
          <RefreshCwIcon size={14} />
          Rotate CA
        </Button>
      </div>
    </div>
  );
}

function InactiveCAsSection({ cas }: { cas: CACertificate[] }) {
  const [expanded, setExpanded] = useState(false);

  if (cas.length === 0) return null;

  return (
    <div className={"px-8 mt-6"}>
      <button
        className={
          "flex items-center gap-2 text-sm text-nb-gray-400 hover:text-nb-gray-300 transition-colors"
        }
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDownIcon size={14} />
        ) : (
          <ChevronRightIcon size={14} />
        )}
        Previous CAs ({cas.length})
      </button>
      {expanded && (
        <div className={"mt-3 flex flex-col gap-2"}>
          {cas.map((ca) => (
            <div
              key={ca.id}
              className={
                "flex items-center gap-4 px-4 py-2.5 rounded-md border border-nb-gray-900 text-nb-gray-400 text-sm"
              }
            >
              <span className={"font-mono text-xs truncate max-w-[200px]"}>
                {ca.fingerprint}
              </span>
              <span>
                Created {dayjs(ca.created_at).format("MMM D, YYYY")}
              </span>
              <span>
                Expired {dayjs(ca.not_after).format("MMM D, YYYY")}
              </span>
              <Badge variant={"gray"} size={"xs"}>
                Inactive
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CertificateAuthorityTab({
  account,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const {
    data: cas,
    isLoading: isCAsLoading,
    error: caError,
  } = useFetchApi<CACertificate[]>("/ca");
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [initModalOpen, setInitModalOpen] = useState(false);
  const [wildcardAllowed, setWildcardAllowed] = useState(
    account.settings.cert_wildcard_allowed ?? false,
  );

  const activeCA = useMemo(() => {
    return cas?.find((ca) => ca.is_active);
  }, [cas]);

  const inactiveCAs = useMemo(() => {
    return cas?.filter((ca) => !ca.is_active) ?? [];
  }, [cas]);

  const dnsDomain = account.settings.dns_domain || "";
  const dnsDomainSet = Boolean(dnsDomain);

  const toggleWildcard = async (toggle: boolean) => {
    notify({
      title: "Wildcard Certificates",
      description: `Wildcard certificates successfully ${toggle ? "enabled" : "disabled"}.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            cert_wildcard_allowed: toggle,
          },
        })
        .then(() => {
          setWildcardAllowed(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Updating wildcard setting...",
    });
  };

  return (
    <Tabs.Content value={"certificate-authority"} className={"w-full"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=certificate-authority"}
            label={"Certificate Authority"}
            icon={<ShieldCheckIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>Certificate Authority</h1>
            <Paragraph>
              Manage your network&apos;s Certificate Authority settings.
            </Paragraph>
          </div>
        </div>
      </div>

      {caError && (
        <div
          className={
            "mx-8 mb-4 flex items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          }
        >
          <AlertTriangleIcon size={16} className="shrink-0" />
          <span>Failed to load Certificate Authority data. Please try again later.</span>
        </div>
      )}

      {!isCAsLoading && !caError && !activeCA && (
        <>
          {!dnsDomainSet && (
            <div
              className={
                "mx-8 mb-4 flex items-center gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400"
              }
            >
              <AlertTriangleIcon size={16} className="shrink-0" />
              <span>
                DNS domain must be configured before initializing a CA.{" "}
                <a
                  href={"/settings?tab=networks"}
                  className="underline hover:text-yellow-300"
                >
                  Configure DNS domain
                </a>
              </span>
            </div>
          )}
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<ShieldCheckIcon size={20} />}
                color={"netbird"}
                size={"large"}
              />
            }
            title={"Get Started with Certificate Authority"}
            description={
              "Initialize a Certificate Authority to issue and manage TLS certificates for your network peers."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => setInitModalOpen(true)}
                disabled={
                  !permission.certificate_authority?.create || !dnsDomainSet
                }
              >
                <ShieldCheckIcon size={16} />
                Initialize CA
              </Button>
            }
          />
          {initModalOpen && (
            <InitCAModal
              open={initModalOpen}
              setOpen={setInitModalOpen}
              dnsDomain={dnsDomain}
              onSuccess={() => mutate("/ca")}
            />
          )}
        </>
      )}

      {activeCA && <CAStatusCard ca={activeCA} />}

      {activeCA && (
        <div className={"px-8 mt-6"}>
          <FancyToggleSwitch
            value={wildcardAllowed}
            onChange={toggleWildcard}
            label={
              <>
                <ShieldCheckIcon size={15} />
                Allow wildcard certificates
              </>
            }
            helpText={
              "Peers can request wildcard subdomain certificates (e.g. *.peer.domain)"
            }
            disabled={!permission.certificate_authority?.update}
          />
        </div>
      )}

      <InactiveCAsSection cas={inactiveCAs} />
    </Tabs.Content>
  );
}
