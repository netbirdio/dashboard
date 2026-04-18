import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Checkbox } from "@components/Checkbox";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Separator from "@components/Separator";
import { LockIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import {
  CertificateInfo,
  CertificatePromptInfo,
} from "./useRDPCertificateHandler";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  open: boolean;
  certificateInfo: CertificatePromptInfo | null;
  onAccept: (remember: boolean) => void;
  onReject: () => void;
};

export const RDPCertificateModal = ({
  open,
  certificateInfo,
  onAccept,
  onReject,
}: Props) => {
  const { t } = useI18n();
  const [rememberCertificate, setRememberCertificate] = useState(false);
  if (!certificateInfo) return null;
  const { hostname, certificate, isChange } = certificateInfo;

  return (
    <Modal open={open} onOpenChange={undefined}>
      <ModalContent maxWidthClass={"max-w-2xl"} showClose={false}>
        <ModalHeader
          icon={<LockIcon className={"text-netbird"} size={18} />}
          title={t("remoteAccess.rdpCertificate")}
          description={hostname}
          color={"netbird"}
        />
        <Separator />

        <div className={"px-8 py-6 flex flex-col gap-6"}>
          {isChange && (
            <Callout variant={"warning"}>
              {t("remoteAccess.rdpCertificateChanged")}
            </Callout>
          )}

          <div>
            <Label>{t("remoteAccess.certificateDetails")}</Label>
            <HelpText>{t("remoteAccess.certificateDetailsHelp")}</HelpText>
            <CertificateDetailsList certificate={certificate} />
          </div>

          <label className={"flex items-center space-x-3 cursor-pointer"}>
            <Checkbox
              id="remember-cert"
              checked={rememberCertificate}
              variant={"tableCell"}
              onCheckedChange={(checked) =>
                setRememberCertificate(checked === true)
              }
            />
            <div className={"font-normal text-sm text-nb-gray-200"}>
              {t("remoteAccess.alwaysTrust")}{" "}
              <span className={"text-white font-medium"}>
                {'"' + certificate?.issuer?.replace("CN=", "") + '"'}
              </span>{" "}
              {t("remoteAccess.whenConnectingTo")}{" "}
              <span className={"text-white font-medium"}>
                {'"' + hostname + '"'}
              </span>
            </div>
          </label>
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <Button variant={"secondary"} onClick={onReject}>
              {t("actions.cancel")}
            </Button>
            <Button
              variant={"primary"}
              onClick={() => onAccept(rememberCertificate)}
            >
              {t("remoteAccess.acceptAndContinue")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const CertificateDetailsList = ({
  certificate,
}: {
  certificate: CertificateInfo;
}) => {
  const { t } = useI18n();
  if (!certificate) return null;

  return (
    <div
      className={
        "bg-nb-gray-930 border border-nb-gray-900 rounded-md mt-3 flex flex-col py-3 px-4 gap-2"
      }
    >
      <CertificateDetailsListItem
        label={t("remoteAccess.certIssuer")}
        value={certificate.issuer || t("remoteAccess.notAvailable")}
      />
      <CertificateDetailsListItem
        label={t("remoteAccess.certSubject")}
        value={certificate.subject || t("remoteAccess.notAvailable")}
      />
      <CertificateDetailsListItem
        label={t("remoteAccess.certValidFrom")}
        value={
          certificate.validFrom
            ? new Date(certificate.validFrom).toLocaleString()
            : t("remoteAccess.notAvailable")
        }
      />
      <CertificateDetailsListItem
        label={t("remoteAccess.certValidTo")}
        value={
          certificate.validTo
            ? new Date(certificate.validTo).toLocaleString()
            : t("remoteAccess.notAvailable")
        }
      />
      <CertificateDetailsListItem
        label={t("remoteAccess.certKeySize")}
        value={
          certificate.keySize
            ? t("remoteAccess.certBits", { bits: certificate.keySize })
            : t("remoteAccess.notAvailable")
        }
      />
      <CertificateDetailsListItem
        label={t("remoteAccess.certSerialNumber")}
        value={certificate.serialNumber || t("remoteAccess.notAvailable")}
      />
      <CertificateDetailsListItem
        label={t("remoteAccess.certFingerprint")}
        value={certificate.fingerprint || t("remoteAccess.notAvailable")}
      />
    </div>
  );
};

const CertificateDetailsListItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <div key={label} className={"flex justify-between text-xs gap-10"}>
      <span className={"font-mono text-nb-gray-200 w-[200px]"}>{label}:</span>
      <span className={"font-mono text-nb-gray-300 break-all text-left w-full"}>
        {value}
      </span>
    </div>
  );
};
