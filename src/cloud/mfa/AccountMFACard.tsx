import FeatureCard, { FeatureCardStatus } from "@components/FeatureCard";
import useFetchApi from "@utils/api";
import loadConfig from "@utils/config";
import { isNetBirdCloud } from "@utils/netbird";
import { ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { AccountMFA } from "@/cloud/mfa/AccountMFASettings";
import { useTranslations } from "@/i18n/LocaleProvider";

const config = loadConfig();

export const AccountMfaCard = () => {
  const t = useTranslations();
  const { data: accountMfa } = useFetchApi<AccountMFA>(
    "/service/mfa",
    true,
    true,
    !!config.authServiceUrl,
    {
      origin: config.authServiceUrl,
    },
  );

  const enabled = useMemo(() => {
    return accountMfa?.mfa || false;
  }, [accountMfa]);

  const router = useRouter();

  return (
    isNetBirdCloud() && (
      <FeatureCard
        onClick={() => router.push("/settings?tab=authentication")}
        aria-label={t("common.mfa")}
        className={"min-w-[432px]"}
        icon={<ShieldCheckIcon size={16} />}
        title={t("common.mfa")}
        action={<FeatureCardStatus enabled={enabled} />}
        description={"Enable NetBird MFA if not configured in your IdP"}
      />
    )
  );
};
