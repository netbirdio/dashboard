import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalTrigger } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import React, { useState } from "react";
import CloudflareLogo from "@/assets/nameservers/cloudflare.svg";
import GoogleLogo from "@/assets/nameservers/google.svg";
import Quad9Logo from "@/assets/nameservers/quad9.svg";
import { Group } from "@/interfaces/Group";
import { NameserverGroup, NameserverPresets } from "@/interfaces/Nameserver";
import NameserverModal from "@/modules/dns/nameservers/NameserverModal";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  children: React.ReactNode;
  distributionGroups?: Group[];
};

export default function NameserverTemplateModal({
  children,
  distributionGroups,
}: Readonly<Props>) {
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
          preset={{
            ...preset,
            groups: distributionGroups
              ? distributionGroups
                  .map((group) => group.id)
                  .filter((id): id is string => !!id)
              : [],
          }}
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
  const { t } = useI18n();
  return (
    <ModalContent maxWidthClass={"max-w-xl"} showClose={true}>
      <div className={"px-8 py-3 flex flex-col gap-6 mt-4"}>
        <div className={"grid grid-cols-1 md:grid-cols-1 gap-4"}>
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Google)}
            src={GoogleLogo}
            title={t("nameserverTemplate.google")}
            description={t("nameserverTemplate.googleDesc")}
            href={"https://developers.google.com/speed/public-dns"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Cloudflare)}
            src={CloudflareLogo}
            title={t("nameserverTemplate.cloudflare")}
            description={t("nameserverTemplate.cloudflareDesc")}
            href={"https://www.cloudflare.com/learning/dns/what-is-1.1.1.1/"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Quad9)}
            src={Quad9Logo}
            title={t("nameserverTemplate.quad9")}
            description={t("nameserverTemplate.quad9Desc")}
            href={"https://quad9.net/"}
          />
          <NameserverTemplate
            onClick={() => onePresetSelection(NameserverPresets.Default)}
            icon={<GlobeIcon size={30} className={"text-netbird"} />}
            title={t("nameserverTemplate.custom")}
            description={t("nameserverTemplate.customDesc")}
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
  const { t } = useI18n();
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
              {hrefTitle || t("nameserverTemplate.learnMore")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </div>
        )}
      </div>
    </button>
  );
}
