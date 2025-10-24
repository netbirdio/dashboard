import { FolderGit2 } from "lucide-react";
import * as React from "react";
import EntraIcon from "@/assets/icons/EntraIcon";
import GoogleIcon from "@/assets/icons/GoogleIcon";
import JWTIcon from "@/assets/icons/JWTIcon";
import OktaIcon from "@/assets/icons/OktaIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { GroupIssued } from "@/interfaces/Group";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";

const ICON_SIZE = {
  default: {
    google: 11,
    entra: 13,
    okta: 11,
    jwt: 12,
    default: 12,
  },
  large: {
    google: 19,
    entra: 21,
    okta: 19,
    jwt: 20,
    default: 20,
  },
};

export const GroupBadgeIcon = ({
  id,
  issued,
  variant = "default",
}: {
  id?: string;
  issued?: GroupIssued;
  variant?: "default" | "large";
}) => {
  const { groups } = useGroups();
  const group = groups?.find((g) => g.id === id);

  const { isAzureGroup, isGoogleGroup, isOktaGroup, isJWTGroup } =
    useGroupIdentification({ id, issued: issued ?? group?.issued });

  if (isGoogleGroup)
    return (
      <GoogleIcon
        size={ICON_SIZE[variant].google}
        className={"shrink-0 mr-0.5"}
      />
    );
  if (isAzureGroup)
    return (
      <EntraIcon
        size={ICON_SIZE[variant].entra}
        className={"shrink-0 mr-0.5"}
      />
    );
  if (isOktaGroup)
    return (
      <OktaIcon size={ICON_SIZE[variant].okta} className={"shrink-0 mr-0.5"} />
    );
  if (isJWTGroup)
    return <JWTIcon size={ICON_SIZE[variant].jwt} className={"shrink-0"} />;

  return (
    <FolderGit2 size={ICON_SIZE[variant].default} className={"shrink-0"} />
  );
};
