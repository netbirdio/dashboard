import { useOidc, useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import loadConfig from "@utils/config";
import { ArrowRightIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useMatomoVirtualPage } from "@/cloud/analytics/MatomoProvider";
import { useTranslations } from "@/i18n/LocaleProvider";

const config = loadConfig();

export const OIDCError = () => {
  const t = useTranslations();

  const { oidcUserLoadingState } = useOidcUser();
  const params = useSearchParams();
  const errorParam = params.get("error");
  const accessDenied = errorParam === "access_denied";
  const invalidRequest = errorParam === "invalid_request";

  const errorDescription = params.get("error_description");
  useMatomoVirtualPage(
    !(accessDenied && errorDescription === "account linked successfully") &&
      "login_error",
  );
  const { logout, login } = useOidc();

  const title = accessDenied
    ? errorDescription === "account linked successfully"
      ? t("error.accountLinked")
      : errorDescription
    : t("error.unexpected");

  return (
    <div
      className={
        "flex items-center justify-center flex-col h-screen max-w-lg mx-auto"
      }
    >
      <div
        className={
          "bg-nb-gray-930 mb-3 border border-nb-gray-900 h-12 w-12 rounded-md flex items-center justify-center "
        }
      >
        <NetBirdIcon size={23} />
      </div>
      <h1 className={"text-center mt-2"}>{title}</h1>

      {accessDenied ? (
        <>
          <Paragraph className={"text-center mt-2"}>
            {t("error.emailVerified")}
          </Paragraph>

          <Button
            variant={"primary"}
            size={"sm"}
            className={"mt-5"}
            onClick={() => logout("/", { client_id: config.clientId })}
          >
            {t("common.continue")}
            <ArrowRightIcon size={16} />
          </Button>

          <Button
            variant={"default-outline"}
            size={"sm"}
            className={"mt-5"}
            onClick={() => logout("/", { client_id: config.clientId })}
          >
            {t("error.loginTrouble")}
          </Button>
        </>
      ) : (
        <>
          <Paragraph className={"text-center mt-2 block"}>
            {t("error.loginFailed")}
            <br />
            {t("error.prefix")}{" "}
            <span className={"inline capitalize"}>
              {invalidRequest && errorDescription
                ? errorDescription
                : oidcUserLoadingState}
            </span>
          </Paragraph>
          <Button
            variant={"primary"}
            size={"sm"}
            className={"mt-5"}
            onClick={() => logout("/", { client_id: config.clientId })}
          >
            {t("error.logout")}
          </Button>
        </>
      )}
    </div>
  );
};
