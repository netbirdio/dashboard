import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { Textarea } from "@components/Textarea";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { cn } from "@utils/helpers";
import { FileUp } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";

const MASKED_VALUE = "••••••••";

function validateCertificatePEM(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "CA certificate PEM is required";

  const matches = trimmed.match(
    /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
  );

  if (!matches || matches.length === 0) {
    return "Enter a valid PEM certificate";
  }

  for (const cert of matches) {
    const base64Body = cert
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s+/g, "");

    if (!base64Body) {
      return "Enter a valid PEM certificate";
    }

    let decoded = "";
    try {
      decoded = atob(base64Body);
    } catch {
      return "Certificate PEM contains invalid base64 data";
    }

    if (!decoded || decoded.charCodeAt(0) !== 0x30) {
      return "Certificate PEM does not contain a valid X.509 certificate";
    }
  }

  const leftover = trimmed
    .replace(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g, "")
    .replace(/^\s*#.*$/gm, "")
    .trim();
  if (leftover.length > 0) {
    return "Only PEM certificate data is allowed";
  }

  return undefined;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCACertPEM: string;
  isEnabled: boolean;
  onSave: (caCertPEM: string) => void;
  onRemove: () => void;
};

export default function AuthMTLSModal({
  open,
  onOpenChange,
  currentCACertPEM,
  isEnabled,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const [caCertPEM, setCACertPEM] = useState(currentCACertPEM);
  const [isMasked, setIsMasked] = useState(isEnabled && currentCACertPEM === "");
  const isEditing = isEnabled;
  const inputRef = useRef<HTMLInputElement>(null);

  const validationError = useMemo(() => {
    if (isMasked) return undefined;
    if (!caCertPEM.trim()) return undefined;
    return validateCertificatePEM(caCertPEM);
  }, [caCertPEM, isMasked]);

  const handleSave = () => {
    if (isMasked) {
      onOpenChange(false);
      onSave("");
      return;
    }

    const error = validateCertificatePEM(caCertPEM);
    if (error) return;

    onOpenChange(false);
    onSave(caCertPEM);
  };

  const handleRemove = () => {
    onOpenChange(false);
    setCACertPEM("");
    setIsMasked(false);
    onRemove();
  };

  const handleFileText = (text: string) => {
    setIsMasked(false);
    setCACertPEM(text);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      if (e.target === null) return;
      handleFileText(e.target.result as string);
    };
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-2xl">
        <ModalHeader
          title="mTLS"
          description="Require clients to present a certificate signed by your trusted CA."
        />

        <GradientFadedBackground />

        <div className="px-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mtls-ca-cert-pem">Client CA Certificate PEM</Label>
              <Textarea
                id="mtls-ca-cert-pem"
                aria-label="Client CA certificate PEM"
                placeholder="-----BEGIN CERTIFICATE-----"
                value={isMasked ? MASKED_VALUE : caCertPEM}
                onChange={(e) => {
                  if (isMasked) {
                    setIsMasked(false);
                    setCACertPEM(e.target.value.replace(/•/g, ""));
                  } else {
                    setCACertPEM(e.target.value);
                  }
                }}
                error={validationError}
                className="min-h-[160px] font-mono text-xs"
                resize
              />
              <HelpText margin={false}>
                Paste one PEM certificate or a PEM certificate bundle for the client CA.
              </HelpText>
            </div>

            <div
              className={cn(
                "flex gap-5 border border-dashed hover:border-nb-gray-600/50 rounded-md border-nb-gray-600/40 items-center justify-center group/upload",
                "bg-nb-gray-930/50 hover:bg-nb-gray-930/40 cursor-pointer transition-all px-4 pb-8 pt-6",
              )}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload client CA certificate file"
            >
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept=".pem,.crt,.cer,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="bg-nb-gray-930 p-2.5 rounded-md mt-0.5 group-hover/upload:bg-nb-gray-930/80 transition-all">
                <FileUp size={20} className="text-netbird" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-nb-gray-100">
                  Upload certificate file
                </p>
                <p className="text-xs !text-nb-gray-300 mt-1">
                  <span className="underline underline-offset-4 group-hover/upload:text-nb-gray-200 transition-all">
                    Click to upload
                  </span>{" "}
                  or paste the PEM directly above
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full justify-between mt-6">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemove}>
                  Remove
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={(!isMasked && !caCertPEM.trim()) || !!validationError}
                  >
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!caCertPEM.trim() || !!validationError}
                  >
                    Add mTLS
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
