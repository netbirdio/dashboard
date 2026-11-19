import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { FingerprintIcon } from "lucide-react";
import React from "react";
import {
  SSOIdentityProvider,
  SSOIdentityProviderType,
} from "@/interfaces/IdentityProvider";
import { idpIcon } from "@/assets/icons/IdentityProviderIcons";
import { useEmbeddedIdentityProviders } from "@/hooks/useEmbeddedIdentityProviders";
import { Callout } from "@components/Callout";
import Paragraph from "@components/Paragraph";
import { InlineButtonLink } from "@components/InlineLink";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  value: string;
  onChange: (value: string) => void;
  location: "setup" | "settings";
  filterByType?: SSOIdentityProviderType[];
};

export function EmbeddedIdentityProviderSelect({
  value,
  onChange,
  location,
  filterByType,
}: Props) {
  const t = useTranslations();
  const { providers, isEmbeddedIdPEnabled } = useEmbeddedIdentityProviders();
  const router = useRouter();
  const filteredProviders = filterByType?.length
    ? providers?.filter((p) => filterByType.includes(p.type)) ?? []
    : providers ?? [];

  if (!isEmbeddedIdPEnabled) return null;

  if (location === "settings") {
    return (
      <div className="mt-3 w-full">
        <Label>{t("integrations.idpIdentityProvider")}</Label>
        <HelpText>{t("integrations.idpConnectorHelp")}</HelpText>
        <ProviderSelect
          providers={filteredProviders}
          value={value}
          onChange={onChange}
          disabled
        />
        <Callout className={"mt-3"} variant={"info"}>
          {t.rich("integrations.idpConnectorCannotChange", {
            br: () => <br />,
          })}
        </Callout>
      </div>
    );
  }

  return filteredProviders?.length > 0 ? (
    <div
      className={
        "px-8 py-3 flex z-0 flex-col gap-0 text-sm mb-3 text-center justify-center items-center"
      }
    >
      <div className="w-full">
        <Paragraph className="text-sm text-center px-4 inline-block mb-3">
          {t("integrations.idpConnectorHelp")}
        </Paragraph>
        <div className="max-w-sm w-full mx-auto mb-2">
          <ProviderSelect
            providers={filteredProviders}
            value={value}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  ) : (
    <div className={"px-8 mb-6"}>
      <Callout variant={"info"} className={"mt-6"}>
        {t.rich("integrations.idpNoCompatibleProviders", {
          settings: (chunks) => (
            <InlineButtonLink
              onClick={() => router.push("/settings?tab=identity-providers")}
              variant={"dashed"}
            >
              {chunks}
            </InlineButtonLink>
          ),
        })}
      </Callout>
    </div>
  );
}

function ProviderSelect({
  providers,
  value,
  onChange,
  disabled,
}: {
  providers?: SSOIdentityProvider[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={t("integrations.idpSelectConnectorPlaceholder")}
        />
      </SelectTrigger>
      <SelectContent>
        {providers?.map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            <div className="flex items-center gap-2">
              {idpIcon(provider.type) || (
                <FingerprintIcon size={14} className="text-nb-gray-400" />
              )}
              <span>{provider.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
