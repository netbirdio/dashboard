import { useOidc, useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import loadConfig from "@utils/config";
import { ArrowRightIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useI18n } from "@/i18n/I18nProvider";

const config = loadConfig();

export const OIDCError = () => {
  const { t } = useI18n();
  const { oidcUserLoadingState } = useOidcUser();
  const params = useSearchParams();
  const errorParam = params.get("error");
  const accessDenied = errorParam === "access_denied";
  const invalidRequest = errorParam === "invalid_request";
  const [title, setTitle] = useState(params.get("error_description"));
  const errorDescription = params.get("error_description");
  const { logout, login } = useOidc();

  useEffect(() => {
    if (accessDenied) {
      if (title === "account linked successfully") {
        setTitle(
          t("auth.accountLinkedSuccessfully"),
        );
      }
    } else {
      setTitle(t("auth.somethingWentWrong"));
    }
  }, [accessDenied, title, t]);

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
            {t("auth.alreadyVerifiedEmail")}
          </Paragraph>

          <Button
            variant={"primary"}
            size={"sm"}
            className={"mt-5"}
            onClick={() => logout("/", { client_id: config.clientId })}
          >
            {t("actions.continue")}
            <ArrowRightIcon size={16} />
          </Button>

          <Button
            variant={"default-outline"}
            size={"sm"}
            className={"mt-5"}
            onClick={() => logout("/", { client_id: config.clientId })}
          >
            {t("auth.troubleLoggingIn")}
          </Button>
        </>
      ) : (
        <>
          <Paragraph className={"text-center mt-2 block"}>
            {t("auth.errorLoggingIn")} <br />
            {t("auth.error")}:{
              invalidRequest && errorDescription
                ? errorDescription
                : oidcUserLoadingState
            }
          </Paragraph>
          <Button
            variant={"primary"}
            size={"sm"}
            className={"mt-5"}
            onClick={() => logout("/", { client_id: config.clientId })}
          >
            {t("auth.logout")}
          </Button>
        </>
      )}
    </div>
  );
};
