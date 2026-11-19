import HelpText from "@components/HelpText";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  type?: "user-groups" | "groups";
};
export const GroupPrefixHelpText = ({ type = "groups" }: Props) => {
  const t = useTranslations();
  return type === "user-groups" ? (
    <HelpText className={"max-w-lg mt-2"}>
      By default,{" "}
      <span className={"text-netbird font-semibold"}>{t("integrations.allUsers")}</span> will be
      synchronized from your IdP to NetBird. <br />
      If you want to synchronize only users that belong to a specific group, you
      can add them below. Keep in mind that the prefix matching is
      case-sensitive.
    </HelpText>
  ) : (
    <HelpText className={"max-w-lg mt-2"}>
      By default,{" "}
      <span className={"text-netbird font-semibold"}>{t("integrations.allGroups")}</span> will be
      synchronized from your IdP to NetBird. <br />
      If you want to synchronize only groups that start with a specific prefix,
      you can add them below. Keep in mind that the prefix matching is
      case-sensitive.
    </HelpText>
  );
};
