import { IconCircleFilled } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { AccountMFA } from "@/cloud/mfa/AccountMFASettings";
import { isNetBirdCloud } from "@utils/netbird";

const config = loadConfig();

export const AccountMfaCard = () => {
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
      <button
        className={cn(
          "border cursor-pointer border-nb-gray-900/50 bg-nb-gray-900/30 hover:bg-nb-gray-900/50 py-3 pl-3 pr-5 rounded-lg transition-all min-w-[432px] max-w-[440px]",
          "text-left",
        )}
        aria-label={"Multi-Factor Authentication (MFA)"}
        onClick={() => router.push("/settings?tab=authentication")}
      >
        <div className={"inline-flex gap-4 w-full"}>
          <div
            className={
              "h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
            }
          >
            <ShieldCheckIcon size={16} />
          </div>
          <div className={"w-full"}>
            <div className={"flex items-center gap-3 justify-between"}>
              <div
                className={"font-medium text-sm flex gap-2 items-center mr-3"}
              >
                Multi-Factor Authentication (MFA)
              </div>
              <div
                className={cn(
                  "text-xs flex gap-2 items-center mb-2 font-medium",
                  enabled ? "text-green-500" : "text-nb-gray-500",
                )}
              >
                <IconCircleFilled size={8} />
                {enabled ? "Enabled" : "Disabled"}
              </div>
            </div>

            <p className={"text-xs font-light !text-nb-gray-300 "}>
              Enable NetBird MFA if not configured in your IdP
            </p>
          </div>
        </div>
      </button>
    )
  );
};
