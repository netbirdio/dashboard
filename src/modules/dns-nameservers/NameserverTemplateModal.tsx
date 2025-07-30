import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalTrigger } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import React, { useState } from "react";
import CloudflareLogo from "@/assets/nameservers/cloudflare.svg";
import DNS0Logo from "@/assets/nameservers/dns0.svg";
import DNS0ZeroLogo from "@/assets/nameservers/dns0-zero.svg";
import GoogleLogo from "@/assets/nameservers/google.svg";
import Quad9Logo from "@/assets/nameservers/quad9.svg";
import { NameserverGroup, NameserverPresets } from "@/interfaces/Nameserver";
import NameserverModal from "@/modules/dns-nameservers/NameserverModal";

type Props = {
  children: React.ReactNode;
};

export default function NameserverTemplateModal({ children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [presetModal, setPresetModal] = useState(false);
  const [preset, setPreset] = useState(NameserverPresets.Default);

  return (
    <>
      <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
        <ModalTrigger asChild={true}>{children}</ModalTrigger>
        <NameserverTemplateModalContent
          onePresetSelection={(preset) => {
            setPreset(preset);
            setPresetModal(true);
          }}
        />
      </Modal>
      {preset && presetModal && (
        <NameserverModal
          open={presetModal}
          onOpenChange={(o) => {
            setPresetModal(o);
            if (!o) setOpen(false);
          }}
          preset={preset}
        />
      )}
    </>
  );
}

type ModalProps = {
  onePresetSelection: (preset: NameserverGroup) => void;
};

export function NameserverTemplateModalContent({
  onePresetSelection,
}: Readonly<ModalProps>) {
  return (
    <ModalContent maxWidthClass={"max-w-5xl"} showClose={true}>
      <div className={"px-8 py-3 flex flex-col gap-6 mt-4"}>
        <div className={"grid grid-cols-1 md:grid-cols-2 gap-4"}>
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Google)}
            src={GoogleLogo}
            title={"Google DNS"}
            description={
              "A free, global DNS resolution service by Google that implements a number of security, performance, and compliance improvements."
            }
            href={"https://developers.google.com/speed/public-dns"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Cloudflare)}
            src={CloudflareLogo}
            title={"Cloudflare DNS"}
            description={
              "Enterprise-grade DNS service that offers the fastest response time, unparalleled redundancy, and advanced security with built-in DDoS mitigation and DNSSEC."
            }
            href={"https://www.cloudflare.com/learning/dns/what-is-1.1.1.1/"}
          />

          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.DNS0)}
            src={DNS0Logo}
            title={"DNS0.EU DNS"}
            description={
              "A free, sovereign and GDPR-compliant DNS resolver with a strong focus on security to protect the citizens and organizations of the European Union."
            }
            href={"https://www.dns0.eu/"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.DNS0Zero)}
            src={DNS0ZeroLogo}
            title={"DNS0.EU Zero DNS"}
            description={
              "Increase the catch rate for malicious domains by combining human-vetted threat intelligence with advanced heuristics that automatically identify high-risk patterns."
            }
            href={"https://www.dns0.eu/zero"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Quad9)}
            src={Quad9Logo}
            title={"Quad9 DNS"}
            description={
              "The Quad9 DNS service is operated by the Swiss-based Quad9 Foundation, whose mission is to provide a safer and more robust Internet for everyone."
            }
            href={"https://quad9.net/"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Default)}
            icon={<GlobeIcon size={30} className={"text-netbird"} />}
            title={"Custom DNS"}
            description={
              "Use custom nameservers to resolve domains in your network. You can either use a public DNS or your own nameservers."
            }
          />
        </div>
      </div>
    </ModalContent>
  );
}

function NameserverTemplate({
  src,
  icon,
  title,
  description,
  onClick,
  href,
  hrefTitle,
}: Readonly<{
  src?: StaticImageData;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  hrefTitle?: string;
}>) {
  return (
    <button
      className={
        "bg-nb-gray-930/90 h-full hover:bg-nb-gray-900 border transition-all cursor-pointer border-nb-gray-900 hover:border-nb-gray-800 flex items-center rounded-lg overflow-hidden"
      }
      onClick={onClick}
    >
      <div
        className={cn(
          "w-1/4",
          "bg-gradient-to-b h-full flex items-center justify-center from-white to-nb-gray-200 overflow-hidden p-4 border-r border-nb-gray-800",
        )}
      >
        {src && <Image src={src} alt={title} width={100} />}
        {icon && icon}
      </div>
      <div className={"h-full flex flex-col text-left px-4 py-3 w-3/4"}>
        <div className={"flex items-center"}>
          <p className={"font-medium text-sm"}>{title}</p>
        </div>
        {description && (
          <p className={"text-xs !text-nb-gray-300 mt-1"}>{description}</p>
        )}
        {href && (
          <div className={"relative mt-auto"}>
            <InlineLink
              href={href}
              className={"text-xs inline-flex"}
              target={"_blank"}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {hrefTitle || "Learn more"}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </div>
        )}
      </div>
    </button>
  );
}
