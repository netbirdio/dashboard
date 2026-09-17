import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { Textarea } from "@components/Textarea";
import { uniqueId } from "lodash";
import {
  ExternalLinkIcon,
  FileKey2Icon,
  MinusCircleIcon,
  PlusCircle,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { CertificateCheck } from "@/interfaces/PostureCheck";
import {
  isValidPEMCertificate,
  useCertificateFingerprints,
} from "@/modules/posture-checks/helper/CertificateHelper";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  value?: CertificateCheck;
  onChange: (value: CertificateCheck | undefined) => void;
  disabled?: boolean;
};

export const PostureCheckCertificate = ({
  value,
  onChange,
  disabled,
}: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      active={value?.ca_certificates && value.ca_certificates.length > 0}
      title={"Certificate"}
      description={
        "Restrict access to peers holding a certificate issued by your own certificate authority."
      }
      icon={<FileKey2Icon size={18} />}
      iconClass={"bg-gradient-to-tr from-purple-500 to-purple-400"}
      modalWidthClass={"max-w-2xl"}
      onReset={() => onChange(undefined)}
    >
      <CheckContent
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
        disabled={disabled}
      />
    </PostureCheckCard>
  );
};

type CACertificate = {
  id: string;
  pem: string;
};

const newCertificate = (pem = ""): CACertificate => ({
  id: uniqueId("ca-certificate"),
  pem,
});

const rowsFor = (pem: string) =>
  Math.min(Math.max(pem.split("\n").length + 1, 6), 32);

const CheckContent = ({ value, onChange, disabled }: Props) => {
  const [certificates, setCertificates] = useState<CACertificate[]>(
    value?.ca_certificates?.length
      ? value.ca_certificates.map((pem) => newCertificate(pem))
      : [newCertificate()],
  );

  const pems = useMemo(() => certificates.map((c) => c.pem), [certificates]);
  const fingerprints = useCertificateFingerprints(pems);

  const errors = useMemo(
    () =>
      certificates.map((c) =>
        c.pem.trim() !== "" && !isValidPEMCertificate(c.pem)
          ? "Please paste a valid PEM encoded certificate"
          : "",
      ),
    [certificates],
  );

  const hasErrorsOrIsEmpty =
    certificates.length === 0 ||
    certificates.some((c) => c.pem.trim() === "") ||
    errors.some((e) => e !== "");

  const updateCertificate = (id: string, pem: string) => {
    setCertificates(certificates.map((c) => (c.id === id ? { ...c, pem } : c)));
  };

  const removeCertificate = (id: string) => {
    setCertificates(certificates.filter((c) => c.id !== id));
  };

  return (
    <>
      <div className={"flex flex-col px-8 gap-2 pb-6"}>
        <div className={"flex justify-between items-start gap-10 mt-2"}>
          <div>
            <Label>CA Certificates</Label>
            <HelpText className={""}>
              Paste the PEM encoded public certificate of the root or
              intermediate CA that issues your device certificates. Peers will
              only be allowed to connect if they hold a certificate issued by
              one of these CAs and prove possession of its private key.
            </HelpText>
          </div>
        </div>
        {certificates.length > 0 && (
          <div className={"mb-2 flex flex-col gap-4 w-full"}>
            {certificates.map((c, index) => {
              return (
                <div key={c.id} className={"flex gap-2 items-start min-w-0"}>
                  <div className={"w-full flex flex-col gap-1.5 min-w-0"}>
                    <Textarea
                      value={c.pem}
                      rows={rowsFor(c.pem)}
                      placeholder={
                        "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----"
                      }
                      error={errors[index]}
                      className={
                        "w-full font-mono text-xs leading-5 overflow-auto"
                      }
                      onChange={(e) => updateCertificate(c.id, e.target.value)}
                      disabled={disabled}
                    />
                    {fingerprints[index] && (
                      <span
                        className={
                          "text-xs text-nb-gray-400 font-mono break-all"
                        }
                      >
                        SHA-256 {fingerprints[index]}
                      </span>
                    )}
                  </div>

                  <Button
                    className={"h-[42px]"}
                    variant={"default-outline"}
                    onClick={() => removeCertificate(c.id)}
                    disabled={disabled}
                  >
                    <MinusCircleIcon size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <Button
          variant={"dotted"}
          size={"sm"}
          onClick={() => setCertificates([...certificates, newCertificate()])}
          className={"mt-1"}
          disabled={disabled}
        >
          <PlusCircle size={16} />
          Add CA Certificate
        </Button>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/manage-posture-checks#certificate-check"
              }
              target={"_blank"}
            >
              Certificate Check
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
            disabled={hasErrorsOrIsEmpty || disabled}
            onClick={() =>
              onChange({
                ca_certificates: certificates.map((c) => c.pem.trim()),
              })
            }
          >
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
};
