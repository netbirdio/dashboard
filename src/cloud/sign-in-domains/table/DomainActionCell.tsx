import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { cn } from "@utils/helpers";
import { TrashIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSignInDomains } from "@/cloud/sign-in-domains/useSignInDomains";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { DomainValidationStatus, SignInDomain } from "@/interfaces/Account";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";

type Props = {
  domain: SignInDomain;
};

export default function DomainActionCell({ domain }: Readonly<Props>) {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { verifyDomain, deleteDomain, mutate } = useSignInDomains();
  const { confirm } = useDialog();
  const [modal, setModal] = useState(false);

  const isVerified =
    domain.validation_status === DomainValidationStatus.VERIFIED;
  const connections = domain.connections ?? [];

  const removeBlockedReason: React.ReactNode = domain.is_primary ? (
    <>
      {t.rich("signInDomains.thisIsThePrimaryDomainOfYourAccountAndCannot", {
        part0: () => <br />,
      })}
    </>
  ) : connections.length > 0 ? (
    <>
      {t.rich("signInDomains.thisDomainIsUsedByAnSSOIntegrationRemoveIt", {
        part0: () => <br />,
      })}
    </>
  ) : undefined;

  const deleteDomainHandler = async () => {
    const choice = await confirm({
      title: t("signInDomains.removeName", { name: domain.name }),
      description: t("signInDomains.usersWithAnEmailAddressOnThisDomainWillNo"),
      confirmText: t("common.remove"),
      cancelText: t("common.cancel"),
      type: "danger",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return;
    notify({
      title: t("signInDomains.signInDomains"),
      description: t("signInDomains.nameHasBeenRemoved", { name: domain.name }),
      promise: deleteDomain(domain.id).then((res) => {
        mutate().catch(() => {});
        return res;
      }),
      loadingMessage: t("signInDomains.removingDomain"),
    });
  };

  return (
    <div
      className={
        "relative top-[2px] flex gap-2 items-center justify-end ml-auto min-h-[34px]"
      }
    >
      <DomainVerificationModal
        open={modal}
        onOpenChange={setModal}
        domain={domain.name}
        token={domain.validation_token}
        onVerify={() =>
          verifyDomain(domain.id).then((res) => {
            mutate().catch(() => {});
            return res;
          })
        }
      />

      {!isVerified && (
        <Button
          variant={"secondary"}
          size={"xs"}
          className={"!px-3"}
          disabled={!permission.settings.update}
          onClick={() => setModal(true)}
          data-testid={"verify-domain"}
        >
          {t("signInDomains.verify")}
        </Button>
      )}

      <FullTooltip
        content={
          <div className={"text-xs max-w-xs"}>
            {removeBlockedReason ?? t("signInDomains.removeDomain")}
          </div>
        }
        interactive={false}
      >
        <Button
          variant={"danger-outline"}
          size={"xs"}
          className={cn(
            "!p-0 !h-[34px] !w-[34px]",
            removeBlockedReason && "pointer-events-none",
          )}
          disabled={!!removeBlockedReason || !permission.settings.update}
          onClick={deleteDomainHandler}
          aria-label={t("signInDomains.removeDomain")}
          data-testid={"remove-domain"}
        >
          <TrashIcon size={14} />
        </Button>
      </FullTooltip>
    </div>
  );
}
