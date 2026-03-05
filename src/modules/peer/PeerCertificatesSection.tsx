import Badge from "@components/Badge";
import Button from "@components/Button";
import Card from "@components/Card";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import GetStartedTest from "@components/ui/GetStartedTest";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  Barcode,
  CalendarDays,
  ChevronDownIcon,
  ChevronRightIcon,
  Globe,
  ShieldCheckIcon,
  ShieldOffIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { IssuedCertificate } from "@/interfaces/CertificateAuthority";

type Props = {
  peerId: string;
};

function isCertExpired(cert: IssuedCertificate) {
  return dayjs(cert.not_after).isBefore(dayjs());
}

function isCertActive(cert: IssuedCertificate) {
  return (
    !cert.revoked &&
    !isCertExpired(cert) &&
    !dayjs(cert.not_before).isAfter(dayjs())
  );
}

function CertStatusBadge({ cert }: { cert: IssuedCertificate }) {
  if (cert.revoked) {
    return (
      <Badge variant={"red"} size={"xs"}>
        Revoked
      </Badge>
    );
  }

  if (isCertExpired(cert)) {
    return (
      <Badge variant={"yellow"} size={"xs"}>
        Expired
      </Badge>
    );
  }

  if (dayjs(cert.not_before).isAfter(dayjs())) {
    return (
      <Badge variant={"yellow"} size={"xs"}>
        Pending
      </Badge>
    );
  }

  return (
    <Badge variant={"green"} size={"xs"}>
      Active
    </Badge>
  );
}

function ActiveCertificateCard({
  cert,
  peerId,
}: {
  cert: IssuedCertificate;
  peerId: string;
}) {
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const revokeRequest = useApiCall<void>(
    "/ca/certificates/" + cert.serial_number + "/revoke",
  );

  const handleRevoke = async () => {
    const choice = await confirm({
      title: `Revoke certificate?`,
      description: `Are you sure you want to revoke the certificate for ${cert.dns_names?.join(", ") || cert.serial_number}? This action cannot be undone.`,
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: "Revoke Certificate",
      description: "Certificate was revoked successfully.",
      promise: revokeRequest.post({}).then(() => {
        mutate("/ca/certificates?peer_id=" + peerId);
      }),
      loadingMessage: "Revoking certificate...",
    });
  };

  const primaryDomain = cert.dns_names?.[0] || "-";

  return (
    <div>
      <Card className={"w-full"}>
        <Card.List>
          <Card.ListItem
            label={
              <>
                <Globe size={16} />
                Domain
              </>
            }
            tooltip={false}
            value={
              <div className={"flex items-center gap-2"}>
                <span>{primaryDomain}</span>
                {cert.has_wildcard && (
                  <Badge variant={"blue"} size={"xs"}>
                    Wildcard
                  </Badge>
                )}
              </div>
            }
          />
          <Card.ListItem
            label={"Status"}
            tooltip={false}
            value={
              <Badge variant={"green"} size={"xs"}>
                Active
              </Badge>
            }
          />
          <Card.ListItem
            label={
              <>
                <CalendarDays size={16} />
                Issued
              </>
            }
            value={dayjs(cert.not_before).format("MMM D, YYYY")}
          />
          <Card.ListItem
            label={
              <>
                <CalendarDays size={16} />
                Expires
              </>
            }
            value={
              dayjs(cert.not_after).format("MMM D, YYYY") +
              " (" +
              dayjs().to(cert.not_after) +
              ")"
            }
          />
          <Card.ListItem
            label={
              <>
                <Barcode size={16} />
                Serial Number
              </>
            }
            value={cert.serial_number}
            copy={true}
          />
        </Card.List>
      </Card>
      <div className={"mt-4"}>
        <Button
          variant={"secondary"}
          onClick={handleRevoke}
          disabled={!permission.certificate_authority?.update}
        >
          <ShieldOffIcon size={14} />
          Revoke Certificate
        </Button>
      </div>
    </div>
  );
}

function PreviousCertificatesSection({
  certs,
}: {
  certs: IssuedCertificate[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (certs.length === 0) return null;

  return (
    <div className={"mt-6"}>
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
        Previous certificates ({certs.length})
      </button>
      {expanded && (
        <div className={"mt-3 flex flex-col gap-2"}>
          {certs.map((cert) => (
            <div
              key={cert.id}
              className={
                "flex items-center gap-4 px-4 py-2.5 rounded-md border border-nb-gray-900 text-nb-gray-400 text-sm"
              }
            >
              <span className={"font-medium truncate max-w-[250px]"}>
                {cert.dns_names?.[0] || "-"}
              </span>
              <span>
                {dayjs(cert.not_before).format("MMM D, YYYY")} &ndash;{" "}
                {dayjs(cert.not_after).format("MMM D, YYYY")}
              </span>
              <CertStatusBadge cert={cert} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PeerCertificatesSection({ peerId }: Props) {
  const {
    data: certificates,
    isLoading,
    error,
  } = useFetchApi<IssuedCertificate[]>(
    "/ca/certificates?peer_id=" + peerId,
  );

  const { activeCert, previousCerts } = useMemo(() => {
    if (!certificates || certificates.length === 0) {
      return { activeCert: null, previousCerts: [] };
    }

    const sorted = [...certificates].sort(
      (a, b) => dayjs(b.not_after).valueOf() - dayjs(a.not_after).valueOf(),
    );

    const active = sorted.find(isCertActive) ?? null;
    const previous = sorted.filter((c) => c !== active);

    return { activeCert: active, previousCerts: previous };
  }, [certificates]);

  if (isLoading) return null;

  const hasNoCerts = !certificates || certificates.length === 0;

  return (
    <div className={"pb-10 px-8"}>
      <Paragraph className={"mb-5"}>
        TLS certificates issued to this peer by your network&apos;s Certificate
        Authority.
      </Paragraph>

      {error && (
        <div
          className={
            "mb-4 flex items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          }
        >
          <span>Failed to load certificates. Please try again later.</span>
        </div>
      )}

      {!error && hasNoCerts && (
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<ShieldCheckIcon size={20} />}
              color={"netbird"}
              size={"large"}
            />
          }
          title={"No Certificates Issued"}
          description={
            "Certificates will appear here once this peer requests them from the Certificate Authority."
          }
        />
      )}

      {activeCert && (
        <ActiveCertificateCard cert={activeCert} peerId={peerId} />
      )}

      <PreviousCertificatesSection certs={previousCerts} />
    </div>
  );
}
