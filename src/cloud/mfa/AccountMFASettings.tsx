import { Checkbox } from "@components/Checkbox";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { notify } from "@components/Notification";
import useFetchApi, { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { AccountMFAInfoModal } from "@/cloud/mfa/AccountMFAInfoModal";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";

const config = loadConfig();

export interface AccountMFA {
  id: string;
  mfa: boolean;
  mfaRememberBrowser: boolean;
}

export const AccountMFASettings = () => {
  const { permission } = usePermissions();
  const {
    data: accountMfa,
    isLoading: isDataLoading,
    error,
    mutate,
  } = useFetchApi<AccountMFA>(
    "/service/mfa",
    true,
    true,
    !!config.authServiceUrl,
    {
      origin: config.authServiceUrl,
    },
  );
  const mfaRequest = useApiCall<AccountMFA>("/service/mfa", true, {
    origin: config.authServiceUrl,
  }).post;

  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [infoModal, setInfoModal] = useState(false);

  const { loggedInUser } = useLoggedInUser();
  const isUserNamePasswordAuth = loggedInUser?.id?.startsWith("auth0|");

  const [pendingUpdate, setPendingUpdate] = useState<{
    enable: boolean;
    rememberBrowser?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      const timer = setTimeout(() => setShowLoader(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const update = async (
    enable: boolean,
    rememberBrowser?: boolean,
    skipModal?: boolean,
  ) => {
    if (!accountMfa) return;

    if (!isUserNamePasswordAuth && enable && !skipModal) {
      setPendingUpdate({ enable, rememberBrowser });
      setInfoModal(true);
      return;
    }

    const timer = setTimeout(() => setIsLoading(true), 800);

    const rememberBrowserDescription = `Option to remember browser is now ${
      rememberBrowser ? "enabled" : "disabled"
    }`;

    const mfaDescription = `MFA is now ${
      enable ? "enabled" : "disabled"
    } for your account`;

    notify({
      title: "Multi-Factor Authentication (MFA)",
      description:
        rememberBrowser != undefined
          ? rememberBrowserDescription
          : mfaDescription,
      promise: mfaRequest({
        mfa: enable,
        mfa_remember_browser: rememberBrowser,
      })
        .then(() => {
          mutate(
            {
              ...accountMfa,
              mfa: enable,
              mfaRememberBrowser: rememberBrowser,
            },
            {
              populateCache: true,
              revalidate: false,
            },
          );
        })
        .finally(() => {
          setIsLoading(false);
          clearTimeout(timer);
        }),
      loadingMessage: "Updating MFA settings...",
    });
  };
  const handleModalConfirm = () => {
    if (pendingUpdate) {
      update(pendingUpdate.enable, pendingUpdate.rememberBrowser, true).then();
    }
    setInfoModal(false);
    setPendingUpdate(null);
  };

  const handleModalCancel = () => {
    setInfoModal(false);
    setPendingUpdate(null);
  };

  return (
    <>
      <AccountMFAInfoModal
        open={infoModal}
        setOpen={setInfoModal}
        onCancel={handleModalCancel}
        onConfirm={handleModalConfirm}
      />
      <div
        className={cn(
          "w-full relative mb-10",
          (isLoading || isDataLoading) &&
            "animate-pulse pointer-events-none opacity-90",
          (error || !accountMfa) && "pointer-events-none opacity-70",
        )}
      >
        <div
          className={cn(
            "w-full h-full absolute left-0 top-0 flex items-center justify-center z-10 bg-nb-gray-950/60 text-sm transition-all",
            showLoader ? "opacity-100" : "opacity-0 hidden",
          )}
        >
          <div className={"flex gap-2 items-center justify-center"}>
            <Loader2Icon size={15} className={"animate-spin"} />
            Updating MFA settings...
          </div>
        </div>
        <FancyToggleSwitch
          disabled={!accountMfa || !permission.settings.update}
          value={accountMfa?.mfa || false}
          onChange={(enable) => {
            update(enable).then();
          }}
          label={
            <>
              <ShieldCheckIcon size={15} />
              Multi-Factor Authentication (MFA)
            </>
          }
          helpText={
            <>
              Enable NetBird MFA if not configured in your IdP. <br />
              This setting is global and applies to all users.
            </>
          }
        />
        <label
          className={cn(
            "text-neutral-500 dark:text-nb-gray-300 font-normal flex items-start gap-4 cursor-pointer mt-4 justify-start text-left",
            accountMfa?.mfa ? "opacity-100" : "opacity-50 pointer-events-none",
          )}
        >
          <Checkbox
            disabled={!accountMfa?.mfa || !permission.settings.update}
            checked={accountMfa?.mfaRememberBrowser || false}
            onClick={() => {
              update(
                accountMfa?.mfa || false,
                !accountMfa?.mfaRememberBrowser || false,
                true,
              ).then();
            }}
            variant={"tableCell"}
            className={"mt-1"}
          />
          <div>
            <div className={"font-medium text-sm text-nb-gray-200"}>
              Remember Browser for MFA
            </div>
            <div className={"text-xs"}>
              When enabled, users will have the option to remember their browser
              for 30 days.
              <br className={"hidden lg:block"} /> MFA will not be required for
              that browser during this period.
            </div>
          </div>
        </label>
      </div>
    </>
  );
};
